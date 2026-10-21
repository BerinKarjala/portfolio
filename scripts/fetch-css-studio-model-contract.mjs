import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readJson } from "../src/shared/studioTransfer.js";

const MODEL = "@cf/openai/gpt-oss-20b";
const ACCOUNT = "d33da711f0acb00005de85f10c11ab0f";
const SCHEMA_LIMIT = 2 * 1024 * 1024;
const ARTIFACT_DIRECTORY = new URL(
  "../artifacts/css-studio-model-contract/",
  import.meta.url,
);
const ARTIFACT_FILE = new URL("gpt-oss-20b-schema.json", ARTIFACT_DIRECTORY);

class ModelContractError extends Error {}

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

async function writeArtifact(value) {
  await mkdir(ARTIFACT_DIRECTORY, { recursive: true });
  await writeFile(ARTIFACT_FILE, JSON.stringify(value, null, 2) + "\n");
}

// The endpoint and model are fixed. This script performs one read-only metadata
// request; it cannot call a model, deploy a Worker, or change account settings.
export async function fetchModelContract({
  token = process.env.CLOUDFLARE_API_TOKEN,
  fetch = globalThis.fetch,
  write = writeArtifact,
  now = Date.now,
  log = console.log,
} = {}) {
  const credential = typeof token === "string" ? token.trim() : "";
  if (!credential)
    throw new ModelContractError("Repository API token is missing.");
  if (/\s/.test(credential))
    throw new ModelContractError("Repository API token format is invalid.");

  const url = new URL(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/models/schema`,
  );
  url.searchParams.set("model", MODEL);
  let response;
  try {
    response = await fetch(url.href, {
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
    throw new ModelContractError("Public model schema request failed.");
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw new ModelContractError(
      `Public model schema request failed (HTTP ${response.status}).`,
    );
  }

  let payload;
  try {
    payload = await readJson(response, SCHEMA_LIMIT, 10000);
  } catch {
    throw new ModelContractError(
      "Public model schema response is invalid or exceeds 2 MiB.",
    );
  }
  const result = payload?.result;
  if (
    payload?.success !== true ||
    !isObject(result) ||
    !isSchema(result.input) ||
    !isSchema(result.output) ||
    (result.model !== undefined && result.model !== MODEL)
  ) {
    throw new ModelContractError("Public model schema contract is invalid.");
  }
  const artifact = {
    model: MODEL,
    observedAt: new Date(now()).toISOString(),
    schema: result,
  };
  // Preserve the complete public schema, but never persist an echoed credential.
  if (JSON.stringify(artifact).includes(credential)) {
    throw new ModelContractError(
      "Public model schema response contains disallowed credential data.",
    );
  }
  try {
    await write(artifact);
  } catch {
    throw new ModelContractError(
      "Public model schema artifact could not be written.",
    );
  }
  log("PASS: complete GPT model schema saved; no inference requested.");
  return artifact;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await fetchModelContract();
  } catch (error) {
    console.error(
      error instanceof ModelContractError
        ? error.message
        : "Public model schema retrieval failed.",
    );
    process.exitCode = 1;
  }
}
