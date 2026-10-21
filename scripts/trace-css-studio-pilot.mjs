import { readJson } from "../src/shared/studioTransfer.js";

const TAILS =
  "https://api.cloudflare.com/client/v4/accounts/d33da711f0acb00005de85f10c11ab0f/workers/scripts/css-studio-ai/tails";
const PROPOSE =
  "https://css-studio-ai.berin-karjala.workers.dev/api/css-studio/propose";
const HEADER = "x-css-studio-pilot-id";
const DEADLINE_MS = 5000;
const MAX_BYTES = 64 * 1024;
// The application bounds a request to 30s. Allow at most another 30s for
// completion work in the runtime; larger or fractional metrics are not proof.
const MAX_TIMING_MS = 60000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAIL_ID =
  /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const OUTCOMES = new Set([
  "ok",
  "canceled",
  "exception",
  "exceededCpu",
  "exceededMemory",
  "unknown",
]);
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const unavailable = (reason) => ({ cpuMeasured: false, reason });
const validTailId = (value) => typeof value === "string" && TAIL_ID.test(value);

function discard(response) {
  try {
    void response?.body?.cancel().catch(() => {});
  } catch {
    // A bounded body reader may already hold the stream lock.
  }
}

function permittedSocket(value) {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "wss:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      (/^[a-z0-9.-]+\.workers\.dev$/i.test(url.hostname) ||
        /^[a-z0-9.-]+\.cloudflare\.com$/i.test(url.hostname))
    );
  } catch {
    return false;
  }
}

// This is an optional, transient real-time tail, not a deployed Tail Worker.
// API authorization includes Workers Scripts Write. No observability query,
// account-wide log read, retry, inference, or storage is performed here.
export async function withImagePilotTrace(
  {
    token,
    pilotId,
    fetch = globalThis.fetch,
    WebSocket = globalThis.WebSocket,
    now = Date.now,
    log = () => {},
  } = {},
  run,
) {
  if (typeof run !== "function") throw new Error("Pilot callback is required.");
  const credential = typeof token === "string" ? token.trim() : "";
  let socket,
    tailId,
    result,
    pilotFailed = false;
  let reason = "tail-unavailable",
    stopped = false,
    connected = false;
  let matched = 0,
    frames = 0,
    projected;
  let started;
  try {
    started = now();
  } catch {
    started = NaN;
  }

  async function api(method, id) {
    const controller = new AbortController();
    let response, timer;
    const begun = Date.now();
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        discard(response);
        resolve(null);
      }, DEADLINE_MS);
    });
    const request = (async () => {
      try {
        response = await fetch(id ? `${TAILS}/${id}` : TAILS, {
          method,
          redirect: "error",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${credential}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          ...(method === "POST"
            ? {
                body: JSON.stringify({
                  filters: [
                    { method: ["POST"] },
                    { header: { key: HEADER, query: pilotId } },
                  ],
                }),
              }
            : {}),
          signal: controller.signal,
        });
        if (
          controller.signal.aborted ||
          !(response instanceof Response) ||
          response.status !== 200
        ) {
          discard(response);
          return null;
        }
        const remaining = DEADLINE_MS - (Date.now() - begun);
        if (remaining <= 0) {
          controller.abort();
          discard(response);
          return null;
        }
        const payload = await readJson(response, MAX_BYTES, remaining);
        if (
          controller.signal.aborted ||
          !object(payload) ||
          payload.success !== true
        )
          return null;
        if (
          method === "POST" &&
          object(payload.result) &&
          validTailId(payload.result.id)
        )
          tailId = payload.result.id;
        // A success response is still untrusted. Never reuse a credential-bearing
        // URL, nor let any returned value become a log/error/artifact field.
        if (JSON.stringify(payload).includes(credential)) return null;
        return payload;
      } catch {
        discard(response);
        return null;
      }
    })();
    try {
      return await Promise.race([request, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  function timing(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIMING_MS;
  }

  async function onMessage(message) {
    if (stopped) return;
    if (++frames > 32) {
      reason = "tail-invalid";
      return;
    }
    try {
      let text;
      const data = message.data;
      if (typeof data === "string") {
        if (
          data.length > MAX_BYTES ||
          new TextEncoder().encode(data).byteLength > MAX_BYTES
        )
          throw new Error();
        text = data;
      } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        if (data.byteLength > MAX_BYTES) throw new Error();
        const bytes =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } else if (data instanceof Blob && data.size <= MAX_BYTES) {
        text = new TextDecoder("utf-8", { fatal: true }).decode(
          await data.arrayBuffer(),
        );
      } else throw new Error();
      if (stopped) return;
      const value = JSON.parse(text),
        request = value?.event?.request;
      if (
        !object(value) ||
        !object(request) ||
        value.scriptName !== "css-studio-ai" ||
        request.method !== "POST" ||
        request.url !== PROPOSE ||
        !object(request.headers)
      )
        return;
      const identifiers = Object.entries(request.headers).filter(
        ([key]) => key.toLowerCase() === HEADER,
      );
      if (identifiers.length !== 1 || identifiers[0][1] !== pilotId) return;
      if (
        !Number.isSafeInteger(value.eventTimestamp) ||
        value.eventTimestamp < started - 1000 ||
        value.eventTimestamp > started + MAX_TIMING_MS
      )
        return;
      matched++;
      if (matched !== 1) {
        reason = "ambiguous-event";
        projected = undefined;
        return;
      }
      if (value.truncated === true || !OUTCOMES.has(value.outcome)) {
        reason = "tail-invalid";
        return;
      }
      if (!timing(value.cpuTime) || !timing(value.wallTime)) {
        reason = "timing-unavailable";
        return;
      }
      // The native TraceItem fields are integer milliseconds. They are optional
      // in real-time messages: missing values never become zero or wall time.
      projected = {
        cpuMeasured: true,
        cpuTimeMs: value.cpuTime,
        wallTimeMs: value.wallTime,
        outcome: value.outcome,
        reason: "measured",
      };
    } catch {
      reason = "tail-invalid";
    }
  }

  async function connect(url) {
    try {
      socket = new WebSocket(url, "trace-v1");
      socket.addEventListener("message", onMessage);
      socket.addEventListener("error", () => {
        if (!stopped) reason = "tail-unavailable";
      });
      socket.addEventListener("close", () => {
        if (!stopped) reason = "tail-unavailable";
      });
      connected = await new Promise((resolve) => {
        let done = false;
        const finish = (value) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(value);
        };
        const timer = setTimeout(() => finish(false), DEADLINE_MS);
        socket.addEventListener("error", () => finish(false), { once: true });
        socket.addEventListener("close", () => finish(false), { once: true });
        socket.addEventListener(
          "open",
          () => {
            if (done) return;
            try {
              if (socket.protocol !== "trace-v1") return finish(false);
              socket.send(JSON.stringify({ debug: false }));
              finish(true);
            } catch {
              finish(false);
            }
          },
          { once: true },
        );
      });
      if (connected) reason = "not-observed";
    } catch {
      connected = false;
      reason = "tail-unavailable";
    }
  }

  try {
    try {
      if (
        credential &&
        !/\s/.test(credential) &&
        typeof pilotId === "string" &&
        UUID.test(pilotId) &&
        typeof WebSocket === "function" &&
        typeof fetch === "function" &&
        Number.isSafeInteger(started)
      ) {
        const payload = await api("POST");
        if (payload) {
          const record = payload.result;
          if (object(record) && validTailId(record.id)) {
            tailId = record.id;
            if (permittedSocket(record.url)) await connect(record.url);
            else reason = "tail-invalid";
          } else reason = "tail-invalid";
        }
      }
    } catch {
      reason = "tail-unavailable";
    }
    try {
      result = await run();
    } catch {
      pilotFailed = true;
    }
    if (connected && !pilotFailed) {
      // Retain a short observation window even for an early event, so duplicate
      // invocations cannot be silently accepted as a single request's timing.
      await new Promise((resolve) => setTimeout(resolve, DEADLINE_MS));
    }
  } finally {
    stopped = true;
    try {
      socket?.close();
    } catch {
      reason = "cleanup-unavailable";
    }
    if (tailId && !(await api("DELETE", tailId)))
      reason = "cleanup-unavailable";
  }
  if (pilotFailed) throw new Error("Image pilot failed.");
  const telemetry =
    projected && matched === 1 && reason === "not-observed"
      ? projected
      : unavailable(reason);
  try {
    log(
      JSON.stringify({
        cpuMeasured: telemetry.cpuMeasured,
        reason: telemetry.reason,
      }),
    );
  } catch {
    /* Optional diagnostic output cannot affect the pilot. */
  }
  return { result, telemetry };
}
