import { afterEach, expect, it, vi } from "vitest";
import { withImagePilotTrace } from "./trace-css-studio-pilot.mjs";

const token = "test-only-cloudflare-token";
const pilotId = "f700f382-942d-4129-9d4b-ec6d2b20896d";
const tailId = "ab".repeat(16);
const base =
  "https://api.cloudflare.com/client/v4/accounts/d33da711f0acb00005de85f10c11ab0f/workers/scripts/css-studio-ai/tails";
const route =
  "https://css-studio-ai.berin-karjala.workers.dev/api/css-studio/propose";
const clock = Date.UTC(2026, 9, 21, 20);

function event(change = {}) {
  return {
    outcome: "ok",
    scriptName: "css-studio-ai",
    eventTimestamp: clock,
    cpuTime: 4,
    wallTime: 1200,
    logs: [{ message: [token, "private prompt"] }],
    exceptions: [{ message: "private exception" }],
    event: {
      request: {
        url: route,
        method: "POST",
        headers: {
          "x-css-studio-pilot-id": pilotId,
          cookie: "private-cookie",
          authorization: token,
        },
      },
    },
    ...change,
  };
}

function fixture({ open = true } = {}) {
  const sockets = [];
  class Socket extends EventTarget {
    readyState = 0;
    protocol = "trace-v1";
    send = vi.fn();
    close = vi.fn(() => {
      this.readyState = 3;
    });
    constructor(url, protocol) {
      super();
      this.url = url;
      this.requestedProtocol = protocol;
      sockets.push(this);
      if (open)
        queueMicrotask(() => {
          this.readyState = 1;
          this.dispatchEvent(new Event("open"));
        });
    }
    message(value) {
      this.dispatchEvent(
        new MessageEvent("message", {
          data: typeof value === "string" ? value : JSON.stringify(value),
        }),
      );
    }
  }
  const fetch = vi.fn(async (_url, options) =>
    options.method === "POST"
      ? Response.json({
          success: true,
          result: {
            id: tailId,
            url: "wss://tail.developers.workers.dev/private-session?credential=hidden",
            expires_at: new Date(clock + 60000).toISOString(),
          },
        })
      : Response.json({ success: true }),
  );
  const log = vi.fn();
  return { fetch, log, sockets, WebSocket: Socket, now: () => clock };
}

async function finish(promise) {
  await vi.advanceTimersByTimeAsync(5001);
  return promise;
}
afterEach(() => vi.useRealTimers());

it("starts a fixed, filtered ephemeral tail, runs once after opening, and retains only correlated numeric timing", async () => {
  vi.useFakeTimers();
  const f = fixture();
  const run = vi.fn(async () => {
    expect(f.sockets[0].send).toHaveBeenCalledExactlyOnceWith(
      '{"debug":false}',
    );
    f.sockets[0].message(event());
    return { completed: true };
  });
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, run),
  );
  expect(run).toHaveBeenCalledOnce();
  expect(f.fetch).toHaveBeenCalledTimes(2);
  expect(f.fetch.mock.calls[0]).toEqual([
    base,
    expect.objectContaining({
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      body: JSON.stringify({
        filters: [
          { method: ["POST"] },
          { header: { key: "x-css-studio-pilot-id", query: pilotId } },
        ],
      }),
    }),
  ]);
  expect(f.fetch.mock.calls[1]).toEqual([
    `${base}/${tailId}`,
    expect.objectContaining({ method: "DELETE", redirect: "error" }),
  ]);
  expect(f.sockets[0].requestedProtocol).toBe("trace-v1");
  expect(f.sockets[0].close).toHaveBeenCalledOnce();
  expect(result).toEqual({
    result: { completed: true },
    telemetry: {
      cpuMeasured: true,
      cpuTimeMs: 4,
      wallTimeMs: 1200,
      outcome: "ok",
      reason: "measured",
    },
  });
  expect(JSON.stringify([result, f.log.mock.calls])).not.toMatch(
    /private|hidden|test-only|abababab/,
  );
});

it.each([403, 500, 302])(
  "runs the pilot once without parsing a failed API response (%i)",
  async (status) => {
    const f = fixture();
    f.fetch.mockResolvedValueOnce(new Response(token, { status }));
    const run = vi.fn(async () => "done");
    const result = await withImagePilotTrace({ token, pilotId, ...f }, run);
    expect(run).toHaveBeenCalledOnce();
    expect(f.fetch).toHaveBeenCalledOnce();
    expect(f.sockets).toHaveLength(0);
    expect(result).toEqual({
      result: "done",
      telemetry: { cpuMeasured: false, reason: "tail-unavailable" },
    });
    expect(JSON.stringify(f.log.mock.calls)).not.toContain(token);
  },
);

it.each([
  "wss://attacker.example/private",
  "wss://workers.dev.evil.example/private",
  "https://tail.cloudflare.com/private",
  "wss://user:pass@tail.cloudflare.com/private",
  "wss://tail.cloudflare.com:8443/private",
  "wss://tail.cloudflare.com/private#fragment",
])(
  "rejects an unsafe tail URL and deletes only the valid issued id (%s)",
  async (url) => {
    const f = fixture();
    f.fetch.mockResolvedValueOnce(
      Response.json({ success: true, result: { id: tailId, url } }),
    );
    const run = vi.fn(async () => "done");
    const result = await withImagePilotTrace({ token, pilotId, ...f }, run);
    expect(run).toHaveBeenCalledOnce();
    expect(f.sockets).toHaveLength(0);
    expect(f.fetch.mock.calls[1][0]).toBe(`${base}/${tailId}`);
    expect(result.telemetry).toEqual({
      cpuMeasured: false,
      reason: "tail-invalid",
    });
  },
);

it("rejects invalid tail IDs without putting them into cleanup URLs", async () => {
  const f = fixture();
  f.fetch.mockResolvedValueOnce(
    Response.json({
      success: true,
      result: { id: "../secrets", url: "wss://tail.cloudflare.com/session" },
    }),
  );
  const run = vi.fn(async () => "done");
  const result = await withImagePilotTrace({ token, pilotId, ...f }, run);
  expect(f.fetch).toHaveBeenCalledOnce();
  expect(run).toHaveBeenCalledOnce();
  expect(result.telemetry.cpuMeasured).toBe(false);
});

it.each([{ toString: null }, [tailId], null, 123])(
  "runs once for a non-string tail ID without coercing it (%j)",
  async (id) => {
    const f = fixture();
    f.fetch.mockResolvedValueOnce(
      Response.json({
        success: true,
        result: { id, url: "wss://tail.cloudflare.com/session" },
      }),
    );
    const run = vi.fn(async () => "done");
    const result = await withImagePilotTrace({ token, pilotId, ...f }, run);
    expect(run).toHaveBeenCalledOnce();
    expect(f.fetch).toHaveBeenCalledOnce();
    expect(f.sockets).toHaveLength(0);
    expect(result.telemetry.cpuMeasured).toBe(false);
  },
);

it("accepts a canonical UUID issued tail ID for fixed-route cleanup", async () => {
  vi.useFakeTimers();
  const f = fixture();
  f.fetch.mockResolvedValueOnce(
    Response.json({
      success: true,
      result: { id: pilotId, url: "wss://tail.cloudflare.com/session" },
    }),
  );
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, async () => {
      f.sockets[0].message(event());
      return "done";
    }),
  );
  expect(f.fetch.mock.calls[1][0]).toBe(`${base}/${pilotId}`);
  expect(result.telemetry.cpuMeasured).toBe(true);
});

it("keeps an unavailable injected clock from suppressing the single pilot", async () => {
  const f = fixture(),
    run = vi.fn(async () => "done");
  const result = await withImagePilotTrace(
    {
      token,
      pilotId,
      ...f,
      now: () => {
        throw new Error(token);
      },
    },
    run,
  );
  expect(run).toHaveBeenCalledOnce();
  expect(f.fetch).not.toHaveBeenCalled();
  expect(result.telemetry.cpuMeasured).toBe(false);
});

it.each(["oversized", "malformed", "credential-echo"])(
  "bounds and sanitizes API metadata (%s)",
  async (kind) => {
    const f = fixture();
    f.fetch.mockResolvedValueOnce(
      kind === "oversized"
        ? new Response("x".repeat(65537))
        : kind === "malformed"
          ? new Response("{")
          : Response.json({
              success: true,
              result: { id: tailId, url: `wss://tail.cloudflare.com/${token}` },
            }),
    );
    const run = vi.fn(async () => "done");
    const result = await withImagePilotTrace({ token, pilotId, ...f }, run);
    expect(run).toHaveBeenCalledOnce();
    expect(f.sockets).toHaveLength(0);
    expect(result.telemetry.cpuMeasured).toBe(false);
    expect(JSON.stringify([result, f.log.mock.calls])).not.toContain(token);
    if (kind === "credential-echo")
      expect(f.fetch.mock.calls[1][0]).toBe(`${base}/${tailId}`);
  },
);

it("bounds a hung create even if fetch ignores abort, then runs once", async () => {
  vi.useFakeTimers();
  const f = fixture();
  f.fetch.mockImplementationOnce(() => new Promise(() => {}));
  const run = vi.fn(async () => "done");
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, run),
  );
  expect(run).toHaveBeenCalledOnce();
  expect(f.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(result.telemetry.reason).toBe("tail-unavailable");
});

it("bounds an unopened socket and cleans it up before completing", async () => {
  vi.useFakeTimers();
  const f = fixture({ open: false });
  const run = vi.fn(async () => "done");
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, run),
  );
  expect(run).toHaveBeenCalledOnce();
  expect(f.sockets[0].close).toHaveBeenCalledOnce();
  expect(f.fetch).toHaveBeenCalledTimes(2);
  expect(result.telemetry.reason).toBe("tail-unavailable");
});

it("bounds a stalled metadata body and runs once without exposing it", async () => {
  vi.useFakeTimers();
  const f = fixture();
  f.fetch.mockResolvedValueOnce(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"success":'));
        },
      }),
    ),
  );
  const run = vi.fn(async () => "done");
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, run),
  );
  expect(run).toHaveBeenCalledOnce();
  expect(result.telemetry.cpuMeasured).toBe(false);
  expect(f.sockets).toHaveLength(0);
});

it("accepts zero milliseconds without substituting wall time for CPU time", async () => {
  vi.useFakeTimers();
  const f = fixture();
  const run = vi.fn(async () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify(event({ cpuTime: 0, wallTime: 60000 })),
    );
    f.sockets[0].dispatchEvent(
      new MessageEvent("message", { data: bytes.buffer }),
    );
    return "done";
  });
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, run),
  );
  expect(result.telemetry).toEqual({
    cpuMeasured: true,
    cpuTimeMs: 0,
    wallTimeMs: 60000,
    outcome: "ok",
    reason: "measured",
  });
});

it("marks timing unavailable after a socket failure even if an event was measured", async () => {
  vi.useFakeTimers();
  const f = fixture();
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, async () => {
      f.sockets[0].message(event());
      f.sockets[0].dispatchEvent(new Event("error"));
      return "done";
    }),
  );
  expect(result.telemetry).toEqual({
    cpuMeasured: false,
    reason: "tail-unavailable",
  });
  expect(f.fetch).toHaveBeenCalledTimes(2);
});

it("runs once and cleans up if constructing the socket throws secret-bearing data", async () => {
  const f = fixture();
  class BrokenSocket {
    constructor() {
      throw new Error(token);
    }
  }
  const run = vi.fn(async () => "done");
  const result = await withImagePilotTrace(
    { token, pilotId, ...f, WebSocket: BrokenSocket },
    run,
  );
  expect(run).toHaveBeenCalledOnce();
  expect(f.fetch).toHaveBeenCalledTimes(2);
  expect(result.telemetry.reason).toBe("tail-unavailable");
  expect(JSON.stringify([result, f.log.mock.calls])).not.toContain(token);
});

it("waits for a late correlated event after the callback without rerunning it", async () => {
  vi.useFakeTimers();
  const f = fixture();
  const run = vi.fn(async () => {
    setTimeout(() => f.sockets[0].message(event()), 100);
    return "done";
  });
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, run),
  );
  expect(run).toHaveBeenCalledOnce();
  expect(result.telemetry.cpuTimeMs).toBe(4);
});

it.each([
  "other-header",
  "other-route",
  "query",
  "other-worker",
  "other-method",
  "stale",
  "missing-time",
  "fractional-time",
  "excess-time",
  "unknown-outcome",
  "truncated",
  "malformed",
  "oversized",
  "duplicate",
])("does not claim CPU proof for %s frames", async (kind) => {
  vi.useFakeTimers();
  const f = fixture();
  const run = vi.fn(async () => {
    const message = event();
    if (kind === "other-header")
      message.event.request.headers["x-css-studio-pilot-id"] = "other";
    if (kind === "other-route") message.event.request.url = route + "/other";
    if (kind === "query") message.event.request.url = route + "?token=private";
    if (kind === "other-worker") message.scriptName = "other";
    if (kind === "other-method") message.event.request.method = "GET";
    if (kind === "stale") message.eventTimestamp = clock - 60001;
    if (kind === "missing-time") delete message.cpuTime;
    if (kind === "fractional-time") message.cpuTime = 1.5;
    if (kind === "excess-time") message.cpuTime = 60001;
    if (kind === "unknown-outcome") message.outcome = token;
    if (kind === "truncated") message.truncated = true;
    f.sockets[0].message(
      kind === "malformed"
        ? "{"
        : kind === "oversized"
          ? "x".repeat(65537)
          : message,
    );
    if (kind === "duplicate") f.sockets[0].message(message);
    return "done";
  });
  const result = await finish(
    withImagePilotTrace({ token, pilotId, ...f }, run),
  );
  expect(run).toHaveBeenCalledOnce();
  expect(result.telemetry.cpuMeasured).toBe(false);
  expect(JSON.stringify([result, f.log.mock.calls])).not.toMatch(
    /test-only|private-cookie|private prompt/,
  );
  expect(f.fetch).toHaveBeenCalledTimes(2);
});

it("sanitizes pilot errors and completes cleanup without retrying inference", async () => {
  const f = fixture();
  const run = vi.fn(async () => {
    throw new Error(token + " private-cookie");
  });
  await expect(
    withImagePilotTrace({ token, pilotId, ...f }, run),
  ).rejects.toThrow(/^Image pilot failed\.$/);
  expect(run).toHaveBeenCalledOnce();
  expect(f.sockets[0].close).toHaveBeenCalledOnce();
  expect(f.fetch.mock.calls[1][0]).toBe(`${base}/${tailId}`);
  expect(JSON.stringify(f.log.mock.calls)).not.toContain(token);
});

it("does not let a failed or hung cleanup suppress the pilot result", async () => {
  vi.useFakeTimers();
  const f = fixture();
  f.fetch.mockImplementationOnce(async () =>
    Response.json({
      success: true,
      result: { id: tailId, url: "wss://tail.cloudflare.com/session" },
    }),
  );
  f.fetch.mockImplementationOnce(() => new Promise(() => {}));
  const run = vi.fn(async () => {
    f.sockets[0].message(event());
    return "done";
  });
  const promise = withImagePilotTrace({ token, pilotId, ...f }, run);
  await vi.advanceTimersByTimeAsync(10002);
  const result = await promise;
  expect(run).toHaveBeenCalledOnce();
  expect(result.result).toBe("done");
  expect(result.telemetry).toEqual({
    cpuMeasured: false,
    reason: "cleanup-unavailable",
  });
});

it("runs once when optional tracing credentials or WebSocket support are absent", async () => {
  for (const change of [
    { token: "" },
    { pilotId: "unsafe\nvalue" },
    { WebSocket: undefined },
  ]) {
    const f = fixture();
    const run = vi.fn(async () => "done");
    const options = { token, pilotId, ...f, ...change };
    if (Object.hasOwn(change, "WebSocket")) options.WebSocket = null;
    const result = await withImagePilotTrace(options, run);
    expect(run).toHaveBeenCalledOnce();
    expect(f.fetch).not.toHaveBeenCalled();
    expect(result.telemetry.cpuMeasured).toBe(false);
  }
});
