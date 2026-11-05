"use client";

import { useEffect, useRef, useState } from "react";

type Session = { configured?: boolean; authenticated: boolean; username?: string; csrfToken?: string };
type Order = { id: string; product_id: string; mode: string; amount_paise: number; status: string; email: string; payment_id: string | null; created_at: string; paid_at: string | null; expires_at: string | null; refunded_paise: number };
type Dashboard = {
  days: number; page: number; totalOrders: number; pageSize: number;
  payments: { orders: number; captured_orders: number; captured_paise: number; refunded_paise: number; donations_paise: number; active_passes: number; afterRefundsPaise: number };
  usage: { enabled: boolean; activeNow: number; totals: Record<string, number>; trend: { day: string; event: string; count: number }[]; presets: { preset: string; count: number }[]; sizes: { size_bucket: string; dimension_bucket: string; count: number }[] };
  orders: Order[];
};
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value / 100);
const number = (value = 0) => new Intl.NumberFormat("en-IN").format(value);
const date = (value: string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const product = (id: string) => id === "zip-day" ? "ZIP Day Pass" : id === "print-day" ? "Print + ZIP Day Pass" : "Voluntary support";
const sizes: Record<string, string> = { none: "Not applicable", under_20kb: "Up to 20 KB", "20_50kb": "20–50 KB", "50_100kb": "50–100 KB", "100_200kb": "100–200 KB", "200_500kb": "200–500 KB", over_500kb: "Over 500 KB", up_to_300px: "Up to 300 px", "301_1000px": "301–1,000 px", over_1000px: "Over 1,000 px" };

class AdminError extends Error { constructor(message: string, public status: number) { super(message); } }
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/admin${path}`, { ...init, credentials: "same-origin", cache: "no-store", headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new AdminError(data?.error || "The admin service is unavailable. Try again shortly.", response.status);
  return data;
}

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null), [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [username, setUsername] = useState(""), [password, setPassword] = useState("");
  const [days, setDays] = useState("30"), [mode, setMode] = useState("live"), [status, setStatus] = useState("all"), [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [updated, setUpdated] = useState("");
  const generation = useRef(0), heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let mounted = true;
    void request<Session>("/session").then((value) => { if (mounted) setSession(value); }).catch((e) => { if (mounted) { setSession({ authenticated: false }); setError(e.message); } });
    return () => { mounted = false; generation.current++; };
  }, []);

  async function load() {
    const id = ++generation.current;
    setBusy(true); setError("");
    try {
      const data = await request<Dashboard>(`/dashboard?days=${days}&mode=${mode}&status=${status}&page=${page}`);
      if (id === generation.current) { setDashboard(data); setUpdated(new Date().toLocaleTimeString("en-IN")); }
    } catch (e) {
      if (id !== generation.current) return;
      if (e instanceof AdminError && e.status === 401) { setSession({ authenticated: false }); setDashboard(null); }
      setError((e as Error).message);
    } finally { if (id === generation.current) setBusy(false); }
  }
  useEffect(() => { if (session?.authenticated) void load(); }, [session?.authenticated, days, mode, status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function login(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { const next = await request<Session>("/login", { method: "POST", body: JSON.stringify({ username, password }) }); setSession(next); setPassword(""); setTimeout(() => heading.current?.focus(), 0); }
    catch (e) { setPassword(""); setError((e as Error).message); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await request("/logout", { method: "POST", headers: { "X-CSRF-Token": session?.csrfToken || "" }, body: "{}" }); generation.current++; setDashboard(null); setSession({ authenticated: false }); }
    catch (e) { if (e instanceof AdminError && e.status === 401) { generation.current++; setDashboard(null); setSession({ authenticated: false }); } else setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const totals = dashboard?.usage.totals || {};
  const trend = new Map<string, { visits: number; processed: number }>();
  for (const row of dashboard?.usage.trend || []) {
    const value = trend.get(row.day) || { visits: 0, processed: 0 };
    if (row.event === "visit") value.visits += row.count;
    if (row.event === "image_processed") value.processed += row.count;
    trend.set(row.day, value);
  }
  const activity = [...trend].sort(([a], [b]) => a.localeCompare(b)).slice(-14), maximum = Math.max(1, ...activity.map(([, value]) => Math.max(value.visits, value.processed)));
  const lastPage = dashboard ? Math.max(1, Math.ceil(dashboard.totalOrders / dashboard.pageSize)) : 1;

  return <main className="admin-shell">
    <header className="admin-header"><div><a href="/" className="admin-brand">PhotoResizeKaro<span>.</span></a><p>MGRRNTECH · Owner dashboard</p></div>{session?.authenticated && <div className="admin-account"><span>Signed in as {session.username}</span><button type="button" onClick={() => void logout()} disabled={busy}>Sign out</button></div>}</header>
    {session === null ? <p role="status" className="admin-loading">Checking your session…</p> : !session.authenticated ? <section className="admin-login" aria-labelledby="admin-login-title">
      <span className="admin-eyebrow">OWNER ACCESS</span><h1 id="admin-login-title">Sign in to your dashboard</h1><p>View payments and anonymous tool activity in one place.</p>
      {session.configured === false ? <p className="commerce-error">Admin access has not been configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in the server’s private .env.api file, run the migration and recreate the API.</p> : <form onSubmit={(event) => void login(event)}>
        <label htmlFor="admin-username">Username</label><input id="admin-username" autoComplete="username" required maxLength={64} value={username} onChange={(event) => setUsername(event.target.value)} disabled={busy}/>
        <label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy}/>
        <button className="choose-button" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in securely →"}</button>
      </form>}<p className="admin-footnote">For the site owner only. The server expires inactive sessions after 30 minutes, with an absolute limit of 8 hours.</p>
    </section> : <>
      <div className="admin-title"><div><span className="admin-eyebrow">YOUR BUSINESS AT A GLANCE</span><h1 ref={heading} tabIndex={-1}>Payments & tool activity</h1><p>{updated ? `Last updated ${updated}` : "Loading your dashboard…"}</p></div><button type="button" className="choose-button" onClick={() => void load()} disabled={busy}>{busy ? "Refreshing…" : "Refresh dashboard"}</button></div>
      <div className="admin-filters"><label>Period<select value={days} onChange={(event) => { setDays(event.target.value); setPage(1); }}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 365 days</option></select></label><label>Payment mode<select value={mode} onChange={(event) => { setMode(event.target.value); setPage(1); }}><option value="live">Live payments</option><option value="test">Test payments</option><option value="all">Live + test</option></select></label><p>Reporting days use UTC. Usage counts include all public tool activity.</p></div>
      {dashboard && <div aria-busy={busy}>
        <section aria-labelledby="admin-payments-title"><div className="admin-section-heading"><h2 id="admin-payments-title">Payments</h2><span>{mode === "test" ? "TEST DATA — not revenue" : mode === "all" ? "Includes simulated test amounts" : "Live payment records"}</span></div>
          <div className="admin-metrics">{[
            ["Captured payments", money(dashboard.payments.captured_paise), `${number(dashboard.payments.captured_orders)} confirmed orders`],
            ["Refunds", money(dashboard.payments.refunded_paise), "Recorded refunded amounts"],
            ["After refunds", money(dashboard.payments.afterRefundsPaise), "Before provider fees, tax and other costs"],
            ["Voluntary support", money(dashboard.payments.donations_paise), "Captured support included in payments"]
          ].map(([title, value, note]) => <article className="admin-metric" key={title}><h3>{title}</h3><strong>{value}</strong><p>{note}</p></article>)}</div>
        </section>
        <section aria-labelledby="admin-usage-title"><div className="admin-section-heading"><h2 id="admin-usage-title">How the tools are used</h2><span>{dashboard.usage.enabled ? "Anonymous first-party counters" : "Collection disabled"}</span></div>
          <div className="admin-metrics usage-metrics">{[
            ["Browser visits", totals.visit || 0, "A tab session counted once per UTC day"], ["Active in last 5 min", dashboard.usage.activeNow, "Browser sessions with recent activity"],
            ["Images processed", totals.image_processed || 0, "Completed results that passed checks"], ["Crops completed", totals.crop_completed || 0, "Successful outputs with a cropped area"],
            ["Image downloads", totals.download || 0, "Free image download clicks"], ["ZIP / PDF downloads", (totals.zip_download || 0) + (totals.print_download || 0), "Paid exports prepared successfully"]
          ].map(([title, value, note]) => <article className="admin-metric" key={String(title)}><h3>{title}</h3><strong>{number(Number(value))}</strong><p>{note}</p></article>)}</div>
          <p className="admin-footnote">These are usage estimates, not a count of identifiable people. Opt-outs, blocked requests and bots affect totals. Collection starts with this release; earlier visits and crops are unavailable. No images, filenames, IP addresses or payment emails are stored in usage counters.</p>
          <div className="admin-detail-grid"><article className="admin-card"><h3>Recent daily activity</h3><p>Visits <span className="chart-key visits-key"/> · processed images <span className="chart-key images-key"/></p>{activity.length ? <div className="activity-chart">{activity.map(([day, value]) => <div className="activity-row" key={day}><span>{new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</span><div><div className="activity-bar visits-bar" style={{ width: `${Math.max(1, value.visits / maximum * 100)}%` }} aria-label={`${value.visits} visits`}/><div className="activity-bar images-bar" style={{ width: `${Math.max(1, value.processed / maximum * 100)}%` }} aria-label={`${value.processed} processed images`}/></div><small>{value.visits} / {value.processed}</small></div>)}</div> : <p className="admin-empty">Activity will appear after visitors use the tools.</p>}</article>
            <article className="admin-card"><h3>Popular presets</h3>{dashboard.usage.presets.length ? <ul className="admin-ranking">{dashboard.usage.presets.map((row) => <li key={row.preset}><span>{row.preset === "custom" ? "Custom settings" : row.preset.replaceAll("-", " ")}</span><strong>{number(row.count)}</strong></li>)}</ul> : <p className="admin-empty">No completed images in this period.</p>}</article>
            <article className="admin-card"><h3>Output sizes</h3><p>Successful processed images · broad size ranges only</p>{dashboard.usage.sizes.length ? <ul className="admin-ranking">{dashboard.usage.sizes.map((row) => <li key={`${row.size_bucket}:${row.dimension_bucket}`}><span>{sizes[row.size_bucket]}<small>{sizes[row.dimension_bucket]} longest side</small></span><strong>{number(row.count)}</strong></li>)}</ul> : <p className="admin-empty">Size ranges will appear after processing.</p>}</article>
          </div>
        </section>
        <section aria-labelledby="admin-orders-title" className="admin-orders"><div className="admin-section-heading"><div><h2 id="admin-orders-title">Payment records</h2><p>{number(dashboard.totalOrders)} matching orders · {number(dashboard.payments.active_passes)} active passes from orders in this period</p></div><label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{["all", "paid", "pending", "creating", "failed", "refunded", "disputed", "cancelled", "expired"].map((value) => <option value={value} key={value}>{value === "all" ? "All statuses" : value}</option>)}</select></label></div>
          {dashboard.orders.length ? <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Payment records, scroll horizontally on small screens"><table><thead><tr><th scope="col">Date / order</th><th scope="col">Customer / product</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Payment reference</th></tr></thead><tbody>{dashboard.orders.map((order) => <tr key={order.id}><td>{date(order.created_at)}<small>{order.id}</small></td><td>{order.email}<small>{product(order.product_id)} · {order.mode}</small></td><td>{money(order.amount_paise)}{order.refunded_paise > 0 && <small>Refunded {money(order.refunded_paise)}</small>}</td><td><span className={`order-status status-${order.status}`}>{order.status}</span>{order.expires_at && <small>Expiry {date(order.expires_at)}</small>}</td><td>{order.payment_id || "Not captured yet"}{order.paid_at && <small>Confirmed {date(order.paid_at)}</small>}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No payments match these filters.</p>}
          <div className="admin-pagination"><button type="button" disabled={busy || page <= 1} onClick={() => setPage((value) => value - 1)}>← Previous</button><span>Page {page} of {lastPage}</span><button type="button" disabled={busy || page >= lastPage} onClick={() => setPage((value) => value + 1)}>Next →</button></div>
        </section>
      </div>}
    </>}
    {error && <p className="commerce-error admin-error" role="alert">{error}</p>}
    <footer className="admin-footer"><span>Private owner access · financial and customer records</span><a href="/">Open public website ↗</a></footer>
  </main>;
}
