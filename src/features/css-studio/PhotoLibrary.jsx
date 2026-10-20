import { useEffect, useState } from "react";
import {
  BACKGROUNDS,
  BACKGROUND_BY_ID,
  backgroundChoices,
  selectedBackground,
  backgroundUrl,
} from "./backgrounds";
let catalogPromise;
async function readCatalog() {
  if (!catalogPromise)
    catalogPromise = fetch("/css-studio/catalog.json")
      .then((r) => {
        if (!r.ok) throw Error("Photo credits unavailable");
        return r.json();
      })
      .then((c) => {
        if (
          !Array.isArray(c.images) ||
          c.images.length !== 248 ||
          new Set(c.images.map((image) => image?.id)).size !== 248 ||
          !c.images.every(
            (image) =>
              image &&
              Object.hasOwn(BACKGROUND_BY_ID, image.id) &&
              image.relativePath === BACKGROUND_BY_ID[image.id].relativePath &&
              [
                "title",
                "creator",
                "license",
                "changes",
                "attribution",
                "rightsRestrictions",
              ].every((key) => typeof image[key] === "string") &&
              ["sourcePage", "licenseUrl", "originalUrl"].every(
                (key) =>
                  typeof image[key] === "string" &&
                  /^https?:\/\//.test(image[key]),
              ),
          )
        )
          throw Error("Invalid photo catalog");
        return c.images;
      })
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  return catalogPromise;
}
function useCatalog() {
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    readCatalog()
      .then((c) => {
        if (active) setImages(c);
      })
      .catch(() => {
        if (active)
          setError(
            "Photo credits could not be loaded. Try reopening the library.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return { images, error };
}
export function PhotoCredit({ imageId }) {
  const { images, error } = useCatalog();
  const image = images.find((i) => i.id === imageId);
  if (!image) return <p role="status">{error || "Loading photo credits…"}</p>;
  return (
    <div className="studio-photo-credit">
      <p>
        {image.title} — {image.creator}.{" "}
        <a href={image.sourcePage} target="_blank" rel="noreferrer noopener">
          Source
        </a>{" "}
        ·{" "}
        <a href={image.licenseUrl} target="_blank" rel="noreferrer noopener">
          {image.license}
        </a>{" "}
        ·{" "}
        <a href={image.originalUrl} target="_blank" rel="noreferrer noopener">
          Original resolution
        </a>
      </p>
      <p>{image.changes}</p>
      {image.rightsRestrictions && <p>{image.rightsRestrictions}</p>}
    </div>
  );
}
export default function PhotoLibrary({
  preferences,
  failed,
  generatedImages,
  getGeneratedImage,
  onSelect,
}) {
  const { images, error } = useCatalog();
  const [scope, setScope] = useState("matching");
  const [season, setSeason] = useState("all");
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const all =
    scope === "matching" ? backgroundChoices(preferences) : BACKGROUNDS;
  const filtered = all.filter(
    (i) =>
      (season === "all" || i.season === season) &&
      (kind === "all" || i.kind === kind) &&
      `${i.title} ${i.holiday || ""} ${i.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const activePage = Math.min(page, totalPages - 1);
  const selected = selectedBackground(preferences, failed, generatedImages);
  function filter(set, value) {
    set(value);
    setPage(0);
  }
  async function download() {
    try {
      setStatus("Preparing theme download…");
      const { themeArchive } = await import("./photoExport");
      const blob = await themeArchive(
        preferences,
        failed,
        selected?.kind === "generated" ? [] : await readCatalog(),
        undefined,
        { generatedImages, getGeneratedImage },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "css-studio-theme.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(
        selected?.kind === "generated"
          ? "Theme download ready. Generated-image metadata and portable paths are included."
          : "Theme download ready. Photo credits and portable paths are included.",
      );
    } catch {
      setStatus("Download unavailable. Your theme remains active; try again.");
    }
  }
  return (
    <section aria-label="Background photo library">
      <h3>Background photos</h3>
      <a
        href="/css-studio/index.html"
        target="_blank"
        rel="noreferrer noopener"
      >
        Open the standalone photo catalog
      </a>
      <p>
        Wilderness for seasons; matching celebration photos for a manually
        selected holiday. These choices use no AI.
      </p>
      <label>
        Photo collection
        <select
          value={scope}
          onChange={(e) => filter(setScope, e.target.value)}
        >
          <option value="matching">Match active preset</option>
          <option value="all">All photos</option>
        </select>
      </label>
      <label>
        Photo season
        <select
          value={season}
          onChange={(e) => filter(setSeason, e.target.value)}
        >
          {["all", "spring", "summer", "fall", "winter"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Photo subject
        <select value={kind} onChange={(e) => filter(setKind, e.target.value)}>
          {["all", "wilderness", "celebration"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Search photos or holidays
        <input
          type="search"
          value={search}
          onChange={(e) => filter(setSearch, e.target.value)}
        />
      </label>
      <div className="studio-photo-grid">
        {filtered.slice(activePage * 12, activePage * 12 + 12).map((i) => (
          <button
            key={i.id}
            aria-label={`Use photo: ${i.title}`}
            aria-pressed={selected?.id === i.id}
            onClick={() => onSelect(i.id)}
          >
            <img
              src={"/css-studio/" + i.thumbnailPath}
              loading="lazy"
              alt=""
              width="160"
              height="107"
            />
            <span>{i.title}</span>
          </button>
        ))}
      </div>
      <p>
        {filtered.length} photos · Page {activePage + 1} of {totalPages}
      </p>
      <button disabled={!activePage} onClick={() => setPage((p) => p - 1)}>
        Previous photos
      </button>
      <button
        disabled={activePage + 1 >= totalPages}
        onClick={() => setPage((p) => p + 1)}
      >
        Next photos
      </button>
      <button onClick={() => onSelect("none")}>Use solid background</button>
      <button onClick={() => onSelect(undefined)}>Use automatic photo</button>
      {selected && (
        <>
          <h3>Selected background</h3>
          {selected.kind === "generated" ? (
            <p>Generated background · saved in this browser.</p>
          ) : (
            <PhotoCredit imageId={selected.id} />
          )}
        </>
      )}
      {error && <p role="status">{error}</p>}
      <button
        disabled={
          !preferences.themed ||
          (selected && selected.kind !== "generated" && !images.length)
        }
        onClick={download}
      >
        Download portable theme
      </button>
      <p role="status">{status}</p>
    </section>
  );
}
