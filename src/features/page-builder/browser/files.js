import { MAX_BACKUP_BYTES } from "../domain/backups";

export function downloadText(
  text,
  filename,
  type = "application/json;charset=utf-8",
) {
  downloadBlob(new Blob([text], { type }), filename);
}
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const fileName = (name, suffix = "") =>
  `${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "page-builder"
  }${suffix}.json`;
export function readJSONFile(file) {
  if (!file || file.size > MAX_BACKUP_BYTES)
    return Promise.reject(
      new Error("Choose a JSON file no larger than 16 MiB."),
    );
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("This file could not be read."));
    reader.readAsText(file);
  });
}
