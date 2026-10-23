/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import NavBar from "./NavBar";

afterEach(cleanup);

function renderNavigation() {
  render(<MemoryRouter><NavBar /></MemoryRouter>);
  return {
    home: screen.getByRole("link", { name: "Berin Karjala" }),
    projects: screen.getByRole("link", { name: "Projects" }),
    about: screen.getByRole("link", { name: "About Me!" }),
  };
}

describe("portfolio navigation", () => {
  it("moves focus with directional keys across the three page links", () => {
    const { home, projects, about } = renderNavigation();
    home.focus();
    for (const link of [projects, about, home]) {
      fireEvent.keyDown(document.activeElement, { key: "ArrowRight" });
      expect(document.activeElement).toBe(link);
    }
    fireEvent.keyDown(home, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(about);
    fireEvent.keyDown(about, { key: "ArrowUp" });
    expect(document.activeElement).toBe(projects);
    fireEvent.keyDown(projects, { key: "ArrowDown" });
    expect(document.activeElement).toBe(about);
  });

  it("supports Home and End without activating a destination", () => {
    const { home, projects, about } = renderNavigation();
    projects.focus();
    fireEvent.keyDown(projects, { key: "End" });
    expect(document.activeElement).toBe(about);
    fireEvent.keyDown(about, { key: "Home" });
    expect(document.activeElement).toBe(home);
    expect(home.getAttribute("aria-current")).toBe("page");
  });

  it("preserves modified keys, Tab, and already handled events", () => {
    const { projects } = renderNavigation();
    projects.focus();
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      expect(fireEvent.keyDown(projects, { key: "ArrowRight", [modifier]: true }))
        .toBe(true);
      expect(document.activeElement).toBe(projects);
    }
    expect(fireEvent.keyDown(projects, { key: "Tab" })).toBe(true);
    const handled = new KeyboardEvent("keydown", {
      key: "ArrowRight", bubbles: true, cancelable: true,
    });
    handled.preventDefault();
    fireEvent(projects, handled);
    expect(document.activeElement).toBe(projects);
  });
});

it("removes social navigation while retaining page destinations", () => {
  renderNavigation();
  expect(screen.getAllByRole("link")).toHaveLength(3);
  expect(screen.queryByRole("link", { name: "GitHub" })).toBeNull();
  expect(screen.queryByRole("link", { name: "LinkedIn" })).toBeNull();
});
