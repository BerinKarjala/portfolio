import forestAvif1600 from "./forest-waterfall-1600.avif";
import forestWebp1600 from "./forest-waterfall-1600.webp";

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

const preloadBackgroundImage = async () => {
  if (typeof document === "undefined") {
    return;
  }

  if (document.querySelector('[data-bg-preload="forest"]')) {
    return;
  }

  const canUseAvif = await supportsAvif();
  const canUseWebp = !canUseAvif && (await supportsWebp());

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  if (canUseAvif) {
    link.href = forestAvif1600;
    link.type = "image/avif";
  } else if (canUseWebp) {
    link.href = forestWebp1600;
    link.type = "image/webp";
  } else {
    return;
  }
  link.setAttribute("fetchpriority", "high");
  link.setAttribute("data-bg-preload", "forest");
  document.head.appendChild(link);
};

preloadBackgroundImage();
