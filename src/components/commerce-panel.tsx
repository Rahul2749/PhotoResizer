"use client";
import { useEffect, useRef, useState } from "react";
import { commerceRequest, plans, rupees, safeCheckoutUrl, type Access, type Catalog, type Purchase } from "../lib/commerce";
import SellerContact from "./seller-contact";

export default function CommercePanel({ kind }: { kind: "plans" | "donate" | "purchases" }) {
  const [catalog,setCatalog]=useState<Catalog|null>(null),[access,setAccess]=useState<Access|null>(null);
  const [email,setEmail]=useState(""),[amount,setAmount]=useState("5"),[restore,setRestore]=useState("");
  const [checkout,setCheckout]=useState<Purchase|null>(null),[receipt,setReceipt]=useState<Purchase|null>(null);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const form=useRef<HTMLFormElement>(null),attempt=useRef<{details:string;key:string}|null>(null);
  const checkoutRegion=useRef<HTMLElement>(null), feedback=useRef<HTMLDivElement>(null), redirectTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const submitting=useRef(false);
  const [selected,setSelected]=useState("");

  async function refresh(reconcile=false) {
    const current=await commerceRequest<Access>("/access");
    if(reconcile){for(const order of current.orders.filter((order)=>order.status==="pending").slice(0,3))await commerceRequest(`/orders/${order.id}`).catch(()=>null);}
    const next=reconcile?await commerceRequest<Access>("/access"):current;setAccess(next);
    const id=new URLSearchParams(window.location.search).get("order");
    if(id && next.orders.some((order)=>order.id===id)){
      const order=await commerceRequest<Purchase>(`/orders/${id}`);setReceipt(order);
      if(order.status==="paid")setNotice(order.productId==="donation"?"Thank you. Your support payment is confirmed.":"Payment confirmed. Your pass is ready in the editor.");
    }
    return next;
  }
  useEffect(()=>{
    let mounted=true;
    void commerceRequest<Catalog>("/catalog").then((value)=>{if(mounted)setCatalog(value);}).catch((e)=>{if(mounted)setError(e.message);});
    void refresh(kind==="purchases").catch((e)=>{if(mounted && kind==="purchases")setError(e.message);});
    const focus=()=>{void refresh().catch(()=>null);};window.addEventListener("focus",focus);
    return()=>{mounted=false;window.removeEventListener("focus",focus);if(redirectTimer.current)clearTimeout(redirectTimer.current);};
  },[kind]);
  useEffect(()=>{if(error||notice){feedback.current?.focus({preventScroll:true});feedback.current?.scrollIntoView({block:"center",behavior:"smooth"});}},[error,notice]);
  useEffect(()=>{
    if(!checkout?.id)return;
    const id=checkout.id;
    const sync=()=>{void commerceRequest<Purchase>(`/orders/${id}`).then(async(order)=>{setCheckout(current=>current?.id===id?{...order,restoreCode:current.restoreCode}:current);await refresh();}).catch(()=>null);};
    window.addEventListener("pageshow",sync);window.addEventListener("focus",sync);
    return()=>{window.removeEventListener("pageshow",sync);window.removeEventListener("focus",sync);};
  },[checkout?.id]);
  async function buy(productId:string) {
    if(submitting.current||!form.current?.reportValidity())return;
    const payload=JSON.stringify({productId,email:email.trim(),...(productId==="donation"?{amountPaise:Number(amount)*100}:{})});
    if(attempt.current?.details!==payload)attempt.current={details:payload,key:crypto.randomUUID()};
    setError("");setNotice("");setBusy(true);setSelected(productId);submitting.current=true;
    try {
      await commerceRequest("/session",{method:"POST",body:"{}"});
      const order=await commerceRequest<Purchase>("/checkout",{method:"POST",body:payload,headers:{"Idempotency-Key":attempt.current.key}});
      setCheckout(order);
      const url=safeCheckoutUrl(order.checkoutUrl);
      if(order.status==="pending"&&url){redirectTimer.current=setTimeout(()=>{checkoutRegion.current?.focus();checkoutRegion.current?.scrollIntoView({block:"center"});window.location.assign(url);},200);}
      else if(order.status==="paid"){setNotice("This purchase is already confirmed. Check Your purchases or open the editor.");await refresh();}
      else setError("Your order was saved, but checkout is not ready. Check Your purchases before trying again.");
    }catch(e){setError(e instanceof Error?e.message:"Checkout failed. Check Your purchases before paying again.");}finally{setBusy(false);submitting.current=false;}
  }
  async function restorePurchase(event:React.FormEvent) {
    event.preventDefault();setError("");setBusy(true);
    try {await commerceRequest("/restore",{method:"POST",body:JSON.stringify({code:restore.trim()})});await refresh();setRestore("");setNotice("Purchase restored in this browser. Expired or refunded passes do not reactivate.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function showReceipt(id:string) {setError("");try{setReceipt(await commerceRequest<Purchase>(`/orders/${id}/receipt`));}catch(e){setError((e as Error).message);}}
  function saveReceipt(purchase:Purchase) {const url=URL.createObjectURL(new Blob([JSON.stringify(purchase,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`photoresizekaro-receipt-${purchase.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  return <div className="commerce-panel">
    <nav className="commerce-tabs" aria-label="Payments"><a href="/pricing" aria-current={kind==="plans"?"page":undefined}>₹5 / ₹10 passes</a><a href="/donate" aria-current={kind==="donate"?"page":undefined}>Donate from ₹5</a><a href="/purchases" aria-current={kind==="purchases"?"page":undefined}>Your purchases</a></nav>
    {catalog?.mode==="test" && <p className="payment-mode" role="status">TEST MODE — no real money is collected and test passes are not live purchases.</p>}
    {catalog?.mode==="disabled" && <p className="payment-mode">Checkout is not enabled yet. You can continue using the free editor.</p>}
    {access && access.features.length>0 && <p className="active-pass">Active: {access.features.includes("print")?"Print + ZIP":"ZIP"} pass · valid until {new Date(access.expiresAt!).toLocaleString()} <a href="/#editor">Open editor</a></p>}
    <div ref={feedback} tabIndex={-1} className="commerce-feedback">{error&&<p className="commerce-error" role="alert">{error}</p>}{notice&&<p className="commerce-notice" role="status">{notice}</p>}</div>
    {checkout&&<section ref={checkoutRegion} tabIndex={-1} className="checkout-ready checkout-primary" aria-labelledby="checkout-ready-title">
      <p className="checkout-step">SECURE CHECKOUT · {rupees(checkout.amountPaise)}</p>
      <h2 id="checkout-ready-title">{checkout.status==="paid"?"Payment confirmed":checkout.status==="pending"&&safeCheckoutUrl(checkout.checkoutUrl)?"Opening Razorpay checkout…":"Your order is saved"}</h2>
      <p>{checkout.status==="paid"?"Your purchase is saved in this browser.":checkout.status==="pending"&&safeCheckoutUrl(checkout.checkoutUrl)?"You’re being taken to Razorpay to pay securely. If it doesn’t open, use the button below.":"Checkout is not ready. View Your purchases for the latest status before making another payment."}</p>
      {checkout.status==="pending"&&safeCheckoutUrl(checkout.checkoutUrl)&&<a className="choose-button payment-continue" href={safeCheckoutUrl(checkout.checkoutUrl)!} rel="noreferrer">Continue to Razorpay — {rupees(checkout.amountPaise)} <span aria-hidden="true">→</span></a>}
      {checkout.status==="paid"&&checkout.productId!=="donation"&&<a className="choose-button payment-continue" href="/#editor">Open editor →</a>}
      <button className="clear-session payment-status-button" onClick={()=>{setError("");void commerceRequest<Purchase>(`/orders/${checkout.id}`).then(async(order)=>{setCheckout(current=>({...order,restoreCode:current?.restoreCode}));await refresh();setNotice(order.status==="paid"?"Payment confirmed. Your purchase is ready.":"Payment is still pending. Check Your purchases before paying again.");}).catch((e)=>setError(e.message));}}>I finished payment — check status</button>
      <a className="checkout-purchases" href="/purchases">View this purchase and payment status</a>
      <details className="checkout-recovery"><summary>Your restore code & order details</summary><p>Keep this private code to restore the purchase on another browser. It is also saved in Your purchases.</p><code className="restore-code">{checkout.restoreCode}</code><button className="back-to-photo" onClick={()=>{void (async()=>{try{await navigator.clipboard.writeText(checkout.restoreCode||"");setNotice("Restore code copied. Keep it private.");}catch{setNotice("Select and copy the restore code shown above.");}})();}}>Copy restore code</button><p className="payment-help">Order {checkout.id} · {rupees(checkout.amountPaise)}</p></details>
      <button className="back-to-photo" onClick={()=>{if(redirectTimer.current)clearTimeout(redirectTimer.current);setCheckout(null);setError("");setNotice("");}}>Choose a different {kind==="donate"?"amount":"plan"}</button>
    </section>}
    {kind!=="purchases" && !checkout && <form ref={form} className="checkout-form" onSubmit={(event)=>event.preventDefault()} aria-busy={busy}>
      <p className="checkout-instructions"><strong>1. Enter your email</strong><span>2. Choose a pass or support amount</span><span>3. Pay securely on Razorpay</span></p><label htmlFor="payment-email">Email for this payment <span>Required</span></label>
      <input id="payment-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="you@example.com" disabled={busy}/>
      <p className="payment-help">Your email is saved with the order and shared with Razorpay for payment communication. It is not a login or proof of ownership. Keep your restore code.</p>
      {kind==="plans"?<div className="plan-cards">{plans.map((plan)=><article className="plan-card" key={plan.id}><span className="plan-price">{rupees(plan.amountPaise)}<small>one time · 24 hours</small></span><h2>{plan.name}</h2><ul>{plan.id==="print-day"&&<li>Printable A4 photo-sheet PDF</li>}<li>Photo + signature in one ZIP download</li><li>Use the included tools during your pass</li><li>All image work stays on your device</li></ul>{plan.features.every(feature=>access?.features.includes(feature))?<a className="choose-button" href="/#editor">Pass active — open editor</a>:<button type="button" className="choose-button" disabled={busy||!catalog?.enabled} onClick={()=>void buy(plan.id)}>{busy&&selected===plan.id?"Opening secure checkout…":`Get ${plan.name} — ${rupees(plan.amountPaise)}`}</button>}</article>)}</div>:<section className="donation-options" aria-labelledby="donation-amount-title"><h2 id="donation-amount-title">Choose a support amount</h2><div className="donation-amounts">{[5,10,20,50,100].map((value)=><button key={value} type="button" aria-pressed={amount===String(value)} onClick={()=>setAmount(String(value))}>₹{value}</button>)}</div><label htmlFor="donation-amount">Amount in rupees · ₹5–₹1,000</label><input id="donation-amount" type="number" min="5" max="1000" step="1" required value={amount} onChange={(event)=>setAmount(event.target.value)}/><button type="button" className="choose-button" disabled={busy||!catalog?.donationsEnabled} onClick={()=>void buy("donation")}>{busy?"Opening secure checkout…":`Donate ₹${amount||"5"}`}</button>{catalog?.enabled&&!catalog.donationsEnabled&&<p className="payment-help">Support checkout is currently unavailable. Please try again later.</p>}<p className="payment-help">Voluntary support for this commercial tool. This is not a charitable or tax-deductible donation and does not buy a paid pass.</p></section>}
      {busy&&<p className="commerce-notice" role="status">Preparing your order. Razorpay will open here automatically—please wait.</p>}
      <p className="payment-help">Final app price is shown before payment. No automatic renewal. Razorpay opens automatically here after you select a pass or support amount. <a href="/refunds">Refund and delivery policy</a></p>
    </form>}
    {kind==="purchases"&&<><div className="purchase-toolbar"><p>Guest purchases use a payment-session cookie in this browser. Restore codes work across browsers; email alone cannot restore a pass.</p><button className="clear-session" disabled={busy} onClick={()=>{setError("");void refresh(true).catch((e)=>setError(e.message));}}>Refresh payment status</button></div>{access?.orders.length===0&&<p>No purchases in this browser yet.</p>}<div className="purchase-list">{access?.orders.map((order)=><article key={order.id}><div><h2>{order.productId==="donation"?"Voluntary support":plans.find((plan)=>plan.id===order.productId)?.name}</h2><p>{rupees(order.amountPaise)} · {order.status} · {order.mode}</p><small>Order {order.id}</small>{order.expiresAt&&<p>Pass expiry: {new Date(order.expiresAt).toLocaleString()}</p>}</div><div>{order.checkoutUrl&&<a href={order.checkoutUrl} target="_blank" rel="noopener noreferrer">Continue pending checkout</a>}<button className="back-to-photo" onClick={()=>void showReceipt(order.id)}>Receipt & restore code</button></div></article>)}</div></>}
    {receipt&&<section className="checkout-ready"><h2>Purchase details</h2><p>Order {receipt.id} · {receipt.status} · {rupees(receipt.amountPaise)}</p>{receipt.status==="paid"&&<p>{receipt.productId==="donation"?"Thank you for supporting the free tool.":"Your paid tools are available in the editor’s Review & download step."}</p>}{receipt.restoreCode&&<><code className="restore-code">{receipt.restoreCode}</code><button className="clear-session" onClick={()=>saveReceipt(receipt)}>Save payment acknowledgement</button></>}<p className="payment-help">This acknowledgement is not a GST tax invoice. For payment or delivery issues, email contact@photoresizekaro.in with the order reference.</p></section>}
    <section className="restore-purchase"><h2>Restore a purchase</h2><form onSubmit={(event)=>void restorePurchase(event)}><label htmlFor="restore-code">Private restore code</label><input id="restore-code" autoComplete="off" required value={restore} onChange={(event)=>setRestore(event.target.value)} placeholder="PRK-…"/><button className="choose-button" disabled={busy}>Restore purchase</button></form></section>

    <SellerContact/>
  </div>;
}
