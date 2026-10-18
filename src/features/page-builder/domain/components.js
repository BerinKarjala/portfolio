import { ensure, object, text, safeUrl, identifier } from "./validation";
import { textDocument, validateRichText } from "./richText";
import { ICONS } from "./icons";

export const FIELD_KINDS = [
  "text",
  "email",
  "tel",
  "url",
  "number",
  "date",
  "password",
  "select",
  "radio",
  "checkbox",
  "textarea",
];
export const makeField = (kind = "text") => ({
  id: crypto.randomUUID(),
  kind,
  label: kind === "email" ? "Email address" : "Your name",
  name: kind === "email" ? "email" : "name",
  placeholder: "",
  required: false,
  pattern: "",
  min: "",
  max: "",
  minLength: 0,
  maxLength: 1000,
  options: ["First option", "Second option"],
  autocomplete: "off",
});
export const defaultProps = (type) =>
  structuredClone(
    {
      container: {},
      card: {},
      heading: { level: 2, document: textDocument("Your heading") },
      paragraph: { document: textDocument("Write something worth sharing.") },
      link: { text: "Explore more", href: "https://example.com" },
      button: { text: "Get started", href: "https://example.com" },
      divider: {},
      image: {
        src: "https://example.com/image.jpg",
        alt: "Describe your image",
        priority: false,
      },
      nav: { label: "Navigation", menuLabel: "Menu" },
      list: { ordered: false },
      listItem: { document: textDocument("List item") },
      form: {
        action: "https://example.com/contact",
        method: "POST",
        fields: type === "form" ? [makeField("email")] : [],
        submitLabel: "Send message",
      },
      table: {
        caption: "A useful comparison",
        headers: "column",
        rows: [
          ["Feature", "Essential", "Studio"],
          ["Projects", "3", "Unlimited"],
          ["Support", "Email", "Priority"],
        ],
        striped: true,
      },
      gallery: {
        columns: 3,
        aspect: "4 / 3",
        fit: "cover",
        hover: "zoom",
        images: [
          {
            id: "gallery-1",
            src: "https://example.com/art-1.jpg",
            alt: "First artwork",
            caption: "Study in light",
          },
          {
            id: "gallery-2",
            src: "https://example.com/art-2.jpg",
            alt: "Second artwork",
            caption: "Quiet forms",
          },
        ],
      },
      icon: { iconId: "sparkle", label: "Highlight", decorative: false },
      video: {
        src: "https://example.com/video.mp4",
        poster: "",
        captions: "",
        captionLang: "en",
        controls: true,
        loop: false,
        muted: false,
        autoplay: false,
        preload: "metadata",
      },
      audio: {
        src: "https://example.com/audio.mp3",
        controls: true,
        loop: false,
        muted: false,
        autoplay: false,
        preload: "metadata",
      },
      embed: {
        provider: "youtube",
        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        title: "Video embed",
      },
    }[type],
  );
export function trustedEmbed(provider, value) {
  if (!safeUrl(value)) return false;
  const u = new URL(value);
  if (provider === "youtube")
    return (
      ["www.youtube.com", "www.youtube-nocookie.com"].includes(u.hostname) &&
      /^\/embed\/[\w-]{6,30}$/.test(u.pathname) &&
      !u.search &&
      !u.hash &&
      !u.port
    );
  if (provider === "vimeo")
    return (
      u.hostname === "player.vimeo.com" &&
      /^\/video\/\d{1,15}$/.test(u.pathname) &&
      !u.search &&
      !u.hash &&
      !u.port
    );
  if (provider === "maps")
    return (
      u.hostname === "www.google.com" &&
      u.pathname === "/maps/embed" &&
      [...u.searchParams.keys()].every((k) => k === "pb") &&
      u.searchParams.get("pb")?.length > 0 &&
      !u.hash &&
      !u.port
    );
  return false;
}
export function validateProps(type, props) {
  const defaults =
    type === "form"
      ? { action: "", method: "", fields: [], submitLabel: "" }
      : defaultProps(type);
  ensure(defaults, "Unsupported component type.");
  // M1/M2 image and nav props are upgraded during migration.
  object(props, Object.keys(defaults), "Component properties");
  if (props.document) validateRichText(props.document);
  if (["heading", "paragraph", "listItem"].includes(type))
    ensure(props.document, "Missing rich-text document.");
  if (type === "heading")
    ensure([1, 2, 3, 4, 5, 6].includes(props.level), "Invalid heading level.");
  if (["link", "button"].includes(type)) {
    text(props.text, 1000, "link text", false);
    ensure(safeUrl(props.href, { link: true }), "Unsafe link URL.");
  }
  if (type === "image") {
    ensure(safeUrl(props.src), "Unsafe image URL.");
    text(props.alt, 1000, "image description");
    ensure(
      typeof props.priority === "boolean",
      "Invalid image loading priority.",
    );
  }
  if (type === "nav") {
    text(props.label, 100, "navigation label", false);
    text(props.menuLabel, 100, "menu label", false);
  }
  if (type === "list")
    ensure(typeof props.ordered === "boolean", "Invalid list type.");
  if (type === "icon") {
    ensure(
      Object.hasOwn(ICONS, props.iconId) &&
        typeof props.decorative === "boolean",
      "Invalid icon.",
    );
    text(props.label, 100, "icon label", props.decorative);
  }
  if (type === "form") {
    ensure(
      safeUrl(props.action) && ["GET", "POST"].includes(props.method),
      "Forms require an HTTPS external endpoint.",
    );
    text(props.submitLabel, 100, "submit label", false);
    ensure(Array.isArray(props.fields), "Invalid form fields.");
    const used = new Set(),
      names = new Set();
    for (const f of props.fields) {
      object(
        f,
        [
          "id",
          "kind",
          "label",
          "name",
          "placeholder",
          "required",
          "pattern",
          "min",
          "max",
          "minLength",
          "maxLength",
          "options",
          "autocomplete",
        ],
        "Form field",
      );
      ensure(
        identifier(f.id) && !used.has(f.id) && FIELD_KINDS.includes(f.kind),
        "Invalid or repeated form field.",
      );
      used.add(f.id);
      ensure(
        /^[A-Za-z][\w-]{0,99}$/.test(f.name) && !names.has(f.name),
        "Field names must be unique.",
      );
      names.add(f.name);
      text(f.label, 200, "field label", false);
      text(f.placeholder, 300);
      text(f.pattern, 200);
      ensure(!/[\u0000-\u001f<>]/.test(f.pattern), "Invalid field pattern.");
      ensure(typeof f.required === "boolean", "Invalid required setting.");
      for (const key of ["min", "max"])
        ensure(
          typeof f[key] === "string" &&
            (f[key] === "" ||
              /^-?\d{1,12}(?:\.\d+)?$/.test(f[key]) ||
              /^\d{4}-\d\d-\d\d$/.test(f[key])),
          "Invalid field bound.",
        );
      ensure(
        Number.isInteger(f.minLength) &&
          Number.isInteger(f.maxLength) &&
          f.minLength >= 0 &&
          f.maxLength >= f.minLength &&
          f.maxLength <= 20000,
        "Invalid field lengths.",
      );
      ensure(
        Array.isArray(f.options) && f.options.length <= 100,
        "Invalid options.",
      );
      f.options.forEach((s) => text(s, 200, "option", false));
      ensure(
        [
          "off",
          "name",
          "email",
          "tel",
          "organization",
          "street-address",
          "postal-code",
          "new-password",
        ].includes(f.autocomplete),
        "Invalid autocomplete.",
      );
    }
  }
  if (type === "table") {
    text(props.caption, 300);
    ensure(
      ["none", "row", "column", "both"].includes(props.headers) &&
        typeof props.striped === "boolean",
      "Invalid table headers.",
    );
    ensure(
      Array.isArray(props.rows) &&
        props.rows.length >= 1 &&
        props.rows.every(
          (row) =>
            Array.isArray(row) &&
            row.length >= 1 &&
            row.length === props.rows[0].length,
        ),
      "Table rows must be rectangular.",
    );
    props.rows.flat().forEach((cell) => text(cell, 3000, "table cell"));
  }
  if (type === "gallery") {
    ensure(
      Number.isInteger(props.columns) &&
        props.columns >= 1 &&
        props.columns <= 12 &&
        ["1 / 1", "4 / 3", "3 / 2", "16 / 9"].includes(props.aspect) &&
        ["cover", "contain", "fill"].includes(props.fit) &&
        ["none", "zoom", "fade"].includes(props.hover) &&
        Array.isArray(props.images),
      "Invalid gallery.",
    );
    const used = new Set();
    for (const i of props.images) {
      object(i, ["id", "src", "alt", "caption"], "Gallery image");
      ensure(
        identifier(i.id) && !used.has(i.id) && safeUrl(i.src),
        "Invalid gallery image.",
      );
      used.add(i.id);
      text(i.alt, 1000);
      text(i.caption, 1000);
    }
  }
  if (["video", "audio"].includes(type)) {
    ensure(safeUrl(props.src), "Unsafe media URL.");
    for (const key of ["controls", "loop", "muted", "autoplay"])
      ensure(typeof props[key] === "boolean", "Invalid media setting.");
    ensure(!props.autoplay || props.muted, "Autoplay requires muted playback.");
    ensure(
      ["none", "metadata", "auto"].includes(props.preload),
      "Invalid media preload.",
    );
    if (type === "video") {
      ensure(
        safeUrl(props.poster, { empty: true }) &&
          safeUrl(props.captions, { empty: true }),
        "Unsafe poster/captions URL.",
      );
      ensure(
        /^[a-z]{2,8}(-[A-Za-z0-9]+)*$/.test(props.captionLang),
        "Invalid caption language.",
      );
    }
  }
  if (type === "embed") {
    ensure(
      trustedEmbed(props.provider, props.url),
      "Use an approved YouTube, Vimeo or Google Maps embed URL.",
    );
    text(props.title, 200, "embed title", false);
  }
  return props;
}
