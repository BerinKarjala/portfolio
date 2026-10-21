/* @vitest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Examples from "./Examples";
import { initialPreferences, updateProfile } from "./theme";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("prepares the selected generated background before mounting its sandboxed example", () => {
  let reader;
  vi.stubGlobal(
    "FileReader",
    class {
      static LOADING = 1;
      readyState = 0;
      constructor() {
        reader = this;
      }
      readAsDataURL() {
        this.readyState = 1;
      }
      abort() {
        this.readyState = 2;
      }
    },
  );
  const id = "generated-00000000-0000-4000-8000-000000000001";
  const preferences = updateProfile(initialPreferences(), { backgroundId: id });
  render(
    <Examples
      preferences={preferences}
      failed={new Set()}
      generatedImages={{
        [id]: {
          id,
          mime: "image/webp",
          blob: new Blob(["fixture"], { type: "image/webp" }),
          context: { family: "seasons", id: "spring" },
          displayUrl: "blob:http://localhost/test",
        },
      }}
      onClose={() => {}}
    />,
  );
  expect(screen.queryByTitle("Themed Page Builder example")).toBeNull();
  expect(screen.getByRole("status").textContent).toMatch(
    /preparing.*background/i,
  );
  act(() => {
    reader.readyState = 2;
    reader.result = "data:image/webp;base64,AA==";
    reader.onload();
  });
  const frame = screen.getByTitle("Themed Page Builder example");
  expect(frame.getAttribute("sandbox")).toBe("");
  expect(frame.getAttribute("srcdoc")).toContain("data:image/webp;base64,AA==");
  expect(frame.getAttribute("srcdoc")).not.toContain("spring-01-woodland.webp");
});
