import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { Miniflare } from "miniflare";
import { runtimeOptions } from "./harness.mjs";
test("a real browser retains a secure HttpOnly identity across reload and cannot use it from another origin", async () => {
  const options = runtimeOptions(false);
  const mf = new Miniflare({
    ...options,
    bindings: { ...options.bindings, ENDPOINT_ORIGIN: "https://worker.test" },
  });
  let browser;
  const attempts = [];
  try {
    browser = await chromium.launch({
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext();
    await context.route("https://studio.test/**", async (route) => {
      const req = route.request();
      if (new URL(req.url()).pathname === "/") {
        await route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Local boundary fixture</title><main>Local boundary fixture</main>",
        });
        return;
      }
      const headers = await req.allHeaders();
      const backend = new URL(req.url());
      backend.hostname = "worker.test";
      const response = await mf.dispatchFetch(backend.href, {
        method: req.method(),
        headers,
        ...(req.postDataBuffer() ? { body: req.postDataBuffer() } : {}),
      });
      attempts.push({
        method: req.method(),
        origin: headers.origin,
        cookie: headers.cookie,
        status: response.status,
      });
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      });
    });
    await context.route("https://evil.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Other origin fixture</title><main>Other origin fixture</main>",
      }),
    );
    const page = await context.newPage();
    await page.goto("https://studio.test/");
    assert.equal(
      await page.evaluate(
        async () =>
          (
            await fetch("/api/css-studio/session", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSS-Studio": "1",
              },
              body: "{}",
            })
          ).status,
      ),
      200,
    );
    const [cookie] = await context.cookies("https://studio.test/");
    assert.equal(cookie.name, "__Host-css-studio");
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, "Strict");
    assert.equal(await page.evaluate(() => document.cookie), "");
    await page.reload();
    assert.equal(
      (await context.cookies("https://studio.test/"))[0].value,
      cookie.value,
    );
    const result = await page.evaluate(async () => {
      document.cookie = "__Host-css-studio=forged; Secure; Path=/";
      localStorage.setItem("remainingQuota", "9999");
      const input = {
        id: crypto.randomUUID(),
        operation: "theme",
        prompt: "Warm holiday",
        history: [],
        context: {
          family: "holidays",
          id: "diwali",
          mode: "dark",
          contrast: true,
        },
      };
      const response = await fetch("/api/css-studio/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSS-Studio": "1" },
        body: JSON.stringify(input),
      });
      return {
        status: response.status,
        quota: await (await fetch("/api/css-studio/status")).json(),
      };
    });
    assert.equal(result.status, 200);
    assert.deepEqual(result.quota.remaining, { prompts: 9, images: 3 });
    assert.equal(
      (await context.cookies("https://studio.test/"))[0].value,
      cookie.value,
    );
    await page.goto("https://evil.test/");
    await page.evaluate(async () => {
      await fetch("https://studio.test/api/css-studio/propose", {
        method: "POST",
        mode: "no-cors",
        credentials: "include",
        body: "{}",
      });
    });
    const last = attempts.at(-1);
    assert.equal(last.status, 403);
    assert.equal(last.origin, "https://evil.test");
    assert.ok(!last.cookie);
  } finally {
    await browser?.close();
    await mf.dispose();
  }
});
