import { expect, it, vi } from "vitest";
import { runCanary } from "./check-css-studio-canary.mjs";
const secret = "ab".repeat(32);
const now = () => Date.UTC(2026, 9, 21, 12);
function fixture({
  publicReady = false,
  budget = 8000,
  failure = false,
  rollover = false,
  sessionCookie = "__Host-css-studio=private-cookie; Path=/; Secure; HttpOnly; SameSite=Strict",
} = {}) {
  let prompts = 10,
    shared = budget,
    submissions = 0,
    statuses = 0;
  const fetch = vi.fn(async (url, options = {}) => {
    const path = new URL(url).pathname;
    if (options.headers.get("X-CSS-Studio-Canary") !== secret)
      return Response.json(
        { available: publicReady },
        { headers: { "Cache-Control": "no-store" } },
      );
    if (path.endsWith("/session"))
      return Response.json(
        { available: true },
        {
          headers: {
            "Set-Cookie": sessionCookie,
            "Cache-Control": "no-store",
          },
        },
      );
    expect(options.headers.get("Cookie")).toBe(
      "__Host-css-studio=private-cookie",
    );
    expect(options.headers.get("Origin")).toBe(
      "https://berinkarjala.netlify.app",
    );
    expect(options.redirect).toBe("error");
    if (path.endsWith("/status")) {
      statuses++;
      return Response.json(
        {
          available: shared > 0,
          operations: shared > 0 ? ["theme"] : [],
          day: rollover && statuses > 1 ? "2026-10-22" : "2026-10-21",
          remaining: { prompts, images: 3 },
          sharedRemaining: shared,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    submissions++;
    prompts--;
    shared -= 1000;
    if (failure)
      return new Response("private upstream detail", { status: 502 });
    const input = JSON.parse(options.body);
    return Response.json(
      {
        requestId: input.id,
        message: "Private model output",
        overrides: { accent: "#166534" },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
  return { fetch, submissions: () => submissions };
}
it("runs exactly two quota-accounted fixtures, waits for burst protection and prints only summary data", async () => {
  const f = fixture(),
    log = vi.fn(),
    sleep = vi.fn(async () => {});
  const result = await runCanary({ secret, fetch: f.fetch, now, sleep, log });
  expect(f.submissions()).toBe(2);
  expect(sleep).toHaveBeenCalledExactlyOnceWith(5100);
  expect(result).toMatchObject({
    calls: 2,
    reservedNeurons: 2000,
    sharedRemaining: 6000,
  });
  expect(JSON.stringify(log.mock.calls)).not.toMatch(
    /private-cookie|Private model output|abababab/,
  );
});
it("fails before inference if public access is enabled or the shared budget is insufficient", async () => {
  for (const options of [{ publicReady: true }, { budget: 1999 }]) {
    const f = fixture(options);
    await expect(
      runCanary({
        secret,
        fetch: f.fetch,
        now,
        sleep: async () => {},
        log: () => {},
      }),
    ).rejects.toThrow();
    expect(f.submissions()).toBe(0);
  }
});
it("never retries a failed provider request or continues after a UTC rollover", async () => {
  for (const options of [{ failure: true }, { rollover: true }]) {
    const f = fixture(options);
    await expect(
      runCanary({
        secret,
        fetch: f.fetch,
        now,
        sleep: async () => {},
        log: () => {},
      }),
    ).rejects.toThrow();
    expect(f.submissions()).toBe(1);
  }
});
it("does not start close to midnight or with a malformed canary credential", async () => {
  const fetch = vi.fn();
  await expect(
    runCanary({ secret, fetch, now: () => Date.UTC(2026, 9, 21, 23, 59) }),
  ).rejects.toThrow(/midnight/i);
  await expect(runCanary({ secret: "invalid", fetch, now })).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

it("requires the browser-valid host cookie path and no Domain", async () => {
  for (const sessionCookie of [
    "__Host-css-studio=private-cookie; Path=/other; Secure; HttpOnly; SameSite=Strict",
    "__Host-css-studio=private-cookie; Path=/; Domain=example.test; Secure; HttpOnly; SameSite=Strict",
  ]) {
    const f = fixture({ sessionCookie });
    await expect(
      runCanary({
        secret,
        fetch: f.fetch,
        now,
        sleep: async () => {},
        log: () => {},
      }),
    ).rejects.toThrow(/cookie/i);
    expect(f.submissions()).toBe(0);
  }
});
