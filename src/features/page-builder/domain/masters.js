import { ensure, object, identifier, text } from "./validation";
import { CATEGORIES, resolveStyles, STATES } from "./styles";
import { remapRichLinks } from "./richText";
import { canContain } from "./catalog";

const same = (a, b) =>
  a === b ||
  (!!a &&
    !!b &&
    typeof a === "object" &&
    typeof b === "object" &&
    Array.isArray(a) === Array.isArray(b) &&
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((k) => Object.hasOwn(b, k) && same(a[k], b[k])));
export const LOCAL_STYLES = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "aspectRatio",
];
export function localInstanceCommand(p, c) {
  if (!c.ids?.length || !c.ids.every((id) => p.page.elements[id]?.instance))
    return false;
  if (["MODE", "GEOMETRY", "ARRANGE"].includes(c.type)) return true;
  if (c.type === "STYLE")
    return (
      !c.state &&
      Object.keys(c.styles || {})
        .concat(c.remove || [])
        .every((k) => LOCAL_STYLES.includes(k))
    );
  return (
    c.type === "PATCH" &&
    Object.entries(c.patch || {}).every(
      ([key, value]) =>
        ["geometry", "visibility", "locked"].includes(key) ||
        (key === "styles" &&
          Object.keys(value).every((k) => k === "overrides") &&
          Object.keys(value.overrides || {}).every((k) =>
            LOCAL_STYLES.includes(k),
          )),
    )
  );
}
// Baking an inherited preset can expose different parent contexts. A confirmed
// removal keeps those appearances independent when one shared master cannot.
export function detachStyleConflicts(p) {
  const roots = new Set();
  const shared = (s) =>
    Object.fromEntries(
      Object.entries(s).filter(([k]) => !LOCAL_STYLES.includes(k)),
    );
  for (const e of Object.values(p.page.elements)) {
    if (!e.instance) continue;
    const source = p.masters[e.instance.masterId].elements[e.instance.sourceId];
    if (
      !same(shared(e.styles.overrides), shared(source.styles.overrides)) ||
      !same(e.styles.states, source.styles.states) ||
      !same(e.presetIds, source.presetIds) ||
      !same(e.presetVariants, source.presetVariants)
    )
      roots.add(e.instance.rootId);
  }
  for (const e of Object.values(p.page.elements))
    if (roots.has(e.instance?.rootId)) e.instance = null;
}
const uid = () => crypto.randomUUID();
const subtree = (elements, id) => [
  id,
  ...elements[id].children.flatMap((key) => subtree(elements, key)),
];
const siblings = (p, id) =>
  id ? p.page.elements[id].children : p.page.rootElementIds;
const remapProps = (props, anchors) => ({
  ...structuredClone(props),
  ...(props.href?.startsWith("#") && anchors[props.href.slice(1)]
    ? { href: "#" + anchors[props.href.slice(1)] }
    : {}),
  ...(props.document
    ? { document: remapRichLinks(props.document, anchors) }
    : {}),
});
export function validateMasterLinks(p) {
  object(p.masters, Object.keys(p.masters || {}), "Masters");
  for (const [id, m] of Object.entries(p.masters)) {
    object(m, ["id", "name", "rootId", "elements"], "Master");
    ensure(
      identifier(id) &&
        m.id === id &&
        identifier(m.rootId) &&
        m.elements[m.rootId],
      "Invalid master.",
    );
    text(m.name, 100, "master name", false);
    ensure(
      Object.values(m.elements).every((e) => e.instance === null),
      "Nested linked masters are not allowed.",
    );
  }
  const groups = new Map();
  for (const e of Object.values(p.page.elements)) {
    if (!e.instance) continue;
    const ref = e.instance;
    object(ref, ["masterId", "sourceId", "rootId"], "Instance reference");
    ensure(
      p.masters[ref.masterId]?.elements[ref.sourceId] &&
        p.page.elements[ref.rootId]?.instance?.masterId === ref.masterId,
      "Missing master/instance reference.",
    );
    if (!groups.has(ref.rootId)) groups.set(ref.rootId, []);
    groups.get(ref.rootId).push(e);
  }
  for (const [rootId, nodes] of groups) {
    const m = p.masters[nodes[0].instance.masterId];
    ensure(
      p.page.elements[rootId].instance.sourceId === m.rootId,
      "Invalid instance root.",
    );
    const map = Object.fromEntries(
      nodes.map((e) => [e.instance.sourceId, e.id]),
    );
    ensure(
      nodes.length === Object.keys(m.elements).length &&
        Object.keys(map).length === nodes.length,
      "Incomplete linked instance.",
    );
    const anchors = Object.fromEntries(
      nodes
        .filter((e) => m.elements[e.instance.sourceId].htmlId)
        .map((e) => [m.elements[e.instance.sourceId].htmlId, e.htmlId]),
    );
    for (const e of nodes) {
      const source = m.elements[e.instance.sourceId];
      ensure(
        e.type === source.type &&
          e.name === source.name &&
          e.layoutMode === source.layoutMode &&
          same(e.layout, source.layout) &&
          same(e.props, remapProps(source.props, anchors)) &&
          same(
            e.children,
            source.children.map((id) => map[id]),
          ),
        "Linked content must be changed through Edit master.",
      );
      for (const key of [
        "presetIds",
        "presetVariants",
        "effects",
        "accessibility",
      ])
        ensure(
          same(e[key], source[key]),
          "Linked styles must be changed through Edit master.",
        );
      ensure(
        same(e.styles.states, source.styles.states),
        "Linked states must be changed through Edit master.",
      );
      const shared = (s) =>
        Object.fromEntries(
          Object.entries(s).filter(([k]) => !LOCAL_STYLES.includes(k)),
        );
      ensure(
        same(shared(e.styles.overrides), shared(source.styles.overrides)),
        "Linked styles must be changed through Edit master.",
      );
      ensure(
        e.id === rootId || e.parentId === map[source.parentId],
        "Linked structure must be changed through Edit master.",
      );
    }
  }
}
function materialize(p, m, parentId, oldRoot = null) {
  const es = p.page.elements;
  const old = oldRoot ? subtree(es, oldRoot).map((id) => es[id]) : [];
  const oldBySource = Object.fromEntries(
    old.map((e) => [e.instance.sourceId, e]),
  );
  const map = Object.fromEntries(
    Object.keys(m.elements).map((id) => [id, oldBySource[id]?.id || uid()]),
  );
  const rootId = map[m.rootId];
  const used = new Set(
    Object.values(es)
      .filter((e) => !old.includes(e))
      .map((e) => e.htmlId),
  );
  const anchors = {};
  for (const source of Object.values(m.elements)) {
    if (!source.htmlId) continue;
    let name = oldBySource[source.id]?.htmlId || source.htmlId;
    let i = 1;
    while (used.has(name)) {
      const tail = "-" + i++;
      name = source.htmlId.slice(0, 100 - tail.length) + tail;
    }
    anchors[source.htmlId] = name;
    used.add(name);
  }
  const nodes = {};
  for (const source of Object.values(m.elements)) {
    const local = oldBySource[source.id];
    const e = structuredClone(source);
    e.id = map[source.id];
    e.parentId = source.id === m.rootId ? parentId : map[source.parentId];
    e.children = source.children.map((id) => map[id]);
    e.htmlId = anchors[source.htmlId] || "";
    e.props = remapProps(source.props, anchors);
    e.geometry.flowParentId = map[source.geometry.flowParentId] || e.parentId;
    if (local) {
      e.positionMode = local.positionMode;
      e.geometry = structuredClone(local.geometry);
      e.visibility = structuredClone(local.visibility);
      e.locked = local.locked;
      for (const key of LOCAL_STYLES) {
        delete e.styles.overrides[key];
        if (Object.hasOwn(local.styles.overrides, key))
          e.styles.overrides[key] = local.styles.overrides[key];
      }
    }
    e.instance = { masterId: m.id, sourceId: source.id, rootId };
    nodes[e.id] = e;
  }
  for (const e of old) delete es[e.id];
  Object.assign(es, nodes);
  return rootId;
}
export function applyMasterCommand(p, c, run, locked) {
  const es = p.page.elements;
  function check(id) {
    ensure(
      es[id] && !locked(p, id),
      "A locked element or descendant prevents master changes.",
    );
  }
  const rootOf = (id) => es[id]?.instance?.rootId;
  switch (c.type) {
    case "MASTER_CREATE": {
      ensure(c.ids?.length === 1, "Select one root to make reusable.");
      const root = c.ids[0];
      check(root);
      const keys = subtree(es, root);
      ensure(
        keys.every((id) => !es[id].instance),
        "Detach linked components before making a master.",
      );
      const id = uid();
      const elements = Object.fromEntries(
        keys.map((key) => [key, structuredClone(es[key])]),
      );
      elements[root].parentId = null;
      elements[root].geometry.flowParentId = null;
      // Capture inherited category refs, then bake only the residual appearance
      // that would be lost when the master is used outside its original parent.
      const before = Object.fromEntries(
        ["", ...STATES].map((state) => [state, resolveStyles(p, root, state)]),
      );
      let parent = es[root].parentId;
      while (parent) {
        for (const category of CATEGORIES)
          if (
            !elements[root].presetIds[category] &&
            es[parent].presetIds[category]
          ) {
            elements[root].presetIds[category] = es[parent].presetIds[category];
            if (es[parent].presetVariants[category])
              elements[root].presetVariants[category] =
                es[parent].presetVariants[category];
          }
        parent = es[parent].parentId;
      }
      const temp = {
        ...p,
        page: { ...p.page, elements, rootElementIds: [root] },
      };
      const normal = resolveStyles(temp, root);
      for (const [key, value] of Object.entries(before[""]))
        if (normal[key] !== value) elements[root].styles.overrides[key] = value;
      for (const state of STATES) {
        const effective = resolveStyles(temp, root, state);
        for (const [key, value] of Object.entries(before[state]))
          if (effective[key] !== value)
            (elements[root].styles.states[state] ??= {})[key] = value;
      }
      es[root].presetIds = structuredClone(elements[root].presetIds);
      es[root].presetVariants = structuredClone(elements[root].presetVariants);
      es[root].styles = structuredClone(elements[root].styles);
      p.masters[id] = { id, name: c.name, rootId: root, elements };
      for (const key of keys)
        es[key].instance = { masterId: id, sourceId: key, rootId: root };
      return [root];
    }
    case "MASTER_INSERT": {
      const m = p.masters[c.masterId];
      ensure(m, "Unknown master.");
      const parentId = c.parentId ?? null;
      if (parentId) {
        check(parentId);
        ensure(!es[parentId].instance, "Cannot nest linked masters.");
      }
      ensure(
        canContain(es[parentId], m.elements[m.rootId].type),
        "Illegal master destination.",
      );
      const root = materialize(p, m, parentId);
      siblings(p, parentId).splice(
        c.index ?? siblings(p, parentId).length,
        0,
        root,
      );
      return [root];
    }
    case "MASTER_DETACH": {
      const roots = [...new Set((c.ids || []).map(rootOf).filter(Boolean))];
      ensure(roots.length, "Select a linked component.");
      for (const root of roots) {
        check(root);
        for (const id of subtree(es, root)) es[id].instance = null;
      }
      return roots;
    }
    case "MASTER_REMOVE": {
      ensure(c.confirmed, "Confirm master removal and detach instances.");
      ensure(p.masters[c.masterId], "Unknown master.");
      const roots = Object.values(es)
        .filter(
          (e) =>
            e.instance?.masterId === c.masterId && e.instance.rootId === e.id,
        )
        .map((e) => e.id);
      for (const root of roots) {
        check(root);
        for (const id of subtree(es, root)) es[id].instance = null;
      }
      delete p.masters[c.masterId];
      return roots;
    }
    case "MASTER_EDIT": {
      const m = p.masters[c.masterId],
        root = c.instanceRoot;
      ensure(
        m && es[root]?.instance?.masterId === m.id && rootOf(root) === root,
        "Select an instance to edit its master.",
      );
      const roots = Object.values(es)
        .filter(
          (e) => e.instance?.masterId === m.id && e.instance.rootId === e.id,
        )
        .map((e) => e.id);
      roots.forEach(check);
      const command = structuredClone(c.command);
      ensure(
        command.type !== "CONFIGURE_ELEMENT" &&
          !command.type.startsWith("MASTER") &&
          !["PRESET_SAVE", "PRESET_REMOVE"].includes(command.type) &&
          !["GLOBAL_STYLE", "RESET_TEMPLATE"].includes(command.type),
        "Exit master editing before this action.",
      );
      const map = Object.fromEntries(
        subtree(es, root).map((id) => [id, es[id].instance.sourceId]),
      );
      if (command.ids)
        command.ids = command.ids.map((id) => {
          ensure(map[id], "Edit only the current master.");
          return map[id];
        });
      for (const key of ["parentId", "beforeId"])
        if (command[key]) {
          ensure(map[command[key]], "Keep master content inside its root.");
          command[key] = map[command[key]];
        }
      if (["ADD", "MOVE", "PASTE"].includes(command.type))
        ensure(command.parentId, "Keep master content inside its root.");
      if (["DELETE", "UNGROUP", "MOVE", "GROUP", "MODE"].includes(command.type))
        ensure(
          !command.ids?.includes(m.rootId),
          "Exit master editing to change the instance root placement.",
        );
      const reverseAnchors = Object.fromEntries(
        subtree(es, root)
          .filter(
            (id) =>
              es[id].htmlId && m.elements[es[id].instance.sourceId].htmlId,
          )
          .map((id) => [
            es[id].htmlId,
            m.elements[es[id].instance.sourceId].htmlId,
          ]),
      );
      if (command.patch?.props)
        command.patch.props = remapProps(command.patch.props, reverseAnchors);
      if (command.initialProps)
        command.initialProps = remapProps(command.initialProps, reverseAnchors);
      if (command.placements)
        command.placements = Object.fromEntries(
          Object.entries(command.placements).map(([id, v]) => [map[id], v]),
        );
      const temporary = {
        ...structuredClone(p),
        masters: {},
        page: {
          ...structuredClone(p.page),
          elements: structuredClone(m.elements),
          rootElementIds: [m.rootId],
        },
      };
      const result = run(temporary, command);
      m.elements = result.project.page.elements;
      roots.forEach((id) => materialize(p, m, es[id].parentId, id));
      const reverse = Object.fromEntries(
        Object.values(es)
          .filter((e) => e.instance?.rootId === root)
          .map((e) => [e.instance.sourceId, e.id]),
      );
      return result.selection.map((id) => reverse[id]).filter(Boolean);
    }
    case "MASTER_COPY": {
      const source = c.source,
        master = source?.masters[c.masterId];
      ensure(master, "Unknown source master.");
      const needed = new Set();
      function visit(id) {
        if (!id || needed.has(id)) return;
        needed.add(id);
        visit(source.presets[id].parentId);
      }
      Object.values(master.elements).forEach((e) =>
        Object.values(e.presetIds).forEach(visit),
      );
      const presetMap = Object.fromEntries(
        [...needed].map((id) => [id, uid()]),
      );
      const names = new Set(Object.values(p.presets).map((s) => s.name));
      for (const id of needed) {
        const s = structuredClone(source.presets[id]);
        s.id = presetMap[id];
        s.parentId = presetMap[s.parentId] || null;
        let name = s.name,
          i = 2;
        while (names.has(name)) name = `${s.name.slice(0, 90)} ${i++}`;
        s.name = name;
        names.add(name);
        p.presets[s.id] = s;
      }
      const m = structuredClone(master),
        map = Object.fromEntries(
          Object.keys(m.elements).map((id) => [id, uid()]),
        );
      m.id = uid();
      let name = m.name,
        i = 2;
      while (Object.values(p.masters).some((s) => s.name === name))
        name = `${master.name.slice(0, 90)} ${i++}`;
      m.name = name;
      m.elements = Object.fromEntries(
        Object.values(m.elements).map((e) => {
          e.id = map[e.id];
          e.parentId = map[e.parentId] || null;
          e.children = e.children.map((id) => map[id]);
          e.geometry.flowParentId = map[e.geometry.flowParentId] || null;
          for (const category of CATEGORIES)
            if (e.presetIds[category])
              e.presetIds[category] = presetMap[e.presetIds[category]];
          return [e.id, e];
        }),
      );
      m.rootId = map[m.rootId];
      const root = m.elements[m.rootId];
      const inherited = Object.fromEntries(
        Object.entries(source.globalStyles).filter(([key]) =>
          [
            "color",
            "fontFamily",
            "fontSize",
            "lineHeight",
            "fontWeight",
          ].includes(key),
        ),
      );
      root.styles.overrides = { ...inherited, ...root.styles.overrides };
      p.masters[m.id] = m;
      return [];
    }
    default:
      return undefined;
  }
}
