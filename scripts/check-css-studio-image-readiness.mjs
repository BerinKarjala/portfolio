import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readJson } from "../src/shared/studioTransfer.js";

const ACCOUNT = "d33da711f0acb00005de85f10c11ab0f";
const WORKER = "css-studio-ai";
const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}`;
const RESPONSE_LIMIT = 64 * 1024;
const REQUEST_MS = 15000;
const DIRECTORY = new URL(
  "../artifacts/css-studio-image-readiness/",
  import.meta.url,
);
const FILE = new URL("account.json", DIRECTORY);

export class ImageReadinessError extends Error {}
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function discard(response) {
  try {
    void response?.body?.cancel().catch(() => {});
  } catch {
    // A bounded reader may already hold the lock and will cancel on its deadline.
  }
}
function flags(bindings, name, expectedType) {
  const named = bindings.filter((binding) => binding?.name === name);
  return {
    name,
    expectedType,
    present: named.length > 0,
    available: named.length === 1 && named[0].type === expectedType,
  };
}
function safeSubscriptions(result) {
  const projected = [];
  for (const subscription of result) {
    const plan = subscription?.rate_plan;
    if (!object(plan)) continue;
    const item = {};
    if (
      typeof plan.id === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(plan.id)
    )
      item.productId = plan.id;
    if (
      typeof plan.public_name === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9 .:_()+/-]{0,99}$/.test(plan.public_name)
    )
      item.productName = plan.public_name;
    if (Object.keys(item).length) projected.push(item);
    if (projected.length >= 64) break;
  }
  return projected;
}
async function writeArtifact(artifact) {
  await mkdir(DIRECTORY, { recursive: true });
  await writeFile(FILE, JSON.stringify(artifact, null, 2) + "\n");
}

// Fixed metadata GETs only. A forbidden billing read is evidence of missing
// visibility, never a reason to request a new token or infer the default plan.
export async function checkImageReadiness({
  token = process.env.CLOUDFLARE_API_TOKEN,
  fetch = globalThis.fetch,
  write = writeArtifact,
  now = Date.now,
  log = console.log,
} = {}) {
  const credential = typeof token === "string" ? token.trim() : "";
  if (!credential || /\s/.test(credential))
    throw new ImageReadinessError(
      "Repository API token is missing or malformed.",
    );

  async function read(url) {
    const controller = new AbortController();
    const started = Date.now();
    const unavailable = { visibility: "unavailable", status: null };
    let response;
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        discard(response);
        resolve(unavailable);
      }, REQUEST_MS);
    });
    const request = (async () => {
      try {
        response = await fetch(url, {
          method: "GET",
          redirect: "error",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${credential}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        if (controller.signal.aborted || !(response instanceof Response)) {
          discard(response);
          return unavailable;
        }
        if (response.status !== 200) {
          discard(response);
          return {
            visibility: response.status === 403 ? "forbidden" : "unavailable",
            status: response.status,
          };
        }
        const remaining = REQUEST_MS - (Date.now() - started);
        if (remaining <= 0) {
          controller.abort();
          discard(response);
          return unavailable;
        }
        const payload = await readJson(response, RESPONSE_LIMIT, remaining);
        if (controller.signal.aborted) return unavailable;
        if (JSON.stringify(payload).includes(credential))
          throw new ImageReadinessError(
            "Readiness metadata contains disallowed credential data.",
          );
        if (!object(payload) || payload.success !== true)
          return { visibility: "unavailable", status: 200 };
        return { visibility: "visible", status: 200, result: payload.result };
      } catch (error) {
        if (error instanceof ImageReadinessError) throw error;
        discard(response);
        return unavailable;
      }
    })();
    try {
      return await Promise.race([request, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  const billing = await read(`${BASE}/subscriptions`);
  const settings = await read(`${BASE}/workers/scripts/${WORKER}/settings`);
  const subscriptionsVisible =
    billing.visibility === "visible" && Array.isArray(billing.result);
  const settingsVisible =
    settings.visibility === "visible" &&
    object(settings.result) &&
    Array.isArray(settings.result.bindings);
  const bindings = settingsVisible ? settings.result.bindings : [];
  const artifact = {
    observedAt: new Date(now()).toISOString(),
    billingVisibility: subscriptionsVisible
      ? "visible"
      : billing.visibility === "forbidden"
        ? "forbidden"
        : "unavailable",
    billingStatus: billing.status,
    // The generic subscriptions schema has no documented, product-specific
    // Images Free discriminator. Absence, zero price, or a free-looking name
    // cannot establish the account's Images billing plan or monthly headroom.
    imagesPlan: "unknown",
    safeSubscriptions: subscriptionsVisible
      ? safeSubscriptions(billing.result)
      : [],
    worker: {
      name: WORKER,
      settingsVisibility: settingsVisible
        ? "visible"
        : settings.visibility === "forbidden"
          ? "forbidden"
          : "unavailable",
      settingsStatus: settings.status,
      bindings: {
        AI: flags(bindings, "AI", "ai"),
        QUOTA: flags(bindings, "QUOTA", "durable_object_namespace"),
        IMAGES: flags(bindings, "IMAGES", "images"),
      },
      anyImagesBinding: bindings.some((binding) => binding?.type === "images"),
    },
    readyForTransform: false,
    inferencePerformed: false,
    transformationPerformed: false,
    deploymentPerformed: false,
    bindingChangesPerformed: false,
  };
  if (JSON.stringify(artifact).includes(credential))
    throw new ImageReadinessError(
      "Readiness artifact contains disallowed credential data.",
    );
  try {
    await write(artifact);
  } catch {
    throw new ImageReadinessError(
      "Images readiness artifact could not be written.",
    );
  }
  log(
    JSON.stringify({
      billingVisibility: artifact.billingVisibility,
      imagesPlan: artifact.imagesPlan,
      workerSettingsVisibility: artifact.worker.settingsVisibility,
      imagesBindingAvailable: artifact.worker.bindings.IMAGES.available,
      readyForTransform: false,
      inferencePerformed: false,
      transformationPerformed: false,
      bindingChangesPerformed: false,
    }),
  );
  return artifact;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await checkImageReadiness();
  } catch (error) {
    console.error(
      error instanceof ImageReadinessError
        ? error.message
        : "Images readiness check failed. Raw output was withheld.",
    );
    process.exitCode = 1;
  }
}
