import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ApiError } from "./security.mjs";

const rules = JSON.parse(await readFile(new URL("../shared/usage.json", import.meta.url), "utf8"));
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export class UsageService {
  constructor(store, config) { this.store = store; this.config = config; }

  async record(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !["eventId", "visitId", "event", "tool", "preset", "sizeBucket", "dimensionBucket"].includes(key))) throw new ApiError(400, "Send anonymous usage counters only.");
    if (typeof input.eventId !== "string" || typeof input.visitId !== "string" || !uuid.test(input.eventId) || !uuid.test(input.visitId) || !rules.events.includes(input.event) || !rules.tools.includes(input.tool) || !rules.presets.includes(input.preset) || !rules.sizeBuckets.includes(input.sizeBucket) || !rules.dimensionBuckets.includes(input.dimensionBucket)) throw new ApiError(400, "Invalid usage counter.");
    if (input.event === "page_view" && (input.tool !== "site" || input.preset !== "custom" || input.sizeBucket !== "none" || input.dimensionBucket !== "none")) throw new ApiError(400, "Invalid page counter.");
    if (!this.config.usageEnabled) return;
    const day = new Date().toISOString().slice(0, 10);
    const digest = (purpose, value) => createHmac("sha256", this.config.key).update(`usage:${purpose}:${day}:${value}`).digest("hex");
    await this.store.transaction(async (client) => {
      const inserted = await client.query("INSERT INTO prk_usage_events(event_hash) VALUES($1) ON CONFLICT DO NOTHING RETURNING event_hash", [digest("event", input.eventId)]);
      if (!inserted.rowCount) return;
      const visitorHash = digest("visit", input.visitId);
      const visit = await client.query("INSERT INTO prk_usage_visits(day,visitor_hash) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING visitor_hash", [day, visitorHash]);
      if (!visit.rowCount) await client.query("UPDATE prk_usage_visits SET last_seen_at=now() WHERE day=$1 AND visitor_hash=$2", [day, visitorHash]);
      const increment = (event, tool, preset, size, dimension) => client.query("INSERT INTO prk_usage_totals(day,event,tool,preset,size_bucket,dimension_bucket,count) VALUES($1,$2,$3,$4,$5,$6,1) ON CONFLICT(day,event,tool,preset,size_bucket,dimension_bucket) DO UPDATE SET count=prk_usage_totals.count+1", [day, event, tool, preset, size, dimension]);
      if (visit.rowCount) await increment("visit", "site", "custom", "none", "none");
      await increment(input.event, input.tool, input.preset, input.sizeBucket, input.dimensionBucket);
    });
  }

  async cleanup() {
    await this.store.pool.query("DELETE FROM prk_usage_events WHERE created_at<now()-interval '2 days'");
    await this.store.pool.query("DELETE FROM prk_usage_visits WHERE day<(now() AT TIME ZONE 'UTC')::date-1");
    await this.store.pool.query("DELETE FROM prk_admin_sessions WHERE expires_at<now() OR last_seen_at<now()-interval '30 minutes'");
  }
}
