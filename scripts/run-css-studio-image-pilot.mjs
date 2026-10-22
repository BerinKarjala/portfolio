import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  readJson,
  readMultipart,
  isMediaReceipt,
  MEDIA_LIMIT,
  TRANSFER_LIMIT,
} from "../src/shared/studioTransfer.js";
import { validateOutput } from "../server/css-studio/protocol.js";
import { KLEIN_IMAGE_PLAN } from "../server/css-studio/kleinProvider.js";
import { deployProxyCheck } from "./deploy-css-studio-proxy.mjs";
import { runProxyCheck } from "./check-css-studio-proxy.mjs";
import { withImagePilotTrace } from "./trace-css-studio-pilot.mjs";
const BACKEND = "https://css-studio-ai.berin-karjala.workers.dev";
const ORIGIN = "https://berinkarjala.netlify.app";
const DIRECTORY = new URL(
  "../artifacts/css-studio-image-pilot/",
  import.meta.url,
);
export class ImagePilotError extends Error {}
const ensure = (
  condition,
  message = "Private image pilot validation failed. No generation retry was made.",
) => {
  if (!condition) throw new ImagePilotError(message);
};
const fixedPrompt =
  "A quiet snowy evergreen forest beside a frozen lake at dawn, soft blue light, ample uncluttered space for readable page content. No people, text or logos.";
async function writeArtifact({ record, image }) {
  await mkdir(DIRECTORY, { recursive: true });
  if (image) await writeFile(new URL("background.png", DIRECTORY), image);
  await writeFile(
    new URL(
      record.mode === "status-only" ? "status.json" : "result.json",
      DIRECTORY,
    ),
    JSON.stringify(record, null, 2) + "\n",
  );
}
function snapshot(value) {
  ensure(
    typeof value?.available === "boolean" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.day),
  );
  for (const [key, maximum] of [
    ["prompts", 10],
    ["images", 3],
  ])
    ensure(
      Number.isInteger(value.remaining?.[key]) &&
        value.remaining[key] >= 0 &&
        value.remaining[key] <= maximum,
    );
  for (const [key, maximum] of [
    ["sharedRemaining", 8000],
    ["imageTransformsRemaining", 5000],
  ])
    ensure(
      Number.isInteger(value[key]) && value[key] >= 0 && value[key] <= maximum,
    );
  return value;
}
async function readFailureDiagnostic(response, requestId) {
  try {
    const failures = {
      429: ["allowance-exhausted"],
      502: ["invalid-output"],
      504: ["request-deadline", "operation-failed"],
    }[response.status];
    if (
      !failures ||
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
        response.headers.get("content-type") || "",
      )
    )
      throw Error("Unavailable diagnostic");
    // Never retain the response body or error text. This bounded read projects
    // only fixed private fields for the one proposal submitted by this runner.
    const value = (await readJson(response, 2048, 1000))?.diagnostic;
    const keys = [
      "requestId",
      "phase",
      "failure",
      "elapsedWallMs",
      "timeoutMs",
    ];
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(value, key)) ||
      value.requestId !== requestId ||
      !["provider", "response-body", "raster", "normalize", "receipt"].includes(
        value.phase,
      ) ||
      !failures.includes(value.failure) ||
      !Number.isSafeInteger(value.elapsedWallMs) ||
      value.elapsedWallMs < 0 ||
      value.timeoutMs !== 18000
    )
      throw Error("Unavailable diagnostic");
    return {
      requestId,
      phase: value.phase,
      failure: value.failure,
      elapsedWallMs: value.elapsedWallMs,
      timeoutMs: value.timeoutMs,
    };
  } catch {
    void response.body?.cancel().catch(() => {});
    return undefined;
  }
}
// Plan basis is the owner's complete same-session subscriptions screenshot
// (Workers Free only, no payment method) and documented default Images Free.
// The current 0/5,000 Zones counter alone does not distinguish Free from Paid.
export async function runPrivateImagePilot({
  secret,
  traceToken,
  statusOnly = false,
  fetch = globalThis.fetch,
  now = Date.now,
  makeId = randomUUID,
  trace = withImagePilotTrace,
  write = writeArtifact,
  log = console.log,
} = {}) {
  ensure(typeof secret === "string" && /^[0-9a-f]{64}$/.test(secret));
  const began = now(),
    day = new Date(began).toISOString().slice(0, 10),
    id = makeId();
  ensure(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    ),
  );
  ensure(
    86400000 - (began % 86400000) >= 120000 &&
      KLEIN_IMAGE_PLAN.imageVerifiedUntil >= began + 120000 &&
      KLEIN_IMAGE_PLAN.imageNeurons === 500 &&
      KLEIN_IMAGE_PLAN.imageWidth === 512 &&
      KLEIN_IMAGE_PLAN.imageHeight === 512 &&
      KLEIN_IMAGE_PLAN.imageSteps === 4,
    "The private image review is expired or too close to a UTC boundary.",
  );
  let cookie = "";
  async function request(
    path,
    { body, privateRequest = true, pilot = false } = {},
  ) {
    const headers = new Headers({ Origin: ORIGIN, "X-CSS-Studio": "1" });
    if (privateRequest) {
      headers.set("X-CSS-Studio-Canary", secret);
      headers.set("X-CSS-Studio-Canary-Image", "klein-4b");
      if (cookie) headers.set("Cookie", cookie);
    }
    if (body) headers.set("Content-Type", "application/json");
    if (pilot) headers.set("X-CSS-Studio-Pilot-Id", id);
    const response = await fetch(BACKEND + "/api/css-studio/" + path, {
      method: body ? "POST" : "GET",
      headers,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    ensure(
      /(?:^|,)\s*no-store\b/i.test(response.headers.get("cache-control") || ""),
    );
    return response;
  }
  async function publicOff() {
    const response = await request("status", { privateRequest: false });
    ensure(
      response.ok && (await readJson(response, 4096)).available === false,
      "Public inference must remain unavailable.",
    );
  }
  async function status() {
    const response = await request("status");
    ensure(response.ok);
    return snapshot(await readJson(response, 4096));
  }
  await publicOff();
  const session = await request("session", { body: {} });
  ensure(session.ok && (await readJson(session, 4096)).available === true);
  const cookies = session.headers.getSetCookie();
  ensure(
    cookies.length === 1 &&
      /^__Host-css-studio=[^;\s]+;/.test(cookies[0]) &&
      /;\s*Secure(?:;|$)/i.test(cookies[0]) &&
      /;\s*HttpOnly(?:;|$)/i.test(cookies[0]) &&
      /;\s*SameSite=Strict(?:;|$)/i.test(cookies[0]) &&
      /;\s*Path=\/(?:;|$)/.test(cookies[0]) &&
      !/;\s*Domain=/i.test(cookies[0]),
  );
  cookie = cookies[0].split(";")[0];
  const before = await status();
  if (statusOnly === true) {
    await publicOff();
    const record = {
      mode: "status-only",
      observedAt: new Date(now()).toISOString(),
      proposalRequests: 0,
      available: before.available,
      day: before.day,
      sharedRemaining: before.sharedRemaining,
      imageTransformsRemaining: before.imageTransformsRemaining,
      remainingPrompts: before.remaining.prompts,
      remainingImages: before.remaining.images,
      publicInferenceEnabled: false,
      cpuMeasured: false,
    };
    await write({ record });
    log(JSON.stringify(record));
    log(
      "PASS: Private image quota inspected without a proposal or model call.",
    );
    return record;
  }
  ensure(
    before.available &&
      before.day === day &&
      before.operations?.includes("image") &&
      before.remaining.prompts >= 1 &&
      before.remaining.images >= 1 &&
      before.sharedRemaining >= 500 &&
      before.imageTransformsRemaining >= 1,
    "Insufficient image readiness or allowance; no proposal was submitted.",
  );
  let submitted = false,
    httpStatus = null,
    image,
    metadata,
    failureDiagnostic,
    telemetry = { cpuMeasured: false, reason: "unavailable" },
    failed = false;
  try {
    const observed = await trace(
      { token: traceToken, pilotId: id, fetch, now, log: () => {} },
      async () => {
        ensure(
          !submitted && new Date(now()).toISOString().slice(0, 10) === day,
        );
        submitted = true;
        const response = await request("propose", {
          pilot: true,
          body: {
            id,
            operation: "image",
            prompt: fixedPrompt,
            context: {
              family: "seasons",
              id: "winter",
              mode: "dark",
              contrast: false,
            },
            history: [],
          },
        });
        httpStatus = response.status;
        if (!response.ok) {
          failureDiagnostic = await readFailureDiagnostic(response, id);
          throw new ImagePilotError(
            "The single image proposal failed. No generation retry was made.",
          );
        }
        const form = await readMultipart(response, TRANSFER_LIMIT, 5000);
        ensure(
          [...form.keys()].length === 2 &&
            form.getAll("proposal").length === 1 &&
            form.getAll("image").length === 1,
        );
        const text = form.get("proposal"),
          file = form.get("image");
        ensure(
          typeof text === "string" &&
            text.length <= 96 * 1024 &&
            file instanceof Blob &&
            file.type === "image/png" &&
            file.size > 0 &&
            file.size <= MEDIA_LIMIT,
        );
        const proposal = JSON.parse(text);
        ensure(proposal.requestId === id && isMediaReceipt(proposal.receipt));
        validateOutput(
          { message: proposal.message, overrides: proposal.overrides },
          { allowEmpty: true },
        );
        const bytes = new Uint8Array(await file.arrayBuffer());
        // Existing pinned Miniflare dependency; full local raster decode, not
        // metadata-only inspection. This does not measure remote Worker CPU.
        const decoder = sharp(bytes, {
          limitInputPixels: 512 * 512,
          animated: false,
        });
        const header = await decoder.metadata();
        ensure(
          header.format === "png" &&
            (header.pages === undefined || header.pages === 1),
        );
        const decoded = await decoder
          .raw()
          .toBuffer({ resolveWithObject: true });
        ensure(decoded.info.width === 512 && decoded.info.height === 512);
        metadata = {
          width: 512,
          height: 512,
          mime: "image/png",
          bytes: bytes.byteLength,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        };
        image = bytes;
        return true;
      },
    );
    ensure(observed.result === true);
    telemetry = observed.telemetry;
  } catch {
    failed = true;
    image = undefined;
  }
  let after,
    publicAfterVerified = false;
  try {
    after = await status();
  } catch {
    failed = true;
  }
  try {
    await publicOff();
    publicAfterVerified = true;
  } catch {
    failed = true;
  }
  const accountingVerified = Boolean(
    after &&
    after.day === day &&
    new Date(now()).toISOString().slice(0, 10) === day &&
    after.remaining.prompts === before.remaining.prompts - 1 &&
    after.remaining.images === before.remaining.images - 1 &&
    after.sharedRemaining === before.sharedRemaining - 500 &&
    after.imageTransformsRemaining === before.imageTransformsRemaining - 1,
  );
  const valid =
    !failed && accountingVerified && Boolean(image) && after.available;
  const record = {
    observedAt: new Date(now()).toISOString(),
    requestId: id,
    valid,
    proposalRequests: submitted ? 1 : 0,
    httpStatus,
    ...(failureDiagnostic ? { failureDiagnostic } : {}),
    modelCompletionVerified: Boolean(image),
    image: image ? metadata : undefined,
    sharedBefore: before.sharedRemaining,
    sharedAfter: after?.sharedRemaining ?? null,
    transformsBefore: before.imageTransformsRemaining,
    transformsAfter: after?.imageTransformsRemaining ?? null,
    promptsBefore: before.remaining.prompts,
    promptsAfter: after?.remaining.prompts ?? null,
    imagesBefore: before.remaining.images,
    imagesAfter: after?.remaining.images ?? null,
    expectedRetainedNeurons: 500,
    expectedRetainedTransforms: 1,
    accountingVerified,
    elapsedWallMs: Math.max(0, now() - began),
    imagesPlanBasis: "prior-complete-subscriptions-screenshot-and-default-free",
    cpuMeasured: telemetry?.cpuMeasured === true,
    ...(telemetry?.cpuMeasured === true
      ? {
          cpuTimeMs: telemetry.cpuTimeMs,
          workerWallTimeMs: telemetry.wallTimeMs,
        }
      : { cpuUnavailableReason: telemetry?.reason || "unavailable" }),
    publicInferenceEnabled: publicAfterVerified ? false : null,
    publicUnavailableVerifiedAfter: publicAfterVerified,
  };
  await write({ record, ...(valid ? { image } : {}) });
  log(JSON.stringify(record));
  ensure(
    valid,
    "The single private image pilot did not verify completion and accounting. No generation retry was made.",
  );
  log(
    "PASS: One private image decoded at 512x512 with retained daily/monthly charges. Public inference remains unavailable.",
  );
  return record;
}
export async function deployImagePilot({
  token = process.env.CLOUDFLARE_API_TOKEN,
  deploy = deployProxyCheck,
  proxy = runProxyCheck,
  pilot = runPrivateImagePilot,
  statusOnly = false,
  ...options
} = {}) {
  return deploy({
    token,
    ...options,
    check: async (context) => {
      if (statusOnly === true)
        return pilot({ ...context, traceToken: token, statusOnly: true });
      const before = await proxy(context);
      ensure(
        before?.session === true &&
          before.cookie === true &&
          before.crossOriginRejected === true,
      );
      return pilot({ ...context, traceToken: token });
    },
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = process.argv.slice(2);
    ensure(
      args.length === 0 || (args.length === 1 && args[0] === "--status-only"),
      "Unknown private pilot mode; no deployment or proposal was started.",
    );
    await deployImagePilot({ statusOnly: args[0] === "--status-only" });
  } catch (error) {
    console.error(
      error instanceof ImagePilotError
        ? error.message
        : "Private image pilot failed. Raw output withheld; no generation retry was made.",
    );
    process.exitCode = 1;
  }
}
