import { QuotaLedger } from "./quota.js";
import { createApp } from "./http.js";
import { readJson } from "./protocol.js";
export const AUTHORITY_NAME = "css-studio-global-v1";
export class QuotaAuthority {
  constructor(ctx) {
    this.ledger = new QuotaLedger(ctx.storage);
  }
  async fetch(request) {
    if (
      request.method !== "POST" ||
      new URL(request.url).origin !== "https://quota.internal"
    )
      return new Response(null, { status: 404 });
    try {
      const { action, value } = await readJson(request, 4096);
      if (!["reserve", "settle", "snapshot"].includes(action))
        return new Response(null, { status: 400 });
      const result = this.ledger[action](value);
      return Response.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return Response.json(
        { error: "Quota storage unavailable." },
        { status: 503 },
      );
    }
  }
}
export function quotaClient(namespace) {
  async function call(action, value) {
    const stub = namespace.get(namespace.idFromName(AUTHORITY_NAME));
    const response = await stub.fetch("https://quota.internal/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, value }),
    });
    if (!response.ok) throw Error("Quota authority unavailable");
    return response.json();
  }
  return {
    reserve: (value) => call("reserve", value),
    settle: (value) => call("settle", value),
    snapshot: (value) => call("snapshot", value),
  };
}
// Intentionally no AI binding, provider adapter, model selection or enable environment flag.
// Account eligibility, cost bounds and media ownership must be verified before adding a live plan.
export default {
  fetch(request, env) {
    return createApp({
      origin: env.APP_ORIGIN,
      endpointOrigin: env.ENDPOINT_ORIGIN || env.APP_ORIGIN,
      secret: env.IDENTITY_SECRET,
      ledger: env.QUOTA ? quotaClient(env.QUOTA) : undefined,
    })(request);
  },
};
