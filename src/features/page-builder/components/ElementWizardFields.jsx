import { useState } from "react";
import ContentInspector from "./ContentInspector";
import { CommitField } from "./CommitField";
import { StyleFields } from "./DesignInspector";
import { ANIMATIONS, CATEGORIES, STATES, STYLE_GROUPS } from "../domain/styles";
import { LOCAL_STYLES } from "../domain/masters";
import { isContainer } from "../domain/catalog";
import { wizardPropKeys } from "../domain/elementWizard";

const label = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
export const Select = ({ title, value, values, change }) => (
  <label>
    {title}
    <select
      aria-label={title}
      value={value}
      onChange={(event) => change(event.target.value)}
    >
      {values.map((item) => (
        <option key={String(item)} value={item}>
          {item || "Native / inherit"}
        </option>
      ))}
    </select>
  </label>
);
export const Check = ({ title, value, change }) => (
  <label className="pb-checkbox">
    <input
      type="checkbox"
      checked={!!value}
      onChange={(event) => change(event.target.checked)}
    />
    {title}
  </label>
);
const ADVANCED_PROPS = {
  image: ["priority"],
  video: ["poster", "loop", "muted", "autoplay", "preload"],
  audio: ["loop", "muted", "autoplay", "preload"],
};
const appearanceEssentials = [
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "textAlign",
  "backgroundColor",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderRadius",
];

function Advanced({ title, changed, children }) {
  return (
    <details className="pb-wizard-advanced">
      <summary>
        {title}
        {changed ? " · draft changes" : ""}
      </summary>
      {children}
    </details>
  );
}

export default function ElementWizardFields({
  element: e,
  step,
  project,
  changes,
  update,
  placement,
  onTextHistory,
  onTextDone,
  disabled,
}) {
  const [interaction, setInteraction] = useState("");
  const patch = (value) => update(value);
  const props = (value) => patch({ props: value });
  const input = (title, key, extra = {}) => (
    <CommitField
      key={key}
      label={title}
      value={e.props[key]}
      onCommit={(value) => props({ [key]: value })}
      {...extra}
    />
  );
  const checkProp = (title, key) => (
    <Check
      key={key}
      title={title}
      value={e.props[key]}
      change={(value) => props({ [key]: value })}
    />
  );
  const style = (values, state = "") => {
    const normalized = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ]),
    );
    patch({
      styles: state
        ? { states: { [state]: normalized } }
        : { overrides: normalized },
    });
  };
  const styleControls = (fields, state = "") => (
    <StyleFields
      fields={fields}
      groups={CATEGORIES}
      expanded
      draft
      values={state ? e.styles.states[state] || {} : e.styles.overrides}
      change={(value) => style(value, state)}
      remove={(key) => style({ [key]: null }, state)}
    />
  );

  if (step === "content") {
    const advanced = ADVANCED_PROPS[e.type] || [];
    const essential = wizardPropKeys(e, step).filter(
      (key) => !advanced.includes(key),
    );
    return (
      <>
        {e.type === "heading" && (
          <Select
            title="Heading level"
            value={e.props.level}
            values={[1, 2, 3, 4, 5, 6]}
            change={(value) => props({ level: Number(value) })}
          />
        )}
        {["link", "button"].includes(e.type) && (
          <>
            {input("Link text", "text", { maxLength: 1000 })}
            {input("Link URL", "href")}
          </>
        )}
        {e.type === "image" && (
          <>
            {input("Image URL", "src")}
            {input("Image description", "alt")}
            <Check
              title="Decorative image"
              value={e.accessibility.decorative}
              change={(decorative) => patch({ accessibility: { decorative } })}
            />
          </>
        )}
        {e.type === "list" && (
          <Select
            title="List type"
            value={String(e.props.ordered)}
            values={["false", "true"]}
            change={(value) => props({ ordered: value === "true" })}
          />
        )}
        {!["image", "list"].includes(e.type) && (
          <ContentInspector
            element={e}
            patch={patch}
            wizard
            disabled={disabled}
            fieldKeys={essential}
            onTextHistory={onTextHistory}
            onTextDone={onTextDone}
          />
        )}
        {!!advanced.length && (
          <Advanced
            title="Advanced content"
            changed={advanced.some((key) =>
              Object.hasOwn(changes.props || {}, key),
            )}
          >
            {e.type === "image" ? (
              checkProp("Load image with high priority", "priority")
            ) : (
              <>
                {e.type === "video" && input("Poster URL", "poster")}
                {["loop", "muted"].map((key) => checkProp(label(key), key))}
                <Check
                  title="Autoplay (requires muted)"
                  value={e.props.autoplay}
                  change={(autoplay) =>
                    props({ autoplay, ...(autoplay ? { muted: true } : {}) })
                  }
                />
                <Select
                  title="Preload"
                  value={e.props.preload}
                  values={["none", "metadata", "auto"]}
                  change={(preload) => props({ preload })}
                />
              </>
            )}
          </Advanced>
        )}
      </>
    );
  }

  if (step === "layout") {
    const absolute = e.positionMode === "absolute";
    const essential = [
      ...(!absolute ? ["width", "height"] : []),
      ...(!e.instance
        ? ["margin", "padding", ...(isContainer(e) ? ["gap"] : [])]
        : []),
    ];
    const advanced = (e.instance ? LOCAL_STYLES : STYLE_GROUPS.Layout).filter(
      (key) => !essential.includes(key),
    );
    return (
      <>
        {absolute && (
          <div className="pb-field-grid">
            {["x", "y", "width", "height"].map((key) => (
              <CommitField
                key={key}
                label={`${label(key)} (%)`}
                type="number"
                step="0.1"
                value={e.geometry[key]}
                onCommit={(value) => patch({ geometry: { [key]: value } })}
              />
            ))}
          </div>
        )}
        {styleControls(essential)}
        {!e.instance && isContainer(e) && (
          <>
            <Select
              title="Layout engine"
              value={e.layoutMode}
              values={["flex", "grid"]}
              change={(layoutMode) => patch({ layoutMode })}
            />
            {e.layoutMode === "flex" ? (
              <>
                <Select
                  title="Direction"
                  value={e.layout.direction}
                  values={["row", "column"]}
                  change={(direction) => patch({ layout: { direction } })}
                />
                <Check
                  title="Wrap children"
                  value={e.layout.wrap}
                  change={(wrap) => patch({ layout: { wrap } })}
                />
              </>
            ) : (
              <CommitField
                label="Grid columns"
                type="number"
                min={1}
                max={12}
                value={e.layout.columns}
                onCommit={(columns) => patch({ layout: { columns } })}
              />
            )}
            <Select
              title="Align children"
              value={e.layout.align}
              values={["stretch", "flex-start", "center", "flex-end"]}
              change={(align) => patch({ layout: { align } })}
            />
          </>
        )}
        {e.type === "gallery" && !e.instance && (
          <>
            {input("Gallery columns", "columns", {
              type: "number",
              min: 1,
              max: 12,
            })}
            <Select
              title="Gallery aspect ratio"
              value={e.props.aspect}
              values={["1 / 1", "4 / 3", "3 / 2", "16 / 9"]}
              change={(aspect) => props({ aspect })}
            />
            <Select
              title="Gallery image fit"
              value={e.props.fit}
              values={["cover", "contain", "fill"]}
              change={(fit) => props({ fit })}
            />
          </>
        )}
        <Advanced
          title="Advanced layout"
          changed={
            Object.keys(changes.styles?.overrides || {}).some((key) =>
              advanced.includes(key),
            ) ||
            !!changes.geometry ||
            !!changes.positionMode ||
            !!changes.layout
          }
        >
          {styleControls(advanced)}
          <Select
            title="Placement"
            value={e.positionMode}
            values={["flow", "absolute", "sticky"]}
            change={(positionMode) =>
              patch({
                positionMode,
                ...(positionMode === "absolute" &&
                !e.geometry.hasPlacement &&
                placement
                  ? { geometry: placement }
                  : {}),
              })
            }
          />
          <CommitField
            label="Z-index"
            type="number"
            min={-10000}
            max={10000}
            value={e.geometry.zIndex}
            onCommit={(zIndex) => patch({ geometry: { zIndex } })}
          />
          <Check
            title="Lock aspect ratio"
            value={e.geometry.aspectLocked}
            change={(aspectLocked) => patch({ geometry: { aspectLocked } })}
          />
          {!e.instance && isContainer(e) && (
            <>
              <Select
                title="Distribute children"
                value={e.layout.justify}
                values={[
                  "flex-start",
                  "center",
                  "flex-end",
                  "space-between",
                  "space-around",
                  "space-evenly",
                ]}
                change={(justify) => patch({ layout: { justify } })}
              />
              {["overflowX", "overflowY"].map((key) => (
                <Select
                  key={key}
                  title={label(key)}
                  value={e.layout[key]}
                  values={["visible", "hidden", "auto"]}
                  change={(value) => patch({ layout: { [key]: value } })}
                />
              ))}
            </>
          )}
        </Advanced>
      </>
    );
  }

  if (step === "appearance") {
    const essential = [
      ...appearanceEssentials,
      ...(e.type === "image" ? ["objectFit", "objectPosition"] : []),
    ];
    const advanced = [
      ...STYLE_GROUPS.Typography,
      ...STYLE_GROUPS.Appearance,
      ...STYLE_GROUPS.Effects,
    ].filter((key) => !essential.includes(key));
    return (
      <>
        {styleControls(essential)}
        {e.type === "table" && checkProp("Striped table rows", "striped")}
        {e.type === "gallery" && (
          <Select
            title="Gallery hover effect"
            value={e.props.hover}
            values={["none", "zoom", "fade"]}
            change={(hover) => props({ hover })}
          />
        )}
        <Advanced
          title="Advanced appearance"
          changed={
            !!changes.effects ||
            !!changes.presetIds ||
            !!changes.presetVariants ||
            !!changes.styles?.states ||
            Object.keys(changes.styles?.overrides || {}).some((key) =>
              advanced.includes(key),
            )
          }
        >
          {styleControls(advanced)}
          <fieldset>
            <legend>Existing presets</legend>
            {CATEGORIES.map((category) => {
              const id = e.presetIds[category] || "",
                preset = project.presets[id];
              return (
                <div key={category}>
                  <label>
                    {category} preset
                    <select
                      aria-label={`${category} preset`}
                      value={id}
                      onChange={(event) =>
                        patch({
                          presetIds: { [category]: event.target.value || null },
                          presetVariants: { [category]: null },
                        })
                      }
                    >
                      <option value="">Inherit / none</option>
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
                    <Select
                      title={`${category} variant`}
                      value={e.presetVariants[category] || ""}
                      values={["", ...Object.keys(preset.variants)]}
                      change={(value) =>
                        patch({ presetVariants: { [category]: value || null } })
                      }
                    />
                  )}
                </div>
              );
            })}
          </fieldset>
          <fieldset>
            <legend>Interaction appearance</legend>
            <Select
              title="Style state"
              value={interaction}
              values={["", ...STATES]}
              change={setInteraction}
            />
            {interaction &&
              styleControls(Object.values(STYLE_GROUPS).flat(), interaction)}
          </fieldset>
          <fieldset>
            <legend>Element animation</legend>
            <Select
              title="Animation"
              value={e.effects.animation}
              values={ANIMATIONS}
              change={(animation) => patch({ effects: { animation } })}
            />
            <Select
              title="Animation trigger"
              value={e.effects.trigger}
              values={["load", "hover", "focus", "active"]}
              change={(trigger) => patch({ effects: { trigger } })}
            />
            {["duration", "delay"].map((key) => (
              <CommitField
                key={key}
                label={`Animation ${key} (seconds)`}
                value={e.effects[key]}
                type="number"
                min={key === "duration" ? 0.1 : 0}
                max={30}
                step="0.1"
                onCommit={(value) => patch({ effects: { [key]: value } })}
              />
            ))}
            <CommitField
              label="Animation repeats (number or infinite)"
              value={e.effects.iterations}
              onCommit={(value) =>
                patch({
                  effects: {
                    iterations: value === "infinite" ? value : Number(value),
                  },
                })
              }
            />
            <Select
              title="Animation direction"
              value={e.effects.direction}
              values={["normal", "reverse", "alternate", "alternate-reverse"]}
              change={(direction) => patch({ effects: { direction } })}
            />
            <p className="pb-muted">
              Reduced-motion preferences are respected in the preview and
              export.
            </p>
          </fieldset>
        </Advanced>
      </>
    );
  }

  if (step === "accessibility")
    return (
      <>
        {!e.instance && (
          <>
            {["image", "icon"].includes(e.type) && (
              <p className="pb-muted">
                Descriptions and decorative choices are configured in Content.
              </p>
            )}
            <CommitField
              label="Accessible label"
              value={e.accessibility.label}
              onCommit={(value) => patch({ accessibility: { label: value } })}
            />
            {!["image", "icon"].includes(e.type) && (
              <Check
                title="Decorative element"
                value={e.accessibility.decorative}
                change={(decorative) =>
                  patch({ accessibility: { decorative } })
                }
              />
            )}
          </>
        )}
        <Check
          title="Include element in page"
          value={!e.visibility.globalHidden}
          change={(included) =>
            patch({ visibility: { globalHidden: !included } })
          }
        />
        {["mobile", "tablet", "desktop"].map((key) => (
          <Check
            key={key}
            title={`Show on ${key}`}
            value={e.visibility[key]}
            change={(value) => patch({ visibility: { [key]: value } })}
          />
        ))}
        {!e.instance && (
          <Advanced
            title="Advanced accessibility and identity"
            changed={
              !!changes.name ||
              !!changes.htmlId ||
              !!changes.accessibility?.role
            }
          >
            <CommitField
              label="Element name"
              value={e.name}
              maxLength={100}
              onCommit={(name) => patch({ name })}
            />
            <CommitField
              label="HTML section ID"
              value={e.htmlId}
              maxLength={100}
              onCommit={(htmlId) => patch({ htmlId })}
            />
            <Select
              title="Landmark role"
              value={e.accessibility.role}
              values={[
                "",
                "region",
                "banner",
                "main",
                "complementary",
                "contentinfo",
              ]}
              change={(role) => patch({ accessibility: { role } })}
            />
          </Advanced>
        )}
      </>
    );
  return null;
}
