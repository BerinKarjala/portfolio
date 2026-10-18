import { useEffect, useState } from "react";
import { useBuilder } from "../state/BuilderProvider";
import { documentText, plainText } from "../domain/project";
import { isContainer } from "../domain/catalog";
import {
  ancestors,
  canMoveTo,
  childrenOf,
  isLocked,
  protectedSubtree,
} from "../domain/structure";

export function CommitField({
  label,
  value,
  onCommit,
  type = "text",
  ...props
}) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  return (
    <label>
      {label}
      <input
        {...props}
        type={type}
        value={draft}
        placeholder={value === undefined ? "Mixed" : props.placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (String(draft) !== String(value ?? ""))
            onCommit(type === "number" ? Number(draft) : draft);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            event.stopPropagation();
            setDraft(value ?? "");
          }
        }}
      />
    </label>
  );
}
export function PageSettings() {
  const { state, editMetadata } = useBuilder();
  const { project, readOnly } = state.editor;
  const metadata = project.page.metadata;
  return (
    <>
      <p className="pb-eyebrow">PAGE SETTINGS</p>
      <h3>Make it yours</h3>
      <fieldset disabled={readOnly}>
        <label>
          Page title
          <input
            value={metadata.title}
            maxLength={200}
            onChange={(e) => editMetadata({ title: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            value={metadata.description}
            maxLength={1000}
            rows={4}
            onChange={(e) => editMetadata({ description: e.target.value })}
          />
        </label>
        <label>
          Page language
          <input
            value={metadata.lang}
            maxLength={40}
            onChange={(e) => editMetadata({ lang: e.target.value })}
          />
        </label>
        <label>
          Favicon URL
          <input
            type="url"
            value={metadata.faviconUrl}
            maxLength={2048}
            placeholder="https://example.com/icon.png"
            onChange={(e) => editMetadata({ faviconUrl: e.target.value })}
          />
        </label>
        <label className="pb-checkbox">
          <input
            type="checkbox"
            checked={metadata.indexable}
            onChange={(e) => editMetadata({ indexable: e.target.checked })}
          />
          Allow search engine indexing
        </label>
      </fieldset>
    </>
  );
}

export default function CanvasInspector({
  tab,
  setTab,
  placements,
  requestDelete,
}) {
  const { state, sendCommand, select } = useBuilder();
  const { project, selection, readOnly } = state.editor;
  const nodes = selection
    .map((id) => project.page.elements[id])
    .filter(Boolean);
  const first = nodes[0];
  const locked = nodes.some((e) => isLocked(project, e.id));
  const transformLocked = nodes.some((e) => protectedSubtree(project, e.id));
  const mixed = (getter) =>
    nodes.every((e) => getter(e) === getter(first)) ? getter(first) : undefined;
  const patch = (value, key) =>
    sendCommand(
      { type: "PATCH", ids: selection, patch: value },
      key && `${key}:${selection.join(",")}`,
    );
  const geometry = (key, value) => patch({ geometry: { [key]: value } }, key);
  function parentChange(parentId) {
    sendCommand({
      type: "MOVE",
      ids: selection,
      parentId: parentId || null,
      placements: placements(selection, parentId || null),
    });
  }
  return (
    <>
      <div className="pb-inspector-tabs" aria-label="Inspector views">
        {["content", "layout", "page"].map((name) => (
          <button
            type="button"
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
          >
            {name === "page"
              ? "Page"
              : name === "layout"
                ? "Layout"
                : "Content"}
          </button>
        ))}
      </div>
      {tab === "page" ? (
        <PageSettings />
      ) : !first ? (
        <p className="pb-muted">
          Select an element on the canvas or in Layers to inspect it.
        </p>
      ) : (
        <>
          <p className="pb-eyebrow">
            {selection.length > 1
              ? `${selection.length} ELEMENTS`
              : first.type.toUpperCase()}
          </p>
          <h3>{selection.length > 1 ? "Multiple selection" : first.name}</h3>
          {locked && (
            <p className="pb-warning">
              Locked elements can be inspected. Unlock their parent in Layers to
              edit them.
            </p>
          )}
          <fieldset disabled={readOnly || locked}>
            <CommitField
              label="Element name"
              value={mixed((e) => e.name)}
              maxLength={100}
              onCommit={(name) => patch({ name }, "name")}
            />
            {tab === "content" && (
              <>
                {nodes.every((e) => !!e.props.document) && (
                  <label>
                    Text content
                    <textarea
                      value={mixed(plainText) ?? ""}
                      placeholder={
                        mixed(plainText) === undefined
                          ? "Mixed values"
                          : "Write something…"
                      }
                      maxLength={10000}
                      rows={5}
                      onChange={(e) =>
                        patch(
                          { props: { document: documentText(e.target.value) } },
                          "text",
                        )
                      }
                    />
                  </label>
                )}
                {nodes.every((e) =>
                  ["heading", "paragraph"].includes(e.type),
                ) && (
                  <label>
                    Text type
                    <select
                      value={mixed((e) => e.type) || ""}
                      onChange={(e) =>
                        sendCommand({
                          type: "CONVERT",
                          ids: selection,
                          component: e.target.value,
                        })
                      }
                    >
                      <option value="" disabled>
                        Mixed
                      </option>
                      <option value="heading">Heading</option>
                      <option value="paragraph">Paragraph</option>
                    </select>
                  </label>
                )}
                {nodes.every((e) => e.type === "heading") && (
                  <label>
                    Heading level
                    <select
                      value={mixed((e) => e.props.level) || ""}
                      onChange={(e) =>
                        patch({ props: { level: Number(e.target.value) } })
                      }
                    >
                      <option value="" disabled>
                        Mixed
                      </option>
                      {[1, 2, 3, 4, 5, 6].map((level) => (
                        <option key={level} value={level}>
                          H{level}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {nodes.every((e) => e.type === "link") && (
                  <>
                    <CommitField
                      label="Link text"
                      value={mixed((e) => e.props.text)}
                      maxLength={1000}
                      onCommit={(text) =>
                        patch({ props: { text } }, "linkText")
                      }
                    />
                    <CommitField
                      label="Link URL"
                      value={mixed((e) => e.props.href)}
                      onCommit={(href) => patch({ props: { href } }, "href")}
                    />
                  </>
                )}
                {nodes.every((e) => e.type === "image") && (
                  <>
                    <CommitField
                      label="Image URL"
                      value={mixed((e) => e.props.src)}
                      onCommit={(src) => patch({ props: { src } }, "src")}
                    />
                    <CommitField
                      label="Image description"
                      value={mixed((e) => e.props.alt)}
                      onCommit={(alt) => patch({ props: { alt } }, "alt")}
                    />
                  </>
                )}
                {nodes.every((e) => e.type === "list") && (
                  <label>
                    List type
                    <select
                      value={
                        mixed((e) => e.props.ordered) === undefined
                          ? "mixed"
                          : String(first.props.ordered)
                      }
                      onChange={(e) =>
                        patch({ props: { ordered: e.target.value === "true" } })
                      }
                    >
                      <option value="mixed" disabled>
                        Mixed
                      </option>
                      <option value="false">Bulleted</option>
                      <option value="true">Numbered</option>
                    </select>
                  </label>
                )}
                <CommitField
                  label="HTML section ID"
                  value={mixed((e) => e.htmlId)}
                  maxLength={100}
                  onCommit={(htmlId) => patch({ htmlId }, "htmlId")}
                />
              </>
            )}
          </fieldset>
          {tab === "layout" && (
            <fieldset disabled={readOnly || transformLocked}>
              <label>
                Move into
                <select
                  aria-label="Move into"
                  value={
                    mixed((e) => e.parentId) === undefined
                      ? "mixed"
                      : first.parentId || ""
                  }
                  onChange={(e) => parentChange(e.target.value)}
                >
                  <option value="mixed" disabled>
                    Mixed parents
                  </option>
                  {canMoveTo(project, selection, null) && (
                    <option value="">Page root</option>
                  )}
                  {Object.values(project.page.elements)
                    .filter(
                      (e) =>
                        isContainer(e) && canMoveTo(project, selection, e.id),
                    )
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {[
                          ...ancestors(project, e.id).map(
                            (id) => project.page.elements[id].name,
                          ),
                          e.name,
                        ].join(" / ")}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Placement
                <select
                  aria-label="Placement"
                  value={mixed((e) => e.positionMode) || ""}
                  onChange={(e) =>
                    sendCommand({
                      type: "MODE",
                      ids: selection,
                      mode: e.target.value,
                      placements: placements(selection),
                    })
                  }
                >
                  <option value="" disabled>
                    Mixed
                  </option>
                  <option value="flow">Structured flow</option>
                  <option value="absolute">Free-form in parent</option>
                </select>
              </label>
              {nodes.every((e) => e.positionMode === "absolute") ? (
                <>
                  <div className="pb-field-grid">
                    {["x", "y", "width", "height"].map((key) => (
                      <CommitField
                        key={key}
                        label={`${key.toUpperCase()} (%)`}
                        type="number"
                        step="0.1"
                        min={key === "x" || key === "y" ? -1000 : 0.1}
                        max={1000}
                        value={mixed((e) => e.geometry[key])}
                        onCommit={(value) => geometry(key, value)}
                      />
                    ))}
                  </div>
                  <label className="pb-checkbox">
                    <input
                      type="checkbox"
                      checked={nodes.every((e) => e.geometry.aspectLocked)}
                      onChange={(e) =>
                        geometry("aspectLocked", e.target.checked)
                      }
                    />
                    Keep aspect ratio on resize
                  </label>
                </>
              ) : (
                <div className="pb-field-grid">
                  <CommitField
                    label="Width"
                    value={mixed((e) => e.styles.overrides.width || "auto")}
                    onCommit={(width) =>
                      patch({ styles: { overrides: { width } } }, "width")
                    }
                  />
                  <CommitField
                    label="Height"
                    value={mixed((e) => e.styles.overrides.height || "auto")}
                    onCommit={(height) =>
                      patch({ styles: { overrides: { height } } }, "height")
                    }
                  />
                </div>
              )}
              <CommitField
                label="Z-index"
                type="number"
                min={-10000}
                max={10000}
                value={mixed((e) => e.geometry.zIndex)}
                onCommit={(value) => geometry("zIndex", value)}
              />
              <p className="pb-muted">
                Z-index is local to its stacking context. Overflow may clip
                free-form content.
              </p>
              {nodes.every(isContainer) && (
                <>
                  <label>
                    Layout engine
                    <select
                      value={mixed((e) => e.layoutMode) || ""}
                      onChange={(e) => patch({ layoutMode: e.target.value })}
                    >
                      <option value="" disabled>
                        Mixed
                      </option>
                      <option value="flex">Flex</option>
                      <option value="grid">Grid</option>
                    </select>
                  </label>
                  {nodes.every((e) => e.layoutMode === "flex") ? (
                    <>
                      <label>
                        Direction
                        <select
                          value={mixed((e) => e.layout.direction) || ""}
                          onChange={(e) =>
                            patch({ layout: { direction: e.target.value } })
                          }
                        >
                          <option value="" disabled>
                            Mixed
                          </option>
                          <option value="column">Column</option>
                          <option value="row">Row</option>
                        </select>
                      </label>
                      <label className="pb-checkbox">
                        <input
                          type="checkbox"
                          checked={nodes.every((e) => e.layout.wrap)}
                          onChange={(e) =>
                            patch({ layout: { wrap: e.target.checked } })
                          }
                        />
                        Wrap children
                      </label>
                    </>
                  ) : (
                    <CommitField
                      label="Grid columns"
                      type="number"
                      min={1}
                      max={12}
                      value={mixed((e) => e.layout.columns)}
                      onCommit={(columns) => patch({ layout: { columns } })}
                    />
                  )}
                  <CommitField
                    label="Gap"
                    value={mixed((e) => e.styles.overrides.gap || "0")}
                    onCommit={(gap) =>
                      patch({ styles: { overrides: { gap } } }, "gap")
                    }
                  />
                  <label>
                    Align children
                    <select
                      value={mixed((e) => e.layout.align) || ""}
                      onChange={(e) =>
                        patch({ layout: { align: e.target.value } })
                      }
                    >
                      <option value="" disabled>
                        Mixed
                      </option>
                      {["stretch", "flex-start", "center", "flex-end"].map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Distribute children
                    <select
                      value={mixed((e) => e.layout.justify) || ""}
                      onChange={(e) =>
                        patch({ layout: { justify: e.target.value } })
                      }
                    >
                      <option value="" disabled>
                        Mixed
                      </option>
                      {[
                        "flex-start",
                        "center",
                        "flex-end",
                        "space-between",
                        "space-around",
                        "space-evenly",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  {["X", "Y"].map((axis) => (
                    <label key={axis}>
                      Overflow {axis}
                      <select
                        value={mixed((e) => e.layout[`overflow${axis}`]) || ""}
                        onChange={(e) =>
                          patch({
                            layout: { [`overflow${axis}`]: e.target.value },
                          })
                        }
                      >
                        <option value="" disabled>
                          Mixed
                        </option>
                        {["visible", "hidden", "auto"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </>
              )}
              <label className="pb-checkbox">
                <input
                  type="checkbox"
                  checked={nodes.every((e) => e.visibility.globalHidden)}
                  onChange={(e) =>
                    patch({ visibility: { globalHidden: e.target.checked } })
                  }
                />
                Hide from page
              </label>
            </fieldset>
          )}
          <div className="pb-inspector-actions">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => sendCommand({ type: "DUPLICATE", ids: selection })}
            >
              Duplicate selection
            </button>
            <button
              type="button"
              disabled={readOnly || transformLocked}
              className="pb-danger"
              onClick={() => requestDelete(selection)}
            >
              Delete selection
            </button>
            <button type="button" onClick={() => select([])}>
              Clear selection
            </button>
          </div>
        </>
      )}
    </>
  );
}
