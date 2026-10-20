import { expect, it } from "vitest";
import {
  initialPreferences,
  updateProfile,
  decodePreferences,
  resolveTheme,
  exportCss,
} from "./theme";
import { makeRequest, validateProposal, canApply } from "./ai";
const id = "generated-00000000-0000-4000-8000-000000000001";
const image = {
  id,
  mime: "image/webp",
  context: { family: "seasons", id: "spring" },
  displayUrl: "blob:https://example.test/local",
};
it("restores generated references and shares runtime/portable resolution without leaking object URLs", () => {
  const p = updateProfile(initialPreferences(), { backgroundId: id });
  expect(decodePreferences(JSON.stringify(p)).seasons.spring.backgroundId).toBe(
    id,
  );
  expect(
    resolveTheme(p, { generatedImages: { [id]: image } })["--studio-image"],
  ).toContain("blob:");
  expect(
    exportCss(p, {
      generatedImages: { [id]: image },
      assetBase: "./css-studio/",
    }),
  ).toContain(`./css-studio/generated/${id}.webp`);
  expect(
    exportCss(p, {
      generatedImages: { [id]: image },
      assetBase: "./css-studio/",
    }),
  ).not.toContain("blob:");
  expect(resolveTheme(p)["--studio-image"]).toContain("spring-01");
  expect(
    resolveTheme(
      { ...p, season: "winter", seasons: { winter: { backgroundId: id } } },
      { generatedImages: { [id]: image } },
    )["--studio-image"],
  ).toContain("winter-01");
});
it("requires actual bounded raster bytes and binds refinement to the selected generated background", () => {
  const p = updateProfile(initialPreferences(), { backgroundId: id });
  const request = makeRequest(p, "More snow", [], () => "r", {
    operation: "refine",
    baseImageId: id,
  });
  expect(request.operation).toBe("refine");
  expect(request.baseImageId).toBe(id);
  expect(() =>
    makeRequest(initialPreferences(), "More snow", [], () => "r", {
      operation: "refine",
      baseImageId: id,
    }),
  ).toThrow();
  const data = {
    requestId: "r",
    message: "Snow",
    overrides: {},
    image: new Blob(["bytes"], { type: "image/webp" }),
  };
  expect(validateProposal(data, request).image).toBe(data.image);
  expect(() =>
    validateProposal({ ...data, image: "https://evil/image.webp" }, request),
  ).toThrow();
  expect(() =>
    validateProposal({ ...data, image: undefined }, request),
  ).toThrow();
  expect(() =>
    validateProposal({ ...data, overrides: { backgroundId: id } }, request),
  ).toThrow();
});

it("rejects refinement Apply when the base selection changes even in the same preset", () => {
  const p = updateProfile(initialPreferences(), { backgroundId: id });
  const request = makeRequest(p, "More snow", [], () => "r", {
    operation: "refine",
    baseImageId: id,
  });
  const proposal = validateProposal(
    {
      requestId: "r",
      message: "Snow",
      overrides: {},
      image: new Blob(["bytes"], { type: "image/webp" }),
    },
    request,
  );
  expect(canApply(proposal, p, "r")).toBe(true);
  expect(
    canApply(proposal, updateProfile(p, { backgroundId: "none" }), "r"),
  ).toBe(false);
});
