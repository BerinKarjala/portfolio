import { expect, it, vi } from "vitest";
import { createKleinImageProvider, KLEIN_IMAGE_PLAN } from "./kleinProvider.js";
import { ProviderLimitError, ProviderOutputError } from "./providerErrors.js";
import { MEDIA_LIMIT } from "../../src/shared/studioTransfer.js";

const input = {
  id: "00000000-0000-4000-8000-000000000001",
  operation: "image",
  prompt: "A quiet winter forest",
  history: [],
  context: { family: "seasons", id: "winter", mode: "dark", contrast: false },
};
// Header fixture is deliberately not a full raster. Only the injected decoder
// represents full decoding here; actual Images runtime acceptance is separate.
function png(size = 512) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  new DataView(bytes.buffer).setUint32(16, size);
  new DataView(bytes.buffer).setUint32(20, size);
  return new Blob([bytes], { type: "image/png" });
}
async function fixture() {
  const encoded = Buffer.from(await png().arrayBuffer()).toString("base64");
  const ai = { run: vi.fn(async () => Response.json({ image: encoded })) };
  const normalized = png();
  const normalizer = {
    normalize: vi.fn(async (_blob, { size }) => ({
      image: size === 512 ? normalized : png(256),
      width: size,
      height: size,
    })),
    inspectImage: vi.fn(async (blob) => {
      if (blob !== normalized) throw new ProviderOutputError();
      return { width: 512, height: 512 };
    }),
  };
  return {
    ai,
    normalizer,
    provider: createKleinImageProvider(ai, normalizer),
    normalized,
  };
}
async function withNativeDecoder(decoder, action) {
  const previous = Object.getOwnPropertyDescriptor(Uint8Array, "fromBase64");
  Object.defineProperty(Uint8Array, "fromBase64", {
    configurable: true,
    writable: true,
    value: decoder,
  });
  try {
    return await action();
  } finally {
    if (previous) Object.defineProperty(Uint8Array, "fromBase64", previous);
    else delete Uint8Array.fromBase64;
  }
}

it("reports fixed phases around one model call and each admitted normalization", async () => {
  for (const refine of [false, true]) {
    const { ai, normalizer, provider } = await fixture();
    const onPhase = vi.fn();
    await provider.propose(
      refine
        ? {
            ...input,
            operation: "refine",
            baseImageId: "generated-00000000-0000-4000-8000-000000000001",
          }
        : input,
      { onPhase, ...(refine ? { baseImage: png() } : {}) },
    );
    expect(onPhase.mock.calls).toEqual(
      [
        ...(refine ? ["normalize"] : []),
        "provider",
        "response-body",
        "raster",
        "normalize",
      ].map((phase) => [phase]),
    );
    expect(ai.run).toHaveBeenCalledOnce();
    expect(ai.run.mock.calls[0][2]).not.toHaveProperty("onPhase");
    expect(normalizer.normalize).toHaveBeenCalledTimes(refine ? 2 : 1);
  }
});

it("stops phase evidence at provider, response, raster or normalization failure without retries", async () => {
  for (const failure of ["provider", "response-body", "raster", "normalize"]) {
    const { ai, normalizer, provider } = await fixture();
    const onPhase = vi.fn();
    if (failure === "provider")
      ai.run.mockRejectedValue(Error("private upstream details"));
    if (failure === "response-body")
      ai.run.mockResolvedValue(new Response("invalid JSON"));
    if (failure === "raster")
      ai.run.mockResolvedValue(Response.json({ image: "AAAA" }));
    if (failure === "normalize")
      normalizer.normalize.mockRejectedValue(Error("private decoder details"));
    await expect(provider.propose(input, { onPhase })).rejects.toThrow();
    expect(onPhase.mock.calls.at(-1)).toEqual([failure]);
    expect(ai.run).toHaveBeenCalledOnce();
    expect(normalizer.normalize).toHaveBeenCalledTimes(
      failure === "normalize" ? 1 : 0,
    );
    expect(JSON.stringify(onPhase.mock.calls)).not.toContain("private");
  }
  const { ai, normalizer, provider } = await fixture();
  const onPhase = vi.fn();
  normalizer.normalize.mockRejectedValue(Error("private base decoder details"));
  await expect(
    provider.propose(
      {
        ...input,
        operation: "refine",
        baseImageId: "generated-00000000-0000-4000-8000-000000000001",
      },
      { baseImage: png(), onPhase },
    ),
  ).rejects.toThrow();
  expect(onPhase.mock.calls).toEqual([["normalize"]]);
  expect(ai.run).not.toHaveBeenCalled();
});

it("uses native decoding when available and preserves fallback bytes including nonzero unused pad bits", async () => {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const header = Buffer.from(await png().arrayBuffer());
  const cases = [];
  for (const paddingBytes of [0, 1, 2]) {
    const bytes = Buffer.concat([header, Buffer.alloc(paddingBytes)]);
    const encoded = bytes.toString("base64");
    cases.push({ bytes, encoded });
    if (encoded.endsWith("=")) {
      const last = encoded.indexOf("=") - 1;
      // atob accepts nonzero unused bits; native loose mode must preserve that
      // existing contract rather than silently switching to canonical padding.
      const altered =
        encoded.slice(0, last) +
        alphabet[alphabet.indexOf(encoded[last]) | 1] +
        encoded.slice(last + 1);
      cases.push({ bytes, encoded: altered });
    }
  }
  const limitBytes = Buffer.alloc(MEDIA_LIMIT);
  header.copy(limitBytes);
  cases.push({ bytes: limitBytes, encoded: limitBytes.toString("base64") });
  for (const native of [false, true]) {
    const decoder = vi.fn((encoded) =>
      Uint8Array.from(Buffer.from(encoded, "base64")),
    );
    const legacy = vi.spyOn(globalThis, "atob");
    try {
      await withNativeDecoder(native ? decoder : undefined, async () => {
        for (const { bytes, encoded } of cases) {
          const { ai, provider, normalizer } = await fixture();
          ai.run.mockResolvedValueOnce(Response.json({ image: encoded }));
          await provider.propose(input);
          const blob = normalizer.normalize.mock.calls[0][0];
          expect(Buffer.from(await blob.arrayBuffer()).equals(bytes)).toBe(
            true,
          );
        }
      });
      expect(decoder).toHaveBeenCalledTimes(native ? cases.length : 0);
      expect(legacy).toHaveBeenCalledTimes(native ? 0 : cases.length);
    } finally {
      legacy.mockRestore();
    }
  }
});

it("rejects malformed wire encoding and decoded-size overflow before native or fallback decoding", async () => {
  const tooManyBytes = "A".repeat(Math.ceil(MEDIA_LIMIT / 3) * 4);
  for (const native of [false, true]) {
    const decoder = vi.fn((encoded) =>
      Uint8Array.from(Buffer.from(encoded, "base64")),
    );
    const legacy = vi.spyOn(globalThis, "atob");
    try {
      await withNativeDecoder(native ? decoder : undefined, async () => {
        for (const encoded of [
          "",
          "A",
          "AA=A",
          "A===",
          "AAAA====",
          "AAAA\nAAA",
          "-_==",
          "data:image/png;base64,AAAA",
          tooManyBytes,
          tooManyBytes.slice(0, -1) + "=",
        ]) {
          const { ai, provider, normalizer } = await fixture();
          ai.run.mockResolvedValueOnce(Response.json({ image: encoded }));
          await expect(provider.propose(input)).rejects.toBeInstanceOf(
            ProviderOutputError,
          );
          expect(normalizer.normalize).not.toHaveBeenCalled();
        }
      });
      expect(decoder.mock.calls.length).toBe(0);
      expect(legacy.mock.calls.length).toBe(0);
    } finally {
      legacy.mockRestore();
    }
  }
});
it("serializes one fixed multipart generation and retains the conservative model-wide reservation", async () => {
  const { ai, normalizer, provider, normalized } = await fixture();
  const signal = new AbortController().signal;
  const result = await provider.propose(input, {
    signal,
    width: 1920,
    steps: 100,
  });
  expect(result.image).toBe(normalized);
  expect(result.proposal).toEqual({
    message: "Background proposal ready to preview.",
    overrides: {},
  });
  expect(result.usage).toBeUndefined();
  const [model, args, options] = ai.run.mock.calls[0];
  expect(model).toBe("@cf/black-forest-labs/flux-2-klein-4b");
  expect(options).toEqual({ returnRawResponse: true, signal });
  expect(Object.keys(args)).toEqual(["multipart"]);
  const form = await new Response(args.multipart.body, {
    headers: { "Content-Type": args.multipart.contentType },
  }).formData();
  expect([...form.keys()].sort()).toEqual(["height", "prompt", "width"]);
  expect(form.get("width")).toBe("512");
  expect(form.get("height")).toBe("512");
  expect(form.get("prompt")).toContain(input.prompt);
  expect(form.get("prompt")).toContain("winter");
  expect(normalizer.normalize).toHaveBeenCalledExactlyOnceWith(
    expect.any(Blob),
    { size: 512, signal },
  );
  await expect(provider.inspectImage(result.image)).resolves.toEqual({
    width: 512,
    height: 512,
  });
  expect(provider.transformsFor(input)).toBe(1);
  expect(KLEIN_IMAGE_PLAN).toMatchObject({
    imageNeurons: 500,
    imageWidth: 512,
    imageHeight: 512,
    imageSteps: 4,
  });
  expect(Object.isFrozen(KLEIN_IMAGE_PLAN)).toBe(true);
});
it("normalizes exactly one verified owned base to256 before the single model call", async () => {
  const { ai, normalizer, provider } = await fixture();
  const refine = {
    ...input,
    operation: "refine",
    baseImageId: "generated-00000000-0000-4000-8000-000000000001",
  };
  await expect(provider.propose(refine)).rejects.toThrow();
  expect(ai.run).not.toHaveBeenCalled();
  const base = png();
  await provider.propose(refine, { baseImage: base });
  expect(
    normalizer.normalize.mock.calls.map(([, options]) => options.size),
  ).toEqual([256, 512]);
  const payload = ai.run.mock.calls[0][1].multipart;
  const form = await new Response(payload.body, {
    headers: { "Content-Type": payload.contentType },
  }).formData();
  expect([...form.keys()].sort()).toEqual([
    "height",
    "input_image_0",
    "prompt",
    "width",
  ]);
  expect(form.get("input_image_0").type).toBe("image/png");
  expect(form.get("input_image_0").name).toBe("base.png");
  expect(provider.transformsFor(refine)).toBe(2);
});
it("rejects oversize input, unsupported fields, wrong operations and unexpected bases before external work", async () => {
  const { ai, normalizer, provider } = await fixture();
  for (const invalid of [
    { ...input, operation: "theme" },
    { ...input, model: "other" },
    {
      ...input,
      history: Array.from({ length: 10 }, () => ({
        role: "user",
        text: "x".repeat(2000),
      })),
    },
  ])
    await expect(provider.propose(invalid)).rejects.toThrow();
  await expect(provider.propose(input, { baseImage: png() })).rejects.toThrow();
  expect(ai.run).not.toHaveBeenCalled();
  expect(normalizer.normalize).not.toHaveBeenCalled();
  expect(createKleinImageProvider(undefined, normalizer)).toBeUndefined();
  expect(createKleinImageProvider(ai, undefined)).toBeUndefined();
});
it("rejects ambiguous or malformed completed outputs without forwarding provider text or accepting arbitrary images", async () => {
  const { ai, normalizer, provider } = await fixture();
  for (const value of [
    {},
    { image: "data:image/png;base64,AAAA" },
    { image: ["AAAA"] },
    { image: "%%%=" },
    { image: "PHN2Zy8+" },
    { image: "AAAA", extra: "unexpected" },
  ]) {
    ai.run.mockImplementationOnce(async () => Response.json(value));
    await expect(provider.propose(input)).rejects.toBeInstanceOf(
      ProviderOutputError,
    );
  }
  expect(normalizer.normalize).not.toHaveBeenCalled();
  ai.run.mockImplementationOnce(async () =>
    Response.json({ image: "A".repeat(5600000) }),
  );
  await expect(provider.propose(input)).rejects.toMatchObject({ status: 413 });
});
it("does not retry failures and preserves transport/abort uncertainty", async () => {
  const { ai, normalizer, provider } = await fixture();
  const controller = new AbortController();
  controller.abort();
  await expect(
    provider.propose(input, { signal: controller.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(ai.run).not.toHaveBeenCalled();
  for (const status of [402, 403, 429]) {
    ai.run.mockImplementationOnce(
      async () => new Response("private details", { status }),
    );
    await expect(provider.propose(input)).rejects.toBeInstanceOf(
      ProviderLimitError,
    );
  }
  const interruption = new Error("fixture transport interruption");
  ai.run.mockRejectedValueOnce(interruption);
  await expect(provider.propose(input)).rejects.toBe(interruption);
  ai.run.mockImplementationOnce(
    async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.error(interruption);
          },
        }),
      ),
  );
  await expect(provider.propose(input)).rejects.toBe(interruption);
  expect(ai.run).toHaveBeenCalledTimes(5);
  expect(normalizer.normalize).not.toHaveBeenCalled();
  ai.run.mockResolvedValueOnce({ image: "unverified completion" });
  await expect(provider.propose(input)).rejects.toThrow(
    "Provider completion could not be verified",
  );
});

it("never starts inference after a base transform finishes beyond cancellation", async () => {
  const { ai, normalizer, provider } = await fixture();
  const controller = new AbortController();
  normalizer.normalize.mockImplementationOnce(async () => {
    controller.abort();
    return { image: png(256), width: 256, height: 256 };
  });
  await expect(
    provider.propose(
      {
        ...input,
        operation: "refine",
        baseImageId: "generated-00000000-0000-4000-8000-000000000001",
      },
      {
        signal: controller.signal,
        baseImage: png(),
      },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(ai.run).not.toHaveBeenCalled();
});

it("does not normalize a late model completion or dispatch a malformed normalized reference", async () => {
  const { ai, normalizer, provider } = await fixture();
  const controller = new AbortController();
  ai.run.mockImplementationOnce(async () => {
    controller.abort();
    return Response.json({ image: "AAAA" });
  });
  await expect(
    provider.propose(input, { signal: controller.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(normalizer.normalize).not.toHaveBeenCalled();
  ai.run.mockClear();
  for (const invalid of [
    { image: png(), width: 512, height: 512 },
    {
      image: new Blob(["other"], { type: "image/webp" }),
      width: 256,
      height: 256,
    },
  ]) {
    normalizer.normalize.mockResolvedValueOnce(invalid);
    await expect(
      provider.propose(
        {
          ...input,
          operation: "refine",
          baseImageId: "generated-00000000-0000-4000-8000-000000000001",
        },
        { baseImage: png() },
      ),
    ).rejects.toBeInstanceOf(ProviderOutputError);
  }
  expect(ai.run).not.toHaveBeenCalled();
});
