export class RazorpayGateway {
  constructor(config) { this.config = config; }
  async request(path, body) {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method: body ? "POST" : "GET", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error("payment_provider_request_failed");
    return response.json();
  }
  createLink(order, email) { return this.request("/payment_links", { amount: order.amount_paise, currency: "INR", accept_partial: false, reference_id: order.id, description: order.product_id === "donation" ? "Voluntary support for PhotoResizeKaro" : `PhotoResizeKaro ${order.product_id === "zip-day" ? "ZIP" : "Print + ZIP"} 24-hour pass`, customer: { email }, notify: { email: true, sms: false }, reminder_enable: false, expire_by: Math.floor(Date.now()/1000)+3600, callback_url: `${this.config.origin}/api/commerce/return`, callback_method: "get" }); }
  fetchLink(id) { if (!/^plink_[a-zA-Z0-9]+$/.test(id)) throw new Error("Invalid provider link ID."); return this.request(`/payment_links/${encodeURIComponent(id)}`); }
  fetchPayment(id) { if (!/^pay_[a-zA-Z0-9]+$/.test(id)) throw new Error("Invalid provider payment ID."); return this.request(`/payments/${encodeURIComponent(id)}`); }
  async findLink(reference) { const result=await this.request(`/payment_links?reference_id=${encodeURIComponent(reference)}`);const links=(result.payment_links || []).filter((link)=>link.reference_id===reference);if(links.length>1)throw new Error("Ambiguous provider reference.");return links[0] || null; }
  async orderPayments(id) { if(!/^order_[a-zA-Z0-9]+$/.test(id))throw new Error("Invalid provider order ID.");return (await this.request(`/orders/${encodeURIComponent(id)}/payments`)).items || []; }
}
