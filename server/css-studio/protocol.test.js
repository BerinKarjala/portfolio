import { expect, it } from "vitest";
import { validateInput, validateOutput, readJson, PRESETS } from "./protocol";
import { SEASONS, HOLIDAYS } from "../../src/features/css-studio/theme";
const input = {
  id: "00000000-0000-4000-8000-000000000001",
  operation: "theme",
  prompt: "Warm colors",
  history: [],
  context: { family: "holidays", id: "diwali", mode: "dark", contrast: true },
};
it("keeps a server-owned allowlist aligned with the shipped presets and rejects authoritative client knobs", () => {
  expect(PRESETS.seasons).toEqual(Object.keys(SEASONS));
  expect(PRESETS.holidays).toEqual(Object.keys(HOLIDAYS));
  expect(validateInput(input)).toEqual(input);
  for (const extra of [
    { cost: 0 },
    { model: "paid" },
    { remaining: 100 },
    { url: "https://evil" },
  ])
    expect(() => validateInput({ ...input, ...extra })).toThrow();
  expect(() =>
    validateInput({ ...input, context: { ...input.context, id: "unknown" } }),
  ).toThrow();
  expect(() => validateInput({ ...input, prompt: "x".repeat(4001) })).toThrow();
  expect(() =>
    validateInput({
      ...input,
      history: Array(11).fill({ role: "user", text: "hi" }),
    }),
  ).toThrow();
});
it("accepts token proposals and rejects unsafe model HTML, CSS, URLs, generated IDs and invalid output bounds", () => {
  expect(
    validateOutput({
      message: "Warm",
      overrides: { accent: "#993311", font: "serif" },
    }),
  ).toEqual({
    message: "Warm",
    overrides: { accent: "#993311", font: "serif" },
  });
  for (const overrides of [
    { accent: "url(javascript:bad)" },
    { css: "body{}" },
    { backgroundId: "generated-00000000-0000-4000-8000-000000000001" },
    { font: "remote" },
    { radius: "1000px" },
  ])
    expect(() => validateOutput({ message: "bad", overrides })).toThrow();
  expect(() =>
    validateOutput({
      message: "x".repeat(4001),
      overrides: { accent: "#ffffff" },
    }),
  ).toThrow();
  expect(() =>
    validateOutput({
      message: "unsafe",
      overrides: { accent: "#ffffff" },
      html: "<script/>",
    }),
  ).toThrow();
});
it("bounds streamed bodies independently of Content-Length and rejects malformed UTF-8/JSON", async () => {
  const oversized = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(100));
      c.enqueue(new Uint8Array(100));
      c.close();
    },
  });
  await expect(
    readJson(
      new Request("https://studio.test", {
        method: "POST",
        body: oversized,
        duplex: "half",
      }),
      128,
    ),
  ).rejects.toMatchObject({ status: 413 });
  await expect(
    readJson(
      new Request("https://studio.test", {
        method: "POST",
        body: new Uint8Array([255]),
      }),
    ),
  ).rejects.toThrow();
});
it("times out an incomplete body without keeping its reader locked", async () => {
  const body = new ReadableStream({
    pull() {
      return new Promise(() => {});
    },
  });
  await expect(
    readJson(
      new Request("https://studio.test", {
        method: "POST",
        body,
        duplex: "half",
      }),
      128,
      10,
    ),
  ).rejects.toMatchObject({ status: 408 });
});
