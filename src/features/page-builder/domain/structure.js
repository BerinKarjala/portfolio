import { documentText, newId, validateProject } from "./project";
import { defaultGeometry, defaultLayout } from "./canvasModel";
import { canContain, COMPONENTS, isContainer } from "./catalog";

const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};
export const childrenOf = (project, parentId) =>
  parentId
    ? project.page.elements[parentId].children
    : project.page.rootElementIds;
export function ancestors(project, id) {
  const result = [];
  let parent = project.page.elements[id]?.parentId;
  while (parent) {
    result.unshift(parent);
    parent = project.page.elements[parent]?.parentId;
  }
  return result;
}
export function descendants(project, id) {
  return [
    id,
    ...(project.page.elements[id]?.children || []).flatMap((child) =>
      descendants(project, child),
    ),
  ];
}
export function isLocked(project, id) {
  return [...ancestors(project, id), id].some(
    (key) => project.page.elements[key]?.locked,
  );
}
export function protectedSubtree(project, id) {
  return (
    isLocked(project, id) ||
    descendants(project, id).some((key) => project.page.elements[key]?.locked)
  );
}
export function selectedRoots(project, ids) {
  const set = new Set(ids);
  return [...set].filter(
    (id) =>
      project.page.elements[id] &&
      !ancestors(project, id).some((parent) => set.has(parent)),
  );
}
export function treeDepth(project, id) {
  return ancestors(project, id).length + 1;
}
export function pathName(project, id) {
  return [...ancestors(project, id), id]
    .map((key) => project.page.elements[key]?.name)
    .join(" / ");
}
export function canMoveTo(project, ids, parentId) {
  const parent = parentId ? project.page.elements[parentId] : null;
  if (
    parentId &&
    (!parent || !isContainer(parent) || isLocked(project, parentId))
  )
    return false;
  return selectedRoots(project, ids).every(
    (id) =>
      !protectedSubtree(project, id) &&
      !descendants(project, id).includes(parentId) &&
      canContain(parent, project.page.elements[id].type) &&
      (parentId ? treeDepth(project, parentId) : 0) +
        Math.max(
          ...descendants(project, id).map(
            (child) => treeDepth(project, child) - treeDepth(project, id) + 1,
          ),
        ) <=
        4,
  );
}
export function makeElement(type, parentId = null) {
  const component = COMPONENTS.find((c) => c.type === type);
  ensure(component, "Unknown component.");
  const props = {
    container: {},
    heading: { level: 2, document: documentText("Your heading") },
    paragraph: { document: documentText("Write something worth sharing.") },
    link: { text: "Explore more", href: "https://example.com" },
    divider: {},
    image: { src: "https://example.com/image.jpg", alt: "Describe your image" },
    nav: {},
    list: { ordered: false },
    listItem: { document: documentText("List item") },
  }[type];
  return {
    id: newId(),
    type,
    name: component.name,
    htmlId: "",
    parentId,
    children: [],
    layoutMode: "flex",
    positionMode: "flow",
    props,
    styles: {
      overrides:
        type === "container"
          ? { padding: "1rem", gap: "1rem", minHeight: "8rem" }
          : type === "heading"
            ? { fontSize: "2rem", fontWeight: 700 }
            : {},
    },
    presetIds: {},
    visibility: {
      globalHidden: false,
      mobile: true,
      tablet: true,
      desktop: true,
    },
    locked: false,
    layout: defaultLayout(),
    geometry: defaultGeometry(parentId),
  };
}
export function captureClipboard(project, ids) {
  validateProject(project);
  const selected = new Set(selectedRoots(project, ids));
  const roots = project.page.rootElementIds
    .flatMap((id) => descendants(project, id))
    .filter((id) => selected.has(id));
  ensure(roots.length, "Select something to copy.");
  return { project: structuredClone(project), ids: roots };
}

/** Commands mutate a private prospective copy, then validate once before commit.
 * @returns {{project: import('./project').Project, selection: string[]}}
 */
export function applyCommand(original, command) {
  validateProject(original);
  const p = structuredClone(original);
  const elements = p.page.elements;
  let ids = selectedRoots(p, command.ids || []);
  let selection = ids;
  const editable = (keys = ids) =>
    keys.forEach((id) =>
      ensure(
        !protectedSubtree(p, id),
        "A locked element or descendant prevents this operation.",
      ),
    );
  const siblings = (parentId) => childrenOf(p, parentId);
  const detach = (id) => {
    const e = elements[id];
    const list = siblings(e.parentId);
    list.splice(list.indexOf(id), 1);
  };
  function insert(keys, parentId, beforeId, index) {
    const parent = parentId ? elements[parentId] : null;
    ensure(
      !parentId || (parent && !isLocked(p, parentId)),
      "The destination is missing or locked.",
    );
    ensure(
      keys.every((id) => canContain(parent, elements[id].type)),
      "Illegal semantic nesting at destination.",
    );
    const list = siblings(parentId);
    const at = beforeId
      ? list.indexOf(beforeId)
      : Number.isInteger(index)
        ? Math.min(index, list.length)
        : list.length;
    ensure(at >= 0, "The insertion target no longer exists.");
    list.splice(at, 0, ...keys);
    keys.forEach((id) => {
      elements[id].parentId = parentId;
    });
  }
  function unwrap(id) {
    const node = elements[id];
    ensure(isContainer(node), "Only a container can be unwrapped.");
    const parentId = node.parentId;
    const list = siblings(parentId);
    const at = list.indexOf(id);
    const children = [...node.children];
    detach(id);
    for (const childId of children) {
      const child = elements[childId];
      if (child.positionMode === "absolute") {
        const measured = command.placements?.[childId];
        ensure(
          measured || node.positionMode === "absolute",
          "Measure child placement before unwrapping this flow container.",
        );
        child.geometry = {
          ...child.geometry,
          ...(measured || {
            x: node.geometry.x + (child.geometry.x * node.geometry.width) / 100,
            y:
              node.geometry.y + (child.geometry.y * node.geometry.height) / 100,
            width: (child.geometry.width * node.geometry.width) / 100,
            height: (child.geometry.height * node.geometry.height) / 100,
          }),
        };
      }
      child.geometry.flowParentId = parentId;
    }
    insert(children, parentId, null, at);
    children.forEach((key) => {
      elements[key].geometry.flowIndex = siblings(parentId).indexOf(key);
    });
    delete elements[id];
    return children;
  }
  switch (command.type) {
    case "ADD": {
      const e = makeElement(command.component, command.parentId ?? null);
      elements[e.id] = e;
      insert([e.id], e.parentId, command.beforeId, command.index);
      selection = [e.id];
      break;
    }
    case "MOVE": {
      const selected = new Set(ids);
      ids = p.page.rootElementIds
        .flatMap((id) => descendants(p, id))
        .filter((id) => selected.has(id));
      ensure(
        ids.length && canMoveTo(p, ids, command.parentId ?? null),
        "Cannot move: destination nesting, depth, cycle or lock restriction.",
      );
      const parentId = command.parentId ?? null;
      // Ignore a drop onto one of the selected insertion anchors.
      if (ids.includes(command.beforeId))
        return { project: original, selection: ids };
      for (const id of ids) {
        const e = elements[id];
        if (e.parentId !== parentId) {
          if (e.positionMode === "absolute") {
            ensure(
              command.placements?.[id],
              "Measure free-form placement before reparenting.",
            );
            e.geometry = { ...e.geometry, ...command.placements[id] };
          } else e.geometry.hasPlacement = false;
          e.geometry.flowParentId = parentId;
        }
        detach(id);
      }
      insert(ids, parentId, command.beforeId, command.index);
      ids.forEach((id) => {
        elements[id].geometry.flowIndex = siblings(parentId).indexOf(id);
      });
      break;
    }
    case "PATCH": {
      ensure(ids.length, "Select an element first.");
      const patch = command.patch;
      ensure(
        patch &&
          Object.keys(patch).every((key) =>
            [
              "name",
              "htmlId",
              "props",
              "styles",
              "layout",
              "layoutMode",
              "geometry",
              "visibility",
              "locked",
            ].includes(key),
          ),
        "Unsupported element change.",
      );
      for (const id of ids) {
        const e = elements[id];
        const lockOnly =
          Object.keys(patch).length === 1 && typeof patch.locked === "boolean";
        if (lockOnly)
          ensure(
            !ancestors(p, id).some((key) => elements[key].locked),
            "An ancestor is locked.",
          );
        else if (
          Object.keys(patch).some((key) =>
            [
              "styles",
              "layout",
              "layoutMode",
              "geometry",
              "visibility",
            ].includes(key),
          )
        )
          editable([id]);
        else ensure(!isLocked(p, id), "This element is locked.");
        for (const [key, value] of Object.entries(patch)) {
          if (key === "styles") {
            ensure(
              value && Object.keys(value).every((k) => k === "overrides"),
              "Unsupported styles.",
            );
            e.styles.overrides = { ...e.styles.overrides, ...value.overrides };
          } else if (
            ["props", "layout", "geometry", "visibility"].includes(key)
          )
            e[key] = { ...e[key], ...structuredClone(value) };
          else e[key] = value;
        }
      }
      break;
    }
    case "DELETE":
      editable();
      ensure(ids.length, "Select an element to delete.");
      if (command.mode === "unwrap") {
        ensure(ids.length === 1, "Unwrap one container at a time.");
        selection = unwrap(ids[0]);
      } else {
        ids.forEach((id) => {
          detach(id);
          descendants(p, id).forEach((key) => delete elements[key]);
        });
        selection = [];
      }
      break;
    case "GROUP": {
      editable();
      ensure(ids.length >= 2, "Select at least two siblings to group.");
      const parentId = elements[ids[0]].parentId;
      const mode = elements[ids[0]].positionMode;
      ensure(
        ids.every(
          (id) =>
            elements[id].parentId === parentId &&
            elements[id].positionMode === mode,
        ),
        "Choose siblings in the same placement mode.",
      );
      const list = siblings(parentId);
      ids = list.filter((id) => ids.includes(id));
      const at = list.indexOf(ids[0]);
      const group = makeElement("container", parentId);
      group.name = "Group";
      group.layout = {
        ...(parentId ? elements[parentId].layout : defaultLayout()),
        group: true,
      };
      group.layoutMode = parentId ? elements[parentId].layoutMode : "flex";
      group.styles.overrides = {
        gap: parentId ? elements[parentId].styles.overrides.gap || "0" : "0",
      };
      if (mode === "absolute") {
        const geometries = ids.map((id) => elements[id].geometry);
        const x = Math.min(...geometries.map((g) => g.x));
        const y = Math.min(...geometries.map((g) => g.y));
        const width = Math.max(...geometries.map((g) => g.x + g.width)) - x;
        const height = Math.max(...geometries.map((g) => g.y + g.height)) - y;
        group.positionMode = mode;
        group.geometry = {
          ...group.geometry,
          x,
          y,
          width,
          height,
          hasPlacement: true,
        };
        ids.forEach((id) => {
          const g = elements[id].geometry;
          elements[id].geometry = {
            ...g,
            x: ((g.x - x) / width) * 100,
            y: ((g.y - y) / height) * 100,
            width: (g.width / width) * 100,
            height: (g.height / height) * 100,
          };
        });
      }
      ids.forEach(detach);
      elements[group.id] = group;
      insert([group.id], parentId, null, at);
      group.geometry.flowIndex = at;
      group.children = ids;
      ids.forEach((id) => {
        elements[id].parentId = group.id;
        elements[id].geometry.flowParentId = group.id;
        elements[id].geometry.flowIndex = ids.indexOf(id);
      });
      selection = [group.id];
      break;
    }
    case "UNGROUP":
      editable();
      ensure(
        ids.length === 1 && elements[ids[0]].layout.group,
        "Select one group to ungroup.",
      );
      selection = unwrap(ids[0]);
      break;
    case "DUPLICATE":
    case "PASTE": {
      const clipboard =
        command.type === "DUPLICATE"
          ? captureClipboard(original, ids)
          : command.clipboard;
      ensure(
        clipboard?.project && Array.isArray(clipboard.ids),
        "The internal clipboard is empty.",
      );
      validateProject(clipboard.project);
      const roots = selectedRoots(clipboard.project, clipboard.ids);
      ensure(roots.length, "Nothing to paste.");
      const parentId =
        command.type === "DUPLICATE"
          ? elements[ids[0]].parentId
          : (command.parentId ?? null);
      const all = roots.flatMap((id) => descendants(clipboard.project, id));
      const map = Object.fromEntries(all.map((id) => [id, newId()]));
      const used = new Set(
        Object.values(elements)
          .map((e) => e.htmlId)
          .filter(Boolean),
      );
      const anchors = {};
      for (const id of all) {
        const old = clipboard.project.page.elements[id];
        if (!old.htmlId) continue;
        let name = old.htmlId;
        let suffix = 1;
        while (used.has(name)) {
          const tail = `-copy-${suffix++}`;
          name = old.htmlId.slice(0, 100 - tail.length) + tail;
        }
        anchors[old.htmlId] = name;
        used.add(name);
      }
      for (const id of all) {
        const e = structuredClone(clipboard.project.page.elements[id]);
        e.id = map[id];
        e.parentId = map[e.parentId] || parentId;
        e.children = e.children.map((key) => map[key]);
        e.htmlId = anchors[e.htmlId] || "";
        e.geometry.flowParentId = map[e.geometry.flowParentId] || e.parentId;
        if (
          e.type === "link" &&
          e.props.href.startsWith("#") &&
          anchors[e.props.href.slice(1)]
        )
          e.props.href = `#${anchors[e.props.href.slice(1)]}`;
        elements[e.id] = e;
      }
      selection = roots.map((id) => map[id]);
      let index = command.index;
      if (command.type === "DUPLICATE")
        index =
          Math.max(...ids.map((id) => siblings(parentId).indexOf(id))) + 1;
      insert(selection, parentId, command.beforeId, index);
      selection.forEach((id) => {
        elements[id].geometry.flowIndex = siblings(parentId).indexOf(id);
      });
      break;
    }
    case "MODE": {
      editable();
      ensure(
        ["flow", "absolute"].includes(command.mode),
        "Invalid positioning mode.",
      );
      for (const id of ids) {
        const e = elements[id];
        if (e.positionMode === command.mode) continue;
        if (command.mode === "absolute") {
          e.geometry.flowIndex = siblings(e.parentId).indexOf(id);
          e.geometry.flowParentId = e.parentId;
          if (!e.geometry.hasPlacement) {
            ensure(
              command.placements?.[id],
              "Measure the element before switching to free-form.",
            );
            e.geometry = {
              ...e.geometry,
              ...command.placements[id],
              hasPlacement: true,
            };
          }
        } else if (e.geometry.flowParentId === e.parentId) {
          detach(id);
          insert([id], e.parentId, null, e.geometry.flowIndex);
        }
        e.positionMode = command.mode;
      }
      break;
    }
    case "GEOMETRY":
      editable();
      for (const id of ids) {
        ensure(command.placements?.[id], "Missing placement.");
        elements[id].geometry = {
          ...elements[id].geometry,
          ...command.placements[id],
          hasPlacement: true,
        };
      }
      break;
    case "CONVERT":
      editable();
      for (const id of ids) {
        const e = elements[id];
        ensure(
          ["heading", "paragraph"].includes(e.type) &&
            ["heading", "paragraph"].includes(command.component),
          "These component types cannot be converted.",
        );
        const doc = e.props.document;
        e.type = command.component;
        e.props =
          e.type === "heading"
            ? { level: command.level || 2, document: doc }
            : { document: doc };
      }
      break;
    case "ARRANGE": {
      editable();
      ensure(ids.length >= 2, "Select at least two compatible elements.");
      const nodes = ids.map((id) => elements[id]);
      ensure(
        nodes.every(
          (e) =>
            e.parentId === nodes[0].parentId && e.positionMode === "absolute",
        ),
        "Arrange requires free-form siblings in the same parent.",
      );
      const first = nodes[0].geometry;
      const operation = command.operation;
      if (operation.startsWith("distribute")) {
        ensure(
          nodes.length >= 3,
          "Distribution requires at least three elements.",
        );
        const axis = operation === "distributeX" ? "x" : "y";
        const size = axis === "x" ? "width" : "height";
        nodes.sort((a, b) => a.geometry[axis] - b.geometry[axis]);
        const start = nodes[0].geometry[axis];
        const last = nodes.at(-1).geometry;
        const gap =
          (last[axis] +
            last[size] -
            start -
            nodes.reduce((sum, e) => sum + e.geometry[size], 0)) /
          (nodes.length - 1);
        let cursor = start;
        for (const e of nodes) {
          e.geometry[axis] = cursor;
          cursor += e.geometry[size] + gap;
        }
      } else
        for (const e of nodes) {
          const g = e.geometry;
          if (operation === "left")
            g.x = Math.min(...nodes.map((n) => n.geometry.x));
          else if (operation === "top")
            g.y = Math.min(...nodes.map((n) => n.geometry.y));
          else if (operation === "right")
            g.x =
              Math.max(...nodes.map((n) => n.geometry.x + n.geometry.width)) -
              g.width;
          else if (operation === "bottom")
            g.y =
              Math.max(...nodes.map((n) => n.geometry.y + n.geometry.height)) -
              g.height;
          else if (operation === "centerX")
            g.x = first.x + first.width / 2 - g.width / 2;
          else if (operation === "centerY")
            g.y = first.y + first.height / 2 - g.height / 2;
          else if (operation === "matchWidth") g.width = first.width;
          else if (operation === "matchHeight") g.height = first.height;
          else throw new Error("Unsupported alignment operation.");
        }
      break;
    }
    default:
      throw new Error("Unknown canvas command.");
  }
  // Retained placement references cannot point to removed containers.
  Object.values(elements).forEach((e) => {
    if (e.geometry.flowParentId && !elements[e.geometry.flowParentId])
      e.geometry.flowParentId = e.parentId;
  });
  validateProject(p);
  if (JSON.stringify(p.page) === JSON.stringify(original.page))
    return { project: original, selection };
  return { project: p, selection };
}
