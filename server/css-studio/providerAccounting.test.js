import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QuotaLedger } from "./quota.js";
import { createIdentity } from "./identity.js";
import { createApp } from "./http.js";
import {
  createCloudflareProvider,
  CLOUDFLARE_THEME_PLAN,
} from "./cloudflareProvider.js";
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(Date.UTC(2026, 9, 27, 12)); });
afterEach(() => vi.useRealTimers());
it("retains the full provider charge and closes durable admission after an interrupted response", async () => {
  const db = new DatabaseSync(":memory:");
  const store = {
    sql: {
      exec(query, ...args) {
        return { toArray: () => db.prepare(query).all(...args) };
      },
    },
    transactionSync(work) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = work();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  try {
    const ledger = new QuotaLedger(store);
    const secret = "ab".repeat(32),
      origin = "https://studio.test";
    const cookie = (await createIdentity(secret).issue()).cookie.split(";")[0];
    const ai = {
      run: vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.error(Error("private upstream transport detail"));
              },
            }),
          ),
      ),
    };
    const app = createApp({
      origin,
      secret,
      ledger,
      provider: createCloudflareProvider(ai),
      policy: CLOUDFLARE_THEME_PLAN,
    });
    const request = () =>
      new Request(origin + "/api/css-studio/propose", {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: cookie,
          "X-CSS-Studio": "1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          operation: "theme",
          prompt: "Autumn",
          history: [],
          context: {
            family: "seasons",
            id: "fall",
            mode: "light",
            contrast: false,
          },
        }),
      });
    const failed = await app(request());
    expect(failed.status).toBe(504);
    expect(await failed.text()).not.toMatch(/private upstream/);
    const status = await app(
      new Request(origin + "/api/css-studio/status", {
        headers: { Cookie: cookie },
      }),
    );
    const snapshot = await status.json();
    expect(snapshot.available).toBe(false);
    expect(snapshot.sharedRemaining).toBe(7000);
    expect(snapshot.remaining.prompts).toBe(9);
    expect((await app(request())).status).toBe(503);
    expect(ai.run).toHaveBeenCalledOnce();
  } finally {
    db.close();
  }
});
