import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PatchEvent, set, useClient } from "sanity";

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_CANVAS_DIMENSION = 8192;
const MAX_CANVAS_PIXELS = 16 * 1024 * 1024;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function assertNotAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException("PDF thumbnail generation was cancelled", "AbortError");
  }
}

async function renderPdfToBlob(pdfUrl, signal) {
  let loadingTask;
  let renderTask;

  const cancel = () => {
    renderTask?.cancel();
    loadingTask?.destroy();
  };

  signal?.addEventListener("abort", cancel, { once: true });

  try {
    assertNotAborted(signal);
    loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    assertNotAborted(signal);

    const page = await pdf.getPage(1);
    const requestedViewport = page.getViewport({ scale: 1.5 });
    const constrainedScale = Math.min(
      1,
      MAX_CANVAS_DIMENSION / requestedViewport.width,
      MAX_CANVAS_DIMENSION / requestedViewport.height,
      Math.sqrt(
        MAX_CANVAS_PIXELS /
          (requestedViewport.width * requestedViewport.height)
      )
    );
    const viewport = page.getViewport({ scale: 1.5 * constrainedScale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) {
      throw new Error("PDF page dimensions are invalid");
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    renderTask = page.render({ canvasContext: context, viewport });
    await renderTask.promise;
    assertNotAborted(signal);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (signal?.aborted) {
          reject(new DOMException("PDF thumbnail generation was cancelled", "AbortError"));
        } else if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to encode PDF thumbnail"));
        }
      }, "image/png");
    });
  } finally {
    signal?.removeEventListener("abort", cancel);
    await loadingTask?.destroy();
  }
}

export default function CertificateInput(props) {
  const { value, onChange, renderDefault } = props;
  const client = useClient({ apiVersion: "2024-01-01" });
  const [status, setStatus] = useState("idle");
  const generationRef = useRef(null);

  useEffect(() => {
    const kind = value?.kind;
    const pdfRef = value?.pdf?.asset?._ref;
    const thumbnailRef = value?.thumbnail?.asset?._ref;

    if (kind !== "pdf") return;
    if (!pdfRef || thumbnailRef) return;
    if (generationRef.current) return;

    let isMounted = true;
    const generation = Symbol("certificate-thumbnail");
    const controller = new AbortController();
    generationRef.current = generation;
    setStatus("generating");

    async function generateThumbnail() {
      try {
        const asset = await client.fetch(
          "*[_id == $id][0]{url, size, mimeType}",
          { id: pdfRef }
        );
        if (!asset?.url) throw new Error("Missing PDF URL");
        if (asset.mimeType && asset.mimeType !== "application/pdf") {
          throw new Error("Certificate asset is not a PDF");
        }
        if (!Number.isFinite(asset.size) || asset.size <= 0) {
          throw new Error("PDF size is unavailable");
        }
        if (asset.size > MAX_PDF_BYTES) {
          throw new Error("PDF exceeds the thumbnail size limit");
        }

        const blob = await renderPdfToBlob(asset.url, controller.signal);
        if (!blob) throw new Error("Failed to render PDF");

        const filename = `certificate-${value?._key || "thumbnail"}.png`;
        const uploaded = await client.assets.upload("image", blob, { filename });

        if (!uploaded?._id) throw new Error("Thumbnail upload failed");

        onChange(
          PatchEvent.from(
            set(
              {
                _type: "image",
                asset: {
                  _type: "reference",
                  _ref: uploaded._id,
                },
              },
              ["thumbnail"]
            )
          )
        );
        if (isMounted) setStatus("done");
      } catch (error) {
        if (isMounted && error?.name !== "AbortError") setStatus("failed");
      } finally {
        if (generationRef.current === generation) {
          generationRef.current = null;
        }
      }
    }

    generateThumbnail();

    return () => {
      isMounted = false;
      controller.abort();
      if (generationRef.current === generation) {
        generationRef.current = null;
      }
    };
  }, [
    client,
    onChange,
    value?._key,
    value?.kind,
    value?.pdf?.asset?._ref,
    value?.thumbnail?.asset?._ref,
  ]);

  useEffect(() => {
    if (value?.kind !== "pdf") {
      setStatus("idle");
    }
    if (value?.kind === "pdf" && value?.pdf?.asset?._ref) {
      setStatus("idle");
    }
  }, [value?.kind, value?.pdf?.asset?._ref]);

  return (
    <div>
      {renderDefault(props)}
      {value?.kind === "pdf" && status === "generating" ? (
        <p style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
          Generating thumbnail from PDF...
        </p>
      ) : null}
      {value?.kind === "pdf" && status === "failed" ? (
        <p style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
          PDF thumbnail could not be generated. You can upload one manually.
        </p>
      ) : null}
    </div>
  );
}
