import {test} from "node:test";
import assert from "node:assert/strict";
import {createHmac,randomBytes} from "node:crypto";
import {verifyHmac,seal,unseal,validateEmail,readConfig} from "../api/security.mjs";
import {passwordHash,passwordMatches,AdminService} from "../api/admin.mjs";
const config={NODE_ENV:"test",APP_ORIGIN:"http://127.0.0.1:3000",DATABASE_URL:"postgresql://user:example@localhost/photoresizekaro",PAYMENTS_ENCRYPTION_KEY:"1".repeat(64)};
test("webhooks require an exact HMAC of raw bytes",()=>{const raw=Buffer.from('{"amount":500}'),secret="unit-only-webhook-secret",signature=createHmac("sha256",secret).update(raw).digest("hex");assert.ok(verifyHmac(raw,signature,secret));assert.ok(!verifyHmac(Buffer.from('{ "amount":500}'),signature,secret));assert.ok(!verifyHmac(raw,"00",secret));assert.ok(!verifyHmac(raw,signature,"other"));});
test("email and restore values are authenticated, encrypted and purpose-bound",()=>{const key=randomBytes(32),encrypted=seal("customer@example.test",key,"email");assert.ok(!encrypted.includes("customer"));assert.equal(unseal(encrypted,key,"email"),"customer@example.test");assert.throws(()=>unseal(encrypted,key,"recovery"));assert.throws(()=>unseal(encrypted,randomBytes(32),"email"));assert.notEqual(encrypted,seal("customer@example.test",key,"email"));});
test("checkout requires a bounded valid email",()=>{assert.equal(validateEmail("Applicant@Example.com"),"applicant@example.com");for(const input of [null,"bad", "a@b", "a@example.com\r\nBcc:x@y.com","x".repeat(260)+"@example.com"])assert.throws(()=>validateEmail(input));});
test("production config fails closed on mismatched modes, HTTP and other databases",()=>{assert.equal(readConfig(config).mode,"disabled");assert.throws(()=>readConfig({...config,NODE_ENV:"production"}));assert.throws(()=>readConfig({...config,DATABASE_URL:"postgresql://user:example@localhost/taskmanager"}));assert.throws(()=>readConfig({...config,PAYMENTS_MODE:"live",RAZORPAY_KEY_ID:"rzp_test_fake",RAZORPAY_KEY_SECRET:"fake",RAZORPAY_WEBHOOK_SECRET:"x".repeat(32)}));assert.throws(()=>readConfig({...config,PAYMENTS_MODE:"live",RAZORPAY_KEY_ID:"rzp_live_fake",RAZORPAY_KEY_SECRET:"fake",RAZORPAY_WEBHOOK_SECRET:"x".repeat(32)}));});

test("admin credentials must be explicitly configured together with a strong password",()=>{
 assert.equal(readConfig(config).adminEnabled,false);
 for(const values of [{ADMIN_USERNAME:"owner"},{ADMIN_PASSWORD:"long-fixture-password"},{ADMIN_USERNAME:"owner",ADMIN_PASSWORD:"short"},{ADMIN_USERNAME:"bad username",ADMIN_PASSWORD:"long-fixture-password"}])assert.throws(()=>readConfig({...config,...values}));
 assert.equal(readConfig({...config,ADMIN_USERNAME:"owner",ADMIN_PASSWORD:"long-fixture-password"}).adminEnabled,true);
 assert.equal(readConfig(config).supportEnabled,true);
 assert.equal(readConfig({...config,DONATIONS_ENABLED:"false"}).supportEnabled,false);
 assert.equal(readConfig({...config,USAGE_METRICS_ENABLED:"false"}).usageEnabled,false);
});
test("admin passwords use salted scrypt and CSRF values are bound to the session",async()=>{
 const encoded=await passwordHash("test-only-password-long");assert.ok(!encoded.includes("test-only"));
 assert.ok(await passwordMatches("test-only-password-long",encoded));assert.ok(!await passwordMatches("wrong",encoded));
 assert.notEqual(encoded,await passwordHash("test-only-password-long"));
 const admin=new AdminService({},readConfig(config));const csrf=admin.csrf("fixture-session-a");admin.checkCsrf("fixture-session-a",csrf);
 assert.throws(()=>admin.checkCsrf("fixture-session-b",csrf));assert.throws(()=>admin.checkCsrf("fixture-session-a",null));
});
