import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { afterEach, expect, it, vi } from "vitest";
import { createImageNormalizer } from "./imageNormalizer.js";
import { ImageLimitError, ProviderOutputError } from "./providerErrors.js";
import { MEDIA_LIMIT } from "../../src/shared/studioTransfer.js";

// Fully encoded PNG fixtures with real chunk CRCs and compressed scanlines.
// The fake Images boundary does not stand in for an actual provider decoder test.
function crc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes = new Uint8Array()) {
  const result = Buffer.alloc(bytes.length + 12);
  result.writeUInt32BE(bytes.length);
  result.write(type, 4);
  result.set(bytes, 8);
  result.writeUInt32BE(crc(result.subarray(4, -4)), result.length - 4);
  return result;
}
function png(width = 64, height = width, { animated = false } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    ...(animated ? [chunk("acTL", Buffer.from([0, 0, 0, 2, 0, 0, 0, 0]))] : []),
    chunk("IDAT", deflateSync(Buffer.alloc(height * (width * 4 + 1)))),
    chunk("IEND"),
  ]);
}
const raster = () => new Blob([png()], { type: "image/png" });
const response = (size = 512) =>
  new Response(png(size), { headers: { "Content-Type": "image/png" } });
function fakeImages(
  result = response(),
  { asynchronous = false, fail, responseFail } = {},
) {
  const calls = { input: 0, transforms: [], outputs: [], response: 0 };
  const binding = {
    input(stream) {
      calls.input++;
      return {
        transform(options) {
          calls.transforms.push(options);
          return {
            async output(options) {
              calls.outputs.push(options);
              calls.bytes = new Uint8Array(
                await new Response(stream).arrayBuffer(),
              );
              if (fail) throw fail;
              return {
                response() {
                  calls.response++;
                  if (responseFail) {
                    if (asynchronous) return Promise.reject(responseFail);
                    throw responseFail;
                  }
                  return asynchronous ? Promise.resolve(result) : result;
                },
              };
            },
          };
        },
      };
    },
  };
  return { binding, calls };
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
}
function delayedImages() {
  const entered = deferred();
  const pending = deferred();
  const calls = { input: 0, response: 0 };
  const binding = {
    input() {
      calls.input++;
      return {
        transform() {
          return {
            output() {
              entered.resolve();
              return pending.promise;
            },
          };
        },
      };
    },
  };
  return {
    binding,
    calls,
    entered: entered.promise,
    finish() {
      pending.resolve({
        response() {
          calls.response++;
          return response();
        },
      });
    },
  };
}
afterEach(() => vi.useRealTimers());

it("requires the binding and normalizes one bounded raster to only the two permitted PNG sizes", async () => {
  expect(createImageNormalizer()).toBeUndefined();
  expect(createImageNormalizer({ info() {} })).toBeUndefined();
  const webp = readFileSync(
    "public/css-studio/images/spring/spring-01-woodland.webp",
  );
  const jpeg = readFileSync("public/css-studio/contact-sheets/winter.jpg");
  for (const [size, source] of [
    [256, new Blob([webp], { type: "image/webp" })],
    [512, raster()],
    [256, new Blob([jpeg], { type: "image/jpeg" })],
  ]) {
    const { binding, calls } = fakeImages(response(size), {
      asynchronous: size === 256,
    });
    const normalizer = createImageNormalizer(binding);
    const normalized = await normalizer.normalize(source, { size });
    expect(normalized).toMatchObject({ width: size, height: size });
    expect(normalized.image).toBeInstanceOf(Blob);
    expect(normalized.image.type).toBe("image/png");
    expect(new Uint8Array(await normalized.image.arrayBuffer())).toEqual(
      new Uint8Array(png(size)),
    );
    expect(calls.bytes).toEqual(new Uint8Array(await source.arrayBuffer()));
    expect(calls.input).toBe(1);
    expect(calls.transforms).toEqual([
      { width: size, height: size, fit: "cover" },
    ]);
    expect(calls.outputs).toEqual([{ format: "image/png", anim: false }]);
    expect(calls.response).toBe(1);
    expect(await normalizer.inspectImage(normalized.image)).toEqual({
      width: size,
      height: size,
    });
    expect(calls.input).toBe(1);
  }
});

it("rejects unsupported size, MIME, signature, dimensions and animation before any Images call", async () => {
  const { binding, calls } = fakeImages();
  const normalizer = createImageNormalizer(binding);
  const animatedWebp = Buffer.alloc(30);
  animatedWebp.write("RIFF");
  animatedWebp.writeUInt32LE(22, 4);
  animatedWebp.write("WEBPVP8X", 8);
  animatedWebp.writeUInt32LE(10, 16);
  animatedWebp[20] = 2;
  animatedWebp[24] = animatedWebp[27] = 63;
  const animationChunk = Buffer.concat([
    readFileSync("public/css-studio/images/spring/spring-01-woodland.webp"),
    Buffer.from([65, 78, 73, 77, 0, 0, 0, 0]),
  ]);
  animationChunk.writeUInt32LE(animationChunk.length - 8, 4);
  for (const [source, size] of [
    [raster(), 257],
    [new Blob(["<svg/>"], { type: "image/svg+xml" }), 512],
    [new Blob([png()], { type: "image/jpeg" }), 512],
    [new Blob([png(32)], { type: "image/png" }), 512],
    [new Blob([png(2049, 64)], { type: "image/png" }), 512],
    [new Blob([png(64, 64, { animated: true })], { type: "image/png" }), 512],
    [new Blob([animatedWebp], { type: "image/webp" }), 512],
    [new Blob([animationChunk], { type: "image/webp" }), 512],
    [new Blob([new Uint8Array(MEDIA_LIMIT + 1)], { type: "image/png" }), 512],
  ])
    await expect(normalizer.normalize(source, { size })).rejects.toBeInstanceOf(
      ProviderOutputError,
    );
  expect(calls.input).toBe(0);
});

it("inspects only exact successful output Blobs and never transforms again for inspection", async () => {
  const { binding, calls } = fakeImages();
  const normalizer = createImageNormalizer(binding);
  const source = raster();
  const result = await normalizer.normalize(source);
  const dimensions = await normalizer.inspectImage(result.image);
  dimensions.width = 1;
  expect(await normalizer.inspectImage(result.image)).toEqual({
    width: 512,
    height: 512,
  });
  for (const blob of [
    source,
    result.image.slice(),
    new Blob([result.image], { type: "image/png" }),
  ])
    await expect(normalizer.inspectImage(blob)).rejects.toBeInstanceOf(
      ProviderOutputError,
    );
  await expect(
    createImageNormalizer(binding).inspectImage(result.image),
  ).rejects.toBeInstanceOf(ProviderOutputError);
  expect(calls.input).toBe(1);
});

it("rejects completed malformed, animated, wrong-format and wrong-sized output without retry", async () => {
  for (const output of [
    new Response("<svg/>", { headers: { "Content-Type": "image/svg+xml" } }),
    new Response("not png", { headers: { "Content-Type": "image/png" } }),
    response(256),
    new Response(png(512, 512, { animated: true }), {
      headers: { "Content-Type": "image/png" },
    }),
  ]) {
    const { binding, calls } = fakeImages(output);
    await expect(
      createImageNormalizer(binding).normalize(raster()),
    ).rejects.toBeInstanceOf(ProviderOutputError);
    expect(calls.input).toBe(1);
  }
});

it("keeps decoder/response/stream failures uncertain and maps only numeric Images exhaustion", async () => {
  const transport = Error("private upstream details");
  const { binding, calls } = fakeImages(undefined, { fail: transport });
  await expect(createImageNormalizer(binding).normalize(raster())).rejects.toBe(
    transport,
  );
  expect(calls.input).toBe(1);
  for (const asynchronous of [false, true]) {
    const responseError = Error("Images response unavailable");
    await expect(
      createImageNormalizer(
        fakeImages(undefined, { responseFail: responseError, asynchronous })
          .binding,
      ).normalize(raster()),
    ).rejects.toBe(responseError);
  }
  const limited = Object.assign(Error("Images limit"), { code: 9422 });
  await expect(
    createImageNormalizer(
      fakeImages(undefined, { fail: limited }).binding,
    ).normalize(raster()),
  ).rejects.toBeInstanceOf(ImageLimitError);
  const unverified = { code: 9422 };
  await expect(
    createImageNormalizer(
      fakeImages(undefined, { fail: unverified }).binding,
    ).normalize(raster()),
  ).rejects.toBe(unverified);
  const stringCode = Object.assign(Error("Unverified code"), { code: "9422" });
  await expect(
    createImageNormalizer(
      fakeImages(undefined, { fail: stringCode }).binding,
    ).normalize(raster()),
  ).rejects.toBe(stringCode);
  const bodyError = Error("response stream interrupted");
  const broken = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(bodyError);
      },
    }),
    { headers: { "Content-Type": "image/png" } },
  );
  await expect(
    createImageNormalizer(fakeImages(broken).binding).normalize(raster()),
  ).rejects.toBe(bodyError);
});

it("bounds normalized output while preserving bounded-reader transport errors", async () => {
  const oversized = new Response(new Uint8Array(MEDIA_LIMIT + 1), {
    headers: { "Content-Type": "image/png" },
  });
  const { binding, calls } = fakeImages(oversized);
  await expect(
    createImageNormalizer(binding).normalize(raster()),
  ).rejects.toMatchObject({ status: 413 });
  expect(calls.input).toBe(1);
});

it("propagates cancellation before dispatch and after a delayed input read", async () => {
  const { binding, calls } = fakeImages();
  const normalizer = createImageNormalizer(binding);
  const controller = new AbortController();
  const reason = Error("request cancelled");
  controller.abort(reason);
  await expect(
    normalizer.normalize(raster(), { signal: controller.signal }),
  ).rejects.toBe(reason);
  const reading = deferred();
  const source = raster();
  source.arrayBuffer = () => reading.promise;
  const active = new AbortController();
  const pending = normalizer.normalize(source, { signal: active.signal });
  const rejected = expect(pending).rejects.toBe(reason);
  active.abort(reason);
  await rejected;
  reading.resolve(png().buffer);
  await Promise.resolve();
  await Promise.resolve();
  expect(calls.input).toBe(0);
});

it("never reads a delayed Images result after the request was cancelled", async () => {
  const delayed = delayedImages();
  const controller = new AbortController();
  const reason = Error("request timed out upstream");
  const pending = createImageNormalizer(delayed.binding).normalize(raster(), {
    signal: controller.signal,
  });
  const rejected = expect(pending).rejects.toBe(reason);
  await delayed.entered;
  controller.abort(reason);
  await rejected;
  delayed.finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(delayed.calls).toEqual({ input: 1, response: 0 });
});

it("bounds a hung Images transform and never proceeds when it eventually completes", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const delayed = delayedImages();
  const pending = createImageNormalizer(delayed.binding, {
    timeoutMs: 20,
  }).normalize(raster());
  const rejected = expect(pending).rejects.toMatchObject({
    name: "TimeoutError",
  });
  await delayed.entered;
  await vi.advanceTimersByTimeAsync(20);
  await rejected;
  delayed.finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(delayed.calls).toEqual({ input: 1, response: 0 });
});

it("stops before reading output when cancellation occurs while response is pending", async () => {
  const controller = new AbortController();
  const returned = deferred();
  const entered = deferred();
  const output = response();
  const normalizer = createImageNormalizer({
    input() {
      return {
        transform() {
          return {
            async output() {
              return {
                response() {
                  entered.resolve();
                  return returned.promise;
                },
              };
            },
          };
        },
      };
    },
  });
  const pending = normalizer.normalize(raster(), { signal: controller.signal });
  const reason = Error("outer request cancelled");
  const rejected = expect(pending).rejects.toBe(reason);
  await entered.promise;
  controller.abort(reason);
  await rejected;
  returned.resolve(output);
  await Promise.resolve();
  await Promise.resolve();
  expect(output.bodyUsed).toBe(false);
});
