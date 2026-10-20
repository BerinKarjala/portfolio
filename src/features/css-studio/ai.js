import { imageBlobAllowed, isGeneratedId } from "./imageIds";
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
  { operation = "theme", baseImageId } = {},
) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000)
    throw new Error("Use a message of 1–4,000 characters.");
  if (
    !["theme", "image", "refine"].includes(operation) ||
    (operation === "refine" &&
      (!isGeneratedId(baseImageId) ||
        p[p.family][profileId(p)]?.backgroundId !== baseImageId))
  )
    throw Error("Select a saved generated background before refining.");
  return {
    operation,
    ...(operation === "refine" ? { baseImageId } : {}),
    id: makeId(),
    prompt: prompt.trim(),
    context: {
      family: p.family,
      id: profileId(p),
      mode: p.mode,
      contrast: p.contrast,
    },
    history: history.slice(-10).map(({ role, text }) => ({
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
  if (
    (data.image !== undefined && !imageBlobAllowed(data.image)) ||
    (["image", "refine"].includes(request.operation) && !data.image) ||
    isGeneratedId(data.overrides.backgroundId)
  )
    throw Error("The designer returned an invalid image proposal.");
  const overrides = cleanOverrides(data.overrides);
  if (
    (!Object.keys(overrides).length && !data.image) ||
    Object.keys(overrides).length !== Object.keys(data.overrides).length
  )
    throw new Error("The designer returned unsupported styling values.");
  return {
    requestId: request.id,
    ...(request.baseImageId ? { baseImageId: request.baseImageId } : {}),
    context: { ...request.context },
    message: data.message,
    overrides,
    ...(data.image ? { image: data.image } : {}),
  };
}
export function canApply(proposal, p, latestId) {
  return (
    proposal &&
    proposal.requestId === latestId &&
    proposal.context.family === p.family &&
    proposal.context.id === profileId(p) &&
    proposal.context.mode === p.mode &&
    proposal.context.contrast === p.contrast &&
    (!proposal.baseImageId ||
      p[p.family][profileId(p)]?.backgroundId === proposal.baseImageId)
  );
}
