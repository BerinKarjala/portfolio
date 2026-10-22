import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { readJson } from "../src/shared/studioTransfer.js";
import { validateOutput } from "../server/css-studio/protocol.js";
import { UUID } from "../server/css-studio/quota.js";
import {
  GPT_THEME_MODEL,
  GPT_THEME_PLAN,
} from "../server/css-studio/gptProvider.js";
import {
  CANARY_BACKEND,
  CANARY_APP_ORIGIN,
} from "./check-css-studio-canary.mjs";

export class GptCheckError extends Error {
  constructor(message) {
    super(message);
    this.name = "GptCheckError";
  }
}
const COST = 4000;
const fixture = Object.freeze({
  label: "season-high-contrast",
  prompt:
    "Propose a calm winter palette with readable high-contrast dark colors.",
  context: Object.freeze({
    family: "seasons",
    id: "winter",
    mode: "dark",
    contrast: true,
  }),
});
function assert(condition, message) {
  if (!condition) throw new GptCheckError(message);
}
function snapshot(value) {
  assert(
    value &&
      typeof value.available === "boolean" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.day),
    "GPT canary status response is invalid.",
  );
  for (const [key, maximum] of [
    ["prompts", 10],
    ["images", 3],
  ])
    assert(
      Number.isInteger(value.remaining?.[key]) &&
        value.remaining[key] >= 0 &&
        value.remaining[key] <= maximum,
      "GPT canary browser allowance is invalid.",
    );
  assert(
    Number.isInteger(value.sharedRemaining) &&
      value.sharedRemaining >= 0 &&
      value.sharedRemaining <= 8000,
    "GPT canary shared allowance is invalid.",
  );
  return value;
}
function sessionCookie(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  assert(
    values.length === 1,
    "GPT canary did not receive one private session cookie.",
  );
  const [value, ...rawAttributes] = values[0]
    .split(";")
    .map((part) => part.trim());
  assert(
    /^__Host-css-studio=[A-Za-z0-9._-]+$/.test(value),
    "GPT canary session cookie has an invalid identity.",
  );
  const attributes = new Map();
  for (const raw of rawAttributes) {
    if (!raw) continue;
    const at = raw.indexOf("="),
      name = (at < 0 ? raw : raw.slice(0, at)).toLowerCase();
    assert(
      !attributes.has(name),
      "GPT canary cookie has duplicate attributes.",
    );
    attributes.set(name, at < 0 ? null : raw.slice(at + 1));
  }
  assert(
    attributes.get("path") === "/" &&
      attributes.has("secure") &&
      attributes.get("secure") === null &&
      attributes.has("httponly") &&
      attributes.get("httponly") === null &&
      attributes.get("samesite")?.toLowerCase() === "strict" &&
      !attributes.has("domain"),
    "GPT canary cookie is missing its required host security attributes.",
  );
  return value;
}
function rawContrast(text, background) {
  const luminance = (color) => {
    const rgb = [1, 3, 5]
      .map((at) => parseInt(color.slice(at, at + 2), 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const a = luminance(text),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
async function writePublicSummary(summary) {
  const directory = new URL(
    "../artifacts/css-studio-evaluation/",
    import.meta.url,
  );
  await mkdir(directory, { recursive: true });
  await writeFile(
    new URL("gpt-winter.json", directory),
    JSON.stringify(summary, null, 2) + "\n",
  );
}
// Importing this module never performs inference. Its deployment caller explicitly
// invokes this one-fixture check after the private endpoint/proxy preflight.
export async function runGptCheck({
  secret,
  fetch = globalThis.fetch,
  now = Date.now,
  makeId = randomUUID,
  log = console.log,
  writeSummary = writePublicSummary,
} = {}) {
  assert(
    typeof secret === "string" && /^[0-9a-f]{64}$/.test(secret),
    "Private GPT canary credential is missing or invalid.",
  );
  const started = now(),
    midnight = Math.floor(started / 86400000) * 86400000 + 86400000;
  assert(
    Number.isFinite(started) && midnight - started >= 120000,
    "GPT canary will not start within two minutes of UTC midnight.",
  );
  assert(
    GPT_THEME_PLAN.reservedNeurons === COST &&
      GPT_THEME_PLAN.verifiedUntil >= started + 120000,
    "The reviewed GPT reservation plan is expired or changed.",
  );
  let cookie = "";
  async function request(path, { body, privateRequest = true } = {}) {
    const headers = new Headers({
      Origin: CANARY_APP_ORIGIN,
      "X-CSS-Studio": "1",
    });
    if (privateRequest) {
      headers.set("X-CSS-Studio-Canary", secret);
      headers.set("X-CSS-Studio-Canary-Model", "gpt-oss-20b");
      if (cookie) headers.set("Cookie", cookie);
    }
    if (body) headers.set("Content-Type", "application/json");
    let response;
    try {
      response = await fetch(CANARY_BACKEND + "/api/css-studio/" + path, {
        method: body ? "POST" : "GET",
        headers,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new GptCheckError(
        "GPT canary request did not finish. No retry was made.",
      );
    }
    assert(
      response.ok,
      `GPT canary request failed (HTTP ${response.status}). No retry was made.`,
    );
    assert(
      /(?:^|,)\s*no-store\b/i.test(response.headers.get("cache-control") || ""),
      "GPT canary response is missing no-store.",
    );
    let value;
    try {
      value = await readJson(response);
    } catch {
      throw new GptCheckError(
        "GPT canary returned an invalid or oversized response. No retry was made.",
      );
    }
    return { value, response };
  }
  const publicBefore = await request("status", { privateRequest: false });
  assert(
    publicBefore.value?.available === false,
    "Public inference must remain unavailable before GPT evaluation.",
  );
  const opened = await request("session", { body: {} });
  assert(
    opened.value?.available === true,
    "Private GPT canary session is unavailable.",
  );
  cookie = sessionCookie(opened.response);
  const before = snapshot((await request("status")).value);
  assert(
    before.available &&
      Array.isArray(before.operations) &&
      before.operations.length === 1 &&
      before.operations[0] === "theme",
    "GPT canary requires a ready theme-only provider.",
  );
  assert(
    before.remaining.prompts >= 1 && before.sharedRemaining >= COST,
    "Insufficient allowance for the GPT fixture; no inference was started.",
  );
  assert(
    new Date(now()).toISOString().slice(0, 10) === before.day,
    "UTC day changed; GPT canary stopped before inference.",
  );
  const id = makeId();
  assert(UUID.test(id), "GPT canary request identity is invalid.");
  const began = now();
  const result = (
    await request("propose", {
      body: {
        id,
        operation: "theme",
        prompt: fixture.prompt,
        context: fixture.context,
        history: [],
      },
    })
  ).value;
  assert(
    result?.requestId === id,
    "GPT canary proposal request identity did not match.",
  );
  let proposal;
  try {
    proposal = validateOutput({
      message: result.message,
      overrides: result.overrides,
    });
  } catch {
    throw new GptCheckError(
      "GPT canary proposal failed safe-token validation.",
    );
  }
  const after = snapshot((await request("status")).value);
  assert(
    after.day === before.day &&
      new Date(now()).toISOString().slice(0, 10) === before.day,
    "UTC day changed; GPT canary stopped without retry.",
  );
  assert(
    after.available &&
      after.remaining.prompts === before.remaining.prompts - 1 &&
      after.remaining.images === before.remaining.images,
    "GPT canary browser accounting did not match one completed theme admission.",
  );
  assert(
    after.sharedRemaining <= before.sharedRemaining - COST,
    "GPT canary shared accounting did not retain the conservative charge.",
  );
  // Match the existing Llama fixture's submission-through-accounting timing.
  const latencyMs = Math.max(0, now() - began);
  assert(
    Number.isFinite(latencyMs),
    "GPT canary latency measurement is invalid.",
  );
  const publicAfter = await request("status", { privateRequest: false });
  assert(
    publicAfter.value?.available === false,
    "Public inference must remain unavailable after GPT evaluation.",
  );
  const summary = {
    model: GPT_THEME_MODEL,
    fixture: fixture.label,
    calls: 1,
    latencyMs,
    reservedNeurons: COST,
    reservationIsActualUsage: false,
    sharedRemaining: after.sharedRemaining,
    remainingPrompts: after.remaining.prompts,
    overrides: proposal.overrides,
    ...(proposal.overrides.text && proposal.overrides.background
      ? {
          rawTextBackgroundContrast: rawContrast(
            proposal.overrides.text,
            proposal.overrides.background,
          ),
        }
      : {}),
    winnerEstablished: false,
  };
  const serialized = JSON.stringify(summary),
    cookieValue = cookie.slice(cookie.indexOf("=") + 1);
  assert(
    !serialized.includes(secret) &&
      !serialized.includes(cookie) &&
      !serialized.includes(cookieValue),
    "GPT evaluation summary unexpectedly contains private credential data.",
  );
  try {
    await writeSummary(summary);
  } catch {
    throw new GptCheckError(
      "GPT evaluation summary could not be saved. No retry was made.",
    );
  }
  log(serialized);
  log(
    "PASS: One private GPT fixture completed. Public inference remains unavailable. The reservation is not measured usage and no model winner is established.",
  );
  return summary;
}
