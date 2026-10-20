import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createMediaReceipts } from "./media";
const bytes = readFileSync(
  "public/css-studio/images/spring/spring-01-woodland.webp",
);
const image = () => new Blob([bytes], { type: "image/webp" });
const owner = "00000000-0000-4000-8000-000000000001";
const context = {
  family: "seasons",
  id: "spring",
  mode: "light",
  contrast: false,
};
const inspect = async () => ({ width: 1600, height: 1067 });
it("seals exact provider bytes to their browser and preset without exposing the owner or accepting changed bytes", async () => {
  const receipts = createMediaReceipts("ab".repeat(32));
  const issued = await receipts.issue({
    owner,
    context,
    image: image(),
    inspect,
  });
  expect(issued.receipt).toMatch(/^media-v1\./);
  expect(issued.receipt).not.toContain(owner);
  const verified = await receipts.verify({
    owner,
    context: { ...context, mode: "dark" },
    image: image(),
    receipt: issued.receipt,
  });
  expect(verified.sha256).toBe(issued.metadata.sha256);
  await expect(
    receipts.verify({
      owner: "00000000-0000-4000-8000-000000000002",
      context,
      image: image(),
      receipt: issued.receipt,
    }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    receipts.verify({
      owner,
      context: { ...context, id: "winter" },
      image: image(),
      receipt: issued.receipt,
    }),
  ).rejects.toMatchObject({ status: 409 });
  const changed = new Uint8Array(bytes);
  changed[changed.length - 1] ^= 1;
  await expect(
    receipts.verify({
      owner,
      context,
      image: new Blob([changed], { type: "image/webp" }),
      receipt: issued.receipt,
    }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    receipts.verify({
      owner,
      context,
      image: image(),
      receipt: issued.receipt.slice(0, -2) + "!!",
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("expires receipts, rejects rotation and bounds/decode-checks images before issuing proof", async () => {
  let now = Date.parse("2026-10-20T12:00:00Z");
  const receipts = createMediaReceipts("ab".repeat(32), { clock: () => now });
  const issued = await receipts.issue({
    owner,
    context,
    image: image(),
    inspect,
  });
  await expect(
    createMediaReceipts("cd".repeat(32), { clock: () => now }).verify({
      owner,
      context,
      image: image(),
      receipt: issued.receipt,
    }),
  ).rejects.toThrow();
  now += 8 * 86400000;
  await expect(
    receipts.verify({
      owner,
      context,
      image: image(),
      receipt: issued.receipt,
    }),
  ).rejects.toThrow();
  await expect(
    receipts.issue({
      owner,
      context,
      image: new Blob(["bad"], { type: "image/webp" }),
      inspect,
    }),
  ).rejects.toThrow();
  await expect(
    receipts.issue({
      owner,
      context,
      image: image(),
      inspect: async () => ({ width: 100000, height: 100000 }),
    }),
  ).rejects.toThrow();
  await expect(
    receipts.issue({ owner, context, image: image() }),
  ).rejects.toThrow();
});
