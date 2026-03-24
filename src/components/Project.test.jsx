/* @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cancelIdleMock, fetchMock } = vi.hoisted(() => ({
  cancelIdleMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("../client.js", () => ({
  default: {
    fetch: fetchMock,
  },
}));

vi.mock("../utils/idleCallback", () => ({
  cancelIdle: cancelIdleMock,
  runWhenIdle: (callback) => {
    callback();
    return "idle-handle";
  },
}));

import Project from "./Project";

const renderProject = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/project"]}>
        <Project />
      </MemoryRouter>
    </HelmetProvider>
  );

describe("Project", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    cancelIdleMock.mockReset();
    document.title = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the page shell and SEO metadata visible while projects are loading", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));

    renderProject();

    expect(
      screen.getByRole("heading", {
        name: /my projects/i,
      })
    ).not.toBeNull();
    expect(screen.getByText(/loading project entries/i)).not.toBeNull();

    await waitFor(() => {
      expect(document.title).toBe("Projects | Berin Karjala");
    });
  });

  it("shows the fetch error state without claiming fallback entries exist", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce(new Error("Sanity unavailable"));

    renderProject();

    expect(
      await screen.findByText(/could not load the latest project content from sanity/i)
    ).not.toBeNull();
    expect(
      screen.getByText(/project entries are temporarily unavailable right now/i)
    ).not.toBeNull();
    expect(screen.queryByText(/showing fallback content/i)).toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
