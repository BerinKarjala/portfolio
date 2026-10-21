import { test } from "vitest";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import {
  classifyProxyRequest,
  runProxyCheck,
  PROXY_PREVIEW,
  PROXY_BACKEND,
  ProxyCheckError,
} from "./check-css-studio-proxy.mjs";

const secret = "ab".repeat(32);
const cookieValue = "signed-cookie-private-test-value";
const cookieHeader = `__Host-css-studio=${cookieValue}; Path=/; Max-Age=604800; Secure; HttpOnly; SameSite=Strict`;
const snapshot = {
  available: true,
  operations: ["theme"],
  day: "2026-10-21",
  remaining: { prompts: 10, images: 3 },
  sharedRemaining: 6000,
};

test("scopes private headers to exact preview status/session requests", () => {
  const classify = (path, method = "GET", extra = {}) =>
    classifyProxyRequest({
      url: PROXY_PREVIEW + path,
      method,
      phase: "private",
      marked: true,
      ...extra,
    });
  assert.equal(classify("/api/css-studio/status"), "private");
  assert.equal(classify("/api/css-studio/session", "POST"), "private");
  for (const [path, method, extra] of [
    ["/api/css-studio/propose", "POST", {}],
    ["/api/css-studio/propose?x=1", "GET", {}],
    ["/api/css-studio/status?x=1", "GET", {}],
    ["/api/css-studio/status", "POST", {}],
    ["/api/css-studio/session", "GET", {}],
    ["/api/css-studio/reset", "POST", {}],
    ["/api/css-studio/status", "GET", { redirected: true }],
  ])
    assert.equal(classify(path, method, extra), "deny");
  assert.equal(
    classifyProxyRequest({
      url: PROXY_BACKEND + "/api/css-studio/status",
      method: "GET",
      phase: "private",
    }),
    "deny",
  );
  assert.equal(
    classifyProxyRequest({
      url: "https://cdn.example/image.png",
      method: "GET",
      phase: "private",
    }),
    "resource",
  );
  assert.equal(
    classifyProxyRequest({
      url: PROXY_PREVIEW + "/api/css-studio/status",
      method: "GET",
      phase: "loading",
    }),
    "public",
  );
  assert.equal(
    classifyProxyRequest({
      url: PROXY_PREVIEW + "/api/css-studio/status",
      method: "GET",
      phase: "private",
    }),
    "public",
  );
  assert.equal(
    classifyProxyRequest({
      url: PROXY_PREVIEW + "/api/css-studio/session",
      method: "POST",
      phase: "private",
    }),
    "deny",
  );
});

function fixture({
  changedCounter = false,
  redirect = false,
  cookieDomain = false,
  transportFailure = false,
  crossCookie = false,
  crossStatus = 403,
  crossFetchRejects = false,
  crossResponseCookie = false,
  crossNoResponse = false,
  launchFailure,
  navigationFailure,
  evaluationFailure,
} = {}) {
  const logs = [],
    publicRequests = [],
    browserRequests = [],
    headersSent = [];
  let routeHandler,
    waiting,
    sessions = 0,
    statuses = 0,
    pageUrl = PROXY_PREVIEW + "/",
    closed = false;
  const request = (url, method, headers = {}, redirected = false) => ({
    url: () => url,
    method: () => method,
    allHeaders: async () => headers,
    headers: () => headers,
    redirectedFrom: () => (redirected ? {} : null),
  });
  async function routed(req, result) {
    let action;
    await routeHandler({
      request: () => req,
      continue: async (options) => {
        action = "continue";
        headersSent.push({
          url: req.url(),
          headers: options?.headers || (await req.allHeaders()),
        });
      },
      abort: async () => {
        action = "abort";
      },
      fulfill: async () => {
        action = "fulfill";
      },
    });
    browserRequests.push({ url: req.url(), method: req.method(), action });
    if (action === "abort") throw Error(cookieValue + secret);
    const response = {
      url: req.url,
      status: () => result.status,
      request: () => req,
      headerValues: async (name) =>
        name === "set-cookie" ? result.cookies || [] : [],
    };
    if (waiting?.predicate(response)) {
      const resolve = waiting.resolve;
      waiting = null;
      resolve(response);
    }
    return result;
  }
  const page = {
    url: () => pageUrl,
    goto: async (url) => {
      if (navigationFailure) throw navigationFailure;
      pageUrl = url;
      const req = request(
        url,
        "GET",
        {},
        redirect && url.startsWith(PROXY_PREVIEW),
      );
      await routed(req, { status: 200 });
      return { request: () => req, status: () => 200 };
    },
    reload: async () => {
      const req = request(PROXY_PREVIEW + "/", "GET");
      await routed(req, { status: 200 });
      return { request: () => req, status: () => 200 };
    },
    waitForResponse: (predicate) =>
      new Promise((resolve) => {
        waiting = { predicate, resolve };
      }),
    evaluate: async (_fn, args) => {
      if (evaluationFailure) throw evaluationFailure;
      if (args?.kind === "document-cookie") return "";
      if (args?.kind === "cross-origin") {
        const browserFetch = async (target, options) => {
          assert.equal(target, PROXY_PREVIEW + "/api/css-studio/session");
          assert.equal(options.mode, "no-cors");
          assert.equal(options.credentials, "include");
          await routed(
            request(target, options.method, {
              origin: pageUrl.replace(/\/$/, ""),
              "sec-fetch-site": "cross-site",
              ...(crossCookie ? { cookie: cookieValue } : {}),
            }),
            {
              status: crossStatus,
              cookies: crossResponseCookie ? [cookieHeader] : [],
            },
          );
          if (crossFetchRejects)
            throw new TypeError("Failed to fetch " + secret + cookieValue);
          return {};
        };
        const browserFunction = runInNewContext("(" + _fn.toString() + ")", {
          fetch: browserFetch,
          AbortSignal,
          TypeError,
        });
        return browserFunction(args);
      }
      const method = args.method,
        route = args.path;
      if (statuses === 0)
        await routed(
          request(PROXY_PREVIEW + "/api/css-studio/status", "GET", {
            "sec-fetch-site": "same-origin",
          }),
          { status: 200, value: { available: false }, cache: "no-store" },
        );
      const headers = {
        origin: PROXY_PREVIEW,
        "sec-fetch-site": "same-origin",
        "x-css-studio-proxy-probe": "1",
        ...(sessions ? { cookie: `__Host-css-studio=${cookieValue}` } : {}),
      };
      let result;
      if (route === "status") {
        statuses++;
        result = sessions
          ? {
              status: 200,
              value: {
                ...snapshot,
                sharedRemaining: changedCounter && statuses >= 3 ? 5000 : 6000,
              },
              cache: "no-store",
            }
          : { status: 401, value: null, cache: "no-store" };
      } else {
        sessions++;
        result = {
          status: 200,
          value: { available: true },
          cache: "no-store",
          cookies:
            sessions === 1
              ? [
                  cookieDomain
                    ? cookieHeader + "; Domain=netlify.app"
                    : cookieHeader,
                ]
              : [],
        };
      }
      return routed(
        request(PROXY_PREVIEW + "/api/css-studio/" + route, method, headers),
        result,
      );
    },
  };
  const context = {
    on: () => {},
    route: async (_pattern, handler) => {
      routeHandler = handler;
    },
    newPage: async () => page,
    cookies: async () =>
      sessions
        ? [
            {
              name: "__Host-css-studio",
              value: cookieValue,
              domain: new URL(PROXY_PREVIEW).hostname,
              path: "/",
              secure: true,
              httpOnly: true,
              sameSite: "Strict",
              expires: 1793188800,
            },
          ]
        : [],
  };
  const chromium = {
    launch: async (options) => {
      if (launchFailure) throw launchFailure;
      for (const name of [
        "CLOUDFLARE_API_TOKEN",
        "CLOUDFLARE_API_KEY",
        "CLOUDFLARE_EMAIL",
        "CANARY_SECRET",
        "IDENTITY_SECRET",
      ])
        assert.equal(options.env[name], undefined);
      return {
        newContext: async (options) => {
          assert.equal(options.serviceWorkers, "block");
          assert.ok(!options.recordVideo);
          return context;
        },
        close: async () => {
          closed = true;
        },
      };
    },
  };
  return {
    logs,
    publicRequests,
    browserRequests,
    headersSent,
    isClosed: () => closed,
    options: {
      secret,
      chromium,
      now: () => Date.UTC(2026, 9, 21, 12),
      log: (line) => logs.push(line),
      fetch: async (url, options) => {
        publicRequests.push({ url, options });
        if (transportFailure) throw Error(secret + cookieValue);
        if (url === PROXY_PREVIEW + "/api/css-studio/session") {
          assert.equal(options.method, "POST");
          assert.equal(options.redirect, "error");
          assert.equal(
            options.headers.origin,
            "https://css-studio-cross-origin.invalid",
          );
          assert.equal(options.headers["sec-fetch-site"], "cross-site");
          assert.ok(!options.headers.cookie);
          if (crossNoResponse) throw Error(secret + cookieValue);
          return new Response("{}", {
            status: crossStatus,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
              ...(crossResponseCookie ? { "set-cookie": cookieHeader } : {}),
            },
          });
        }
        return Response.json(
          { available: false },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  };
}

test("verifies browser cookie round-trip and cross-origin rejection without proposals", async () => {
  const f = fixture();
  const result = await runProxyCheck(f.options);
  assert.equal(result.sharedRemaining, 6000);
  assert.equal(f.publicRequests.length, 5);
  assert.ok(f.isClosed());
  assert.ok(f.browserRequests.every((r) => !r.url.includes("propose")));
  assert.ok(
    f.headersSent.some(
      (r) =>
        r.url === PROXY_PREVIEW + "/api/css-studio/status" &&
        !r.headers["X-CSS-Studio-Canary"],
    ),
  );
  const cross = f.publicRequests.find(
    (request) =>
      request.options.headers.origin ===
      "https://css-studio-cross-origin.invalid",
  );
  assert.equal(cross.options.headers["X-CSS-Studio"], "1");
  assert.equal(cross.options.headers["content-type"], "application/json");
  assert.ok(!cross.options.headers.cookie);
  for (const r of f.headersSent)
    if (r.headers["X-CSS-Studio-Canary"])
      assert.ok(r.url.startsWith(PROXY_PREVIEW + "/api/css-studio/"));
  assert.ok(!f.logs.join("\n").includes(secret));
  assert.ok(!f.logs.join("\n").includes(cookieValue));
});

test("accepts an observed cookie-free 403 when the browser blocks its opaque response", async () => {
  const f = fixture({ crossFetchRejects: true });
  const result = await runProxyCheck(f.options);
  assert.equal(result.crossOriginRejected, true);
  assert.equal(result.sharedRemaining, 6000);
  assert.equal(f.publicRequests.length, 5);
  assert.ok(!f.logs.join("\n").includes(secret));
  assert.ok(!f.logs.join("\n").includes(cookieValue));
});

test("a blocked browser fetch cannot hide a successful session, changed cookie or missing rejection response", async () => {
  for (const extra of [
    { crossStatus: 200 },
    { crossStatus: 401 },
    { crossResponseCookie: true },
    { crossNoResponse: true },
  ]) {
    const f = fixture({ crossFetchRejects: true, ...extra });
    await assert.rejects(runProxyCheck(f.options), ProxyCheckError);
    assert.ok(f.isClosed());
  }
});

test("fails closed on changed counters, redirects or domain cookies and closes the browser", async () => {
  for (const options of [
    { changedCounter: true },
    { redirect: true },
    { cookieDomain: true },
    { crossCookie: true },
  ]) {
    const f = fixture(options);
    await assert.rejects(
      runProxyCheck(f.options),
      (error) =>
        error instanceof ProxyCheckError &&
        !error.message.includes(secret) &&
        !error.message.includes(cookieValue),
    );
    assert.ok(f.isClosed());
  }
});

test("redacts transport errors and rejects missing credentials before requests", async () => {
  const f = fixture({ transportFailure: true });
  await assert.rejects(
    runProxyCheck(f.options),
    (error) =>
      !error.message.includes(secret) && !error.message.includes(cookieValue),
  );
  const missing = fixture();
  await assert.rejects(runProxyCheck({ ...missing.options, secret: "" }));
  assert.equal(missing.publicRequests.length, 0);
});

test("reports only fixed stages and native categories without exposing browser diagnostics", async () => {
  for (const [option, error, stage, category] of [
    [
      "launchFailure",
      Error(
        "browserType.launch: Executable doesn't exist at /private/" + secret,
      ),
      "browser-launch",
      "browser-executable",
    ],
    [
      "navigationFailure",
      Error(
        "page.goto: net::ERR_CERT_AUTHORITY_INVALID at https://" +
          secret +
          ".invalid/" +
          cookieValue,
      ),
      "navigate-preview",
      "network-tls",
    ],
    [
      "evaluationFailure",
      Error(
        "page.evaluate: TypeError: Failed to fetch " + cookieValue + secret,
      ),
      "anonymous-status",
      "fetch-failed",
    ],
    [
      "navigationFailure",
      Object.assign(Error("private timeout " + secret), {
        name: "TimeoutError",
      }),
      "navigate-preview",
      "timeout",
    ],
  ]) {
    const f = fixture({ [option]: error });
    await assert.rejects(runProxyCheck(f.options), (failure) => {
      assert.ok(failure instanceof ProxyCheckError);
      assert.ok(failure.message.includes("stage=" + stage));
      assert.ok(failure.message.includes("category=" + category));
      assert.ok(!failure.message.includes(secret));
      assert.ok(!failure.message.includes(cookieValue));
      assert.ok(!failure.message.includes("https://"));
      assert.ok(!failure.message.includes("/private/"));
      return true;
    });
    assert.ok(!f.logs.join("\n").includes(secret));
  }
});
