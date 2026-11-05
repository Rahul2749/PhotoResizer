import plans from "../../shared/products.json";
export { plans };
export type Access = { mode: "disabled" | "test" | "live"; features: string[]; expiresAt: string | null; orders: Purchase[] };
export type Purchase = { id: string; productId: string; mode: string; amountPaise: number; currency: string; status: string; createdAt: string; paidAt: string | null; expiresAt: string | null; refundedPaise: number; paymentId: string | null; checkoutUrl: string | null; restoreCode?: string; email?: string };
export type Catalog = { mode: string; enabled: boolean; donationsEnabled: boolean };
export async function commerceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/commerce${path}`, { ...init, credentials: "same-origin", cache: "no-store", headers: { ...(init.body ? { "Content-Type":"application/json" } : {}), ...init.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Payments are temporarily unavailable. The free editor is available.");
  return data;
}
export const rupees = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount / 100);
