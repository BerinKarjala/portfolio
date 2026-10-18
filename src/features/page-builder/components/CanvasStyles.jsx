import { STATES, cssDeclarations, ownStyles } from "../domain/styles";
const frames = {
  fade: "from{opacity:0}to{opacity:1}",
  slide:
    "from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}",
  zoom: "from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}",
  rotate: "from{transform:rotate(-8deg)}to{transform:rotate(0)}",
  pulse: "0%,100%{transform:scale(1)}50%{transform:scale(1.04)}",
  bounce: "0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}",
};
export default function CanvasStyles({ project, paused, replay }) {
  let css = Object.entries(frames)
    .map(([name, body]) => `@keyframes pb-${name}-${replay}{${body}}`)
    .join("\n");
  for (const e of Object.values(project.page.elements)) {
    const selector = `.pb-root .pb-canvas-document [data-element-id="${e.id}"]`;
    for (const state of STATES) {
      const s = ownStyles(project, e.id, state);
      if (Object.keys(s).length)
        css += `${selector}:${state}{${cssDeclarations(s)
          .split(";")
          .filter(Boolean)
          .map((d) => d + "!important")
          .join(";")}}\n`;
    }
    const f =
      e.effects.animation === "inherit" ? project.globalEffects : e.effects;
    if (f.animation !== "none") {
      const when = f.trigger === "load" ? "" : ":" + f.trigger;
      css += `${selector}${when}{animation:pb-${f.animation}-${replay} ${f.duration}s ease ${f.delay}s ${f.iterations} ${f.direction} both;animation-play-state:${paused ? "paused" : "running"}}\n`;
    }
  }
  css +=
    "@media(prefers-reduced-motion:reduce){.pb-root .pb-canvas-document [data-element-id]{animation:none!important;transition:none!important}.pb-root .pb-content-gallery img{transition:none!important;transform:none!important}}";
  const fonts = new Set();
  for (const e of Object.values(project.page.elements)) {
    for (const v of [
      e.styles.overrides,
      ...Object.values(e.styles.states),
      ...Object.values(project.presets).flatMap((p) => [
        p.styles,
        ...Object.values(p.states),
        ...Object.values(p.variants),
      ]),
      project.globalStyles,
    ])
      if (
        v.fontFamily &&
        ["Inter", "DM Sans", "Lora", "Space Grotesk"].includes(v.fontFamily)
      )
        fonts.add(v.fontFamily);
    for (const n of e.props.document?.nodes || [])
      if (
        ["Inter", "DM Sans", "Lora", "Space Grotesk"].includes(
          n.styles?.fontFamily,
        )
      )
        fonts.add(n.styles.fontFamily);
  }
  return (
    <>
      {fonts.size > 0 && (
        <link
          rel="stylesheet"
          href={
            "https://fonts.googleapis.com/css2?" +
            [...fonts]
              .sort()
              .map(
                (f) =>
                  "family=" + f.replaceAll(" ", "+") + ":wght@400;500;600;700",
              )
              .join("&") +
            "&display=swap"
          }
        />
      )}
      <style>{css}</style>
    </>
  );
}
