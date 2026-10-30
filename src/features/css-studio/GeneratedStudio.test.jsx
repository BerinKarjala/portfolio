/* @vitest-environment jsdom */
import { Blob } from "node:buffer";
import { readFileSync } from "node:fs";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StudioProvider, StudioLauncher } from "./Studio";
import { createImageCache, memoryImageBackend } from "./imageCache";
const bytes = readFileSync(
  "public/css-studio/images/spring/spring-01-woodland.webp",
);
const blob = () => new Blob([bytes], { type: "image/webp" });
const context = {
  family: "seasons",
  id: "spring",
  mode: "light",
  contrast: false,
};
function cache() {
  return createImageCache(memoryImageBackend(), {
    inspect: async () => ({ width: 1600, height: 1067 }),
  });
}
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  URL.createObjectURL = vi.fn(
    () => `blob:http://localhost/${crypto.randomUUID()}`,
  );
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function open() {
  fireEvent.click(screen.getByRole("button", { name: "Theme Studio" }));
  fireEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
}
it("previews image proposals, isolates late results, applies only explicitly, refines and restores saved bytes", async () => {
  const images = cache();
  let respond;
  const designer = {
    available: true,
    propose: vi.fn(
      (request) =>
        new Promise((resolve) => {
          respond = () =>
            resolve({
              requestId: request.id,
              message: "Snowy forest",
              overrides: {},
              image: blob(),
            });
        }),
    ),
  };
  const view = render(
    <StudioProvider designer={designer} imageCache={images}>
      <StudioLauncher />
    </StudioProvider>,
  );
  open();
  fireEvent.change(screen.getByLabelText("Design action"), {
    target: { value: "image" },
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "A snowy forest" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }));
  fireEvent.change(screen.getByLabelText("Season"), {
    target: { value: "winter" },
  });
  await act(async () => respond());
  await screen.findByAltText("Proposed generated background");
  expect(screen.getByRole("button", { name: "Apply proposal" }).disabled).toBe(
    true,
  );
  expect(
    document.documentElement.style.getPropertyValue("--studio-image"),
  ).not.toContain("blob:");
  fireEvent.change(screen.getByLabelText("Season"), {
    target: { value: "spring" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply proposal" }));
  await waitFor(() =>
    expect(
      document.documentElement.style.getPropertyValue("--studio-image"),
    ).toContain("blob:"),
  );
  const saved = JSON.parse(localStorage.getItem("css-studio:preferences"))
    .seasons.spring.backgroundId;
  expect(saved).toMatch(/^generated-/);
  fireEvent.change(screen.getByLabelText("Design action"), {
    target: { value: "refine" },
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "More snow" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }));
  await waitFor(() =>
    expect(designer.propose.mock.calls[1][0]).toMatchObject({
      operation: "refine",
      baseImageId: saved,
    }),
  );
  await act(async () => respond());
  await screen.findByAltText("Proposed generated background");
  expect(
    (await images.list()).find((row) => row.parentId === saved),
  ).toBeTruthy();
  view.unmount();
  render(
    <StudioProvider imageCache={images}>
      <StudioLauncher />
    </StudioProvider>,
  );
  await waitFor(() =>
    expect(
      document.documentElement.style.getPropertyValue("--studio-image"),
    ).toContain("blob:"),
  );
  open();
  fireEvent.click(
    screen.getByRole("button", { name: "Generated backgrounds", exact: true }),
  );
  await screen.findByRole("button", { name: "Use background 1" });
  expect(
    screen.getByRole("button", { name: "Remove background 2" }).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByLabelText("Compare background 1"));
  fireEvent.click(screen.getByLabelText("Compare background 2"));
  await screen.findByAltText("Comparison background 1");
  await screen.findByAltText("Comparison background 2");
  expect(
    screen.getByRole("button", { name: "Remove background 1" }).disabled,
  ).toBe(true);
});

it("preserves selected and compared images when the cache is full and retains a downloadable proposal", async () => {
  let clock = 0;
  const images = createImageCache(memoryImageBackend(), {
    maxItems: 2,
    now: () => ++clock,
    inspect: async () => ({ width: 1600, height: 1067 }),
  });
  const selected = await images.save({ blob: blob(), context });
  const compared = await images.save({ blob: blob(), context });
  localStorage.setItem(
    "css-studio:preferences",
    JSON.stringify({
      schemaVersion: 2,
      themed: true,
      family: "seasons",
      season: "spring",
      holiday: "new-year",
      mode: "light",
      contrast: false,
      seasons: { spring: { backgroundId: selected.id } },
      holidays: {},
    }),
  );
  vi.stubGlobal("createImageBitmap", async () => ({
    width: 1600,
    height: 1067,
    close() {},
  }));
  const designer = {
    available: true,
    propose: async (request) => ({
      requestId: request.id,
      message: "New forest",
      overrides: {},
      image: blob(),
    }),
  };
  render(
    <StudioProvider imageCache={images} designer={designer}>
      <StudioLauncher />
    </StudioProvider>,
  );
  open();
  fireEvent.click(
    screen.getByRole("button", { name: "Generated backgrounds", exact: true }),
  );
  await screen.findByLabelText("Compare background 1");
  fireEvent.click(screen.getByLabelText("Compare background 1"));
  fireEvent.change(screen.getByLabelText("Design action"), {
    target: { value: "image" },
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "New forest" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }));
  await screen.findByAltText("Proposed generated background");
  expect(screen.getByRole("button", { name: "Apply proposal" }).disabled).toBe(
    true,
  );
  expect(
    screen.getByRole("button", { name: "Download proposed background" })
      .disabled,
  ).toBe(false);
  expect(screen.getByText(/Image cache is full/)).toBeTruthy();
  expect(new Set((await images.list()).map((row) => row.id))).toEqual(
    new Set([selected.id, compared.id]),
  );
  fireEvent.click(screen.getByRole("button", { name: "Clear comparison" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove background 1" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Use background 2" }),
    ).toBeNull(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save proposed background" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Apply proposal" }).disabled,
    ).toBe(false),
  );
  expect(await images.list()).toHaveLength(2);
  vi.unstubAllGlobals();
});

it("ignores a canceled image response and rejects malformed returned bytes without changing the theme", async () => {
  const images = cache();
  const responses = [];
  const designer = {
    available: true,
    propose: vi.fn(
      (request) =>
        new Promise((resolve) =>
          responses.push((image) =>
            resolve({
              requestId: request.id,
              message: "Image",
              overrides: {},
              image,
            }),
          ),
        ),
    ),
  };
  render(
    <StudioProvider designer={designer} imageCache={images}>
      <StudioLauncher />
    </StudioProvider>,
  );
  open();
  fireEvent.change(screen.getByLabelText("Design action"), {
    target: { value: "image" },
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Forest" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Another forest" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }));
  await act(async () => responses[0](blob()));
  expect(screen.queryByAltText("Proposed generated background")).toBeNull();
  expect(await images.list()).toHaveLength(0);
  await act(async () =>
    responses[1](new Blob(["invalid"], { type: "image/webp" })),
  );
  await screen.findByText(/could not complete this request/);
  expect(screen.queryByRole("button", { name: "Apply proposal" })).toBeNull();
  expect(await images.list()).toHaveLength(0);
});

it("shows visit-only storage failure while allowing Apply, then falls back after losing the visit mirror", async () => {
  const unavailable = () =>
    createImageCache(
      {
        async transact() {
          throw Error("Browser storage denied");
        },
      },
      { inspect: async () => ({ width: 1600, height: 1067 }) },
    );
  const designer = {
    available: true,
    propose: async (request) => ({
      requestId: request.id,
      message: "Visit-only image",
      overrides: {},
      image: blob(),
    }),
  };
  const view = render(
    <StudioProvider designer={designer} imageCache={unavailable()}>
      <StudioLauncher />
    </StudioProvider>,
  );
  open();
  fireEvent.change(screen.getByLabelText("Design action"), {
    target: { value: "image" },
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "A calm forest" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }));
  await screen.findByAltText("Proposed generated background");
  expect(
    screen.getAllByText(/only be kept for this visit/).length,
  ).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Apply proposal" }));
  expect(
    document.documentElement.style.getPropertyValue("--studio-image"),
  ).toContain("blob:");
  view.unmount();
  render(
    <StudioProvider imageCache={unavailable()}>
      <StudioLauncher />
    </StudioProvider>,
  );
  open();
  await waitFor(() =>
    expect(
      screen.getAllByText(/only be kept for this visit/).length,
    ).toBeGreaterThan(0),
  );
  expect(
    document.documentElement.style.getPropertyValue("--studio-image"),
  ).toContain("spring-01");
});
