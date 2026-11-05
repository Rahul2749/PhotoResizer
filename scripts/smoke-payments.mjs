import assert from "node:assert/strict";
const base=new URL(process.argv[2] || "http://127.0.0.1:8088");
const request=(path,init={})=>fetch(new URL(path,base),{redirect:"manual",signal:AbortSignal.timeout(10000),...init});
let ready=false;
for(let i=0;i<20;i++){try{const response=await request("/api/healthz");if(response.ok&&(await response.json()).ok){ready=true;break;}}catch{}await new Promise((resolve)=>setTimeout(resolve,1000));}
assert.ok(ready,"Payment API/database did not become ready.");
const catalogResponse=await request("/api/commerce/catalog");assert.equal(catalogResponse.status,200);assert.equal(catalogResponse.headers.get("cache-control"),"no-store");
const catalog=await catalogResponse.json();assert.ok(["disabled","test","live"].includes(catalog.mode));assert.equal(catalog.products.find((plan)=>plan.id==="zip-day").amountPaise,500);assert.equal(catalog.products.find((plan)=>plan.id==="print-day").amountPaise,1000);assert.equal(catalog.donationMinimumPaise,500);
const access=await request("/api/commerce/access");assert.equal(access.headers.get("set-cookie"),null);assert.equal(access.headers.get("cache-control"),"no-store");assert.deepEqual((await access.json()).features,[]);
assert.equal((await request("/api/commerce/orders/00000000-0000-0000-0000-000000000000/receipt")).status,404);
assert.equal((await request("/api/commerce/session",{method:"POST",headers:{Origin:"https://unrelated.example","Content-Type":"application/json"},body:"{}"})).status,403);
console.log(`Payment API smoke passed at ${base.origin}: database, catalog, anonymous access, no-store and cross-origin protection. Mode: ${catalog.mode}. No checkout or charge was created.`);
