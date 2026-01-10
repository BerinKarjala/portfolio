/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the navigation links", () => {
    render(<App />);
    expect(screen.getByText(/projects/i)).not.toBeNull();
    expect(screen.getByText(/about me!/i)).not.toBeNull();
  });
});
