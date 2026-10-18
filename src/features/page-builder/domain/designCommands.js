import { ensure, identifier } from "./validation";
import { CATEGORIES, STATES, ownStyles } from "./styles";
import { detachStyleConflicts } from "./masters";

export function applyDesignCommand(p, c, locked) {
  const ids = c.ids || [];
  const es = p.page.elements;
  const editable = () => {
    ensure(ids.length, "Select an element.");
    ids.forEach((id) =>
      ensure(
        es[id] && !locked(p, id),
        "A locked element or descendant prevents this operation.",
      ),
    );
  };
  switch (c.type) {
    case "STYLE":
      editable();
      for (const id of ids) {
        const e = es[id];
        const s = c.state
          ? (e.styles.states[c.state] ??= {})
          : e.styles.overrides;
        ensure(
          !c.state || STATES.includes(c.state),
          "Invalid interaction state.",
        );
        for (const key of c.remove || []) delete s[key];
        Object.assign(s, structuredClone(c.styles || {}));
      }
      return ids;
    case "GLOBAL_STYLE":
      ensure(
        !Object.values(es).some((e) => locked(p, e.id)),
        "Unlock elements before changing global styles.",
      );
      Object.assign(p.globalStyles, structuredClone(c.styles));
      for (const key of c.remove || []) delete p.globalStyles[key];
      return ids;
    case "GLOBAL_EFFECTS":
      ensure(
        !Object.values(es).some((e) => locked(p, e.id)),
        "Unlock elements before changing global effects.",
      );
      Object.assign(p.globalEffects, structuredClone(c.effects));
      return ids;
    case "PRESET_SAVE":
      ensure(c.preset && identifier(c.preset.id), "Invalid preset.");
      ensure(
        !Object.values(es).some((e) => locked(p, e.id)),
        "Unlock elements before changing shared presets.",
      );
      p.presets[c.preset.id] = structuredClone(c.preset);
      return ids;
    case "PRESET_APPLY":
      editable();
      ensure(CATEGORIES.includes(c.category), "Invalid preset category.");
      ensure(
        !c.presetId || p.presets[c.presetId]?.category === c.category,
        "Preset category mismatch.",
      );
      for (const id of ids) {
        if (c.presetId) {
          es[id].presetIds[c.category] = c.presetId;
          if (c.variant) {
            ensure(
              p.presets[c.presetId].variants[c.variant],
              "Unknown preset variant.",
            );
            es[id].presetVariants[c.category] = c.variant;
          } else delete es[id].presetVariants[c.category];
        } else {
          delete es[id].presetIds[c.category];
          delete es[id].presetVariants[c.category];
        }
      }
      return ids;
    case "PRESET_REMOVE": {
      ensure(c.confirmed, "Confirm preset removal and bake appearance.");
      const preset = p.presets[c.presetId];
      ensure(preset, "Unknown preset.");
      const depends = (id) =>
        id === c.presetId ||
        !!(p.presets[id]?.parentId && depends(p.presets[id].parentId));
      function bake(project) {
        const affected = (id) => {
          const e = project.page.elements[id];
          return (
            Object.values(e.presetIds).some(depends) ||
            !!(e.parentId && affected(e.parentId))
          );
        };
        const changes = Object.values(project.page.elements)
          .filter((e) => affected(e.id))
          .map((e) => {
            ensure(
              !locked(project, e.id),
              "A locked element prevents preset removal.",
            );
            return [
              e.id,
              ownStyles(project, e.id),
              Object.fromEntries(
                STATES.map((state) => [
                  state,
                  Object.fromEntries(
                    Object.entries(ownStyles(project, e.id, state)).filter(
                      ([k, v]) => v !== ownStyles(project, e.id)[k],
                    ),
                  ),
                ]),
              ),
            ];
          });
        for (const [id, normal, states] of changes) {
          const e = project.page.elements[id];
          e.styles = { overrides: normal, states };
          for (const category of CATEGORIES)
            if (e.presetIds[category] === c.presetId) {
              delete e.presetIds[category];
              delete e.presetVariants[category];
            }
        }
      }
      bake(p);
      for (const master of Object.values(p.masters))
        bake({
          ...p,
          page: {
            ...p.page,
            elements: master.elements,
            rootElementIds: [master.rootId],
          },
        });
      for (const child of Object.values(p.presets).filter(
        (s) => s.parentId === c.presetId,
      )) {
        const chain = [];
        let at = preset;
        while (at) {
          chain.unshift(at);
          at = p.presets[at.parentId];
        }
        child.styles = Object.assign(
          {},
          ...chain.map((s) => s.styles),
          child.styles,
        );
        for (const state of STATES)
          child.states[state] = Object.assign(
            {},
            ...chain.map((s) => s.states[state]),
            child.states[state],
          );
        child.parentId = null;
      }
      delete p.presets[c.presetId];
      detachStyleConflicts(p);
      return ids;
    }
    default:
      return undefined;
  }
}
