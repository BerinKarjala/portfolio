import { expect, it, vi } from "vitest";
import { GptCheckError, runGptCheck } from "./check-css-studio-gpt.mjs";
const secret = "ab".repeat(32);
const now = () => Date.UTC(2026, 9, 21, 12);
const cookieValue = "private-session-cookie";
const cookie = `__Host-css-studio=${cookieValue}`;
const sessionCookie = `${cookie}; Path=/; Secure; HttpOnly; SameSite=Strict`;
function fixture({
  budget = 6000,
  prompts = 10,
  publicReady = false,
  rollover = false,
  failure,
  charge = 4000,
  responseChange = (value) => value,
  issuedCookie = sessionCookie,
} = {}) {
  let shared = budget,
    remainingPrompts = prompts,
    submissions = 0,
    statuses = 0;
  const fetch = vi.fn(async (url, options) => {
    expect(new URL(url).origin).toBe(
      "https://css-studio-ai.berin-karjala.workers.dev",
    );
    expect(options.redirect).toBe("error");
    expect(options.headers.get("Origin")).toBe(
      "https://berinkarjala.netlify.app",
    );
    expect(options.headers.get("X-CSS-Studio")).toBe("1");
    const headers = { "Cache-Control": "no-store" };
    const path = new URL(url).pathname;
    if (options.headers.get("X-CSS-Studio-Canary") !== secret) {
      expect(options.headers.has("Cookie")).toBe(false);
      expect(options.headers.has("X-CSS-Studio-Canary-Model")).toBe(false);
      return Response.json({ available: publicReady }, { headers });
    }
    expect(options.headers.get("X-CSS-Studio-Canary-Model")).toBe(
      "gpt-oss-20b",
    );
    if (path.endsWith("/session"))
      return Response.json(
        { available: true },
        { headers: { ...headers, "Set-Cookie": issuedCookie } },
      );
    expect(options.headers.get("Cookie")).toBe(issuedCookie.split(";")[0]);
    if (path.endsWith("/status")) {
      statuses++;
      return Response.json(
        {
          available: true,
          operations: ["theme"],
          day: rollover && statuses > 1 ? "2026-10-22" : "2026-10-21",
          remaining: { prompts: remainingPrompts, images: 3 },
          sharedRemaining: shared,
        },
        { headers },
      );
    }
    expect(path).toBe("/api/css-studio/propose");
    submissions++;
    remainingPrompts--;
    shared -= charge;
    if (failure === "network") throw Error("private network detail");
    if (failure)
      return new Response("private provider detail", { status: failure });
    const input = JSON.parse(options.body);
    expect(input).toEqual({
      id: expect.any(String),
      operation: "theme",
      prompt:
        "Propose a calm winter palette with readable high-contrast dark colors.",
      context: {
        family: "seasons",
        id: "winter",
        mode: "dark",
        contrast: true,
      },
      history: [],
    });
    return Response.json(
      responseChange({
        requestId: input.id,
        message: `Private generated explanation ${secret} ${cookieValue}`,
        overrides: {
          accent: "#99ccff",
          background: "#000000",
          text: "#ffffff",
          font: "system",
          radius: "8px",
        },
      }),
      { headers },
    );
  });
  const writeSummary = vi.fn(async () => {}),
    log = vi.fn();
  return { fetch, writeSummary, log, submissions: () => submissions };
}
it("runs exactly one comparable private winter fixture and retains a safe summary with a raw contrast measurement", async () => {
  const f = fixture();
  const summary = await runGptCheck({ secret, now, ...f });
  expect(f.submissions()).toBe(1);
  expect(summary).toMatchObject({
    model: "@cf/openai/gpt-oss-20b",
    fixture: "season-high-contrast",
    calls: 1,
    reservedNeurons: 4000,
    sharedRemaining: 2000,
    remainingPrompts: 9,
    rawTextBackgroundContrast: 21,
    reservationIsActualUsage: false,
    winnerEstablished: false,
  });
  expect(f.writeSummary).toHaveBeenCalledExactlyOnceWith(summary);
  const serialized = JSON.stringify({
    log: f.log.mock.calls,
    artifact: f.writeSummary.mock.calls,
  });
  expect(serialized).not.toContain(secret);
  expect(serialized).not.toContain(cookieValue);
  expect(serialized).not.toMatch(
    /Private generated explanation|prompt|history|reasoning|requestId/,
  );
  expect(
    f.fetch.mock.calls.filter(([url]) => url.endsWith("/propose")),
  ).toHaveLength(1);
});
it("does not start inference when the public route is enabled or either allowance is insufficient", async () => {
  for (const options of [
    { publicReady: true },
    { budget: 3999 },
    { prompts: 0 },
  ]) {
    const f = fixture(options);
    await expect(runGptCheck({ secret, now, ...f })).rejects.toThrow();
    expect(f.submissions()).toBe(0);
    expect(f.writeSummary).not.toHaveBeenCalled();
  }
});
it("never retries a denied, failed or interrupted inference request", async () => {
  for (const failure of [429, 502, 504, "network"]) {
    const f = fixture({ failure });
    const outcome = runGptCheck({ secret, now, ...f });
    await expect(outcome).rejects.toBeInstanceOf(GptCheckError);
    await expect(outcome).rejects.toThrow(/No retry/i);
    expect(f.submissions()).toBe(1);
    expect(f.writeSummary).not.toHaveBeenCalled();
    expect(JSON.stringify(f.log.mock.calls)).not.toMatch(
      /private provider detail|private network detail/,
    );
  }
});
it("fails without a success artifact on mismatched identity or unsafe proposal content", async () => {
  for (const responseChange of [
    (value) => ({ ...value, requestId: crypto.randomUUID() }),
    (value) => ({ ...value, overrides: { accent: "url(https://evil.test)" } }),
    (value) => ({ ...value, overrides: {} }),
  ]) {
    const f = fixture({ responseChange });
    await expect(runGptCheck({ secret, now, ...f })).rejects.toThrow();
    expect(f.submissions()).toBe(1);
    expect(f.writeSummary).not.toHaveBeenCalled();
  }
});
it("does not report success if accounting undercharges or the UTC day changes", async () => {
  for (const options of [{ charge: 3999 }, { rollover: true }]) {
    const f = fixture(options);
    await expect(runGptCheck({ secret, now, ...f })).rejects.toThrow();
    expect(f.submissions()).toBe(1);
    expect(f.writeSummary).not.toHaveBeenCalled();
  }
});
it("requires the host-cookie security attributes and rejects Domain or duplicate Path attributes before inference", async () => {
  for (const issuedCookie of [
    `${cookie}; Path=/; Secure; SameSite=Strict`,
    `${sessionCookie}; Domain=example.test`,
    `${sessionCookie}; Path=/other`,
    `${cookie}; Path=/; Secure; HttpOnly; SameSite=Lax`,
  ]) {
    const f = fixture({ issuedCookie });
    await expect(runGptCheck({ secret, now, ...f })).rejects.toThrow(/cookie/i);
    expect(f.submissions()).toBe(0);
  }
});
it("does not begin near midnight or with malformed private credentials", async () => {
  const f = fixture();
  await expect(
    runGptCheck({ secret, ...f, now: () => Date.UTC(2026, 9, 21, 23, 59) }),
  ).rejects.toThrow(/midnight/i);
  await expect(runGptCheck({ ...f, now, secret: "invalid" })).rejects.toThrow();
  expect(f.fetch).not.toHaveBeenCalled();
});
it("omits unavailable raw contrast and rejects failed artifact persistence without repeating inference", async () => {
  const f = fixture({
    responseChange: (value) => ({ ...value, overrides: { accent: "#166534" } }),
  });
  f.writeSummary.mockRejectedValueOnce(Error("private filesystem failure"));
  await expect(runGptCheck({ secret, now, ...f })).rejects.toThrow(/summary/i);
  expect(f.submissions()).toBe(1);
  expect(f.writeSummary.mock.calls[0][0]).not.toHaveProperty(
    "rawTextBackgroundContrast",
  );
  expect(f.log.mock.calls.some(([line]) => /PASS:/.test(line))).toBe(false);
});

it("rejects a summary containing a session credential before either logging or writing it", async () => {
  const f = fixture({
    issuedCookie:
      "__Host-css-studio=system; Path=/; Secure; HttpOnly; SameSite=Strict",
  });
  await expect(runGptCheck({ secret, now, ...f })).rejects.toThrow(
    /private credential/i,
  );
  expect(f.submissions()).toBe(1);
  expect(f.writeSummary).not.toHaveBeenCalled();
  expect(f.log).not.toHaveBeenCalled();
});
