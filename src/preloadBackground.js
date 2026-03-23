import forestAvif1600 from "./forest-waterfall-1600.avif";
import forestAvif2400 from "./forest-waterfall-2400.avif";
import forestWebp1600 from "./forest-waterfall-1600.webp";
import forestWebp2400 from "./forest-waterfall-2400.webp";
import forestPng from "./forest-waterfall.png";

const supportsAvif = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAG1pZjFhdmlmAAACAGF2MDEAAAAB";
  });

const supportsWebp = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src =
      "data:image/webp;base64,UklGRiIAAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=";
  });

const shouldUseHighDensityAsset = () =>
  typeof window !== "undefined" && (window.devicePixelRatio || 1) > 1.5;

const preloadBackgroundImage = async () => {
  if (typeof document === "undefined") {
    return;
  }

  if (document.querySelector('[data-bg-preload="forest"]')) {
    return;
  }

  const useHighDensityAsset = shouldUseHighDensityAsset();
  const canUseAvif = await supportsAvif();
  const canUseWebp = !canUseAvif && (await supportsWebp());

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  if (canUseAvif) {
    link.href = useHighDensityAsset ? forestAvif2400 : forestAvif1600;
    link.type = "image/avif";
  } else if (canUseWebp) {
    link.href = useHighDensityAsset ? forestWebp2400 : forestWebp1600;
    link.type = "image/webp";
  } else {
    link.href = forestPng;
    link.type = "image/png";
  }
  link.setAttribute("fetchpriority", "high");
  link.setAttribute("data-bg-preload", "forest");
  document.head.appendChild(link);
};

preloadBackgroundImage();
