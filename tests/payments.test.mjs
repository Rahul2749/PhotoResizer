import {test,before,beforeEach,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID,createHmac} from "node:crypto";
import {Store} from "../api/store.mjs";
import {PaymentService} from "../api/service.mjs";
import {createApi} from "../api/server.mjs";
import {readConfig,randomToken} from "../api/security.mjs";

const databaseUrl=process.env.TEST_DATABASE_URL;
if(!databaseUrl || decodeURIComponent(new URL(databaseUrl).pathname)!=="/photoresizekaro_test")throw new Error("Set TEST_DATABASE_URL to the dedicated photoresizekaro_test database. Never use a production database.");
const config=readConfig({NODE_ENV:"test",APP_ORIGIN:"http://127.0.0.1:3003",DATABASE_URL:databaseUrl,PAYMENTS_DATABASE_NAME:"photoresizekaro_test",PAYMENTS_ENCRYPTION_KEY:"9".repeat(64),PAYMENTS_MODE:"test",RAZORPAY_KEY_ID:"rzp_test_fixture",RAZORPAY_KEY_SECRET:"fixture-api-secret",RAZORPAY_WEBHOOK_SECRET:"fixture-webhook-secret-at-least-24-characters",SUPPORT_PAYMENTS_APPROVED:"true"});
const store=new Store(databaseUrl);
class FakeGateway {
  links=new Map();payments=new Map();creates=0;uncertain=false;
  async createLink(order,email){this.creates++;this.email=email;const link={id:`plink_${randomUUID().replaceAll("-","")}`,reference_id:order.id,amount:order.amount_paise,currency:"INR",status:"created",amount_paid:0,payments:[],short_url:"https://rzp.io/i/testOnly"};this.links.set(link.id,link);if(this.uncertain)throw new Error("Simulated network loss after provider creation");return structuredClone(link);}
  async fetchLink(id){if(!this.links.has(id))throw new Error("Missing provider link");return structuredClone(this.links.get(id));}
  async fetchPayment(id){if(!this.payments.has(id))throw new Error("Missing provider payment");return structuredClone(this.payments.get(id));}
  async findLink(reference){return structuredClone([...this.links.values()].find((link)=>link.reference_id===reference)||null);}
  async orderPayments(id){return structuredClone([...this.payments.values()].filter((payment)=>payment.order_id===id));}
  pay(linkId,overrides={}){const link=this.links.get(linkId),payment={id:`pay_${randomUUID().replaceAll("-","")}`,amount:link.amount,currency:"INR",status:"captured",captured:true,amount_refunded:0,fee:12,tax:2,...overrides};link.status="paid";link.amount_paid=link.amount;link.payments=[{payment_id:payment.id}];this.payments.set(payment.id,payment);return payment;}
}
let gateway,service,session;
before(async()=>{await store.migrate();});
beforeEach(async()=>{await store.pool.query("TRUNCATE prk_refunds,prk_payment_events,prk_order_access,prk_orders,prk_sessions CASCADE");gateway=new FakeGateway();service=new PaymentService(store,gateway,config);session=await store.createSession(randomToken());});
after(async()=>{await store.close();});
const buy=(productId="zip-day",extra={},key=randomUUID())=>service.checkout(session,{productId,email:"buyer@example.test",...extra},key);
function signed(event,id=randomUUID()){const raw=Buffer.from(JSON.stringify(event));return service.webhook(raw,createHmac("sha256",config.webhookSecrets[0]).update(raw).digest("hex"),id);}
const paidEvent=(order,payment)=>({event:"payment_link.paid",payload:{payment_link:{entity:{id:order.link_id,reference_id:order.id}},payment:{entity:payment}}});

test("requires email, rejects price tampering and persists only encrypted email/restore data",async()=>{
 await assert.rejects(()=>buy("zip-day",{email:""}),/email/);await assert.rejects(()=>buy("zip-day",{amountPaise:1}),/server/);
 const order=await buy(),row=await store.getOrder(order.id);assert.equal(row.amount_paise,500);assert.equal(row.status,"pending");assert.notEqual(row.email_encrypted,"buyer@example.test");assert.ok(!row.recovery_encrypted.includes(order.restoreCode));assert.equal(gateway.email,"buyer@example.test");assert.deepEqual((await service.entitlements(session)).features,[]);
});
test("checkout idempotency returns the same link and restore code",async()=>{
 const key=randomUUID(),a=await buy("zip-day",{},key),b=await buy("zip-day",{},key);assert.equal(a.id,b.id);assert.equal(a.restoreCode,b.restoreCode);assert.equal(gateway.creates,1);await assert.rejects(()=>buy("print-day",{},key),/different details/);
});
test("forged webhook and callback signatures cannot grant a pass",async()=>{
 const order=await buy(),row=await store.getOrder(order.id),payment=gateway.pay(row.link_id),event=paidEvent(row,payment);
 await assert.rejects(()=>service.webhook(Buffer.from(JSON.stringify(event)),"0".repeat(64),"forged"),/signature/);
 await assert.rejects(()=>service.callback(new URLSearchParams({razorpay_payment_link_reference_id:row.id,razorpay_payment_link_id:row.link_id,razorpay_payment_id:payment.id,razorpay_payment_link_status:"paid",razorpay_signature:"0".repeat(64)})),/signature/);assert.deepEqual((await service.entitlements(session)).features,[]);
});
test("only matching captured provider payments grant access",async()=>{
 const order=await buy(),row=await store.getOrder(order.id),payment=gateway.pay(row.link_id,{amount:499});await assert.rejects(()=>service.reconcile(row,payment.id),/match/);gateway.payments.get(payment.id).amount=500;gateway.payments.get(payment.id).status="authorized";gateway.payments.get(payment.id).captured=false;await assert.rejects(()=>service.reconcile(row,payment.id),/match/);gateway.payments.get(payment.id).status="captured";gateway.payments.get(payment.id).captured=true;await service.reconcile(row,payment.id);assert.deepEqual((await service.entitlements(session)).features,["zip"]);
});
test("duplicate and concurrent paid events neither double grant nor extend expiry",async()=>{
 const order=await buy("print-day"),row=await store.getOrder(order.id),payment=gateway.pay(row.link_id),event=paidEvent(row,payment);
 await signed(event,"same-paid-event");const expiry=(await store.getOrder(row.id)).expires_at.getTime();await Promise.all(Array.from({length:8},()=>signed(event,"same-paid-event")));await signed(event,"another-delivery");
 assert.equal((await store.getOrder(row.id)).expires_at.getTime(),expiry);assert.deepEqual((await service.entitlements(session)).features,["zip","print"]);assert.equal((await store.pool.query("SELECT count(*)::int AS n FROM prk_payment_events WHERE event_id='test:same-paid-event'")).rows[0].n,1);
});
test("partial refunds revoke access, do not double count, and later paid events cannot restore it",async()=>{
 const order=await buy(),row=await store.getOrder(order.id),payment=gateway.pay(row.link_id);await signed(paidEvent(row,payment));gateway.payments.get(payment.id).amount_refunded=100;await service.reconcile(await store.getOrder(row.id));
 const refund={event:"refund.processed",payload:{refund:{entity:{id:"rfnd_First",payment_id:payment.id,status:"processed",amount:100}}}};await signed(refund,"refund-one");await signed(refund,"refund-other-delivery-id");assert.equal((await store.getOrder(row.id)).refunded_paise,100);await signed(paidEvent(row,payment));assert.deepEqual((await service.entitlements(session)).features,[]);assert.equal((await store.getOrder(row.id)).status,"refunded");
});
test("refunds and disputes delivered before paid events never briefly unlock access",async()=>{
 for(const type of ["refund.processed","payment.dispute.created"]){
  const order=await buy(),row=await store.getOrder(order.id),payment=gateway.pay(row.link_id);
  await signed({event:type,payload:{[type==="refund.processed"?"refund":"dispute"]:{entity:{id:"rfnd_Early",payment_id:payment.id,status:"processed",amount:100}}}});
  await signed(paidEvent(row,payment));assert.deepEqual((await service.entitlements(session)).features,[]);assert.ok((await store.getOrder(row.id)).revoked_at);
 }
});
test("provider reconciliation revokes a fully refunded payment even without its webhook",async()=>{
 const order=await buy(),row=await store.getOrder(order.id),payment=gateway.pay(row.link_id);await service.reconcile(row);gateway.payments.get(payment.id).status="refunded";gateway.payments.get(payment.id).amount_refunded=500;await service.reconcile(await store.getOrder(row.id));assert.equal((await store.getOrder(row.id)).refunded_paise,500);assert.deepEqual((await service.entitlements(session)).features,[]);
});
test("concurrent paid and refund delivery ends revoked with correct refund totals",async()=>{
 const order=await buy(),row=await store.getOrder(order.id),payment=gateway.pay(row.link_id);
 await Promise.all([signed(paidEvent(row,payment)),signed({event:"refund.processed",payload:{refund:{entity:{id:"rfnd_Concurrent",payment_id:payment.id,status:"processed",amount:100}}}})]);
 const result=await store.getOrder(row.id);assert.equal(result.status,"refunded");assert.equal(result.refunded_paise,100);assert.deepEqual((await service.entitlements(session)).features,[]);
});
test("expired passes and donations never grant paid features",async()=>{
 const order=await buy(),row=await store.getOrder(order.id);gateway.pay(row.link_id);await service.reconcile(row);await store.pool.query("UPDATE prk_orders SET expires_at=now()-interval '1 second' WHERE id=$1",[row.id]);assert.deepEqual((await service.entitlements(session)).features,[]);
 await assert.rejects(()=>buy("donation",{amountPaise:499}),/₹5/);await assert.rejects(()=>buy("donation",{amountPaise:550}),/whole-rupee/);const donation=await buy("donation",{amountPaise:500}),d=await store.getOrder(donation.id);gateway.pay(d.link_id);await service.reconcile(d);assert.deepEqual((await service.entitlements(session)).features,[]);assert.equal((await store.getOrder(d.id)).expires_at,null);
});
test("restore code grants only its purchase and email is not a restore credential",async()=>{
 const a=await buy(),b=await buy("print-day"),row=await store.getOrder(a.id);gateway.pay(row.link_id);await service.reconcile(row);const other=await store.createSession(randomToken());await assert.rejects(()=>service.restore(other,"buyer@example.test"),/restore code/);await service.restore(other,a.restoreCode);assert.deepEqual((await service.entitlements(other)).features,["zip"]);assert.equal(await store.ownedOrder(other.id,b.id),null);const receipt=await service.receipt(other,a.id);assert.equal(receipt.email,"buyer@example.test");assert.equal(receipt.restoreCode,a.restoreCode);
});
test("signed callback reconciles but does not act as a browser login",async()=>{
 const order=await buy(),row=await store.getOrder(order.id),payment=gateway.pay(row.link_id);const query=new URLSearchParams({razorpay_payment_link_reference_id:row.id,razorpay_payment_link_id:row.link_id,razorpay_payment_id:payment.id,razorpay_payment_link_status:"paid"});query.set("razorpay_signature",createHmac("sha256",config.keySecret).update(`${row.link_id}|${row.id}|paid|${payment.id}`).digest("hex"));assert.equal(await service.callback(query),row.id);assert.deepEqual((await service.entitlements(null)).features,[]);assert.deepEqual((await service.entitlements(session)).features,["zip"]);
});
test("late signed payment recovers a create request whose response was lost",async()=>{
 gateway.uncertain=true;await assert.rejects(()=>buy(),/could not be confirmed/);const row=(await store.history(session.id))[0],link=[...gateway.links.values()][0],payment=gateway.pay(link.id);assert.equal(row.status,"failed");await signed(paidEvent({...row,link_id:link.id},payment));assert.deepEqual((await service.entitlements(session)).features,["zip"]);
});
test("background reconciliation recovers a lost checkout without relying on its webhook",async()=>{
 gateway.uncertain=true;await assert.rejects(()=>buy(),/could not be confirmed/);const row=(await store.history(session.id))[0],link=[...gateway.links.values()][0];gateway.pay(link.id);await service.reconcile(row);assert.deepEqual((await service.entitlements(session)).features,["zip"]);
});
test("HTTP API blocks cross-origin writes, unknown purchases and image payloads; anonymous free reads set no cookie",async()=>{
 const {server}=createApi({store,gateway,config});await new Promise((resolve)=>server.listen(0,"127.0.0.1",resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const access=await fetch(`${base}/api/commerce/access`);assert.equal(access.headers.get("set-cookie"),null);assert.equal(access.headers.get("cache-control"),"no-store");
  assert.equal((await fetch(`${base}/api/commerce/session`,{method:"POST",headers:{Origin:"https://evil.example","Content-Type":"application/json"},body:"{}"})).status,403);
  assert.equal((await fetch(`${base}/api/commerce/checkout`,{method:"POST",headers:{Origin:config.origin,"Content-Type":"image/png"},body:"not-an-image"})).status,415);
  const created=await fetch(`${base}/api/commerce/session`,{method:"POST",headers:{Origin:config.origin,"Content-Type":"application/json"},body:"{}"});assert.match(created.headers.get("set-cookie"),/HttpOnly; SameSite=Lax/);
  const cookie=created.headers.get("set-cookie").split(";")[0];
  const response=await fetch(`${base}/api/commerce/checkout`,{method:"POST",headers:{Origin:config.origin,"Content-Type":"application/json",Cookie:cookie,"Idempotency-Key":randomUUID()},body:JSON.stringify({email:"person@example.test",productId:"zip-day",image:"data:image/png;..."})});assert.equal(response.status,400);
  const purchase=await buy();assert.equal((await fetch(`${base}/api/commerce/orders/${purchase.id}/receipt`,{headers:{Cookie:cookie}})).status,404);
 }finally{await new Promise((resolve)=>server.close(resolve));}
});
