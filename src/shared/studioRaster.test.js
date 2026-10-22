import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { boundedDimensions } from "./studioRaster.js";

// These JPEG header fixtures exercise bounded inspection, not full decoding.
function jpeg({ comments = 0, fills = 0, fillEach = 0, marker = 0xc0 } = {}) {
  const segments = [Buffer.from([0xff, 0xd8])];
  for (let i = 0; i < comments; i++)
    segments.push(
      Buffer.from([0xff, ...new Array(fillEach).fill(0xff), 0xfe, 0, 2]),
    );
  segments.push(
    Buffer.from([
      0xff,
      ...new Array(fills).fill(0xff),
      marker,
      0,
      17,
      8,
      0,
      128,
      0,
      64,
      3,
      1,
      0x11,
      0,
      2,
      0x11,
      0,
      3,
      0x11,
      0,
      0xff,
      0xd9,
    ]),
  );
  return Buffer.concat(segments);
}

it("preserves ordinary PNG, JPEG and WebP dimensions", () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAmUlEQVR4nO3QMREAIBDAsBeBCETg3xbIyECH7L3O2uf+bHSA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AHaA7dtcVqPrbY0AAAAAElFTkSuQmCC",
    "base64",
  );
  expect(boundedDimensions(png, "image/png")).toEqual({
    width: 64,
    height: 64,
  });
  for (const season of ["spring", "summer", "fall", "winter"]) {
    const bytes = readFileSync(
      `public/css-studio/contact-sheets/${season}.jpg`,
    );
    const dimensions = boundedDimensions(bytes, "image/jpeg");
    expect(dimensions.width).toBe(1500);
    expect(dimensions.height).toBeGreaterThanOrEqual(64);
    expect(dimensions.height).toBeLessThanOrEqual(2048);
  }
  const webp = readFileSync(
    "public/css-studio/images/spring/spring-01-woodland.webp",
  );
  expect(boundedDimensions(webp, "image/webp")).toEqual({
    width: 1600,
    height: 1067,
  });
});

it.each([0xc0, 0xc2])(
  "accepts ordinary baseline/progressive SOF marker %i with comments and fill",
  (marker) => {
    expect(
      boundedDimensions(
        jpeg({ comments: 8, fills: 3, fillEach: 2, marker }),
        "image/jpeg",
      ),
    ).toEqual({ width: 64, height: 128 });
  },
);

it("jumps over large metadata payloads without counting their bytes as marker fill", () => {
  const comment = Buffer.alloc(65537, 0xff);
  comment.set([0xff, 0xfe, 0xff, 0xff]);
  expect(
    boundedDimensions(
      Buffer.concat([Buffer.from([0xff, 0xd8]), comment, jpeg().subarray(2)]),
      "image/jpeg",
    ),
  ).toEqual({ width: 64, height: 128 });
});

it("permits at most 2048 JPEG marker steps before the dimensions", () => {
  expect(boundedDimensions(jpeg({ comments: 2047 }), "image/jpeg")).toEqual({
    width: 64,
    height: 128,
  });
  expect(() =>
    boundedDimensions(jpeg({ comments: 2048 }), "image/jpeg"),
  ).toThrow("Unsupported image bytes or dimensions");
  // A near-wire-limit run of tiny valid COM segments must not be scanned in JS.
  const many = Buffer.alloc(4 * 1024 * 1024 - 64);
  many.fill(Buffer.from([0xff, 0xfe, 0, 2]));
  expect(() =>
    boundedDimensions(
      Buffer.concat([Buffer.from([0xff, 0xd8]), many, jpeg().subarray(2)]),
      "image/jpeg",
    ),
  ).toThrow("Unsupported image bytes or dimensions");
});

it("limits JPEG fill bytes across all marker prefixes instead of restarting at each segment", () => {
  expect(
    boundedDimensions(jpeg({ comments: 1024, fillEach: 4 }), "image/jpeg"),
  ).toEqual({ width: 64, height: 128 });
  expect(() =>
    boundedDimensions(jpeg({ comments: 1025, fillEach: 4 }), "image/jpeg"),
  ).toThrow("Unsupported image bytes or dimensions");
});

it("rejects a long JPEG fill run before a valid SOF without scanning the full wire allowance", () => {
  expect(boundedDimensions(jpeg({ fills: 4096 }), "image/jpeg")).toEqual({
    width: 64,
    height: 128,
  });
  expect(() => boundedDimensions(jpeg({ fills: 4097 }), "image/jpeg")).toThrow(
    "Unsupported image bytes or dimensions",
  );
  const huge = Buffer.alloc(4 * 1024 * 1024 - 64, 0xff);
  expect(() =>
    boundedDimensions(
      Buffer.concat([Buffer.from([0xff, 0xd8]), huge, jpeg().subarray(2)]),
      "image/jpeg",
    ),
  ).toThrow("Unsupported image bytes or dimensions");
});

it("retains malformed JPEG and unsupported geometry rejection", () => {
  const tooSmall = jpeg();
  tooSmall[9] = 0;
  tooSmall[10] = 63;
  const tooLarge = jpeg();
  tooLarge[9] = 8;
  tooLarge[10] = 1;
  for (const bytes of [
    Buffer.from([0xff, 0xd8, 0xff, 0xda, 0, 2]),
    Buffer.from([0xff, 0xd8, 0xff, 0xfe, 0, 1]),
    jpeg().subarray(0, 10),
    tooSmall,
    tooLarge,
  ])
    expect(() => boundedDimensions(bytes, "image/jpeg")).toThrow();
  expect(() => boundedDimensions(jpeg(), "image/png")).toThrow();
});
