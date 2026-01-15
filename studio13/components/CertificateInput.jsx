import React, { useEffect, useRef, useState } from "react";
import { PatchEvent, set, useClient } from "sanity";

const PDFJS_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfJsLoader;

function loadPdfJs() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfJsLoader) return pdfJsLoader;

  pdfJsLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error("pdfjsLib not available"));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load pdf.js"));
    document.head.appendChild(script);
  });

  return pdfJsLoader;
}

async function renderPdfToBlob(pdfUrl) {
  const pdfjsLib = await loadPdfJs();
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1] || "";
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      resolve(new Blob([bytes], { type: "image/png" }));
    }, "image/png");
  });
}

export default function CertificateInput(props) {
  const { value, onChange, renderDefault } = props;
  const client = useClient({ apiVersion: "2024-01-01" });
  const [status, setStatus] = useState("idle");
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    const kind = value?.kind;
    const pdfRef = value?.pdf?.asset?._ref;
    const thumbnailRef = value?.thumbnail?.asset?._ref;

    if (kind !== "pdf") return;
    if (!pdfRef || thumbnailRef) return;
    if (isGeneratingRef.current) return;

    let isMounted = true;
    isGeneratingRef.current = true;
    setStatus("generating");

    async function generateThumbnail() {
      try {
        const asset = await client.fetch(
          "*[_id == $id][0]{url}",
          { id: pdfRef }
        );
        if (!asset?.url) throw new Error("Missing PDF URL");

        const blob = await renderPdfToBlob(asset.url);
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
        if (isMounted) setStatus("failed");
      } finally {
        isGeneratingRef.current = false;
      }
    }

    generateThumbnail();

    return () => {
      isMounted = false;
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
