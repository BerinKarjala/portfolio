import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readJson } from "../src/shared/studioTransfer.js";
import { CLOUDFLARE_THEME_PLAN } from "../server/css-studio/cloudflareProvider.js";
import {
  runCanary,
  CANARY_APP_ORIGIN,
  CANARY_BACKEND,
  CanaryError,
} from "./check-css-studio-canary.mjs";
const ACCOUNT = "d33da711f0acb00005de85f10c11ab0f";
const WORKER = "css-studio-ai";
const CONFIG = "server/css-studio/wrangler.canary.toml";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLI = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const MODEL = "@cf/openai/gpt-oss-20b";
function assert(condition, message) {
  if (!condition) throw new CanaryError(message);
}
function resourceBindingsCompatible(bindings, requireImages = false) {
  const expected = new Map([
    ["AI", "ai"],
    ["QUOTA", "durable_object_namespace"],
    ["IMAGES", "images"],
  ]);
  return (
    bindings.every(
      (binding) =>
        binding &&
        (expected.has(binding.name)
          ? binding.type === expected.get(binding.name)
          : ["secret_text", "plain_text", "json"].includes(binding.type)),
    ) &&
    [...expected].every(
      ([name]) =>
        bindings.filter((binding) => binding.name === name).length <= 1,
    ) &&
    (!requireImages || bindings.some((binding) => binding.name === "IMAGES"))
  );
}
export function summarizeModelSchema(
  result,
  observedAt = new Date().toISOString(),
) {
  const fields = [];
  function walk(value, path = "", depth = 0) {
    if (
      !value ||
      typeof value !== "object" ||
      depth > 12 ||
      fields.length >= 500
    )
      return;
    if (
      value.properties &&
      typeof value.properties === "object" &&
      !Array.isArray(value.properties)
    ) {
      for (const [name, definition] of Object.entries(value.properties)) {
        const item = { path: path || "root", name };
        if (typeof definition?.type === "string") item.type = definition.type;
        if (typeof definition?.maximum === "number")
          item.maximum = definition.maximum;
        if (typeof definition?.minimum === "number")
          item.minimum = definition.minimum;
        if (
          [
            "max_tokens",
            "max_output_tokens",
            "reasoning",
            "output",
            "output_text",
            "usage",
          ].includes(name) &&
          typeof definition?.description === "string"
        )
          item.description = definition.description.slice(0, 2048);
        fields.push(item);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (["example", "examples", "default", "description"].includes(key))
        continue;
      if (
        typeof child === "string" &&
        ["schema", "input_schema", "output_schema"].includes(key) &&
        child.length <= 2 * 1024 * 1024
      ) {
        try {
          walk(JSON.parse(child), `${path}.${key}`, depth + 1);
        } catch {
          /* Public schema may use a non-JSON encoding. */
        }
      } else walk(child, `${path}.${key}`, depth + 1);
    }
  }
  walk(result);
  return { model: MODEL, observedAt, fields };
}
async function defaultCli(args, { input, env }) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    env,
    input,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 4 * 1024 * 1024,
  });
}
async function defaultWriteSummary(value) {
  await mkdir(new URL("../artifacts/css-studio-canary/", import.meta.url), {
    recursive: true,
  });
  await writeFile(
    new URL(
      "../artifacts/css-studio-canary/gpt-oss-schema-contract.json",
      import.meta.url,
    ),
    JSON.stringify(value, null, 2) + "\n",
  );
}
export async function deployCanary({
  token = process.env.CLOUDFLARE_API_TOKEN,
  fetch = globalThis.fetch,
  cli = defaultCli,
  check = runCanary,
  writeSummary = defaultWriteSummary,
  randomSecret = () => randomBytes(32).toString("hex"),
  now = Date.now,
  log = console.log,
} = {}) {
  token = token?.trim();
  assert(
    typeof token === "string" && token.length > 0 && !/\s/.test(token),
    "CLOUDFLARE_API_TOKEN is missing or malformed.",
  );
  assert(
    CLOUDFLARE_THEME_PLAN.verifiedUntil >= now() + 120000,
    "The reviewed model cost plan is expired or too close to expiry.",
  );
  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
    CI: "true",
    WRANGLER_SEND_METRICS: "false",
    WRANGLER_LOG: "error",
  };
  for (const name of [
    "CANARY_SECRET",
    "IDENTITY_SECRET",
    "CLOUDFLARE_API_KEY",
    "CLOUDFLARE_EMAIL",
  ])
    delete env[name];
  async function api(path, maxBytes = 65536) {
    let response;
    try {
      response = await fetch("https://api.cloudflare.com/client/v4" + path, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new CanaryError("Cloudflare configuration read failed.");
    }
    assert(
      response.ok,
      `Cloudflare configuration read failed (HTTP ${response.status}).`,
    );
    let payload;
    try {
      payload = await readJson(response, maxBytes);
    } catch {
      throw new CanaryError(
        "Cloudflare configuration response was invalid or oversized.",
      );
    }
    assert(
      payload?.success === true,
      "Cloudflare configuration read was rejected.",
    );
    return payload.result;
  }
  async function command(args, input) {
    let result;
    try {
      result = await cli([...args, "--config", CONFIG], { input, env });
    } catch {
      throw new CanaryError(
        "Cloudflare deployment command failed. Raw output was withheld.",
      );
    }
    assert(
      result?.status === 0,
      args.includes("--dry-run")
        ? "Worker bundle dry-run failed. No secrets or deployment were changed."
        : "Cloudflare deployment command failed. Raw output was withheld; no inference retry was made.",
    );
  }
  const settings = await api(
    `/accounts/${ACCOUNT}/workers/scripts/${WORKER}/settings`,
  );
  assert(
    Array.isArray(settings?.bindings),
    "The existing Worker settings are invalid.",
  );
  assert(
    resourceBindingsCompatible(settings.bindings),
    "Existing Worker resource bindings are incompatible; deployment was not started.",
  );
  const identities = settings.bindings.filter(
    (binding) => binding.name === "IDENTITY_SECRET",
  );
  assert(
    identities.length <= 1 &&
      identities.every((binding) => binding.type === "secret_text"),
    "Existing identity binding has an unexpected type; it will not be replaced.",
  );
  const quotas = settings.bindings.filter(
    (binding) => binding.name === "QUOTA",
  );
  assert(
    quotas.length <= 1 &&
      quotas.every(
        (binding) =>
          binding.type === "durable_object_namespace" &&
          binding.class_name === "QuotaAuthority" &&
          typeof binding.namespace_id === "string" &&
          binding.namespace_id.length > 0 &&
          !binding.environment &&
          (!binding.script_name || binding.script_name === WORKER),
      ),
    "Existing quota binding is incompatible; its namespace will not be replaced.",
  );
  const priorNamespace = quotas[0]?.namespace_id;
  await command([
    "deploy",
    "--dry-run",
    "--outdir",
    "/tmp/css-studio-canary-bundle",
  ]);
  log("PASS: Private Worker bundle dry-run completed.");
  const schema = await api(
    `/accounts/${ACCOUNT}/ai/models/schema?model=${encodeURIComponent(MODEL)}`,
    2 * 1024 * 1024,
  );
  const summary = summarizeModelSchema(schema, new Date(now()).toISOString());
  assert(
    summary.fields.length > 0,
    "The model-schema field contract could not be projected. No secrets or deployment were changed.",
  );
  await writeSummary(summary);
  log("PASS: GPT-OSS schema field contract recorded without inference.");
  if (!identities.length) {
    const identity = randomSecret();
    assert(
      /^[0-9a-f]{64}$/.test(identity),
      "Generated identity credential is invalid.",
    );
    await command(["secret", "put", "IDENTITY_SECRET"], identity + "\n");
    log(
      "PASS: Initial identity secret provisioned; future deployments preserve it.",
    );
  } else log("PASS: Existing identity secret preserved.");
  const secret = randomSecret();
  assert(
    /^[0-9a-f]{64}$/.test(secret),
    "Generated canary credential is invalid.",
  );
  await command(["secret", "put", "CANARY_SECRET"], secret + "\n");
  await command(["deploy"]);
  const deployed = await api(
    `/accounts/${ACCOUNT}/workers/scripts/${WORKER}/settings`,
  );
  const bindings = deployed?.bindings;
  assert(Array.isArray(bindings), "Deployed Worker settings are invalid.");
  assert(
    resourceBindingsCompatible(bindings, true),
    "Deployed Worker resource bindings are invalid; no verification was started.",
  );
  const quota = bindings.find((binding) => binding.name === "QUOTA");
  assert(
    quota?.type === "durable_object_namespace" &&
      quota.class_name === "QuotaAuthority" &&
      typeof quota.namespace_id === "string" &&
      quota.namespace_id.length > 0 &&
      !quota.environment &&
      (!priorNamespace || quota.namespace_id === priorNamespace),
    "Quota namespace changed unexpectedly; no inference was started.",
  );
  assert(
    bindings.some(
      (binding) =>
        binding.name === "IDENTITY_SECRET" && binding.type === "secret_text",
    ) &&
      bindings.some(
        (binding) =>
          binding.name === "CANARY_SECRET" && binding.type === "secret_text",
      ) &&
      bindings.some(
        (binding) => binding.name === "AI" && binding.type === "ai",
      ),
    "Required private Worker bindings were not retained.",
  );
  assert(
    bindings.some(
      (binding) =>
        binding.name === "APP_ORIGIN" &&
        binding.type === "plain_text" &&
        binding.text === CANARY_APP_ORIGIN,
    ) &&
      bindings.some(
        (binding) =>
          binding.name === "ENDPOINT_ORIGIN" &&
          binding.type === "plain_text" &&
          binding.text === CANARY_BACKEND,
      ),
    "Deployed Worker origins do not match the fixed canary configuration.",
  );
  log("PASS: Private canary deployed with durable quota identity preserved.");
  return check({ secret, fetch, now, log });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await deployCanary();
  } catch (error) {
    console.error(
      error instanceof CanaryError
        ? error.message
        : "Private canary deployment failed. Raw output was withheld.",
    );
    process.exitCode = 1;
  }
}
