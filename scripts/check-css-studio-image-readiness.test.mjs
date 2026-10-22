// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import {
  checkImageReadiness,
  ImageReadinessError,
} from "./check-css-studio-image-readiness.mjs";

const token = "fixture-cloudflare-readiness-token";
const prefix =
  "https://api.cloudflare.com/client/v4/accounts/d33da711f0acb00005de85f10c11ab0f";
const urls = [
  `${prefix}/subscriptions`,
  `${prefix}/workers/scripts/css-studio-ai/settings`,
];
const now = () => Date.UTC(2026, 9, 21, 15);
const settings = {
  bindings: [
    { name: "AI", type: "ai" },
    {
      name: "QUOTA",
      type: "durable_object_namespace",
      namespace_id: "private-namespace",
      class_name: "QuotaAuthority",
    },
    { name: "IMAGES", type: "images", private_value: "private-images" },
    { name: "IDENTITY_SECRET", type: "secret_text", text: "private-identity" },
  ],
};
const subscriptions = [
  {
    id: "private-subscription-id",
    price: 0,
    currency: "USD",
    customer_email: "private@example.com",
    rate_plan: {
      id: "free",
      public_name: "Images Free",
      private: "private-plan",
    },
  },
];
const json = (result) => Response.json({ success: true, result });
function fixture({
  billing = () => json(subscriptions),
  worker = () => json(settings),
} = {}) {
  return {
    fetch: vi.fn(async (url, options) =>
      url === urls[0] ? billing(url, options) : worker(url, options),
    ),
    write: vi.fn(async () => {}),
    log: vi.fn(),
  };
}
const check = (f, options = {}) =>
  checkImageReadiness({ token, now, ...f, ...options });
afterEach(() => vi.useRealTimers());

it("makes exactly two fixed GETs and retains only safe product names and binding flags", async () => {
  const f = fixture();
  const result = await check(f);
  expect(f.fetch.mock.calls.map(([url]) => url)).toEqual(urls);
  for (const [, options] of f.fetch.mock.calls) {
    expect(options).toMatchObject({
      method: "GET",
      redirect: "error",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    expect(options.body).toBeUndefined();
    expect(options.signal).toBeInstanceOf(AbortSignal);
  }
  expect(result).toMatchObject({
    observedAt: "2026-10-21T15:00:00.000Z",
    billingVisibility: "visible",
    imagesPlan: "unknown",
    safeSubscriptions: [{ productId: "free", productName: "Images Free" }],
    readyForTransform: false,
    inferencePerformed: false,
    transformationPerformed: false,
    deploymentPerformed: false,
    bindingChangesPerformed: false,
    worker: {
      name: "css-studio-ai",
      settingsVisibility: "visible",
      anyImagesBinding: true,
      bindings: {
        AI: { present: true, available: true, expectedType: "ai" },
        QUOTA: { present: true, available: true },
        IMAGES: { present: true, available: true, expectedType: "images" },
      },
    },
  });
  expect(f.write).toHaveBeenCalledExactlyOnceWith(result);
  const retained = JSON.stringify([result, f.log.mock.calls]);
  expect(retained).not.toMatch(
    /private|namespace_id|IDENTITY_SECRET|Authorization|Bearer|customer_email|currency|price/,
  );
  expect(retained).not.toContain(token);
});

it("continues after subscriptions 403 without reading or retaining its error body", async () => {
  const denied = new Response(`private error ${token}`, { status: 403 });
  const text = vi.spyOn(denied, "text");
  const f = fixture({ billing: () => denied });
  const result = await check(f);
  expect(result.billingVisibility).toBe("forbidden");
  expect(result.imagesPlan).toBe("unknown");
  expect(result.safeSubscriptions).toEqual([]);
  expect(result.worker.bindings.IMAGES.available).toBe(true);
  expect(f.fetch).toHaveBeenCalledTimes(2);
  expect(text).not.toHaveBeenCalled();
  expect(JSON.stringify([result, f.log.mock.calls])).not.toContain(token);
});

it.each([401, 404, 429, 500, 302])(
  "records HTTP %s as unavailable without retrying or parsing an error body",
  async (status) => {
    const response = new Response("private error", { status });
    const text = vi.spyOn(response, "text");
    const f = fixture({ billing: () => response });
    const result = await check(f);
    expect(result.billingVisibility).toBe("unavailable");
    expect(result.imagesPlan).toBe("unknown");
    expect(f.fetch).toHaveBeenCalledTimes(2);
    expect(text).not.toHaveBeenCalled();
  },
);

it.each([
  { result: [] },
  { result: [{ price: 0 }] },
  { result: [{ rate_plan: { id: "free" } }] },
  { result: [{ plan: "Images Free" }] },
])(
  "never infers a Free plan from absent, zero-price, or ambiguous subscription data",
  async ({ result }) => {
    const f = fixture({ billing: () => json(result) });
    expect((await check(f)).imagesPlan).toBe("unknown");
  },
);

it("drops unsafe or oversized product fields and bounds the projected subscription list", async () => {
  const f = fixture({
    billing: () =>
      json([
        {
          rate_plan: {
            id: "x".repeat(101),
            public_name: "private@example.com",
          },
        },
        { rate_plan: { id: "bad\nvalue", public_name: "bad\u0000name" } },
        ...Array.from({ length: 100 }, () => ({
          rate_plan: { id: "safe", public_name: "Images" },
        })),
      ]),
  });
  const result = await check(f);
  expect(result.safeSubscriptions.length).toBeLessThanOrEqual(64);
  expect(
    result.safeSubscriptions.every(
      (row) => row.productId === "safe" && row.productName === "Images",
    ),
  ).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/private@example|bad|x{101}/);
});

it("records missing, mistyped, and duplicate binding names without retaining configuration", async () => {
  const f = fixture({
    worker: () =>
      json({
        bindings: [
          { name: "AI", type: "plain_text", text: "private-config" },
          { name: "QUOTA", type: "durable_object_namespace" },
          { name: "QUOTA", type: "durable_object_namespace" },
          { name: "OTHER_IMAGES", type: "images" },
        ],
      }),
  });
  const result = await check(f);
  expect(result.worker.bindings.AI).toMatchObject({
    present: true,
    available: false,
  });
  expect(result.worker.bindings.QUOTA.available).toBe(false);
  expect(result.worker.bindings.IMAGES).toMatchObject({
    present: false,
    available: false,
  });
  expect(result.worker.anyImagesBinding).toBe(true);
  expect(JSON.stringify(result)).not.toContain("private-config");
});

it("fails closed on malformed, oversized, or rejected successful responses", async () => {
  for (const billing of [
    () => new Response("not JSON"),
    () => new Response("x".repeat(65537)),
    () => Response.json({ success: false, result: [] }),
    () => json({ unknown: "value" }),
  ]) {
    const f = fixture({ billing });
    const result = await check(f);
    expect(result.billingVisibility).toBe("unavailable");
    expect(result.imagesPlan).toBe("unknown");
    expect(result.worker.bindings.IMAGES.available).toBe(true);
  }
  for (const worker of [
    () => new Response("not JSON"),
    () => new Response("x".repeat(65537)),
    () => json({ bindings: "invalid" }),
    () => new Response("private error", { status: 403 }),
  ]) {
    const result = await check(fixture({ worker }));
    expect(result.worker.settingsVisibility).not.toBe("visible");
    expect(result.worker.bindings.IMAGES.available).toBe(false);
    expect(result.readyForTransform).toBe(false);
  }
});

it.each(["billing", "worker"])(
  "rejects credential echoes in successful %s responses before publishing",
  async (where) => {
    const f = fixture(
      where === "billing"
        ? { billing: () => json([{ rate_plan: { public_name: token } }]) }
        : { worker: () => json({ ...settings, private_echo: token }) },
    );
    await expect(check(f)).rejects.toBeInstanceOf(ImageReadinessError);
    expect(f.write).not.toHaveBeenCalled();
    expect(JSON.stringify(f.log.mock.calls)).not.toContain(token);
  },
);

it("bounds each complete GET to 15 seconds and continues after a timed-out subscription read", async () => {
  vi.useFakeTimers();
  const f = fixture({ billing: () => new Promise(() => {}) });
  const pending = check(f);
  await vi.advanceTimersByTimeAsync(15000);
  const result = await pending;
  expect(result.billingVisibility).toBe("unavailable");
  expect(result.worker.settingsVisibility).toBe("visible");
  expect(f.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(f.fetch).toHaveBeenCalledTimes(2);
});

it("also bounds stalled body reads and reports transport failures without upstream details", async () => {
  vi.useFakeTimers();
  const f = fixture({
    billing: () => new Response(new ReadableStream({ start() {} })),
  });
  const pending = check(f);
  await vi.advanceTimersByTimeAsync(15000);
  expect((await pending).billingVisibility).toBe("unavailable");
  const failed = fixture({
    billing: () => {
      throw Error(`private ${token}`);
    },
  });
  const result = await check(failed);
  expect(result.billingVisibility).toBe("unavailable");
  expect(JSON.stringify([result, failed.log.mock.calls])).not.toMatch(
    /private|fixture-cloudflare/,
  );
});

it("uses one shared deadline for fetch latency and the remaining body read", async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const f = fixture({
    billing: () =>
      new Promise((resolve) => {
        setTimeout(
          () =>
            resolve(new Response(new ReadableStream({ start() {}, cancel }))),
          7000,
        );
      }),
  });
  const pending = check(f);
  await vi.advanceTimersByTimeAsync(14999);
  expect(f.fetch).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1);
  expect((await pending).billingVisibility).toBe("unavailable");
  expect(f.fetch).toHaveBeenCalledTimes(2);
  expect(cancel).toHaveBeenCalledOnce();
});

it("rejects invalid credentials before network access and sanitizes artifact failures", async () => {
  const f = fixture();
  for (const value of ["", "bad whitespace", "\n"]) {
    await expect(check(f, { token: value })).rejects.toBeInstanceOf(
      ImageReadinessError,
    );
  }
  expect(f.fetch).not.toHaveBeenCalled();
  await expect(
    check(f, {
      write: async () => {
        throw Error(`private ${token}`);
      },
    }),
  ).rejects.toThrow("artifact");
  expect(JSON.stringify(f.log.mock.calls)).not.toContain(token);
});
