import { useState } from "react";
import { generatedPath } from "./imageIds";
import { saveDownload } from "./useGeneratedImages";
import { profileId } from "./theme";
export default function GeneratedHistory({
  preferences,
  generated,
  comparison,
  setComparison,
  pinnedIds,
  onSelect,
}) {
  const [status, setStatus] = useState("");
  const records = generated.records.filter(
    (row) =>
      row.context.family === preferences.family &&
      row.context.id === profileId(preferences),
  );
  async function action(work) {
    try {
      await work();
      setStatus("");
    } catch (error) {
      setStatus(error.message || "This image is unavailable.");
    }
  }
  return (
    <section aria-label="Generated background history">
      <h3>Generated backgrounds</h3>
      <p>
        Saved in this browser, separately from chat. Choose up to two images to
        compare.
      </p>
      {!records.length && (
        <p>No generated backgrounds saved for this preset.</p>
      )}
      {comparison.length > 0 && (
        <button onClick={() => setComparison([])}>Clear comparison</button>
      )}
      <ol>
        {records.map((row, index) => (
          <li key={row.id}>
            <p>
              Background {index + 1} ·{" "}
              {new Date(row.createdAt).toLocaleString()} · {row.context.mode}
              {row.context.contrast ? " · High Contrast" : ""}
              {row.parentId ? " · Refined" : ""}
            </p>
            <label className="studio-checkbox">
              <input
                type="checkbox"
                aria-label={`Compare background ${index + 1}`}
                checked={comparison.includes(row.id)}
                disabled={
                  !comparison.includes(row.id) && comparison.length >= 2
                }
                onChange={(e) => {
                  setComparison((previous) =>
                    e.target.checked
                      ? [...previous, row.id].slice(-2)
                      : previous.filter((id) => id !== row.id),
                  );
                  if (e.target.checked) void generated.ensure(row.id);
                }}
              />
              Compare background {index + 1}
            </label>
            <button
              onClick={() =>
                action(async () => {
                  const image = await generated.ensure(row.id);
                  if (image) onSelect(image);
                })
              }
            >
              Use background {index + 1}
            </button>
            <button
              onClick={() =>
                action(async () => {
                  const image = await generated.cache.get(row.id);
                  if (!image)
                    throw Error(
                      "Image unavailable. A curated fallback remains available.",
                    );
                  saveDownload(
                    image.blob,
                    generatedPath(image).split("/").pop(),
                  );
                })
              }
            >
              Download background {index + 1}
            </button>
            <button
              disabled={pinnedIds().includes(row.id)}
              onClick={() => action(() => generated.remove(row.id, pinnedIds))}
            >
              Remove background {index + 1}
            </button>
          </li>
        ))}
      </ol>
      <div
        className="studio-generated-comparison"
        aria-label="Background comparison"
      >
        {records
          .filter((row) => comparison.includes(row.id))
          .map(
            (row, index) =>
              generated.images[row.id] && (
                <figure key={row.id}>
                  <img
                    src={generated.images[row.id].displayUrl}
                    alt={`Comparison background ${index + 1}`}
                  />
                  <figcaption>Background {records.indexOf(row) + 1}</figcaption>
                </figure>
              ),
          )}
      </div>
      <p role="status">{status}</p>
    </section>
  );
}
