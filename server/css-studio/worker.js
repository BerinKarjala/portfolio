import { QuotaLedger } from "./quota.js";
import { createApp } from "./http.js";
import { readJson } from "./protocol.js";
import {
  createCloudflareProvider,
  CLOUDFLARE_THEME_PLAN,
} from "./cloudflareProvider.js";
import { createGptProvider, GPT_THEME_PLAN } from "./gptProvider.js";
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
// Public requests remain unavailable. The private canary is for bounded evaluation
// through the same identity, admission, durable accounting and validation path.
// A generic enable flag cannot expose inference to visitors.
export default {
  fetch(request, env) {
    const canary =
      typeof env.CANARY_SECRET === "string" &&
      /^[0-9a-f]{64}$/.test(env.CANARY_SECRET) &&
      request.headers.get("X-CSS-Studio-Canary") === env.CANARY_SECRET;
    const origin =
      canary &&
      env.CANARY_APP_ORIGIN &&
      request.headers.get("Origin") === env.CANARY_APP_ORIGIN
        ? env.CANARY_APP_ORIGIN
        : env.APP_ORIGIN;
    let selected = {};
    if (canary) {
      const configuredModel =
        env.CANARY_MODEL === undefined ? "llama" : env.CANARY_MODEL;
      const model =
        request.headers.get("X-CSS-Studio-Canary-Model") ?? configuredModel;
      const approvedConfiguration = ["llama", "gpt-oss-20b"].includes(
        configuredModel,
      );
      if (approvedConfiguration && model === "llama")
        selected = {
          provider: createCloudflareProvider(env.AI),
          policy: CLOUDFLARE_THEME_PLAN,
        };
      else if (approvedConfiguration && model === "gpt-oss-20b")
        selected = {
          provider: createGptProvider(env.AI),
          policy: GPT_THEME_PLAN,
        };
    }
    return createApp({
      origin,
      endpointOrigin: env.ENDPOINT_ORIGIN || env.APP_ORIGIN,
      secret: env.IDENTITY_SECRET,
      ledger: env.QUOTA ? quotaClient(env.QUOTA) : undefined,
      ...selected,
    })(request);
  },
};
