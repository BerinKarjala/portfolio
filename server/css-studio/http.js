import { createMediaReceipts } from "./media.js";
import { readImageRequest, imageResponse } from "./mediaWire.js";
import { createIdentity } from "./identity.js";
import {
  fingerprint,
  HttpError,
  readJson,
  validateInput,
  validateOutput,
} from "./protocol.js";
import { LIMITS } from "./quota.js";
import { ProviderLimitError, ProviderOutputError } from "./providerErrors.js";
import {
  GPT_THEME_MODEL,
  GPT_MAX_CONTEXT_TOKENS,
  GPT_THEME_PLAN,
} from "./gptProvider.js";
export { ProviderLimitError } from "./providerErrors.js";
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
  let receipts;
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
    receipts = createMediaReceipts(secret, { clock });
  } catch {
    /* Missing developer configuration keeps the route unavailable. */
  }
  const boundedOutput = () =>
    provider?.model === GPT_THEME_MODEL
      ? provider.maxContextTokens === GPT_MAX_CONTEXT_TOKENS &&
        Object.entries(GPT_THEME_PLAN).every(
          ([key, value]) => plan?.[key] === value,
        )
      : Number.isSafeInteger(plan?.maxOutputTokens) &&
        plan.maxOutputTokens >= 1 &&
        plan.maxOutputTokens <= 512;
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
      boundedOutput() &&
      Number.isSafeInteger(plan.timeoutMs) &&
      plan.timeoutMs >= 1 &&
      plan.timeoutMs <= 25000,
    );
  const imageReady = () =>
    ready() &&
    receipts &&
    typeof provider.image?.propose === "function" &&
    typeof provider.image?.inspectImage === "function" &&
    Number.isSafeInteger(plan.imageNeurons) &&
    plan.imageNeurons >= 1 &&
    plan.imageNeurons <= LIMITS.neurons &&
    [plan.imageWidth, plan.imageHeight].every(
      (value) => Number.isInteger(value) && value >= 64 && value <= 2048,
    ) &&
    Number.isInteger(plan.imageSteps) &&
    plan.imageSteps >= 1 &&
    plan.imageSteps <= 8;
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
          operations: snapshot.available
            ? ["theme", ...(imageReady() ? ["image", "refine"] : [])]
            : [],
          day: snapshot.day,
          remaining: snapshot.remaining,
          sharedRemaining: snapshot.sharedRemaining,
        });
      }
      const jsonType = /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
        request.headers.get("content-type") || "",
      );
      const multipart = /^multipart\/form-data;/i.test(
        request.headers.get("content-type") || "",
      );
      if (
        (!jsonType && !multipart) ||
        (request.headers.get("content-encoding") &&
          request.headers.get("content-encoding") !== "identity")
      )
        return reply(415, { error: "Use a supported design request." });
      if (route.endsWith("/session")) {
        if (!jsonType)
          return reply(415, { error: "Use a JSON session request." });
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
      if (multipart && !imageReady())
        return reply(503, { error: "Image design is currently unavailable." });
      const attachment = multipart ? await readImageRequest(request) : null;
      const input = attachment
        ? attachment.input
        : validateInput(await readJson(request));
      const imageOperation = input.operation !== "theme";
      if (imageOperation && !imageReady())
        return reply(503, { error: "Image design is currently unavailable." });
      if (input.operation === "refine" && !attachment)
        throw new HttpError(
          409,
          "Saved background verification is required.",
          "media-unavailable",
        );
      const base = attachment
        ? await receipts.verify({
            owner: visitor,
            context: input.context,
            image: attachment.image,
            receipt: attachment.receipt,
          })
        : null;
      if (!ready())
        return reply(503, { error: "AI design is currently unavailable." });
      if (typeof provider.validateRequest === "function")
        provider.validateRequest(input);
      const reservation = await ledger.reserve({
        visitor,
        requestId: input.id,
        fingerprint: await fingerprint(
          base
            ? { ...input, ownedMedia: { id: base.id, sha256: base.sha256 } }
            : input,
        ),
        operation: input.operation,
        reservedNeurons: imageOperation
          ? plan.imageNeurons
          : plan.reservedNeurons,
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
          Promise.resolve().then(async () => {
            const output = imageOperation
              ? await provider.image.propose(input, {
                  signal: controller.signal,
                  width: plan.imageWidth,
                  height: plan.imageHeight,
                  steps: plan.imageSteps,
                  ...(base ? { baseImage: attachment.image } : {}),
                })
              : await provider.propose(input, {
                  signal: controller.signal,
                  maxOutputTokens: plan.maxOutputTokens,
                });
            try {
              const proposal = validateOutput(output?.proposal, {
                allowEmpty: imageOperation,
              });
              const proof = imageOperation
                ? await receipts.issue({
                    owner: visitor,
                    context: input.context,
                    image: output.image,
                    inspect: (image) =>
                      provider.image.inspectImage(image, {
                        signal: controller.signal,
                      }),
                  })
                : null;
              if (
                proof &&
                (proof.metadata.width !== plan.imageWidth ||
                  proof.metadata.height !== plan.imageHeight)
              )
                throw Error("Unexpected image geometry");
              return { output, proposal, proof };
            } catch {
              throw new ProviderOutputError();
            }
          }),
          timeout,
        ]);
      } catch (error) {
        if (error instanceof ProviderOutputError) {
          await ledger.settle({
            visitor,
            requestId: input.id,
            outcome: "complete",
          });
          return reply(502, {
            error:
              "The designer returned unsupported styling or media. Existing themes remain available.",
          });
        }
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
      // Usage comes from a trusted provider adapter, never model text or the request body.
      const settlement = await ledger.settle({
        visitor,
        requestId: input.id,
        outcome: "complete",
        ...(result.output.usage?.verified === true
          ? { measuredNeurons: result.output.usage.neurons }
          : {}),
      });
      if (!settlement.settled)
        return reply(503, {
          error:
            "AI accounting is unavailable. Existing themes remain available.",
        });
      if (imageOperation)
        return imageResponse(
          {
            requestId: input.id,
            ...result.proposal,
            receipt: result.proof.receipt,
          },
          result.output.image,
        );
      return reply(200, { requestId: input.id, ...result.proposal });
    } catch (error) {
      return reply(error instanceof HttpError ? error.status : 503, {
        ...(error instanceof HttpError && error.code
          ? { code: error.code }
          : {}),
        error:
          error instanceof HttpError
            ? error.message
            : "AI design is currently unavailable. Existing themes remain available.",
      });
    }
  };
}
