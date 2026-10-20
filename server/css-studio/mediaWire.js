import {
  HttpError,
  readMultipart,
  JSON_LIMIT,
} from "../../src/shared/studioTransfer.js";
import { validateInput } from "./protocol.js";
export async function readImageRequest(request) {
  const form = await readMultipart(request);
  if (
    [...form.keys()].length !== 3 ||
    !["request", "receipt", "image"].every(
      (name) => form.getAll(name).length === 1,
    )
  )
    throw new HttpError(400, "Invalid image attachment.");
  const text = form.get("request"),
    receipt = form.get("receipt"),
    file = form.get("image");
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).length > JSON_LIMIT ||
    typeof receipt !== "string" ||
    typeof file === "string" ||
    !file ||
    file.size > 4 * 1024 * 1024
  )
    throw new HttpError(400, "Invalid image attachment.");
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid image attachment.");
  }
  const input = validateInput(raw);
  if (input.operation !== "refine")
    throw new HttpError(400, "Only refinement accepts an image attachment.");
  return { input, receipt, image: new Blob([file], { type: file.type }) };
}
export function imageResponse(metadata, image) {
  const form = new FormData();
  form.set("proposal", JSON.stringify(metadata));
  form.set(
    "image",
    image,
    "background." +
      { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[
        image.type
      ],
  );
  return new Response(form, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
