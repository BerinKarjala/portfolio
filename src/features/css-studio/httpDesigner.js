import {
  readJson,
  readMultipart,
  JSON_LIMIT,
  isMediaReceipt,
} from "../../shared/studioTransfer.js";
import { imageBlobAllowed } from "./imageIds";
import { unavailableDesigner, validateProposal } from "./ai";
export class DesignerError extends Error {
  constructor(message) {
    super(message);
    this.publicMessage = message;
  }
}
const failure = (status, code) =>
  new DesignerError(
    code === "media-unavailable"
      ? "This saved background cannot be verified. Generate a new background to refine."
      : status === 429
        ? "AI allowance or request rate is exhausted. Keep using manual controls."
        : status === 413
          ? "The image or message is too large."
          : status === 409
            ? "This request was already handled. Your existing theme is unchanged."
            : status === 401
              ? "The AI session is unavailable. Your saved themes remain available."
              : status === 503
                ? "AI design is currently unavailable. Keep using manual controls."
                : "The designer could not complete this request. Your existing theme is unchanged.",
  );
export async function connectHttpDesigner({
  fetch = globalThis.fetch,
  signal,
} = {}) {
  async function call(
    path,
    { body, signal: cancel, ...options } = {},
    consume = async (response) => readJson(response),
  ) {
    if (cancel?.aborted) throw new DOMException("Canceled", "AbortError");
    const controller = new AbortController(),
      abort = () => controller.abort();
    cancel?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 30000);
    try {
      const response = await fetch("/api/css-studio/" + path, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        mode: "same-origin",
        redirect: "error",
        cache: "no-store",
        headers: {
          "X-CSS-Studio": "1",
          ...(typeof body === "string"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...options,
        ...(body ? { body } : {}),
        signal: controller.signal,
      });
      return await consume(response);
    } finally {
      clearTimeout(timer);
      cancel?.removeEventListener("abort", abort);
    }
  }
  async function status() {
    return call("status", { signal }, async (response) => ({
      needsSession: response.status === 401,
      data: response.ok ? await readJson(response) : null,
    }));
  }
  let state;
  try {
    let snapshot = await status();
    if (snapshot.needsSession) {
      const opened = await call(
        "session",
        { body: "{}", signal },
        async (response) =>
          response.ok && (await readJson(response)).available === true,
      );
      if (!opened) return unavailableDesigner;
      snapshot = await status();
    }
    state = snapshot.data;
  } catch {
    return unavailableDesigner;
  }
  if (
    state?.available !== true ||
    !Array.isArray(state.operations) ||
    !state.operations.includes("theme") ||
    state.operations.some(
      (operation) => !["theme", "image", "refine"].includes(operation),
    ) ||
    new Set(state.operations).size !== state.operations.length
  )
    return unavailableDesigner;
  const operations = Object.freeze([...state.operations]);
  return {
    available: true,
    operations,
    async propose(request, { signal, baseImage, baseReceipt } = {}) {
      if (!operations.includes(request.operation)) throw failure(503);
      let body = JSON.stringify(request);
      if (new TextEncoder().encode(body).length > JSON_LIMIT)
        throw failure(413);
      if (request.operation === "refine") {
        if (!imageBlobAllowed(baseImage) || !isMediaReceipt(baseReceipt))
          throw failure(409, "media-unavailable");
        const form = new FormData();
        form.set("request", body);
        form.set("receipt", baseReceipt);
        form.set("image", baseImage, "base-image");
        body = form;
      }
      return call("propose", { body, signal }, async (response) => {
        if (!response.ok) {
          let code;
          try {
            code = (await readJson(response, 4096)).code;
          } catch {
            /* Never display upstream text. */
          }
          throw failure(response.status, code);
        }
        let result;
        if (
          /^multipart\/form-data;/i.test(
            response.headers.get("content-type") || "",
          )
        ) {
          const form = await readMultipart(response);
          if (
            [...form.keys()].length !== 2 ||
            form.getAll("proposal").length !== 1 ||
            form.getAll("image").length !== 1
          )
            throw failure(502);
          const text = form.get("proposal"),
            file = form.get("image");
          if (
            typeof text !== "string" ||
            new TextEncoder().encode(text).length > JSON_LIMIT ||
            !file ||
            typeof file === "string"
          )
            throw failure(502);
          try {
            result = JSON.parse(text);
          } catch {
            throw failure(502);
          }
          if (!isMediaReceipt(result.receipt)) throw failure(502);
          result = { ...result, image: new Blob([file], { type: file.type }) };
        } else {
          result = await readJson(response);
          if (request.operation !== "theme") throw failure(502);
        }
        try {
          validateProposal(result, request);
        } catch {
          throw failure(502);
        }
        return result;
      });
    },
  };
}
