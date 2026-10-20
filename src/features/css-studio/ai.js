import { cleanOverrides, profileId } from "./theme";
export const unavailableDesigner = Object.freeze({
  available: false,
  async propose() {
    throw new Error("AI design is currently unavailable.");
  },
});
export function makeRequest(
  p,
  prompt,
  history,
  makeId = () => crypto.randomUUID(),
) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000)
    throw new Error("Use a message of 1–4,000 characters.");
  return {
    id: makeId(),
    prompt: prompt.trim(),
    context: {
      family: p.family,
      id: profileId(p),
      mode: p.mode,
      contrast: p.contrast,
    },
    history: history
      .slice(-10)
      .map(({ role, text }) => ({
        role: role === "user" ? "user" : "assistant",
        text: String(text).slice(0, 2000),
      })),
  };
}
export function validateProposal(data, request) {
  if (
    !data ||
    data.requestId !== request.id ||
    typeof data.message !== "string" ||
    data.message.length > 4000 ||
    !data.overrides ||
    typeof data.overrides !== "object" ||
    Array.isArray(data.overrides)
  )
    throw new Error("The designer returned an invalid proposal.");
  const overrides = cleanOverrides(data.overrides);
  if (
    !Object.keys(overrides).length ||
    Object.keys(overrides).length !== Object.keys(data.overrides).length
  )
    throw new Error("The designer returned unsupported styling values.");
  return {
    requestId: request.id,
    context: { ...request.context },
    message: data.message,
    overrides,
  };
}
export function canApply(proposal, p, latestId) {
  return (
    proposal &&
    proposal.requestId === latestId &&
    proposal.context.family === p.family &&
    proposal.context.id === profileId(p) &&
    proposal.context.mode === p.mode &&
    proposal.context.contrast === p.contrast
  );
}
