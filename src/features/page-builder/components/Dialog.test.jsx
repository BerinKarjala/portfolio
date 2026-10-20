/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import Dialog from "./Dialog";
afterEach(cleanup);

it("wraps keyboard focus through visible controls while ignoring a hidden preview pane", () => {
  render(
    <Dialog labelledBy="dialog-title" onDismiss={() => {}}>
      <h2 id="dialog-title">Focus test</h2>
      <button>First</button>
      <button>Last</button>
      <section hidden>
        <button>Hidden preview</button>
      </section>
    </Dialog>,
  );
  const first = screen.getByRole("button", { name: "First" });
  const last = screen.getByRole("button", { name: "Last" });
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
});
