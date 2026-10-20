import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { connectHttpDesigner } from "./httpDesigner";
const image = () =>
  new Blob(
    [readFileSync("public/css-studio/images/spring/spring-01-woodland.webp")],
    { type: "image/webp" },
  );
const receipt = "media-v1." + "a".repeat(16) + "." + "b".repeat(400);
const request = {
  id: crypto.randomUUID(),
  operation: "image",
  prompt: "Forest",
  history: [],
  context: { family: "seasons", id: "spring", mode: "light", contrast: false },
};
it("does not open a session or submit a proposal when the same-origin server is unavailable", async () => {
  const fetch = vi.fn(async () => Response.json({ available: false }));
  const designer = await connectHttpDesigner({ fetch });
  expect(designer.available).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe("/api/css-studio/status");
});
it("opens a session only after readiness, validates image responses and reattaches proof/bytes without arbitrary URLs", async () => {
  const fetch = vi.fn(async (path, options) => {
    if (path.endsWith("/status")) return new Response("", { status: 401 });
    if (path.endsWith("/session")) return Response.json({ available: true });
    if (options.body instanceof FormData) {
      expect(options.body.get("receipt")).toBe(receipt);
      expect(options.body.get("image").size).toBe(image().size);
    }
    const form = new FormData();
    form.set(
      "proposal",
      JSON.stringify({
        requestId: request.id,
        message: "Forest",
        overrides: {},
        receipt,
      }),
    );
    form.set("image", image(), "image.webp");
    return new Response(form);
  });
  const designer = await connectHttpDesigner({ fetch });
  expect(designer.available).toBe(true);
  const response = await designer.propose(request);
  expect(response.image.size).toBe(image().size);
  expect(response.receipt).toBe(receipt);
  await designer.propose(
    {
      ...request,
      operation: "refine",
      baseImageId: "generated-00000000-0000-4000-8000-000000000001",
    },
    { baseImage: response.image, baseReceipt: response.receipt },
  );
  expect(
    fetch.mock.calls.every(([path]) => path.startsWith("/api/css-studio/")),
  ).toBe(true);
  expect(
    fetch.mock.calls.every(
      ([, options]) =>
        options.credentials === "same-origin" && options.redirect === "error",
    ),
  ).toBe(true);
});
it("does not silently retry submissions and maps expired proof to a safe actionable error", async () => {
  const fetch = vi.fn(async (path) =>
    path.endsWith("/status")
      ? Response.json({ available: true })
      : Response.json(
          { code: "media-unavailable", error: "<script>private</script>" },
          { status: 409 },
        ),
  );
  const designer = await connectHttpDesigner({ fetch });
  await expect(designer.propose(request)).rejects.toMatchObject({
    publicMessage: expect.stringMatching(/saved background.*verified/i),
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});
