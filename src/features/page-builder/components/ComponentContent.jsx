import { useState } from "react";
import { RichText, InlineIcon } from "./RichText";
import { reactStyles } from "../domain/styles";

export function PlaceholderArt({ label = "Image placeholder", index = 0 }) {
  return (
    <svg
      className="pb-original-art"
      role="img"
      aria-label={label}
      viewBox="0 0 400 300"
    >
      <rect
        width="400"
        height="300"
        fill={["#e6efe9", "#ede6f4", "#f4e8d9"][index % 3]}
      />
      <circle
        cx={index % 2 ? 270 : 130}
        cy="110"
        r="78"
        fill={["#36765c", "#81689b", "#be8651"][index % 3]}
      />
      <path
        d="M0 260 120 140 250 270 340 170 400 240V300H0Z"
        fill={["#173f33", "#47365e", "#68452f"][index % 3]}
      />
      <path d="M24 24h70M24 34h45" stroke="#ffffff" strokeWidth="3" />
    </svg>
  );
}
export function ImageContent({ src, alt, index = 0, style = {} }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="pb-image-fallback" style={style}>
      <PlaceholderArt label={alt || "Image unavailable"} index={index} />
      <small>Placeholder · update the image URL in Content.</small>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      draggable={false}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
function Embed({ props: p }) {
  const [loaded, setLoaded] = useState(false);
  return loaded ? (
    <iframe
      className="pb-embed"
      src={p.url}
      title={p.title}
      sandbox="allow-scripts allow-presentation"
      allow="fullscreen"
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  ) : (
    <div className="pb-embed-placeholder">
      <InlineIcon
        name={p.provider === "maps" ? "location" : "play"}
        label={p.title}
      />
      <strong>{p.title}</strong>
      <span>{p.provider} · trusted embed</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setLoaded(true);
        }}
      >
        Load external embed
      </button>
    </div>
  );
}
export default function ComponentContent({
  element: e,
  styles = {},
  viewport = 1280,
}) {
  const p = e.props;
  if (e.type === "heading") {
    const Heading = `h${p.level}`;
    return (
      <Heading>
        <RichText document={p.document} />
      </Heading>
    );
  }
  if (e.type === "paragraph")
    return (
      <p>
        <RichText document={p.document} />
      </p>
    );
  if (e.type === "listItem")
    return (
      <span>
        • <RichText document={p.document} />
      </span>
    );
  if (["link", "button"].includes(e.type))
    return (
      <a
        className={
          e.type === "button" ? "pb-content-button" : "pb-preview-link"
        }
        href={p.href}
        onClick={(event) => event.preventDefault()}
      >
        {p.text}
        {e.type === "link" && (
          <InlineIcon
            name="arrow"
            decorative
            style={{
              marginLeft: ".3em",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          />
        )}
      </a>
    );
  if (e.type === "divider") return <hr />;
  if (e.type === "image")
    return (
      <ImageContent
        key={p.src}
        src={p.src}
        alt={e.accessibility.decorative ? "" : p.alt}
        style={{
          width: "100%",
          height: styles.height || styles.aspectRatio ? "100%" : undefined,
          ...reactStyles(
            Object.fromEntries(
              ["objectFit", "objectPosition", "aspectRatio", "borderRadius"]
                .filter((k) => styles[k])
                .map((k) => [k, styles[k]]),
            ),
          ),
        }}
      />
    );
  if (e.type === "icon")
    return (
      <InlineIcon
        name={p.iconId}
        label={p.label}
        decorative={p.decorative}
        style={{ fontSize: "2em" }}
      />
    );
  if (e.type === "embed") return <Embed key={p.url} props={p} />;
  if (["video", "audio"].includes(e.type)) {
    const Media = e.type;
    return (
      <div className="pb-media-content">
        <Media
          src={p.src}
          controls={p.controls}
          muted={p.muted}
          loop={p.loop}
          preload="none"
          poster={p.poster || undefined}
          aria-label={e.accessibility.label || e.name}
        >
          {p.captions && (
            <track
              kind="captions"
              src={p.captions}
              srcLang={p.captionLang}
              label="Captions"
            />
          )}
        </Media>
        <small>External {e.type} · autoplay stays off while editing.</small>
      </div>
    );
  }
  if (e.type === "form")
    return (
      <form
        className="pb-content-form"
        action={p.action}
        method={p.method}
        onSubmit={(event) => event.preventDefault()}
        aria-label={e.accessibility.label || "Form preview"}
      >
        {p.fields.map((f) => {
          const id = "preview-" + e.id + "-" + f.id;
          const attrs = {
            id,
            name: f.name,
            placeholder: f.placeholder,
            required: f.required,
            pattern: f.pattern || undefined,
            min: f.min || undefined,
            max: f.max || undefined,
            minLength: f.minLength,
            maxLength: f.maxLength,
            autoComplete: f.autocomplete,
            disabled: true,
          };
          if (f.kind === "radio")
            return (
              <fieldset key={f.id}>
                <legend>
                  {f.label}
                  {f.required ? " *" : ""}
                </legend>
                {f.options.map((option, i) => (
                  <label key={i} htmlFor={id + "-" + i}>
                    <input
                      id={id + "-" + i}
                      name={f.name}
                      type="radio"
                      required={f.required}
                      disabled
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            );
          return (
            <div key={f.id}>
              <label htmlFor={id}>
                {f.label}
                {f.required ? " *" : ""}
              </label>
              {f.kind === "textarea" ? (
                <textarea {...attrs} />
              ) : f.kind === "select" ? (
                <select {...attrs}>
                  {f.options.map((o, i) => (
                    <option key={i}>{o}</option>
                  ))}
                </select>
              ) : (
                <input {...attrs} type={f.kind} />
              )}
            </div>
          );
        })}
        <button type="button" disabled>
          {p.submitLabel}
        </button>
        <small>Editing preview · visitor values are never saved.</small>
      </form>
    );
  if (e.type === "table")
    return (
      <div className="pb-table-scroll">
        <table data-striped={p.striped}>
          <caption>{p.caption}</caption>
          {p.rows.map((row, r) => {
            const Group =
              r === 0 && ["column", "both"].includes(p.headers)
                ? "thead"
                : "tbody";
            return (
              <Group key={r}>
                <tr>
                  {row.map((cell, c) => {
                    const head =
                      (r === 0 && ["column", "both"].includes(p.headers)) ||
                      (c === 0 && ["row", "both"].includes(p.headers));
                    const Cell = head ? "th" : "td";
                    return (
                      <Cell
                        key={c}
                        scope={
                          head
                            ? r === 0 && ["column", "both"].includes(p.headers)
                              ? "col"
                              : "row"
                            : undefined
                        }
                      >
                        {cell}
                      </Cell>
                    );
                  })}
                </tr>
              </Group>
            );
          })}
        </table>
      </div>
    );
  if (e.type === "gallery")
    return (
      <div
        className="pb-content-gallery"
        data-hover={p.hover}
        style={{
          gridTemplateColumns: `repeat(${Math.min(p.columns, viewport < 600 ? 1 : viewport < 1024 ? 2 : 12)},minmax(0,1fr))`,
        }}
      >
        {p.images.map((img, i) => (
          <figure key={img.id}>
            <ImageContent
              key={img.src}
              src={img.src}
              alt={img.alt}
              index={i}
              style={{ aspectRatio: p.aspect, objectFit: p.fit }}
            />
            <figcaption>{img.caption}</figcaption>
          </figure>
        ))}
      </div>
    );
  return null;
}
