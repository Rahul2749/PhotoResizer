import { createServer } from "node:http";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { Store } from "./store.mjs";
import { RazorpayGateway } from "./gateway.mjs";
import { PaymentService, isUuid } from "./service.mjs";
import { readConfig, ApiError, randomToken, hash } from "./security.mjs";

const cookieName = "prk_payment_session";
const headers = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Robots-Tag":"noindex, nofollow", "Referrer-Policy":"no-referrer", "X-Content-Type-Options":"nosniff", "X-Frame-Options":"DENY", "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'" };
async function body(req, limit) {
  if (req.headers["content-encoding"] && req.headers["content-encoding"] !== "identity") throw new ApiError(415,"Compressed request bodies are not accepted.");
  const chunks=[]; let size=0;
  for await (const chunk of req) { size+=chunk.length; if(size>limit) throw new ApiError(413,"Request body is too large."); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function parseCookie(req) { const value=(req.headers.cookie || "").split(";").map((part)=>part.trim()).find((part)=>part.startsWith(`${cookieName}=`)); return value?.slice(cookieName.length+1); }
function limiter() { const entries=new Map(); return (key,limit,windowMs) => { const now=Date.now(); let entry=entries.get(key); if(!entry || entry.until<=now) entry={count:0,until:now+windowMs}; if(entries.size>=10000 && !entries.has(key)) entries.delete(entries.keys().next().value); entries.set(key,entry); if(++entry.count>limit) throw new ApiError(429,"Too many requests. Please wait and try again."); }; }

export function createApi({ store, gateway, config }) {
  const service=new PaymentService(store,gateway,config), consume=limiter();
  const server=createServer(async(req,res)=>{
    const send=(status,data,extra={})=>{res.writeHead(status,{...headers,...extra});res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url || "/",config.origin), path=url.pathname;
      const webhook=path==="/api/commerce/webhook", callback=path==="/api/commerce/return";
      if (path==="/api/healthz" && req.method==="GET") { await store.healthy(); send(200,{ok:true}); return; }
      const remote=config.trustProxy && isIP(req.headers["x-forwarded-for"] || "") ? req.headers["x-forwarded-for"] : req.socket.remoteAddress;
      const ipKey=hash(`${config.key.toString("hex")}:${remote}`);
      consume(`${webhook?"webhook":"all"}:${ipKey}`,webhook?600:180,60000);
      if(req.method==="POST" && !webhook && req.headers.origin!==config.origin) throw new ApiError(403,"Open checkout from this website.");
      if(req.method==="POST" && !webhook && !(req.headers["content-type"] || "").startsWith("application/json")) throw new ApiError(415,"Send JSON checkout details.");
      if(webhook && req.method==="POST") { if(config.mode==="disabled") throw new ApiError(503,"Payments are disabled."); await service.webhook(await body(req,65536),req.headers["x-razorpay-signature"],req.headers["x-razorpay-event-id"]);send(200,{received:true});return; }
      if(callback && req.method==="GET") { let id; try{id=await service.callback(url.searchParams);}catch{res.writeHead(303,{...headers,Location:`${config.origin}/payment-status?result=pending`});res.end();return;}res.writeHead(303,{...headers,Location:`${config.origin}/payment-status?order=${id}`});res.end();return; }
      if(path==="/api/commerce/catalog" && req.method==="GET"){send(200,service.catalog());return;}
      let session=await store.session(parseCookie(req));
      const ensureSession=async()=>{if(!session){const token=randomToken();session=await store.createSession(token);res.setHeader("Set-Cookie",`${cookieName}=${token}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=2592000${config.production?"; Secure":""}`);}return session;};
      if(path==="/api/commerce/session" && req.method==="POST"){await body(req,128);await ensureSession();send(200,{ready:true});return;}
      if(path==="/api/commerce/access" && req.method==="GET"){send(200,await service.entitlements(session));return;}
      if(path==="/api/commerce/checkout" && req.method==="POST"){
        consume(`checkout:${ipKey}`,12,3600000);
        if(!session)throw new ApiError(401,"Start a checkout session first.");
        consume(`checkout-session:${session.id}`,6,3600000);
        let input;try{input=JSON.parse((await body(req,4096)).toString("utf8"));}catch(error){if(error instanceof ApiError)throw error;throw new ApiError(400,"Invalid checkout JSON.");}
        send(200,await service.checkout(session,input,req.headers["idempotency-key"]));return;
      }
      if(path==="/api/commerce/restore" && req.method==="POST"){
        consume(`restore:${ipKey}`,8,3600000);
        let input;try{input=JSON.parse((await body(req,1024)).toString("utf8"));}catch{throw new ApiError(400,"Invalid restore request.");}
        await ensureSession();const id=await service.restore(session,input.code);send(200,{id});return;
      }
      const orderRoute=path.match(/^\/api\/commerce\/orders\/([^/]+)(\/receipt)?$/);
      if(orderRoute && req.method==="GET"){
        if(!session || !isUuid(orderRoute[1]))throw new ApiError(404,"Purchase not found in this browser. Use its restore code.");
        if(orderRoute[2]){send(200,await service.receipt(session,orderRoute[1]));return;}
        consume(`reconcile:${session.id}`,20,60000);
        const order=await store.ownedOrder(session.id,orderRoute[1]);if(!order)throw new ApiError(404,"Purchase not found in this browser.");
        send(200,service.view(await service.reconcile(order)));return;
      }
      throw new ApiError(404,"Payment endpoint not found.");
    }catch(error){const status=error instanceof ApiError?error.status:503;if(status>=500)console.error(JSON.stringify({event:"payment_request_failed",status}));if(!res.headersSent)send(status,{error:error instanceof ApiError?error.message:"Payment service is temporarily unavailable. Please try again."});else res.end();}
  });
  server.requestTimeout=20000;server.headersTimeout=10000;server.maxHeadersCount=40;
  return {server,service};
}

export async function main() {
  const config=readConfig(),store=new Store(config.databaseUrl);await store.healthy();
  const {server,service}=createApi({store,gateway:new RazorpayGateway(config),config});
  let busy=false;
  const timer=setInterval(async()=>{if(busy||config.mode==="disabled")return;busy=true;try{for(const order of await store.reconcileCandidates(config.mode)){try{await service.reconcile(order);}catch{console.error("payment_reconciliation_pending");}finally{await store.pool.query("UPDATE prk_orders SET updated_at=now() WHERE id=$1",[order.id]);}}}catch{console.error("payment_reconciliation_failed");}finally{busy=false;}},120000);timer.unref();
  server.listen(config.port,"0.0.0.0",()=>console.log(JSON.stringify({event:"payment_api_ready",mode:config.mode})));
  const shutdown=()=>{clearInterval(timer);server.close(()=>{void store.close().then(()=>process.exit(0));});};
  process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error("Payment API startup failed. Check database migration and server-only configuration.");process.exit(1);});
