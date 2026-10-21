import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readJson } from "../src/shared/studioTransfer.js";

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const ACCOUNT = "d33da711f0acb00005de85f10c11ab0f";
const WORKER = "css-studio-ai";
const SCHEMA_LIMIT = 2 * 1024 * 1024;
const DIRECTORY = new URL(
  "../artifacts/css-studio-image-contract/",
  import.meta.url,
);
const FILE = new URL("flux-2-klein-4b-contract.json", DIRECTORY);
export class ImageContractError extends Error {}
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isSchema(value) {
  try {
    return isObject(typeof value === "string" ? JSON.parse(value) : value);
  } catch {
    return false;
  }
}
async function writeArtifact(artifact) {
  await mkdir(DIRECTORY, { recursive: true });
  await writeFile(FILE, JSON.stringify(artifact, null, 2) + "\n");
}
function bindingFlags(bindings, name, expectedType) {
  const named = bindings.filter((binding) => binding?.name === name);
  return {
    name,
    expectedType,
    present: named.length > 0,
    available: named.length === 1 && named[0].type === expectedType,
  };
}
// Two fixed metadata GETs only. There is no model-run endpoint, deployment CLI,
// billing API, secret lookup, binding mutation, fallback model or retry path.
export async function checkImageContract({
  token = process.env.CLOUDFLARE_API_TOKEN,
  fetch = globalThis.fetch,
  write = writeArtifact,
  now = Date.now,
  log = console.log,
} = {}) {
  const credential = typeof token === "string" ? token.trim() : "";
  if (!credential)
    throw new ImageContractError("Repository API token is missing.");
  if (/\s/.test(credential))
    throw new ImageContractError("Repository API token format is invalid.");
  async function read(url, maxBytes, label) {
    let response;
    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "error",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${credential}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ImageContractError(`${label} request failed.`);
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new ImageContractError(
        `${label} request failed (HTTP ${response.status}).`,
      );
    }
    let payload;
    try {
      payload = await readJson(response, maxBytes, 10000);
    } catch {
      throw new ImageContractError(
        `${label} response is invalid or oversized.`,
      );
    }
    if (payload?.success !== true || !isObject(payload.result))
      throw new ImageContractError(`${label} response was rejected.`);
    return payload.result;
  }
  const schemaURL = new URL(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/models/schema`,
  );
  schemaURL.searchParams.set("model", MODEL);
  const schema = await read(
    schemaURL.href,
    SCHEMA_LIMIT,
    "Public image model schema",
  );
  if (
    !isSchema(schema.input) ||
    !isSchema(schema.output) ||
    (schema.model !== undefined && schema.model !== MODEL)
  )
    throw new ImageContractError(
      "Public image model schema contract is invalid.",
    );
  // The complete schema is public metadata. Reject an unexpected credential echo
  // before retaining it; never log the response itself or account configuration.
  if (JSON.stringify(schema).includes(credential))
    throw new ImageContractError(
      "Public image model schema contains disallowed credential data.",
    );
  const settings = await read(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/settings`,
    65536,
    "Worker binding metadata",
  );
  if (!Array.isArray(settings.bindings))
    throw new ImageContractError("Worker binding metadata is invalid.");
  const artifact = {
    model: MODEL,
    observedAt: new Date(now()).toISOString(),
    schema,
    worker: {
      name: WORKER,
      bindings: {
        AI: bindingFlags(settings.bindings, "AI", "ai"),
        QUOTA: bindingFlags(
          settings.bindings,
          "QUOTA",
          "durable_object_namespace",
        ),
        IMAGES: bindingFlags(settings.bindings, "IMAGES", "images"),
      },
      anyImagesBinding: settings.bindings.some(
        (binding) => binding?.type === "images",
      ),
    },
    liveImageReady: false,
    inferencePerformed: false,
    bindingChangesPerformed: false,
  };
  if (JSON.stringify(artifact).includes(credential))
    throw new ImageContractError(
      "Public image contract artifact contains disallowed credential data.",
    );
  try {
    await write(artifact);
  } catch {
    throw new ImageContractError(
      "Public image contract artifact could not be written.",
    );
  }
  log(
    "PASS: Complete public FLUX.2 Klein 4B schema and safe binding-availability flags saved.",
  );
  log(
    "No inference, deployment, binding change or billing operation was performed. Live image readiness is not established.",
  );
  return artifact;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await checkImageContract();
  } catch (error) {
    console.error(
      error instanceof ImageContractError
        ? error.message
        : "Public image model contract retrieval failed. Raw output was withheld.",
    );
    process.exitCode = 1;
  }
}
