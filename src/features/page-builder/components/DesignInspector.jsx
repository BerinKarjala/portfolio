import { useEffect, useState } from "react";
import { CommitField } from "./CommitField";
import { useBuilder } from "../state/BuilderProvider";
import {
  CATEGORIES,
  STATES,
  FONTS,
  STYLE_GROUPS,
  colorToHex,
  resolveStyles,
  inheritedStyles,
  ANIMATIONS,
} from "../domain/styles";
import { isLocked, protectedSubtree } from "../domain/structure";

const title = (key) =>
  key
    .replace(/([A-Z])/g, (c) => " " + c.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());
const ENUMS = {
  fontFamily: Object.keys(FONTS),
  fontWeight: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  fontStyle: ["normal", "italic"],
  textAlign: ["left", "center", "right", "justify"],
  textTransform: ["none", "uppercase", "lowercase", "capitalize"],
  textDecoration: ["none", "underline", "line-through", "overline"],
  whiteSpace: ["normal", "pre-wrap", "nowrap"],
  overflowWrap: ["normal", "break-word", "anywhere"],
  backgroundSize: ["auto", "cover", "contain"],
  backgroundRepeat: ["no-repeat", "repeat", "repeat-x", "repeat-y"],
  borderStyle: ["none", "solid", "dashed", "dotted", "double"],
  objectFit: ["cover", "contain", "fill", "none", "scale-down"],
  alignSelf: ["auto", "stretch", "flex-start", "center", "flex-end"],
  transitionProperty: [
    "all",
    "color",
    "background-color",
    "opacity",
    "transform",
    "box-shadow",
  ],
  transitionTimingFunction: [
    "ease",
    "linear",
    "ease-in",
    "ease-out",
    "ease-in-out",
  ],
  cursor: ["auto", "pointer", "default"],
};
const NUMBERS = [
  "lineHeight",
  "opacity",
  "flexGrow",
  "flexShrink",
  "transitionDuration",
];
function readColors() {
  try {
    const p = JSON.parse(localStorage.getItem("page-builder:colors") || "{}");
    return {
      saved: (p.saved || []).slice(0, 20).map(colorToHex),
      recent: (p.recent || []).slice(0, 8).map(colorToHex),
    };
  } catch {
    return { saved: [], recent: [] };
  }
}
export function ColorField({ label, value, onCommit }) {
  const { report } = useBuilder();
  const [colors, setColors] = useState(readColors);
  useEffect(() => {
    const sync = () => setColors(readColors());
    window.addEventListener("pb-colors", sync);
    return () => window.removeEventListener("pb-colors", sync);
  }, []);
  const hex = (() => {
    try {
      return colorToHex(value || "#000000");
    } catch {
      return "#000000";
    }
  })();
  function remember(color, save = false) {
    try {
      const next = readColors();
      next.recent = [color, ...next.recent.filter((c) => c !== color)].slice(
        0,
        8,
      );
      if (save) next.saved = [...new Set([...next.saved, color])].slice(-20);
      localStorage.setItem("page-builder:colors", JSON.stringify(next));
      window.dispatchEvent(new Event("pb-colors"));
    } catch (e) {
      report(e);
    }
  }
  function commit(color) {
    try {
      const next = colorToHex(color);
      onCommit(next);
      remember(next);
    } catch (e) {
      report(e);
    }
  }
  return (
    <div className="pb-color-control">
      <CommitField
        label={label}
        value={value}
        placeholder="HEX, RGB(A), HSL(A)"
        onCommit={commit}
      />
      <div className="pb-inline-actions">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={hex.slice(0, 7)}
          onChange={(event) =>
            commit(event.target.value + (hex.length === 9 ? hex.slice(7) : ""))
          }
        />
        <label>
          Alpha
          <input
            aria-label={`${label} alpha`}
            type="range"
            min={0}
            max={100}
            value={Math.round(
              (hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1) * 100,
            )}
            onChange={(event) =>
              commit(
                hex.slice(0, 7) +
                  Math.round(Number(event.target.value) * 2.55)
                    .toString(16)
                    .padStart(2, "0"),
              )
            }
          />
        </label>
        <button type="button" onClick={() => remember(hex, true)}>
          Save {label.toLowerCase()} swatch
        </button>
      </div>
      <div className="pb-swatches" aria-label={`${label} swatches`}>
        {[...new Set([...colors.saved, ...colors.recent])].map((color) => (
          <button
            type="button"
            key={color}
            style={{ backgroundColor: color }}
            aria-label={`Use ${color} for ${label.toLowerCase()}`}
            title={color}
            onClick={() => commit(color)}
          />
        ))}
        {colors.saved.length > 0 && (
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(
                  "page-builder:colors",
                  JSON.stringify({ ...colors, saved: [] }),
                );
                window.dispatchEvent(new Event("pb-colors"));
              } catch (e) {
                report(e);
              }
            }}
          >
            Clear saved swatches
          </button>
        )}
      </div>
    </div>
  );
}
function ShadowField({ label, value, onCommit }) {
  const values = (
    value && value !== "none" ? value : "0px 4px 12px #00000022"
  ).split(" ");
  const [x, setX] = useState(parseFloat(values[0]) || 0),
    [y, setY] = useState(parseFloat(values[1]) || 0),
    [blur, setBlur] = useState(parseFloat(values[2]) || 0),
    [color, setColor] = useState(values.at(-1));
  return (
    <details>
      <summary>{label}</summary>
      {[
        ["Horizontal", x, setX],
        ["Vertical", y, setY],
        ["Blur", blur, setBlur],
      ].map(([name, v, set]) => (
        <label key={name}>
          {label} {name.toLowerCase()}
          <input
            type="number"
            min={name === "Blur" ? 0 : -999}
            max={999}
            value={v}
            onChange={(e) => set(Number(e.target.value))}
          />
        </label>
      ))}
      <ColorField label={`${label} color`} value={color} onCommit={setColor} />
      <button
        type="button"
        onClick={() => onCommit(`${x}px ${y}px ${blur}px ${color}`)}
      >
        Apply {label.toLowerCase()}
      </button>
      <button type="button" onClick={() => onCommit("none")}>
        Remove {label.toLowerCase()}
      </button>
    </details>
  );
}
function FocalField({ label, value, onCommit }) {
  const [x, y] = (value || "50% 50%").split(" ").map(parseFloat);
  return (
    <div className="pb-focal-control">
      <span>{label}</span>
      {[
        ["horizontal", x],
        ["vertical", y],
      ].map(([axis, v], i) => (
        <label key={axis}>
          {axis}
          <input
            aria-label={`${label} ${axis}`}
            type="range"
            min={0}
            max={100}
            value={v}
            onChange={(e) =>
              onCommit(
                `${i === 0 ? e.target.value : x}% ${i === 1 ? e.target.value : y}%`,
              )
            }
          />
        </label>
      ))}
      <div className="pb-focal-preview">
        <i style={{ left: `${x}%`, top: `${y}%` }} />
      </div>
    </div>
  );
}
export function StyleFields({ values, change, remove, groups = CATEGORIES }) {
  const [linked, setLinked] = useState({ padding: false, margin: false });
  return groups.map((category) => (
    <details
      className="pb-style-group"
      key={category}
      open={groups.length === 1}
    >
      <summary>{category}</summary>
      {category === "Layout" &&
        ["padding", "margin"].map((kind) => (
          <label key={kind} className="pb-checkbox">
            <input
              type="checkbox"
              checked={linked[kind]}
              onChange={(event) =>
                setLinked({ ...linked, [kind]: event.target.checked })
              }
            />
            Link {kind} sides
          </label>
        ))}
      {STYLE_GROUPS[category].map((key) => {
        const value = values[key];
        const label = title(key);
        const commit = (v) => {
          if (
            (key.startsWith("margin") || key.startsWith("padding")) &&
            linked[key.startsWith("margin") ? "margin" : "padding"]
          ) {
            const kind = key.startsWith("margin") ? "margin" : "padding";
            change(
              Object.fromEntries(
                ["Top", "Right", "Bottom", "Left"].map((side) => [
                  kind + side,
                  v,
                ]),
              ),
            );
          } else change({ [key]: v });
        };
        let control;
        if (["color", "backgroundColor", "borderColor"].includes(key))
          control = (
            <ColorField label={label} value={value} onCommit={commit} />
          );
        else if (ENUMS[key])
          control = (
            <label>
              {label}
              <select
                aria-label={label}
                value={value ?? ""}
                onChange={(event) =>
                  commit(
                    key === "fontWeight"
                      ? Number(event.target.value)
                      : event.target.value,
                  )
                }
              >
                <option value="" disabled>
                  Inherit / Mixed
                </option>
                {ENUMS[key].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          );
        else if (["boxShadow", "textShadow"].includes(key))
          control = (
            <ShadowField label={label} value={value} onCommit={commit} />
          );
        else if (["objectPosition", "backgroundPosition"].includes(key))
          control = (
            <FocalField label={label} value={value} onCommit={commit} />
          );
        else
          control = (
            <CommitField
              label={label}
              value={value}
              type={NUMBERS.includes(key) ? "number" : "text"}
              step="0.1"
              placeholder={
                key === "backgroundImage" ? "https://…" : "Inherit / Mixed"
              }
              onCommit={commit}
            />
          );
        return (
          <div key={key} className="pb-style-control">
            {control}
            {remove && Object.hasOwn(values, key) && (
              <button
                type="button"
                aria-label={`Reset ${label.toLowerCase()} override`}
                onClick={() => remove(key)}
              >
                ↺
              </button>
            )}
            {key.startsWith("margin") && String(value).startsWith("-") && (
              <small className="pb-warning">
                Negative margins can overlap nearby content.
              </small>
            )}
          </div>
        );
      })}
    </details>
  ));
}
function Presets({ nodes }) {
  const { state, sendCommand } = useBuilder();
  const { project, selection, readOnly } = state.editor;
  const [category, setCategory] = useState("Typography"),
    [name, setName] = useState("My style"),
    [editId, setEditId] = useState(""),
    [variant, setVariant] = useState(""),
    [editState, setEditState] = useState("");
  const preset = project.presets[editId];
  const disabled =
    readOnly || nodes.some((e) => protectedSubtree(project, e.id));
  const save = (patch) =>
    sendCommand({ type: "PRESET_SAVE", preset: { ...preset, ...patch } });
  return (
    <details className="pb-preset-manager">
      <summary>Style presets</summary>
      <fieldset disabled={disabled}>
        <label>
          Preset category
          <select
            aria-label="Preset category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setEditId("");
            }}
          >
            {CATEGORIES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Apply preset
          <select
            aria-label="Apply preset"
            value={
              nodes.length &&
              nodes.every(
                (e) => e.presetIds[category] === nodes[0].presetIds[category],
              )
                ? nodes[0].presetIds[category] || ""
                : ""
            }
            onChange={(event) =>
              sendCommand({
                type: "PRESET_APPLY",
                ids: selection,
                category,
                presetId: event.target.value,
                variant: "",
              })
            }
          >
            <option value="">No preset / Mixed</option>
            {Object.values(project.presets)
              .filter((p) => p.category === category)
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        {nodes[0]?.presetIds[category] && (
          <label>
            Applied variant
            <select
              aria-label="Applied variant"
              value={nodes[0].presetVariants[category] || ""}
              onChange={(event) =>
                sendCommand({
                  type: "PRESET_APPLY",
                  ids: selection,
                  category,
                  presetId: nodes[0].presetIds[category],
                  variant: event.target.value,
                })
              }
            >
              <option value="">Base</option>
              {Object.keys(
                project.presets[nodes[0].presetIds[category]].variants,
              ).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          New preset name
          <input
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!nodes.length || !name.trim()}
          onClick={() => {
            const id = crypto.randomUUID(),
              effective = resolveStyles(project, nodes[0].id);
            sendCommand({
              type: "PRESET_SAVE",
              preset: {
                id,
                name: name.trim(),
                category,
                parentId: null,
                styles: Object.fromEntries(
                  Object.entries(effective).filter(([key]) =>
                    STYLE_GROUPS[category].includes(key),
                  ),
                ),
                states: {},
                variants: {},
              },
            });
            setEditId(id);
          }}
        >
          Create preset from selection
        </button>
        <label>
          Edit shared preset
          <select
            aria-label="Edit shared preset"
            value={editId}
            onChange={(event) => {
              setEditId(event.target.value);
              setVariant("");
              setEditState("");
            }}
          >
            <option value="">Choose a preset</option>
            {Object.values(project.presets)
              .filter((p) => p.category === category)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        {preset && (
          <>
            <CommitField
              label="Preset name"
              value={preset.name}
              onCommit={(name) => save({ name })}
            />
            <label>
              Parent preset
              <select
                aria-label="Parent preset"
                value={preset.parentId || ""}
                onChange={(event) =>
                  save({ parentId: event.target.value || null })
                }
              >
                <option value="">None</option>
                {Object.values(project.presets)
                  .filter(
                    (p) => p.id !== preset.id && p.category === preset.category,
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Preset state
              <select
                aria-label="Preset state"
                value={editState}
                onChange={(event) => {
                  setEditState(event.target.value);
                  setVariant("");
                }}
              >
                <option value="">Normal</option>
                {STATES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Preset variant
              <select
                aria-label="Preset variant"
                value={variant}
                onChange={(event) => {
                  setVariant(event.target.value);
                  setEditState("");
                }}
              >
                <option value="">Base</option>
                {Object.keys(preset.variants).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <CommitField
              label="Add variant name"
              value=""
              placeholder="large, muted…"
              onCommit={(key) => {
                if (key)
                  save({
                    variants: {
                      ...preset.variants,
                      [key]: { ...preset.styles },
                    },
                  });
              }}
            />
            <StyleFields
              groups={[category]}
              values={
                variant
                  ? preset.variants[variant]
                  : editState
                    ? preset.states[editState] || {}
                    : preset.styles
              }
              change={(styles) => {
                if (variant)
                  save({
                    variants: {
                      ...preset.variants,
                      [variant]: { ...preset.variants[variant], ...styles },
                    },
                  });
                else if (editState)
                  save({
                    states: {
                      ...preset.states,
                      [editState]: { ...preset.states[editState], ...styles },
                    },
                  });
                else save({ styles: { ...preset.styles, ...styles } });
              }}
            />
            <button
              type="button"
              className="pb-danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Remove this preset? Its appearance will be baked into affected elements and dependent presets. A linked component will be detached if that is needed to preserve its appearance in a different parent context.",
                  )
                ) {
                  sendCommand({
                    type: "PRESET_REMOVE",
                    presetId: preset.id,
                    confirmed: true,
                  });
                  setEditId("");
                }
              }}
            >
              Remove preset and preserve appearance
            </button>
          </>
        )}
      </fieldset>
    </details>
  );
}
export default function DesignInspector({ nodes }) {
  const { state, sendCommand } = useBuilder();
  const { project, selection, readOnly, masterEdit } = state.editor;
  const [interaction, setInteraction] = useState("");
  const values = Object.fromEntries(
    Object.entries(
      interaction
        ? nodes[0]?.styles.states[interaction] || {}
        : nodes[0]?.styles.overrides || {},
    ).filter(([k, v]) =>
      nodes.every(
        (e) =>
          (interaction ? e.styles.states[interaction] : e.styles.overrides)?.[
            k
          ] === v,
      ),
    ),
  );
  const disabled =
    readOnly ||
    nodes.some((e) => protectedSubtree(project, e.id)) ||
    nodes.some((e) => e.instance && !masterEdit);
  return (
    <>
      <label>
        Style state
        <select
          aria-label="Style state"
          value={interaction}
          onChange={(event) => setInteraction(event.target.value)}
        >
          <option value="">Normal</option>
          {STATES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <p className="pb-muted">
        Styles are shared across viewport widths. State rules apply on hover,
        focus, active and disabled content.
      </p>
      <fieldset disabled={disabled}>
        <StyleFields
          values={values}
          change={(styles) =>
            sendCommand(
              { type: "STYLE", ids: selection, styles, state: interaction },
              `style:${selection.join(",")}:${interaction}:${Object.keys(styles).join(",")}`,
            )
          }
          remove={(key) =>
            sendCommand({
              type: "STYLE",
              ids: selection,
              remove: [key],
              state: interaction,
            })
          }
        />
      </fieldset>
      <Presets nodes={nodes} />
      {nodes.length === 1 && (
        <details>
          <summary>Inherited, effective and overridden values</summary>
          <table className="pb-computed-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Inherited</th>
                <th>Effective</th>
                <th>Override</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                resolveStyles(project, nodes[0].id, interaction),
              ).map(([key, value]) => (
                <tr key={key}>
                  <th>{title(key)}</th>
                  <td>
                    {String(
                      inheritedStyles(project, nodes[0].id, interaction)[key] ??
                        "—",
                    )}
                  </td>
                  <td>{String(value)}</td>
                  <td>{String(values[key] ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}
export function GlobalStylesInspector() {
  const { state, sendCommand } = useBuilder();
  return (
    <details>
      <summary>Global page styles</summary>
      <fieldset disabled={state.editor.readOnly}>
        <StyleFields
          values={state.editor.project.globalStyles}
          change={(styles) =>
            sendCommand(
              { type: "GLOBAL_STYLE", styles },
              `global:${Object.keys(styles).join(",")}`,
            )
          }
          remove={(key) => sendCommand({ type: "GLOBAL_STYLE", remove: [key] })}
        />
      </fieldset>
      <p className="pb-muted">
        System fonts work offline. Curated Google Fonts load externally with
        fallback fonts.
      </p>
    </details>
  );
}
export function EffectsInspector({ nodes = [], global = false }) {
  const { state, sendCommand, dispatch } = useBuilder();
  const { selection, project, readOnly, masterEdit } = state.editor;
  const effects = global
    ? project.globalEffects
    : Object.fromEntries(
        Object.keys(nodes[0].effects).map((key) => [
          key,
          nodes.every((e) => e.effects[key] === nodes[0].effects[key])
            ? nodes[0].effects[key]
            : undefined,
        ]),
      );
  const change = (patch) =>
    sendCommand(
      global
        ? { type: "GLOBAL_EFFECTS", effects: patch }
        : { type: "PATCH", ids: selection, patch: { effects: patch } },
      `effect:${selection.join(",")}:${Object.keys(patch).join(",")}`,
    );
  return (
    <>
      <fieldset
        disabled={
          readOnly ||
          nodes.some(
            (e) =>
              protectedSubtree(project, e.id) || (e.instance && !masterEdit),
          )
        }
      >
        <label>
          Animation
          <select
            aria-label="Animation"
            value={effects.animation ?? ""}
            onChange={(e) => change({ animation: e.target.value })}
          >
            <option value="" disabled>
              Mixed
            </option>
            {ANIMATIONS.filter((v) => !global || v !== "inherit").map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Animation trigger
          <select
            aria-label="Animation trigger"
            value={effects.trigger ?? ""}
            onChange={(e) => change({ trigger: e.target.value })}
          >
            <option value="" disabled>
              Mixed
            </option>
            {["load", "hover", "focus", "active"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {["duration", "delay"].map((key) => (
          <CommitField
            key={key}
            label={`Animation ${key} (seconds)`}
            type="number"
            min={key === "duration" ? 0.1 : 0}
            max={30}
            step="0.1"
            value={effects[key]}
            onCommit={(v) => change({ [key]: v })}
          />
        ))}
        <CommitField
          label="Animation repeats (number or infinite)"
          value={effects.iterations}
          onCommit={(v) =>
            change({ iterations: v === "infinite" ? v : Number(v) })
          }
        />
        <label>
          Animation direction
          <select
            aria-label="Animation direction"
            value={effects.direction ?? ""}
            onChange={(e) => change({ direction: e.target.value })}
          >
            <option value="" disabled>
              Mixed
            </option>
            {["normal", "reverse", "alternate", "alternate-reverse"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
      </fieldset>
      <div className="pb-inline-actions">
        <button
          type="button"
          aria-pressed={state.editor.effectsPaused}
          onClick={() => dispatch({ type: "EFFECTS_PAUSE" })}
        >
          {state.editor.effectsPaused ? "Resume effects" : "Pause effects"}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "EFFECTS_REPLAY" })}
        >
          Replay effects
        </button>
      </div>
      <p className="pb-muted">
        Elements set to inherit use the global animation. None disables
        animation. Pause and replay affect this editor session. Reduced-motion
        preferences disable animations and transitions.
      </p>
    </>
  );
}
export function AccessibilityInspector({ nodes, patch }) {
  const { state } = useBuilder();
  return (
    <fieldset
      disabled={
        state.editor.readOnly ||
        nodes.some(
          (e) =>
            isLocked(state.editor.project, e.id) ||
            (e.instance && !state.editor.masterEdit),
        )
      }
    >
      <CommitField
        label="Accessible label"
        value={
          nodes.every(
            (e) => e.accessibility.label === nodes[0].accessibility.label,
          )
            ? nodes[0].accessibility.label
            : undefined
        }
        onCommit={(label) => patch({ accessibility: { label } })}
      />
      <label>
        Landmark role
        <select
          aria-label="Landmark role"
          value={nodes[0].accessibility.role}
          onChange={(event) =>
            patch({ accessibility: { role: event.target.value } })
          }
        >
          {["", "region", "banner", "main", "complementary", "contentinfo"].map(
            (v) => (
              <option key={v} value={v}>
                {v || "Native semantics"}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="pb-checkbox">
        <input
          type="checkbox"
          checked={nodes.every((e) => e.accessibility.decorative)}
          onChange={(event) =>
            patch({ accessibility: { decorative: event.target.checked } })
          }
        />
        Decorative element
      </label>
      {["mobile", "tablet", "desktop"].map((key) => (
        <label key={key} className="pb-checkbox">
          <input
            type="checkbox"
            checked={nodes.every((e) => e.visibility[key])}
            onChange={(event) =>
              patch({ visibility: { [key]: event.target.checked } })
            }
          />
          Show on {key}
        </label>
      ))}
      <p className="pb-muted">
        Breakpoint hiding keeps an element in the page. Global hiding omits it.
        Alt text, form labels, captions and table headers are edited in Content.
      </p>
    </fieldset>
  );
}
