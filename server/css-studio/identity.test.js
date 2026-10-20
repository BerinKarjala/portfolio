import { expect, it } from "vitest";
import { createIdentity, COOKIE_NAME } from "./identity";
it("issues a signed browser cookie, preserves reload identity, and rejects forgery, duplicate cookies, expiry and another key", async () => {
  let now = Date.parse("2026-10-20T12:00:00Z");
  const identity = createIdentity("ab".repeat(32), { clock: () => now });
  const issued = await identity.issue();
  expect(issued.cookie).toContain(`${COOKIE_NAME}=`);
  expect(issued.cookie).toMatch(/HttpOnly/);
  expect(issued.cookie).toMatch(/Secure/);
  expect(issued.cookie).toMatch(/SameSite=Strict/);
  expect(issued.cookie).toMatch(/Path=\//);
  const cookie = issued.cookie.split(";")[0];
  expect(await identity.read(cookie)).toBe(issued.id);
  expect(await identity.read(cookie + "; " + cookie)).toBeNull();
  expect(await identity.read(cookie.replace(/.$/, "!"))).toBeNull();
  expect(
    await createIdentity("cd".repeat(32), { clock: () => now }).read(cookie),
  ).toBeNull();
  now += 8 * 86400000;
  expect(await identity.read(cookie)).toBeNull();
});
it("rejects missing or weak signing configuration", () => {
  expect(() => createIdentity("")).toThrow();
  expect(() => createIdentity("short")).toThrow();
});
