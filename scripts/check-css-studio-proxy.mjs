import { pathToFileURL } from "node:url";
import { readJson, readBytes } from "../src/shared/studioTransfer.js";

export const PROXY_PREVIEW =
  "https://deploy-preview-245--berinkarjala.netlify.app";
export const PROXY_BACKEND = "https://css-studio-ai.berin-karjala.workers.dev";
const FOREIGN_ORIGIN = "https://css-studio-cross-origin.invalid";
const COOKIE_NAME = "__Host-css-studio";
const API = "/api/css-studio/";
const PROBE_HEADER = "x-css-studio-proxy-probe";
export class ProxyCheckError extends Error {
  constructor(message, category) {
    super(message);
    this.category = category;
  }
}

// Native Playwright messages can contain private URLs, headers and cookies.
// Match known conditions internally and return only these fixed categories.
function nativeCategory(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  for (const [needle, category] of [
    ["net::ERR_CERT_", "network-tls"],
    ["net::ERR_SSL_", "network-tls"],
    ["net::ERR_NAME_NOT_RESOLVED", "network-dns"],
    ["net::ERR_CONNECTION_REFUSED", "network-refused"],
    ["net::ERR_CONNECTION_RESET", "network-reset"],
    ["net::ERR_TIMED_OUT", "network-timeout"],
    ["net::ERR_BLOCKED_", "network-blocked"],
    ["net::ERR_TOO_MANY_REDIRECTS", "network-redirect"],
    ["net::ERR_ABORTED", "network-aborted"],
    ["net::ERR_FAILED", "network-failed"],
    ["Executable doesn't exist", "browser-executable"],
    ["Host system is missing dependencies", "browser-dependencies"],
    ["error while loading shared libraries", "browser-dependencies"],
    ["Target page, context or browser has been closed", "browser-closed"],
    ["Execution context was destroyed", "execution-context"],
    ["Failed to fetch", "fetch-failed"],
    ["NetworkError when attempting to fetch resource", "fetch-failed"],
  ]) {
    if (message.includes(needle)) return category;
  }
  if (error?.name === "TimeoutError") return "timeout";
  if (error?.name === "AbortError") return "aborted";
  if (error?.name === "TypeError" || message.includes("TypeError:"))
    return "type-error";
  if (error?.name === "RangeError") return "range-error";
  return "native-error";
}

function requireCheck(condition, message) {
  if (!condition) throw new ProxyCheckError(message);
}

// No credentials are needed to classify requests. No forwarded host is trusted.
export function classifyProxyRequest({
  url,
  method,
  phase,
  marked = false,
  redirected = false,
}) {
  let target;
  try {
    target = new URL(url);
  } catch {
    return "deny";
  }
  if (redirected) return "deny";
  if (
    target.origin === FOREIGN_ORIGIN &&
    target.pathname === "/" &&
    !target.search &&
    method === "GET" &&
    phase === "cross-origin"
  )
    return "fixture";
  if (!target.pathname.startsWith("/api/css-studio")) return "resource";
  if (target.origin !== PROXY_PREVIEW || target.search || target.hash)
    return "deny";
  const status = target.pathname === API + "status" && method === "GET";
  const session = target.pathname === API + "session" && method === "POST";
  if (status && !marked) return "public";
  if (phase === "private" && marked && (status || session)) return "private";
  if (phase === "cross-origin" && session) return "cross-origin-check";
  return "deny";
}

function validateSnapshot(value, day) {
  requireCheck(
    value?.available === true &&
      value.day === day &&
      Array.isArray(value.operations) &&
      value.operations.length === 1 &&
      value.operations[0] === "theme",
    "Private proxy status is unavailable or invalid.",
  );
  for (const [key, maximum] of [
    ["prompts", 10],
    ["images", 3],
  ])
    requireCheck(
      Number.isInteger(value.remaining?.[key]) &&
        value.remaining[key] >= 0 &&
        value.remaining[key] <= maximum,
      "Private proxy allowance is invalid.",
    );
  requireCheck(
    Number.isInteger(value.sharedRemaining) &&
      value.sharedRemaining >= 0 &&
      value.sharedRemaining <= 8000,
    "Private proxy shared allowance is invalid.",
  );
  return {
    day: value.day,
    prompts: value.remaining.prompts,
    images: value.remaining.images,
    sharedRemaining: value.sharedRemaining,
  };
}

function sameSnapshot(a, b) {
  return (
    a.day === b.day &&
    a.prompts === b.prompts &&
    a.images === b.images &&
    a.sharedRemaining === b.sharedRemaining
  );
}

export async function runProxyCheck({
  secret,
  chromium,
  fetch = globalThis.fetch,
  now = Date.now,
  log = console.log,
} = {}) {
  requireCheck(
    typeof secret === "string" && /^[0-9a-f]{64}$/.test(secret),
    "Private proxy credential is missing or invalid.",
  );
  let browser,
    stage = "preflight";
  try {
    const started = now(),
      day = new Date(started).toISOString().slice(0, 10);
    requireCheck(
      86400000 - (started % 86400000) >= 120000,
      "Proxy verification will not start near UTC midnight.",
    );
    async function publicStatus(origin) {
      let response, value;
      try {
        response = await fetch(origin + API + "status", {
          method: "GET",
          redirect: "error",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15000),
        });
        requireCheck(
          response.ok &&
            /(?:^|,)\s*no-store\b/i.test(
              response.headers.get("cache-control") || "",
            ),
          "Public proxy status is unavailable or cacheable.",
        );
        value = await readJson(response, 4096);
      } catch (error) {
        if (error instanceof ProxyCheckError) throw error;
        throw new ProxyCheckError(
          "Public proxy status verification failed.",
          nativeCategory(error),
        );
      }
      requireCheck(
        value?.available === false,
        "Public inference must remain unavailable.",
      );
    }
    stage = "public-preview-before";
    await publicStatus(PROXY_PREVIEW);
    stage = "public-worker-before";
    await publicStatus(PROXY_BACKEND);
    stage = "load-playwright";
    const browserType = chromium || (await import("@playwright/test")).chromium;
    stage = "browser-launch";
    browser = await browserType.launch({
      env: Object.fromEntries(
        Object.entries(process.env).filter(
          ([name]) =>
            ![
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_KEY",
              "CLOUDFLARE_EMAIL",
              "CANARY_SECRET",
              "IDENTITY_SECRET",
            ].includes(name),
        ),
      ),
    });
    stage = "browser-context";
    const context = await browser.newContext({ serviceWorkers: "block" });
    let phase = "loading",
      blocked = false,
      crossRequestSafe = false,
      crossReply,
      routeFailure = "none";
    stage = "request-guard";
    context.on("response", (response) => {
      if ([301, 302, 303, 307, 308].includes(response.status())) blocked = true;
    });
    await context.route("**/*", async (route) => {
      try {
        const request = route.request(),
          headers = await request.allHeaders();
        const classification = classifyProxyRequest({
          url: request.url(),
          method: request.method(),
          phase,
          marked: headers[PROBE_HEADER] === "1",
          redirected: Boolean(request.redirectedFrom()),
        });
        if (
          classification === "deny" ||
          Object.keys(headers).some(
            (name) => name.toLowerCase() === "x-css-studio-canary",
          )
        ) {
          blocked = true;
          await route.abort("blockedbyclient");
          return;
        }
        if (classification === "fixture") {
          await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: "<!doctype html><title>Foreign origin fixture</title><main>Foreign origin fixture</main>",
          });
          return;
        }
        if (classification === "private") {
          await route.continue({
            headers: { ...headers, "X-CSS-Studio-Canary": secret },
          });
          return;
        }
        if (classification === "cross-origin-check") {
          crossRequestSafe =
            !headers.cookie &&
            headers.origin === FOREIGN_ORIGIN &&
            headers["sec-fetch-site"] === "cross-site";
          if (!crossRequestSafe) {
            blocked = true;
            await route.abort("blockedbyclient");
            return;
          }
          const upstream = await fetch(PROXY_PREVIEW + API + "session", {
            method: "POST",
            redirect: "error",
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
            headers: {
              Origin: headers.origin,
              "Sec-Fetch-Site": headers["sec-fetch-site"],
              "X-CSS-Studio-Canary": secret,
              "X-CSS-Studio": "1",
              "content-type": "application/json",
            },
            body: "{}",
          });
          // Chromium may hide an opaque JSON rejection from response events.
          // Inspect this exact intercepted request's upstream response before
          // delivering it, without relying on page access to forbidden data.
          crossReply = {
            status: upstream.status,
            hasCookie: upstream.headers.has("set-cookie"),
          };
          if (crossReply.status !== 403 || crossReply.hasCookie) {
            blocked = true;
            await upstream.body?.cancel();
            await route.abort("blockedbyclient");
            return;
          }
          const bytes = await readBytes(upstream, 4096);
          try {
            crossReply.backendRejected =
              JSON.parse(
                new TextDecoder("utf-8", { fatal: true }).decode(bytes),
              )?.error === "Use the same-origin Studio endpoint.";
          } catch {
            crossReply.backendRejected = false;
          }
          const responseHeaders = new Headers(upstream.headers);
          responseHeaders.delete("content-encoding");
          responseHeaders.delete("content-length");
          await route.fulfill({
            status: upstream.status,
            headers: Object.fromEntries(responseHeaders),
            body: Buffer.from(bytes),
          });
          return;
        }
        await route.continue();
      } catch (error) {
        blocked = true;
        routeFailure = nativeCategory(error);
        try {
          await route.abort("blockedbyclient");
        } catch {
          /* Browser teardown can cancel an intercepted request. */
        }
      }
    });
    stage = "open-page";
    const page = await context.newPage();
    stage = "navigate-preview";
    const navigation = await page.goto(PROXY_PREVIEW + "/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    requireCheck(
      !blocked &&
        page.url() === PROXY_PREVIEW + "/" &&
        navigation?.status() === 200 &&
        !navigation?.request().redirectedFrom(),
      "An unexpected or redirected browser request was blocked.",
    );
    phase = "private";
    async function call(path, method = "GET") {
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url() === PROXY_PREVIEW + API + path &&
          response.request().method() === method &&
          response.request().headers()[PROBE_HEADER] === "1",
        { timeout: 15000 },
      );
      const [result, response] = await Promise.all([
        page.evaluate(
          async ({ path, method }) => {
            const response = await fetch("/api/css-studio/" + path, {
              method,
              credentials: "same-origin",
              mode: "same-origin",
              redirect: "error",
              cache: "no-store",
              signal: AbortSignal.timeout(15000),
              headers: {
                "X-CSS-Studio": "1",
                "x-css-studio-proxy-probe": "1",
                ...(method === "POST"
                  ? { "Content-Type": "application/json" }
                  : {}),
              },
              ...(method === "POST" ? { body: "{}" } : {}),
            });
            let value;
            const reader = response.body?.getReader();
            if (reader) {
              const parts = [];
              let size = 0;
              while (true) {
                const part = await reader.read();
                if (part.done) break;
                size += part.value.byteLength;
                if (size > 16384 || parts.length >= 2048) {
                  void reader.cancel().catch(() => {});
                  break;
                }
                parts.push(part.value);
              }
              if (size <= 16384 && parts.length < 2048) {
                const bytes = new Uint8Array(size);
                let offset = 0;
                for (const part of parts) {
                  bytes.set(part, offset);
                  offset += part.byteLength;
                }
                try {
                  value = JSON.parse(
                    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
                  );
                } catch {
                  /* Validation below fails closed. */
                }
              }
            }
            return {
              status: response.status,
              value,
              cache: response.headers.get("cache-control"),
            };
          },
          { path, method },
        ),
        responsePromise,
      ]);
      requireCheck(
        !blocked,
        "An unexpected or redirected browser request was blocked.",
      );
      requireCheck(
        /(?:^|,)\s*no-store\b/i.test(result.cache || ""),
        "Private proxy response is cacheable.",
      );
      return { ...result, cookies: await response.headerValues("set-cookie") };
    }
    stage = "anonymous-status";
    requireCheck(
      (await call("status")).status === 401,
      "A fresh browser unexpectedly has a private identity.",
    );
    stage = "open-session";
    const issued = await call("session", "POST");
    requireCheck(
      issued.status === 200 &&
        issued.value?.available === true &&
        issued.cookies.length === 1,
      "Private proxy session could not be opened.",
    );
    stage = "cookie-attributes";
    const header = issued.cookies[0];
    requireCheck(
      header.length <= 1024 &&
        /^__Host-css-studio=[^;\s]+;/.test(header) &&
        /;\s*Secure(?:;|$)/i.test(header) &&
        /;\s*HttpOnly(?:;|$)/i.test(header) &&
        /;\s*SameSite=Strict(?:;|$)/i.test(header) &&
        /;\s*Path=\/(?:;|$)/i.test(header) &&
        !/;\s*Domain=/i.test(header),
      "Private proxy cookie attributes are invalid.",
    );
    async function identity() {
      const cookies = (await context.cookies(PROXY_PREVIEW + "/")).filter(
        (cookie) => cookie.name === COOKIE_NAME,
      );
      requireCheck(
        cookies.length === 1,
        "Private proxy browser cookie is missing or duplicated.",
      );
      const cookie = cookies[0];
      requireCheck(
        cookie.domain === new URL(PROXY_PREVIEW).hostname &&
          cookie.path === "/" &&
          cookie.secure === true &&
          cookie.httpOnly === true &&
          cookie.sameSite === "Strict" &&
          cookie.expires > now() / 1000,
        "Private proxy browser cookie scope is invalid.",
      );
      const visible = await page.evaluate(
        ({ kind }) => (kind === "document-cookie" ? document.cookie : ""),
        { kind: "document-cookie" },
      );
      requireCheck(
        !visible.includes(COOKIE_NAME + "="),
        "The private identity is exposed to page scripts.",
      );
      return cookie.value;
    }
    stage = "issued-cookie";
    const cookie = await identity();
    requireCheck(
      header.split(";")[0] === COOKIE_NAME + "=" + cookie,
      "The browser did not retain the issued private identity.",
    );
    stage = "authenticated-status";
    const initial = await call("status");
    requireCheck(
      initial.status === 200,
      "Private proxy identity did not authenticate.",
    );
    const before = validateSnapshot(initial.value, day);
    stage = "reuse-session";
    const reused = await call("session", "POST");
    requireCheck(
      reused.status === 200 &&
        reused.value?.available === true &&
        reused.cookies.length === 0 &&
        (await identity()) === cookie,
      "Private proxy session identity was unexpectedly replaced.",
    );
    stage = "reload-preview";
    const reloaded = await page.reload({
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    requireCheck(
      !blocked &&
        page.url() === PROXY_PREVIEW + "/" &&
        reloaded?.status() === 200 &&
        !reloaded?.request().redirectedFrom(),
      "An unexpected or redirected browser request was blocked.",
    );
    stage = "reload-cookie";
    requireCheck(
      (await identity()) === cookie,
      "Private proxy identity did not survive reload.",
    );
    stage = "reload-status";
    const after = await call("status");
    requireCheck(
      after.status === 200 &&
        sameSnapshot(before, validateSnapshot(after.value, day)),
      "Proxy verification changed the allowance counters.",
    );
    phase = "cross-origin";
    stage = "foreign-navigation";
    await page.goto(FOREIGN_ORIGIN + "/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    stage = "cross-origin-request";
    const foreignOutcome = await page.evaluate(
      async ({ kind, target }) => {
        if (kind === "cross-origin") {
          try {
            await fetch(target, {
              method: "POST",
              mode: "no-cors",
              credentials: "include",
              redirect: "error",
              signal: AbortSignal.timeout(15000),
              body: "{}",
            });
            return "opaque-response";
          } catch (error) {
            // Chromium can block the opaque JSON rejection itself. This is
            // acceptable only alongside the observed, cookie-free 403 below.
            if (error instanceof TypeError) return "blocked-response";
            throw error;
          }
        }
      },
      { kind: "cross-origin", target: PROXY_PREVIEW + API + "session" },
    );
    requireCheck(
      !blocked &&
        crossRequestSafe &&
        ["opaque-response", "blocked-response"].includes(foreignOutcome) &&
        crossReply?.status === 403 &&
        crossReply.hasCookie === false &&
        crossReply.backendRejected === true,
      `Cross-origin session protection did not hold. [safeRequest=${crossRequestSafe}; blocked=${blocked}; upstreamStatus=${crossReply?.status ?? "none"}; cookie=${crossReply?.hasCookie ?? "unknown"}; backendRejected=${crossReply?.backendRejected ?? "unknown"}; routeCategory=${routeFailure}]`,
    );
    phase = "private";
    stage = "return-preview";
    const returned = await page.goto(PROXY_PREVIEW + "/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    requireCheck(
      !blocked &&
        page.url() === PROXY_PREVIEW + "/" &&
        returned?.status() === 200 &&
        !returned?.request().redirectedFrom(),
      "An unexpected or redirected browser request was blocked.",
    );
    stage = "return-cookie";
    requireCheck(
      (await identity()) === cookie,
      "Private proxy identity changed after foreign navigation.",
    );
    stage = "final-status";
    const final = await call("status");
    requireCheck(
      final.status === 200 &&
        sameSnapshot(before, validateSnapshot(final.value, day)),
      "Proxy verification changed the allowance counters.",
    );
    requireCheck(
      new Date(now()).toISOString().slice(0, 10) === day,
      "UTC day changed during proxy verification.",
    );
    stage = "public-preview-after";
    await publicStatus(PROXY_PREVIEW);
    stage = "public-worker-after";
    await publicStatus(PROXY_BACKEND);
    stage = "complete";
    log(
      JSON.stringify({
        fixture: "browser-proxy-identity",
        cookieRetained: true,
        crossOriginRejected: true,
        remainingPrompts: before.prompts,
        remainingImages: before.images,
        sharedRemaining: before.sharedRemaining,
      }),
    );
    log(
      "PASS: Chromium proxy identity, reload and cross-origin checks passed; no inference requested.",
    );
    return {
      browser: "chromium",
      session: true,
      cookie: true,
      crossOriginRejected: true,
      remainingPrompts: before.prompts,
      remainingImages: before.images,
      sharedRemaining: before.sharedRemaining,
    };
  } catch (error) {
    const category =
      error instanceof ProxyCheckError
        ? error.category || "validation"
        : nativeCategory(error);
    const message =
      error instanceof ProxyCheckError
        ? error.message
        : "Private browser proxy verification failed; details withheld.";
    throw new ProxyCheckError(
      `${message} [stage=${stage}; category=${category}]`,
    );
  } finally {
    try {
      await browser?.close();
    } catch {
      /* Never expose browser diagnostics or credentials. */
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await runProxyCheck({ secret: process.env.CANARY_SECRET });
  } catch (error) {
    console.error(
      error instanceof ProxyCheckError
        ? error.message
        : "Private browser proxy verification failed.",
    );
    process.exitCode = 1;
  }
}
