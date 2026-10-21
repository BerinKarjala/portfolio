import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { readJson } from "../src/shared/studioTransfer.js";
import { validateOutput } from "../server/css-studio/protocol.js";

export const CANARY_BACKEND = "https://css-studio-ai.berin-karjala.workers.dev";
export const CANARY_APP_ORIGIN = "https://berinkarjala.netlify.app";
export const CANARY_COST = 1000;
export class CanaryError extends Error {}
const fixtures = [
  {
    label: "season-high-contrast",
    prompt:
      "Propose a calm winter palette with readable high-contrast dark colors.",
    context: { family: "seasons", id: "winter", mode: "dark", contrast: true },
  },
  {
    label: "holiday-light",
    prompt:
      "Propose a warm Diwali palette for a readable light appearance. Return only safe design tokens.",
    context: {
      family: "holidays",
      id: "diwali",
      mode: "light",
      contrast: false,
    },
  },
];
function assert(condition, message) {
  if (!condition) throw new CanaryError(message);
}
function snapshot(value) {
  assert(
    value &&
      typeof value.available === "boolean" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.day),
    "Canary status response is invalid.",
  );
  for (const [key, maximum] of [
    ["prompts", 10],
    ["images", 3],
  ])
    assert(
      Number.isInteger(value.remaining?.[key]) &&
        value.remaining[key] >= 0 &&
        value.remaining[key] <= maximum,
      "Canary browser allowance is invalid.",
    );
  assert(
    Number.isInteger(value.sharedRemaining) &&
      value.sharedRemaining >= 0 &&
      value.sharedRemaining <= 8000,
    "Canary shared allowance is invalid.",
  );
  return value;
}
export async function runCanary({
  secret,
  fetch = globalThis.fetch,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  makeId = randomUUID,
  log = console.log,
} = {}) {
  assert(
    typeof secret === "string" && /^[0-9a-f]{64}$/.test(secret),
    "Private canary credential is missing or invalid.",
  );
  const started = now();
  const midnight = Math.floor(started / 86400000) * 86400000 + 86400000;
  assert(
    midnight - started >= 120000,
    "Canary will not start within two minutes of UTC midnight.",
  );
  let cookie = "";
  async function request(path, { body, privateRequest = true } = {}) {
    const headers = new Headers({
      Origin: CANARY_APP_ORIGIN,
      "X-CSS-Studio": "1",
    });
    if (privateRequest) headers.set("X-CSS-Studio-Canary", secret);
    if (privateRequest && cookie) headers.set("Cookie", cookie);
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
      throw new CanaryError(
        "Canary request did not finish. No retry was made.",
      );
    }
    assert(
      response.ok,
      `Canary request failed (HTTP ${response.status}). No retry was made.`,
    );
    assert(
      /(?:^|,)\s*no-store\b/i.test(response.headers.get("cache-control") || ""),
      "Canary response is missing no-store.",
    );
    let value;
    try {
      value = await readJson(response);
    } catch {
      throw new CanaryError(
        "Canary returned an invalid or oversized response.",
      );
    }
    return { value, response };
  }
  const publicStatus = await request("status", { privateRequest: false });
  assert(
    publicStatus.value?.available === false,
    "Public inference must remain unavailable during canary evaluation.",
  );
  const session = await request("session", { body: {} });
  assert(
    session.value?.available === true,
    "Private canary session is unavailable.",
  );
  const cookies =
    typeof session.response.headers.getSetCookie === "function"
      ? session.response.headers.getSetCookie()
      : [session.response.headers.get("set-cookie")].filter(Boolean);
  assert(
    cookies.length === 1 &&
      /^__Host-css-studio=[^;\s]+;/.test(cookies[0]) &&
      /;\s*Secure(?:;|$)/i.test(cookies[0]) &&
      /;\s*HttpOnly(?:;|$)/i.test(cookies[0]) &&
      /;\s*SameSite=Strict(?:;|$)/i.test(cookies[0]) &&
      /;\s*Path=\/(?:;|$)/i.test(cookies[0]) &&
      !/;\s*Domain=/i.test(cookies[0]),
    "Canary did not receive the required private session cookie.",
  );
  cookie = cookies[0].split(";")[0];
  let before = snapshot((await request("status")).value);
  assert(
    before.available &&
      Array.isArray(before.operations) &&
      before.operations.length === 1 &&
      before.operations[0] === "theme",
    "Canary requires a ready theme-only provider.",
  );
  assert(
    before.remaining.prompts >= fixtures.length &&
      before.sharedRemaining >= CANARY_COST * fixtures.length,
    "Insufficient allowance for both canary fixtures; no inference was started.",
  );
  const day = before.day;
  const records = [];
  for (let index = 0; index < fixtures.length; index++) {
    if (index) await sleep(5100);
    assert(
      before.available &&
        before.remaining.prompts >= 1 &&
        before.sharedRemaining >= CANARY_COST,
      "Canary allowance became unavailable; no further inference was started.",
    );
    assert(
      new Date(now()).toISOString().slice(0, 10) === day,
      "UTC day changed; canary stopped without retry.",
    );
    const fixture = fixtures[index],
      id = makeId(),
      began = now();
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
      "Canary proposal request identity did not match.",
    );
    try {
      validateOutput({ message: result.message, overrides: result.overrides });
    } catch {
      throw new CanaryError("Canary proposal failed safe-token validation.");
    }
    const after = snapshot((await request("status")).value);
    assert(after.day === day, "UTC day changed; canary stopped without retry.");
    assert(
      after.remaining.prompts === before.remaining.prompts - 1 &&
        after.remaining.images === before.remaining.images,
      "Canary browser accounting did not match one theme admission.",
    );
    assert(
      after.sharedRemaining <= before.sharedRemaining - CANARY_COST,
      "Canary shared accounting did not retain the conservative charge.",
    );
    const record = {
      fixture: fixture.label,
      valid: true,
      latencyMs: Math.max(0, now() - began),
      remainingPrompts: after.remaining.prompts,
      sharedRemaining: after.sharedRemaining,
    };
    records.push(record);
    log(JSON.stringify(record));
    before = after;
  }
  const finalPublic = await request("status", { privateRequest: false });
  assert(
    finalPublic.value?.available === false,
    "Public inference must remain unavailable after evaluation.",
  );
  log(
    "PASS: Two private quota-accounted fixtures completed. Public inference remains unavailable.",
  );
  return {
    calls: records.length,
    reservedNeurons: CANARY_COST * records.length,
    sharedRemaining: before.sharedRemaining,
    records,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await runCanary({ secret: process.env.CANARY_SECRET });
  } catch (error) {
    console.error(
      error instanceof CanaryError
        ? error.message
        : "Private canary verification failed. No retry was made.",
    );
    process.exitCode = 1;
  }
}
