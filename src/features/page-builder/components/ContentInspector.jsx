import { useState } from "react";
import { CommitField } from "./CommitField";
import { useBuilder } from "../state/BuilderProvider";
import { ICONS } from "../domain/icons";
import { FIELD_KINDS, makeField } from "../domain/components";
import { InlineIcon } from "./RichText";

export default function ContentInspector({ element: e, patch }) {
  const { state, dispatch, sendCommand } = useBuilder();
  const p = e.props;
  const [iconQuery, setIconQuery] = useState(""),
    [kind, setKind] = useState("text");
  const update = (value, key = "component") => patch({ props: value }, key);
  const field = (label, key, options = {}) => (
    <CommitField
      key={key}
      label={label}
      value={p[key]}
      onCommit={(value) => update({ [key]: value }, key)}
      {...options}
    />
  );
  const check = (label, key) => (
    <label className="pb-checkbox" key={key}>
      <input
        type="checkbox"
        checked={p[key]}
        onChange={(event) => update({ [key]: event.target.checked }, key)}
      />
      {label}
    </label>
  );
  if (p.document)
    return (
      <>
        <button
          type="button"
          onClick={() => dispatch({ type: "RICH_MODE", id: e.id })}
        >
          Edit rich text
        </button>
        <p className="pb-muted">
          Double-click or double-tap text on the canvas to format a selection.
          The plain text field replaces formatting.
        </p>
      </>
    );
  if (["button", "link"].includes(e.type))
    return (
      <>
        <label>
          Link appearance
          <select
            aria-label="Link appearance"
            value={e.type}
            onChange={(event) =>
              sendCommand({
                type: "CONVERT",
                ids: [e.id],
                component: event.target.value,
              })
            }
          >
            <option value="link">Text link</option>
            <option value="button">Button link</option>
          </select>
        </label>
        <label>
          Section target
          <select
            aria-label="Section target"
            value={p.href.startsWith("#") ? p.href : ""}
            onChange={(event) => update({ href: event.target.value })}
          >
            <option value="" disabled>
              Choose a page section
            </option>
            {Object.values(state.editor.project.page.elements)
              .filter((n) => n.htmlId)
              .map((n) => (
                <option key={n.id} value={"#" + n.htmlId}>
                  {n.name}
                  {n.visibility.globalHidden ? " (hidden)" : ""}
                </option>
              ))}
          </select>
        </label>
        {p.href.startsWith("#") &&
          !Object.values(state.editor.project.page.elements).some(
            (n) => n.htmlId === p.href.slice(1),
          ) && <p className="pb-warning">This section target is missing.</p>}
      </>
    );
  if (e.type === "nav")
    return (
      <>
        {field("Navigation label", "label")}
        {field("Menu button label", "menuLabel")}
        <p className="pb-muted">
          Add Link components inside Navigation. Narrow layouts use a native
          details/summary menu.
        </p>
      </>
    );
  if (e.type === "image")
    return (
      <>
        {check("Load image with high priority", "priority")}
        <p className="pb-muted">
          Use Style to choose object fit, focal point and aspect ratio.
        </p>
      </>
    );
  if (e.type === "icon")
    return (
      <>
        <label>
          Find an icon
          <input
            type="search"
            value={iconQuery}
            onChange={(event) => setIconQuery(event.target.value)}
          />
        </label>
        <div className="pb-icon-grid">
          {Object.keys(ICONS)
            .filter((id) => id.includes(iconQuery.toLowerCase()))
            .map((id) => (
              <button
                type="button"
                key={id}
                aria-label={`Use ${id} icon`}
                aria-pressed={p.iconId === id}
                onClick={() => update({ iconId: id })}
              >
                <InlineIcon name={id} decorative />
                {id}
              </button>
            ))}
        </div>
        {field("Icon accessible label", "label")}
        {check("Decorative icon", "decorative")}
      </>
    );
  if (e.type === "embed")
    return (
      <>
        <label>
          Embed provider
          <select
            aria-label="Embed provider"
            value={p.provider}
            onChange={(event) =>
              update({
                provider: event.target.value,
                url: {
                  youtube: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                  vimeo: "https://player.vimeo.com/video/76979871",
                  maps: "https://www.google.com/maps/embed?pb=placeholder",
                }[event.target.value],
              })
            }
          >
            {["youtube", "vimeo", "maps"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {field("Trusted embed URL", "url")}
        {field("Embed title", "title")}
        <p className="pb-muted">
          Use the provider’s embed URL. Only approved hosts and paths are
          accepted. Loading an embed contacts its provider.
        </p>
      </>
    );
  if (["video", "audio"].includes(e.type))
    return (
      <>
        {field("Media URL", "src")}
        {e.type === "video" && (
          <>
            {field("Poster URL", "poster")}
            {field("Caption track URL", "captions")}
            {field("Caption language", "captionLang")}
          </>
        )}
        {["controls", "loop", "muted"].map((k) =>
          check(k[0].toUpperCase() + k.slice(1), k),
        )}
        <label className="pb-checkbox">
          <input
            type="checkbox"
            checked={p.autoplay}
            onChange={(event) =>
              update({
                autoplay: event.target.checked,
                ...(event.target.checked ? { muted: true } : {}),
              })
            }
          />
          Autoplay (requires muted)
        </label>
        <label>
          Preload
          <select
            aria-label="Preload"
            value={p.preload}
            onChange={(event) => update({ preload: event.target.value })}
          >
            {["none", "metadata", "auto"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </>
    );
  if (e.type === "form") {
    const fields = p.fields;
    const edit = (index, changes) =>
      update(
        {
          fields: fields.map((f, i) =>
            i === index ? { ...f, ...changes } : f,
          ),
        },
        "fields",
      );
    return (
      <>
        {field("Form endpoint (HTTPS)", "action")}
        <label>
          Form method
          <select
            aria-label="Form method"
            value={p.method}
            onChange={(event) => update({ method: event.target.value })}
          >
            <option>POST</option>
            <option>GET</option>
          </select>
        </label>
        {p.method === "GET" && (
          <p className="pb-warning">
            GET places personal information in the URL. Prefer POST for private
            details.
          </p>
        )}
        {field("Submit button label", "submitLabel")}
        {fields.map((f, index) => (
          <details key={f.id} open className="pb-component-record">
            <summary>
              {f.label} · {f.kind}
            </summary>
            <label>
              Field type
              <select
                aria-label={`Field ${index + 1} type`}
                value={f.kind}
                onChange={(event) => edit(index, { kind: event.target.value })}
              >
                {FIELD_KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            {["label", "name", "placeholder", "pattern", "min", "max"].map(
              (k) => (
                <CommitField
                  key={k}
                  label={`Field ${index + 1} ${k}`}
                  value={f[k]}
                  onCommit={(v) => edit(index, { [k]: v })}
                />
              ),
            )}
            {["minLength", "maxLength"].map((k) => (
              <CommitField
                key={k}
                type="number"
                min={0}
                max={20000}
                label={`Field ${index + 1} ${k}`}
                value={f[k]}
                onCommit={(v) => edit(index, { [k]: v })}
              />
            ))}
            <label className="pb-checkbox">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(event) =>
                  edit(index, { required: event.target.checked })
                }
              />
              Required field {index + 1}
            </label>
            {["select", "radio"].includes(f.kind) && (
              <CommitField
                label={`Field ${index + 1} options (separate with |)`}
                value={f.options.join("|")}
                onCommit={(v) =>
                  edit(index, {
                    options: v
                      .split("|")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            )}
            <label>
              Autocomplete
              <select
                aria-label={`Field ${index + 1} autocomplete`}
                value={f.autocomplete}
                onChange={(event) =>
                  edit(index, { autocomplete: event.target.value })
                }
              >
                {[
                  "off",
                  "name",
                  "email",
                  "tel",
                  "organization",
                  "street-address",
                  "postal-code",
                  "new-password",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <div className="pb-inline-actions">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const next = [...fields];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  update({ fields: next });
                }}
              >
                Move field {index + 1} up
              </button>
              <button
                type="button"
                disabled={index === fields.length - 1}
                onClick={() => {
                  const next = [...fields];
                  [next[index + 1], next[index]] = [
                    next[index],
                    next[index + 1],
                  ];
                  update({ fields: next });
                }}
              >
                Move field {index + 1} down
              </button>
              <button
                type="button"
                onClick={() =>
                  update({ fields: fields.filter((_, i) => i !== index) })
                }
              >
                Remove field {index + 1}
              </button>
            </div>
          </details>
        ))}
        <label>
          New field type
          <select
            aria-label="New field type"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            {FIELD_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            const f = makeField(kind);
            let name = kind,
              i = 2;
            while (fields.some((x) => x.name === name)) name = kind + "-" + i++;
            update({
              fields: [
                ...fields,
                { ...f, name, label: "New " + kind + " field" },
              ],
            });
          }}
        >
          Add form field
        </button>
        <p className="pb-muted">
          Only field definitions are stored. Canvas inputs are disabled and
          submissions are blocked.
        </p>
      </>
    );
  }
  if (e.type === "table")
    return (
      <>
        {field("Table caption", "caption")}
        <label>
          Table headers
          <select
            aria-label="Table headers"
            value={p.headers}
            onChange={(event) => update({ headers: event.target.value })}
          >
            {["none", "row", "column", "both"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {check("Striped table rows", "striped")}
        <div className="pb-table-editor">
          {p.rows.map((row, r) => (
            <details key={r} open>
              <summary>Row {r + 1}</summary>
              {row.map((cell, c) => (
                <CommitField
                  key={c}
                  label={`Cell ${r + 1}, ${c + 1}`}
                  value={cell}
                  onCommit={(value) =>
                    update(
                      {
                        rows: p.rows.map((line, i) =>
                          i === r
                            ? line.map((v, j) => (j === c ? value : v))
                            : line,
                        ),
                      },
                      "table",
                    )
                  }
                />
              ))}
              <button
                type="button"
                disabled={p.rows.length === 1}
                onClick={() =>
                  update({ rows: p.rows.filter((_, i) => i !== r) })
                }
              >
                Delete row {r + 1}
              </button>
            </details>
          ))}
        </div>
        <div className="pb-inline-actions">
          <button
            type="button"
            onClick={() =>
              update({ rows: [...p.rows, p.rows[0].map(() => "New cell")] })
            }
          >
            Add table row
          </button>
          <button
            type="button"
            onClick={() =>
              update({ rows: p.rows.map((row) => [...row, "New cell"]) })
            }
          >
            Add table column
          </button>
        </div>
        {p.rows[0].map((_, c) => (
          <button
            type="button"
            key={c}
            disabled={p.rows[0].length === 1}
            onClick={() =>
              update({
                rows: p.rows.map((row) => row.filter((_, i) => i !== c)),
              })
            }
          >
            Delete column {c + 1}
          </button>
        ))}
      </>
    );
  if (e.type === "gallery")
    return (
      <>
        {field("Gallery columns", "columns", {
          type: "number",
          min: 1,
          max: 12,
        })}
        <label>
          Gallery aspect ratio
          <select
            aria-label="Gallery aspect ratio"
            value={p.aspect}
            onChange={(event) => update({ aspect: event.target.value })}
          >
            {["1 / 1", "4 / 3", "3 / 2", "16 / 9"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Gallery image fit
          <select
            aria-label="Gallery image fit"
            value={p.fit}
            onChange={(event) => update({ fit: event.target.value })}
          >
            {["cover", "contain", "fill"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Gallery hover effect
          <select
            aria-label="Gallery hover effect"
            value={p.hover}
            onChange={(event) => update({ hover: event.target.value })}
          >
            {["none", "zoom", "fade"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {p.images.map((img, i) => (
          <details key={img.id} open className="pb-component-record">
            <summary>Image {i + 1}</summary>
            {["src", "alt", "caption"].map((k) => (
              <CommitField
                key={k}
                label={`Gallery image ${i + 1} ${k}`}
                value={img[k]}
                onCommit={(value) =>
                  update(
                    {
                      images: p.images.map((entry, j) =>
                        i === j ? { ...entry, [k]: value } : entry,
                      ),
                    },
                    "gallery",
                  )
                }
              />
            ))}
            <button
              type="button"
              disabled={i === 0}
              onClick={() => {
                const images = [...p.images];
                [images[i - 1], images[i]] = [images[i], images[i - 1]];
                update({ images });
              }}
            >
              Move image {i + 1} up
            </button>
            <button
              type="button"
              disabled={i === p.images.length - 1}
              onClick={() => {
                const images = [...p.images];
                [images[i + 1], images[i]] = [images[i], images[i + 1]];
                update({ images });
              }}
            >
              Move image {i + 1} down
            </button>
            <button
              type="button"
              onClick={() =>
                update({ images: p.images.filter((_, j) => j !== i) })
              }
            >
              Remove image {i + 1}
            </button>
          </details>
        ))}
        <button
          type="button"
          onClick={() =>
            update({
              images: [
                ...p.images,
                {
                  id: crypto.randomUUID(),
                  src: "https://example.com/image.jpg",
                  alt: "Describe this image",
                  caption: "New image",
                },
              ],
            })
          }
        >
          Add gallery image
        </button>
      </>
    );
  return null;
}
