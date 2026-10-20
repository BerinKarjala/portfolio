import { describe, expect, it, vi } from "vitest";
import {
  makeRequest,
  validateProposal,
  canApply,
  unavailableDesigner,
} from "./ai";
import { initialPreferences } from "./theme";
describe("AI context and safe proposals AC-06/42", () => {
  it("binds exact appearance and profile, rejects stale and unsafe results and never dispatches by default", async () => {
    const p = {
      ...initialPreferences(),
      family: "holidays",
      holiday: "diwali",
      mode: "dark",
      contrast: true,
    };
    const request = makeRequest(p, "Make it warm", [], () => "request-1");
    expect(request.context).toEqual({
      family: "holidays",
      id: "diwali",
      mode: "dark",
      contrast: true,
    });
    const proposal = validateProposal(
      {
        requestId: "request-1",
        message: "A warmer accent",
        overrides: { accent: "#993311" },
      },
      request,
    );
    expect(canApply(proposal, p, "request-1")).toBe(true);
    expect(
      canApply(proposal, { ...p, holiday: "christmas" }, "request-1"),
    ).toBe(false);
    expect(canApply(proposal, p, "request-2")).toBe(false);
    expect(() =>
      validateProposal(
        {
          requestId: "request-1",
          message: "bad",
          overrides: { accent: "url(https://evil)" },
        },
        request,
      ),
    ).toThrow();
    const fetch = vi.spyOn(globalThis, "fetch");
    await expect(unavailableDesigner.propose(request)).rejects.toThrow(
      "unavailable",
    );
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it("bounds prompts, follow-up history and structured outputs", () => {
    expect(() =>
      makeRequest(initialPreferences(), "x".repeat(4001), []),
    ).toThrow();
    const request = makeRequest(
      initialPreferences(),
      "More calm",
      Array.from({ length: 30 }, () => ({ role: "user", text: "Hi" })),
    );
    expect(request.history.length).toBeLessThanOrEqual(10);
    expect(() =>
      validateProposal(
        { requestId: request.id, message: "x".repeat(4001), overrides: {} },
        request,
      ),
    ).toThrow();
    expect(() =>
      validateProposal(
        {
          requestId: request.id,
          message: "bad",
          overrides: { css: "body{display:none}" },
        },
        request,
      ),
    ).toThrow();
  });
});
