import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readJson } from "../src/shared/studioTransfer.js";
import {
  runProxyCheck,
  ProxyCheckError,
  PROXY_PREVIEW,
  PROXY_BACKEND,
} from "./check-css-studio-proxy.mjs";

const ACCOUNT = "d33da711f0acb00005de85f10c11ab0f";
const WORKER = "css-studio-ai";
const APP_ORIGIN = "https://berinkarjala.netlify.app";
const CONFIG = "server/css-studio/wrangler.proxy.toml";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLI = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);

function ensure(condition, message) {
  if (!condition) throw new ProxyCheckError(message);
}
function uniqueBinding(bindings, name, type) {
  const matching = bindings.filter((binding) => binding.name === name);
  return matching.length === 1 && matching[0].type === type
    ? matching[0]
    : null;
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
    (!requireImages || uniqueBinding(bindings, "IMAGES", "images"))
  );
}
function quotaBinding(bindings) {
  const quota = uniqueBinding(bindings, "QUOTA", "durable_object_namespace");
  ensure(
    quota &&
      quota.class_name === "QuotaAuthority" &&
      typeof quota.namespace_id === "string" &&
      quota.namespace_id.length > 0 &&
      !quota.environment &&
      (!quota.script_name || quota.script_name === WORKER),
    "Existing quota namespace is missing or incompatible; it will not be created or replaced.",
  );
  return quota;
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

// The default check and CLI use session/status only. A reviewed caller may supply
// an explicit check; this module never imports or retries an inference runner.
export async function deployProxyCheck({
  token = process.env.CLOUDFLARE_API_TOKEN,
  fetch = globalThis.fetch,
  cli = defaultCli,
  check = runProxyCheck,
  randomSecret = () => randomBytes(32).toString("hex"),
  now = Date.now,
  log = console.log,
} = {}) {
  const credential = typeof token === "string" ? token.trim() : "";
  ensure(
    credential && !/\s/.test(credential),
    "CLOUDFLARE_API_TOKEN is missing or malformed.",
  );
  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: credential,
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

  async function settings() {
    let response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/settings`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${credential}` },
          redirect: "error",
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch {
      throw new ProxyCheckError("Cloudflare configuration read failed.");
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new ProxyCheckError(
        `Cloudflare configuration read failed (HTTP ${response.status}).`,
      );
    }
    let payload;
    try {
      payload = await readJson(response, 65536);
    } catch {
      throw new ProxyCheckError(
        "Cloudflare configuration response is invalid or oversized.",
      );
    }
    ensure(
      payload?.success === true && Array.isArray(payload.result?.bindings),
      "Cloudflare configuration read was rejected or invalid.",
    );
    return payload.result.bindings;
  }
  async function command(args, input) {
    let result;
    try {
      result = await cli([...args, "--config", CONFIG], { input, env });
    } catch {
      throw new ProxyCheckError(
        "Cloudflare deployment command failed. Raw output was withheld.",
      );
    }
    ensure(
      result?.status === 0,
      args.includes("--dry-run")
        ? "Worker bundle dry-run failed. No secret or deployment was changed."
        : "Cloudflare deployment command failed. Raw output was withheld; no retry was made.",
    );
  }

  const before = await settings();
  ensure(
    resourceBindingsCompatible(before),
    "Existing Worker resource bindings are incompatible; deployment was not started.",
  );
  ensure(
    uniqueBinding(before, "IDENTITY_SECRET", "secret_text"),
    "Existing identity secret is missing or incompatible; it will not be created or rotated.",
  );
  const namespace = quotaBinding(before).namespace_id;
  ensure(
    uniqueBinding(before, "AI", "ai"),
    "Existing AI binding is missing or incompatible.",
  );
  await command([
    "deploy",
    "--dry-run",
    "--outdir",
    "/tmp/css-studio-proxy-bundle",
  ]);
  log("PASS: Private proxy Worker bundle dry-run completed.");
  const secret = randomSecret();
  ensure(
    typeof secret === "string" && /^[0-9a-f]{64}$/.test(secret),
    "Generated private proxy credential is invalid.",
  );
  await command(["secret", "put", "CANARY_SECRET"], secret + "\n");
  await command(["deploy"]);

  const after = await settings();
  ensure(
    resourceBindingsCompatible(after, true),
    "Deployed Worker resource bindings are invalid; the browser check was not started.",
  );
  ensure(
    quotaBinding(after).namespace_id === namespace,
    "Quota namespace changed unexpectedly; the browser check was not started.",
  );
  ensure(
    uniqueBinding(after, "IDENTITY_SECRET", "secret_text") &&
      uniqueBinding(after, "CANARY_SECRET", "secret_text") &&
      uniqueBinding(after, "AI", "ai"),
    "Deployed private bindings are invalid; the browser check was not started.",
  );
  for (const [name, expected] of [
    ["APP_ORIGIN", APP_ORIGIN],
    ["ENDPOINT_ORIGIN", PROXY_BACKEND],
    ["CANARY_APP_ORIGIN", PROXY_PREVIEW],
    ["CANARY_MODEL", "llama"],
  ]) {
    ensure(
      uniqueBinding(after, name, "plain_text")?.text === expected,
      "Deployed Worker origins or private model do not match the fixed proxy configuration.",
    );
  }
  log(
    "PASS: Private proxy configuration deployed; existing identity and quota namespace preserved.",
  );
  return check({ secret, fetch, now, log });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await deployProxyCheck();
  } catch (error) {
    console.error(
      error instanceof ProxyCheckError
        ? error.message
        : "Private proxy verification failed. Raw output was withheld; no retry was made.",
    );
    process.exitCode = 1;
  }
}
