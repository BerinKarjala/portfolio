import { afterEach, expect, it, vi } from "vitest";
import { inflateSync } from "node:zlib";
import { IMAGE_INFO_PATH, handleImageInfoProbe } from "./imageInfoProbe.js";

const origin = "https://berinkarjala.netlify.app";
const endpointOrigin = "https://css-studio-ai.berin-karjala.workers.dev";
const metadata = { width: 64, height: 64, format: "image/png" };
const privateText = "private-provider-detail-and-cookie";
afterEach(() => vi.useRealTimers());
function request({
  url = endpointOrigin + IMAGE_INFO_PATH,
  method = "POST",
  body = "{}",
  headers = {},
  signal,
} = {}) {
  return new Request(url, {
    method,
    headers: {
      Origin: origin,
      "X-CSS-Studio": "1",
      "Content-Type": "application/json",
      ...headers,
    },
    ...(method === "GET" ? {} : { body }),
    ...(signal ? { signal } : {}),
  });
}
function options(info = vi.fn(async () => metadata)) {
  return {
    authorized: true,
    origin,
    endpointOrigin,
    images: { info, input: vi.fn(), output: vi.fn() },
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

it("dispatches exactly one real bounded 64px PNG stream to info and returns only metadata plus wall time", async () => {
  let bytes;
  const info = vi.fn(async (stream) => {
    bytes = Buffer.from(await new Response(stream).arrayBuffer());
    return { ...metadata, private: privateText };
  });
  const config = options(info);
  const clock = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(117);
  const response = await handleImageInfoProbe(request(), { ...config, clock });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    info: metadata,
    elapsedWallMs: 17,
    inferencePerformed: false,
    transformationPerformed: false,
    cpuMeasured: false,
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.has("set-cookie")).toBe(false);
  expect(info).toHaveBeenCalledTimes(1);
  expect(info.mock.calls[0]).toHaveLength(1);
  expect(config.images.input).not.toHaveBeenCalled();
  expect(config.images.output).not.toHaveBeenCalled();
  expect(bytes.length).toBeLessThan(1024);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [],
    compressed = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset),
      end = offset + 8 + length;
    const name = bytes.toString("ascii", offset + 4, offset + 8);
    expect(crc32(bytes.subarray(offset + 4, end))).toBe(
      bytes.readUInt32BE(end),
    );
    chunks.push(name);
    if (name === "IHDR") {
      expect(bytes.readUInt32BE(offset + 8)).toBe(64);
      expect(bytes.readUInt32BE(offset + 12)).toBe(64);
      expect([...bytes.subarray(offset + 16, offset + 21)]).toEqual([
        8, 6, 0, 0, 0,
      ]);
    }
    if (name === "IDAT") compressed.push(bytes.subarray(offset + 8, end));
    offset = end + 4;
  }
  expect(chunks).toEqual(["IHDR", "IDAT", "IEND"]);
  const raster = inflateSync(Buffer.concat(compressed));
  expect(raster.length).toBe(64 * (1 + 64 * 4));
  for (let y = 0; y < 64; y++) expect(raster[y * 257]).toBe(0);
});

it("hides the diagnostic from every unauthorized request before touching Images", async () => {
  for (const authorized of [undefined, false, 1, "true"]) {
    const config = options();
    const response = await handleImageInfoProbe(request(), {
      ...config,
      authorized,
    });
    expect(response.status).toBe(404);
    expect(config.images.info).not.toHaveBeenCalled();
  }
});

it("rejects wrong endpoints, paths, methods, origins and fetch metadata before dispatch", async () => {
  for (const invalid of [
    { url: origin + IMAGE_INFO_PATH },
    { url: endpointOrigin + IMAGE_INFO_PATH + "?x=1" },
    { url: endpointOrigin + "/api/css-studio/other" },
    { method: "GET" },
    { headers: { Origin: "https://example.com" } },
    { headers: { "X-CSS-Studio": "0" } },
    { headers: { "Sec-Fetch-Site": "cross-site" } },
  ]) {
    const config = options();
    expect((await handleImageInfoProbe(request(invalid), config)).status).toBe(
      403,
    );
    expect(config.images.info).not.toHaveBeenCalled();
  }
});

it("accepts optional same-origin metadata and rejects unsupported bodies within 64 bytes", async () => {
  const valid = options();
  expect(
    (
      await handleImageInfoProbe(
        request({
          body: " ".repeat(62) + "{}",
          headers: { "Sec-Fetch-Site": "same-origin" },
        }),
        valid,
      )
    ).status,
  ).toBe(200);
  for (const [invalid, status] of [
    [{ headers: { "Content-Type": "text/plain" } }, 415],
    [{ headers: { "Content-Encoding": "gzip" } }, 415],
    [{ body: "[]" }, 400],
    [{ body: "null" }, 400],
    [{ body: '{"x":1}' }, 400],
    [{ body: "bad-json" }, 400],
    [{ body: " ".repeat(63) + "{}" }, 400],
    [{ headers: { "Content-Length": "65" } }, 400],
  ]) {
    const config = options();
    expect((await handleImageInfoProbe(request(invalid), config)).status).toBe(
      status,
    );
    expect(config.images.info).not.toHaveBeenCalled();
  }
});

it("returns safe unavailable/invalid categories and exposes only the allowlisted numeric code", async () => {
  expect(
    (await handleImageInfoProbe(request(), { ...options(), images: undefined }))
      .status,
  ).toBe(503);
  for (const code of [9432, "9432", 9422, undefined]) {
    const config = options(
      vi.fn(async () => {
        throw Object.assign(Error(privateText), { code });
      }),
    );
    const response = await handleImageInfoProbe(request(), config);
    const value = await response.json();
    expect(value.category).toBe(
      code === 9432 ? "images-info-unavailable" : "images-info-failed",
    );
    expect(value.code).toBe(code === 9432 ? 9432 : undefined);
    expect(JSON.stringify(value)).not.toContain(privateText);
    expect(config.images.info).toHaveBeenCalledTimes(1);
  }
  for (const value of [
    { ...metadata, width: 1 },
    { ...metadata, height: 128 },
    { ...metadata, format: "png" },
    null,
  ]) {
    const response = await handleImageInfoProbe(
      request(),
      options(vi.fn(async () => value)),
    );
    expect(response.status).toBe(502);
    expect((await response.json()).category).toBe("invalid-image-info");
  }
});

it("bounds the operation at five seconds and ignores late info completion without retry", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const pendingInfo = deferred(),
    entered = deferred();
  const info = vi.fn(() => {
    entered.resolve();
    return pendingInfo.promise;
  });
  const pending = handleImageInfoProbe(request(), options(info));
  await entered.promise;
  await vi.advanceTimersByTimeAsync(5000);
  const response = await pending;
  expect(response.status).toBe(504);
  expect((await response.json()).category).toBe("image-info-timeout");
  const read = vi.fn(() => {
    throw Error(privateText);
  });
  pendingInfo.resolve({
    get width() {
      return read();
    },
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(read).not.toHaveBeenCalled();
  expect(info).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it("shares one five-second deadline across a delayed body and info without late dispatch", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  function slowRequest() {
    let body,
      cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        body = controller;
      },
      cancel() {
        cancelled = true;
      },
    });
    return {
      request: new Request(endpointOrigin + IMAGE_INFO_PATH, {
        method: "POST",
        headers: {
          Origin: origin,
          "X-CSS-Studio": "1",
          "Content-Type": "application/json",
        },
        body: stream,
        duplex: "half",
      }),
      finish: () => {
        body.enqueue(new TextEncoder().encode("{}"));
        body.close();
      },
      cancelled: () => cancelled,
    };
  }
  const slow = slowRequest(),
    entered = deferred(),
    late = deferred();
  const info = vi.fn(() => {
    entered.resolve();
    return late.promise;
  });
  const pending = handleImageInfoProbe(slow.request, options(info));
  await vi.advanceTimersByTimeAsync(4000);
  slow.finish();
  await entered.promise;
  await vi.advanceTimersByTimeAsync(1000);
  expect((await pending).status).toBe(504);
  late.resolve(metadata);
  await Promise.resolve();
  await Promise.resolve();
  expect(info).toHaveBeenCalledTimes(1);

  const abandoned = slowRequest(),
    unused = options();
  const stopped = handleImageInfoProbe(abandoned.request, unused);
  await vi.advanceTimersByTimeAsync(5000);
  expect((await stopped).status).toBe(504);
  expect(abandoned.cancelled()).toBe(true);
  expect(unused.images.info).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("does not dispatch for an aborted request and ignores completion after in-flight abort", async () => {
  const stopped = new AbortController();
  stopped.abort(Error(privateText));
  const config = options();
  expect(
    (await handleImageInfoProbe(request({ signal: stopped.signal }), config))
      .status,
  ).toBe(400);
  expect(config.images.info).not.toHaveBeenCalled();
  const active = new AbortController(),
    pendingInfo = deferred(),
    entered = deferred();
  const info = vi.fn(() => {
    entered.resolve();
    return pendingInfo.promise;
  });
  const pending = handleImageInfoProbe(
    request({ signal: active.signal }),
    options(info),
  );
  await entered.promise;
  active.abort(Error(privateText));
  const response = await pending;
  expect(response.status).toBe(400);
  expect((await response.json()).category).toBe("request-aborted");
  pendingInfo.reject(Error(privateText));
  await Promise.resolve();
  await Promise.resolve();
  expect(info).toHaveBeenCalledTimes(1);
});
