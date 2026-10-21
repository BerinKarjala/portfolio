import { useCallback, useEffect, useRef, useState } from "react";
import { createImageCache, CacheLimitError } from "./imageCache";
import { isGeneratedId } from "./imageIds";
import { validateImage } from "./imageMedia";
export function useGeneratedImages(suppliedCache) {
  const [cache] = useState(() => suppliedCache || createImageCache());
  const [images, setImages] = useState({});
  const [records, setRecords] = useState([]);
  const [warning, setWarning] = useState("");
  const urls = useRef(new Map());
  const epoch = useRef(0);
  useEffect(() => {
    ++epoch.current;
    return () => {
      ++epoch.current;
      for (const url of urls.current.values()) URL.revokeObjectURL(url);
      urls.current.clear();
    };
  }, []);
  const refresh = useCallback(async () => {
    const visit = epoch.current;
    const rows = await cache.list();
    if (visit !== epoch.current) return;
    const ids = new Set(rows.map((row) => row.id));
    for (const [id, url] of urls.current)
      if (!ids.has(id)) {
        URL.revokeObjectURL(url);
        urls.current.delete(id);
      }
    setImages((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([id]) => ids.has(id)),
      ),
    );
    setRecords(rows);
    setWarning(cache.status().warning);
  }, [cache]);
  const ensure = useCallback(
    async (id) => {
      if (!isGeneratedId(id)) return null;
      const visit = epoch.current;
      const record = await cache.get(id);
      if (visit !== epoch.current) return null;
      if (!record) {
        if (urls.current.has(id)) {
          URL.revokeObjectURL(urls.current.get(id));
          urls.current.delete(id);
        }
        setImages((previous) =>
          Object.fromEntries(
            Object.entries(previous).filter(([key]) => key !== id),
          ),
        );
        setWarning(
          cache.status().warning ||
            "A saved generated background is unavailable. A curated fallback is shown.",
        );
        return null;
      }
      if (!urls.current.has(id))
        urls.current.set(id, URL.createObjectURL(record.blob));
      const image = { ...record, displayUrl: urls.current.get(id) };
      setImages((previous) => ({ ...previous, [id]: image }));
      setWarning(cache.status().warning);
      return image;
    },
    [cache],
  );
  const save = useCallback(
    async (input, pinnedIds) => {
      try {
        const record = await cache.save(input, { pinnedIds });
        await refresh();
        return { recordId: record.id, image: await ensure(record.id) };
      } catch (error) {
        if (!(error instanceof CacheLimitError)) throw error;
        // A full protected cache must not discard the response: keep one downloadable preview.
        await validateImage(input.blob);
        return { unsavedImage: input.blob, imageWarning: error.message };
      }
    },
    [cache, ensure, refresh],
  );
  const remove = useCallback(
    async (id, pinnedIds) => {
      await cache.remove(id, { pinnedIds });
      await refresh();
    },
    [cache, refresh],
  );
  return { images, records, warning, cache, refresh, ensure, save, remove };
}
export function saveDownload(blob, name) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
