import { createIdentity } from "./identity.js";
import {
  fingerprint,
  HttpError,
  readJson,
  validateInput,
  validateOutput,
} from "./protocol.js";
import { LIMITS } from "./quota.js";
export class ProviderLimitError extends Error {}
const reply = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
export function createApp({
  origin,
  endpointOrigin = origin,
  secret,
  ledger,
  provider,
  policy,
  clock = Date.now,
} = {}) {
  const plan = policy ? Object.freeze({ ...policy }) : null;
  let identity,
    validOrigins = false;
  try {
    if (new URL(origin).origin !== origin || !origin.startsWith("https://"))
      throw Error();
    if (
      new URL(endpointOrigin).origin !== endpointOrigin ||
      !endpointOrigin.startsWith("https://")
    )
      throw Error();
    validOrigins = true;
    identity = createIdentity(secret, { clock });
  } catch {
    /* Missing developer configuration keeps the route unavailable. */
  }
  const ready = () =>
    Boolean(
      identity &&
      ledger &&
      provider?.propose &&
      plan &&
      Number.isFinite(plan.verifiedUntil) &&
      plan.verifiedUntil >= clock() + LIMITS.requestMs &&
      Number.isSafeInteger(plan.reservedNeurons) &&
      plan.reservedNeurons >= 1 &&
      plan.reservedNeurons <= LIMITS.neurons &&
      Number.isSafeInteger(plan.maxOutputTokens) &&
      plan.maxOutputTokens >= 1 &&
      plan.maxOutputTokens <= 512 &&
      Number.isSafeInteger(plan.timeoutMs) &&
      plan.timeoutMs >= 1 &&
      plan.timeoutMs <= 25000,
    );
  return async function handle(request) {
    const url = new URL(request.url),
      route = url.pathname;
    if (
      ![
        "/api/css-studio/status",
        "/api/css-studio/session",
        "/api/css-studio/propose",
      ].includes(route)
    )
      return reply(404, { error: "Not found." });
    const status = route.endsWith("/status");
    if (request.method !== (status ? "GET" : "POST"))
      return reply(
        405,
        { error: "Method unavailable." },
        { Allow: status ? "GET" : "POST" },
      );
    if (!validOrigins)
      return reply(
        status ? 200 : 503,
        status
          ? { available: false }
          : { error: "AI design is currently unavailable." },
      );
    if (
      url.search ||
      url.origin !== endpointOrigin ||
      (!status &&
        (request.headers.get("origin") !== origin ||
          request.headers.get("x-css-studio") !== "1")) ||
      (request.headers.has("sec-fetch-site") &&
        request.headers.get("sec-fetch-site") !== "same-origin") ||
      (request.headers.has("origin") &&
        request.headers.get("origin") !== origin)
    )
      return reply(403, { error: "Use the same-origin Studio endpoint." });
    if (!ready())
      return reply(
        status ? 200 : 503,
        status
          ? { available: false }
          : { error: "AI design is currently unavailable." },
      );
    try {
      const visitor = await identity.read(request.headers.get("cookie"));
      if (status) {
        if (!visitor)
          return reply(401, { error: "Open a Studio session first." });
        const snapshot = await ledger.snapshot(visitor);
        return reply(200, {
          available: snapshot.available,
          day: snapshot.day,
          remaining: snapshot.remaining,
          sharedRemaining: snapshot.sharedRemaining,
        });
      }
      if (
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
          request.headers.get("content-type") || "",
        ) ||
        (request.headers.get("content-encoding") &&
          request.headers.get("content-encoding") !== "identity")
      )
        return reply(415, { error: "Use a JSON request." });
      if (route.endsWith("/session")) {
        const body = await readJson(request, 64);
        if (
          !body ||
          Array.isArray(body) ||
          typeof body !== "object" ||
          Object.keys(body).length
        )
          throw new HttpError(400, "Invalid session request.");
        if (visitor) return reply(200, { available: true });
        const issued = await identity.issue();
        return reply(200, { available: true }, { "Set-Cookie": issued.cookie });
      }
      if (!visitor)
        return reply(401, { error: "Open a Studio session first." });
      const input = validateInput(await readJson(request));
      // Local browser image IDs are not trusted server media. These routes stay closed until an approved media adapter exists.
      if (input.operation !== "theme")
        return reply(503, { error: "Image design is currently unavailable." });
      if (!ready())
        return reply(503, { error: "AI design is currently unavailable." });
      const reservation = await ledger.reserve({
        visitor,
        requestId: input.id,
        fingerprint: await fingerprint(input),
        operation: input.operation,
        reservedNeurons: plan.reservedNeurons,
      });
      if (!reservation.admitted)
        return reply(
          reservation.status,
          { error: reservation.code },
          { "Retry-After": String(reservation.retryAfter || 1) },
        );
      if (
        !ready() ||
        !Number.isFinite(reservation.deadline) ||
        clock() + plan.timeoutMs >= reservation.deadline
      ) {
        await ledger.settle({
          visitor,
          requestId: input.id,
          outcome: "complete",
          measuredNeurons: 0,
        });
        return reply(503, { error: "AI admission expired before dispatch." });
      }
      const controller = new AbortController();
      let timer;
      let result;
      try {
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(Error("deadline"));
          }, plan.timeoutMs);
        });
        result = await Promise.race([
          Promise.resolve().then(() =>
            provider.propose(input, {
              signal: controller.signal,
              maxOutputTokens: plan.maxOutputTokens,
            }),
          ),
          timeout,
        ]);
      } catch (error) {
        const exhausted = error instanceof ProviderLimitError;
        await ledger.settle({
          visitor,
          requestId: input.id,
          outcome: exhausted ? "provider-exhausted" : "uncertain",
        });
        return reply(exhausted ? 429 : 504, {
          error: exhausted
            ? "Provider allowance is exhausted."
            : "The designer did not finish safely. Existing themes remain available.",
        });
      } finally {
        clearTimeout(timer);
      }
      let proposal;
      try {
        proposal = validateOutput(result?.proposal);
      } catch {
        await ledger.settle({
          visitor,
          requestId: input.id,
          outcome: "complete",
        });
        return reply(502, {
          error:
            "The designer returned unsupported styling. Existing themes remain available.",
        });
      }
      // Usage comes from a trusted provider adapter, never model text or the request body.
      const settlement = await ledger.settle({
        visitor,
        requestId: input.id,
        outcome: "complete",
        ...(result.usage?.verified === true
          ? { measuredNeurons: result.usage.neurons }
          : {}),
      });
      if (!settlement.settled)
        return reply(503, {
          error:
            "AI accounting is unavailable. Existing themes remain available.",
        });
      return reply(200, { requestId: input.id, ...proposal });
    } catch (error) {
      return reply(error instanceof HttpError ? error.status : 503, {
        error:
          error instanceof HttpError
            ? error.message
            : "AI design is currently unavailable. Existing themes remain available.",
      });
    }
  };
}
