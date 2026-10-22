import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// Native Fetch semantics only: this does not contact Netlify, a Worker or AI.
// The full live proxy probe separately verifies cookies and the server's 403.
test("a native no-cors request requires follow before a cross-site probe can be intercepted", async () => {
  const source = "https://foreign-fetch-fixture.invalid/";
  const target = "https://studio-fetch-fixture.invalid/api/css-studio/session";
  const intercepted = { error: 0, follow: 0 };
  let unexpected = 0,
    browser;
  try {
    browser = await chromium.launch({
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
      args: ["--no-sandbox"],
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
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (request.url() === source && request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: '<!doctype html><title>Offline Fetch regression</title><link rel="icon" href="data:,">',
        });
        return;
      }
      const url = new URL(request.url());
      const variant = url.searchParams.get("variant");
      if (
        url.origin + url.pathname === target &&
        request.method() === "POST" &&
        ["error", "follow"].includes(variant) &&
        [...url.searchParams].length === 1
      ) {
        intercepted[variant]++;
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: "{}",
        });
        return;
      }
      unexpected++;
      await route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    await page.goto(source, { waitUntil: "domcontentloaded", timeout: 15000 });
    const results = {};
    for (const redirect of ["error", "follow"]) {
      results[redirect] = await page.evaluate(
        async ({ target, redirect }) => {
          try {
            const response = await fetch(target + "?variant=" + redirect, {
              method: "POST",
              mode: "no-cors",
              credentials: "include",
              redirect,
              signal: AbortSignal.timeout(5000),
              body: "{}",
            });
            return {
              rejected: false,
              type: response.type,
              status: response.status,
            };
          } catch (error) {
            return { rejected: true, typeError: error instanceof TypeError };
          }
        },
        { target, redirect },
      );
    }
    assert.deepEqual(results.error, { rejected: true, typeError: true });
    assert.equal(intercepted.error, 0);
    assert.deepEqual(results.follow, {
      rejected: false,
      type: "opaque",
      status: 0,
    });
    assert.equal(intercepted.follow, 1);
    assert.equal(
      unexpected,
      0,
      "Every browser request must stay within the offline fixture.",
    );
  } finally {
    await browser?.close();
  }
});
