import { expect, it } from "vitest";
import { createApp } from "./http.js";
import { createGptProvider, GPT_THEME_PLAN } from "./gptProvider.js";

const origin = "https://berinkarjala.netlify.app";
it("admits only the exact reviewed GPT whole-context output and cost plan", async () => {
  const provider = createGptProvider({
    run() {
      throw Error("Must not infer");
    },
  });
  const app = (policy, candidate = provider) =>
    createApp({
      origin,
      secret: "ab".repeat(32),
      provider: candidate,
      policy,
      ledger: {
        snapshot() {
          throw Error("Must not read before a session");
        },
      },
    });
  const request = () => new Request(origin + "/api/css-studio/status");
  expect((await app(GPT_THEME_PLAN)(request())).status).toBe(401);
  for (const change of [
    { reservedNeurons: 3999 },
    { maxContextTokens: 127999 },
    { maxOutputTokens: 127999 },
    { maxOutputTokens: 512 },
    { timeoutMs: 19000 },
    { verifiedUntil: GPT_THEME_PLAN.verifiedUntil + 86400000 },
  ]) {
    expect(
      await (await app({ ...GPT_THEME_PLAN, ...change })(request())).json(),
    ).toEqual({ available: false });
  }
  expect(
    await (
      await app(GPT_THEME_PLAN, { ...provider, model: "unreviewed" })(request())
    ).json(),
  ).toEqual({ available: false });
});
