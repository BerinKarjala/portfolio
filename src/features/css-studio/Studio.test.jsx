/* @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Link, Routes, Route } from "react-router-dom";
import { StudioProvider, MoonLauncher, StudioGalleryEntry } from "./Studio";
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn(() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(cleanup);
function Site() {
  return (
    <MemoryRouter>
      <StudioProvider>
        <MoonLauncher />
        <Link to="/next">Next page</Link>
        <Routes>
          <Route
            path="/"
            element={
              <main>
                <h1>Original page</h1>
                <StudioGalleryEntry />
              </main>
            }
          />
          <Route
            path="/next"
            element={
              <main>
                <h1>Destination</h1>
              </main>
            }
          />
        </Routes>
      </StudioProvider>
    </MemoryRouter>
  );
}
describe("live workspace AC-09–24, AC-28/29", () => {
  it("edits independently, retains theme/draft across navigation and closing, restores focus and reloads", () => {
    const view = render(<Site />);
    fireEvent.click(screen.getByRole("button", { name: "Theme Studio" }));
    expect(screen.getByRole("heading", { name: "Original page" })).toBeTruthy();
    expect(document.querySelector("[inert]")).toBeNull();
    fireEvent.change(screen.getByLabelText("Accent color"), {
      target: { value: "#123456" },
    });
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "winter" },
    });
    fireEvent.change(screen.getByLabelText("Accent color"), {
      target: { value: "#654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Keep my draft" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Next page" }));
    expect(screen.getByRole("heading", { name: "Destination" })).toBeTruthy();
    expect(screen.getByLabelText("Message").value).toBe("Keep my draft");
    fireEvent.click(screen.getByRole("button", { name: "Close tools" }));
    expect(
      document.documentElement.style.getPropertyValue("--studio-accent"),
    ).toBe("#654321");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Theme Studio" }),
    );
    view.unmount();
    render(<Site />);
    fireEvent.click(screen.getByRole("button", { name: "Theme Studio" }));
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "spring" },
    });
    expect(screen.getByLabelText("Accent color").value).toBe("#123456");
    fireEvent.click(screen.getByRole("button", { name: "Copy CSS variables" }));
    expect(screen.getByLabelText("Reusable CSS").value).toContain(
      "--studio-accent: #123456;",
    );
  });
  it("launches from gallery, resets with Undo and restores original without deleting profiles", () => {
    render(<Site />);
    fireEvent.click(screen.getByRole("button", { name: "Open Theme Studio" }));
    fireEvent.change(screen.getByLabelText("Accent color"), {
      target: { value: "#123456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Reset current season" }),
    );
    expect(screen.getByLabelText("Accent color").value).not.toBe("#123456");
    fireEvent.click(screen.getByRole("button", { name: "Undo reset" }));
    expect(screen.getByLabelText("Accent color").value).toBe("#123456");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Restore original portfolio appearance",
      }),
    );
    expect(document.documentElement.hasAttribute("data-studio-theme")).toBe(
      false,
    );
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "winter" },
    });
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "spring" },
    });
    expect(screen.getByLabelText("Accent color").value).toBe("#123456");
  });
  it("switches phone drawers while preserving chat draft and page access", () => {
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    render(<Site />);
    fireEvent.click(screen.getByRole("button", { name: "Theme Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
    expect(screen.queryByLabelText("Season")).toBeNull();
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Retained" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Styles", exact: true }),
    );
    expect(screen.queryByLabelText("Message")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
    expect(screen.getByLabelText("Message").value).toBe("Retained");
  });
});

it("reuses real starter content in a separate dialog without losing chat draft AC-08/14/25", async () => {
  render(<Site />);
  fireEvent.click(screen.getByRole("button", { name: "Theme Studio" }));
  fireEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Keep this" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Preview Page Builder examples" }),
  );
  const frame = await screen.findByTitle("Themed Page Builder example");
  expect(frame.getAttribute("sandbox")).toBe("");
  fireEvent.change(screen.getByLabelText("Example template"), {
    target: { value: "portfolio" },
  });
  expect(frame.getAttribute("srcdoc")).toContain(
    "Thoughtful work. Lasting impressions.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Close examples" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByLabelText("Message").value).toBe("Keep this");
});

it("previews mocked proposals and prevents a late result from overwriting another preset AC-06/42", async () => {
  let respond;
  const designer = {
    available: true,
    propose: vi.fn(
      (request) =>
        new Promise((resolve) => {
          respond = () =>
            resolve({
              requestId: request.id,
              message: "Warm palette",
              overrides: { accent: "#993311" },
            });
        }),
    ),
  };
  render(
    <StudioProvider designer={designer}>
      <MoonLauncher />
    </StudioProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Theme Studio" }));
  fireEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Warm colors" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send", exact: true }));
  fireEvent.change(screen.getByLabelText("Season"), {
    target: { value: "winter" },
  });
  await act(async () => respond());
  await screen.findByRole("button", { name: "Apply proposal" });
  expect(screen.getByRole("button", { name: "Apply proposal" }).disabled).toBe(
    true,
  );
  expect(screen.getByLabelText("Accent color").value).not.toBe("#993311");
  fireEvent.change(screen.getByLabelText("Season"), {
    target: { value: "spring" },
  });
  expect(screen.getByLabelText("Accent color").value).not.toBe("#993311");
  fireEvent.click(screen.getByRole("button", { name: "Apply proposal" }));
  expect(screen.getByLabelText("Accent color").value).toBe("#993311");
});
it("listens only on request and inserts editable speech without submitting AC-07", () => {
  let recognition;
  window.SpeechRecognition = class {
    constructor() {
      recognition = this;
    }
    start = vi.fn();
    stop = vi.fn();
    abort = vi.fn();
  };
  const designer = { available: true, propose: vi.fn() };
  const view = render(
    <StudioProvider designer={designer}>
      <MoonLauncher />
    </StudioProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Theme Studio" }));
  fireEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
  expect(recognition).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "Use microphone" }));
  expect(recognition.start).toHaveBeenCalledOnce();
  const result = [{ transcript: "Blue winter" }];
  result.isFinal = true;
  act(() => recognition.onresult({ results: [result] }));
  fireEvent.click(screen.getByRole("button", { name: "Stop listening" }));
  expect(screen.getByLabelText("Message").value).toBe("Blue winter");
  expect(designer.propose).not.toHaveBeenCalled();
  view.unmount();
  delete window.SpeechRecognition;
});

it("opens the on-demand photo picker and preserves a manual image across presets AC-40/49", async () => {
  render(<Site />);
  fireEvent.click(screen.getByRole("button", { name: "Theme Studio" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Choose a background photo" }),
  );
  expect(
    await screen.findByRole("button", {
      name: /Use photo: A forest in spring/,
    }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: /Use photo: A forest in spring/ }),
  );
  expect(
    document.documentElement.style.getPropertyValue("--studio-image"),
  ).toContain("spring-01");
  fireEvent.change(screen.getByLabelText("Season"), {
    target: { value: "winter" },
  });
  fireEvent.change(screen.getByLabelText("Season"), {
    target: { value: "spring" },
  });
  expect(
    document.documentElement.style.getPropertyValue("--studio-image"),
  ).toContain("spring-01");
});
