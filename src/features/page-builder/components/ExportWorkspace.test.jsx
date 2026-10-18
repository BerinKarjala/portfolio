// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createProject } from "../domain/project";
import { applyCommand } from "../domain/structure";
import ExportWorkspace from "./ExportWorkspace";
import * as downloads from "../browser/files";
import ErrorBoundary from "./ErrorBoundary";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("export review", () => {
  it("blocks each delivery until warnings are acknowledged and locates an affected element", async () => {
    const result = applyCommand(createProject(), {
        type: "ADD",
        component: "image",
      }),
      p = result.project;
    p.page.elements[result.selection[0]].props.alt = "";
    const locate = vi.fn();
    vi.spyOn(downloads, "downloadBlob").mockImplementation(() => {});
    vi.spyOn(downloads, "downloadText").mockImplementation(() => {});
    render(<ExportWorkspace project={p} onLocate={locate} />);
    expect(
      screen.getByRole("button", { name: "Download website ZIP" }).disabled,
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Show affected element" }),
    );
    expect(locate).toHaveBeenCalledWith(result.selection[0]);
    fireEvent.click(
      screen.getByLabelText("I reviewed the warnings and want to export."),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Download website ZIP" }),
    );
    expect(downloads.downloadBlob).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Individual files"));
    fireEvent.click(
      screen.getByRole("button", { name: "Download index.html" }),
    );
    expect(downloads.downloadText.mock.calls[0][2]).toBe(
      "text/html;charset=utf-8",
    );
  });
  it("invalidates acknowledgement on project changes and hides stale or invalid generated output", async () => {
    const p = createProject();
    const { rerender } = render(
      <ExportWorkspace project={p} onLocate={() => {}} />,
    );
    fireEvent.click(
      screen.getByLabelText("I reviewed the warnings and want to export."),
    );
    const next = structuredClone(p);
    next.page.metadata.title = "";
    rerender(<ExportWorkspace project={next} onLocate={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Download website ZIP" }).disabled,
    ).toBe(true);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/critical/i),
    );
    expect(document.querySelector("iframe")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Download website ZIP" }).disabled,
    ).toBe(true);
  });
  it("contains scripts, navigation and submissions in an opaque sandbox and exposes safe copyable code", () => {
    const p = createProject({ templateId: "portfolio" });
    render(<ExportWorkspace project={p} onLocate={() => {}} />);
    const frame = screen.getByTitle("Website preview");
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(
      new DOMParser()
        .parseFromString(frame.srcdoc, "text/html")
        .querySelector('meta[http-equiv="Content-Security-Policy"]').content,
    ).toContain("form-action 'none'");
    fireEvent.click(screen.getByRole("button", { name: "HTML", exact: true }));
    expect(screen.getByLabelText("Read-only HTML code").readOnly).toBe(true);
    expect(screen.getByLabelText("Read-only HTML code").value).toContain(
      "styles.css",
    );
    expect(document.querySelector("script")).toBeNull();
  });
  it("isolates a sidebar render failure and allows a retry without replacing sibling UI", () => {
    let broken = true;
    const Bomb = () => {
      if (broken) throw new Error("private diagnostic");
      return <p>Inspector recovered</p>;
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <>
        <p>Canvas still available</p>
        <ErrorBoundary panelName="Inspector">
          <Bomb />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getByText("Canvas still available")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).not.toContain(
      "private diagnostic",
    );
    broken = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry inspector" }));
    expect(screen.getByText("Inspector recovered")).toBeTruthy();
  });
});
