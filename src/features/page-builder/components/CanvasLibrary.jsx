import { useDraggable } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { COMPONENTS, canContain, isContainer } from "../domain/catalog";
import {
  ancestors,
  isLocked,
  pathName,
  treeDepth,
  protectedSubtree,
} from "../domain/structure";
import { useBuilder } from "../state/BuilderProvider";

function PaletteItem({
  item,
  add,
  disabled,
  dragDisabled,
  favorite,
  toggleFavorite,
}) {
  const drag = useDraggable({
    id: `palette:${item.type}`,
    disabled: dragDisabled,
    data: { kind: "palette", component: item.type, label: item.name },
  });
  return (
    <article className="pb-palette-item">
      <button
        type="button"
        ref={drag.setNodeRef}
        {...drag.listeners}
        {...drag.attributes}
        disabled={dragDisabled}
        aria-label={`Drag ${item.name}`}
        className="pb-drag-handle"
      >
        ⠿
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => add(item.type)}
        aria-label={`Add ${item.name}`}
      >
        <strong>{item.name}</strong>
        <small>{item.hint}</small>
      </button>
      <button
        type="button"
        aria-label={`${favorite ? "Unfavorite" : "Favorite"} component ${item.name}`}
        aria-pressed={favorite}
        onClick={toggleFavorite}
      >
        {favorite ? "★" : "☆"}
      </button>
    </article>
  );
}
export function Palette({
  add,
  parentId,
  insertion,
  setInsertion,
  recentVersion,
}) {
  const { state, repository, report } = useBuilder();
  const { project, readOnly } = state.editor;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [preferences, setPreferences] = useState(() =>
    repository.palettePreferences(),
  );
  useEffect(
    () => setPreferences(repository.palettePreferences()),
    [recentVersion],
  );
  function update(value) {
    setPreferences(value);
    try {
      repository.savePalettePreferences(value);
    } catch (error) {
      report(error);
    }
  }
  function insert(type) {
    add(type, parentId);
    update({
      ...preferences,
      recent: [type, ...preferences.recent.filter((t) => t !== type)].slice(
        0,
        8,
      ),
    });
  }
  return (
    <>
      <label>
        Find a component
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Text, layout, media…"
        />
      </label>
      <label>
        Component category
        <select
          aria-label="Component category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All components</option>
          {["Text", "Layout", "Media", "Favorites", "Recent"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Insert into
        <select
          aria-label="Insert into"
          value={insertion}
          onChange={(e) => setInsertion(e.target.value)}
        >
          <option value="selection">Selected container or its parent</option>
          <option value="page">Page root</option>
          {Object.values(project.page.elements)
            .filter((e) => isContainer(e) && !isLocked(project, e.id))
            .map((e) => (
              <option key={e.id} value={e.id}>
                {pathName(project, e.id)}
              </option>
            ))}
        </select>
      </label>
      <p className="pb-muted">
        Click to insert, drag a handle, or press Space on a handle and use
        arrows to choose a drop zone.
      </p>
      <div className="pb-palette-list">
        {COMPONENTS.filter(
          (c) =>
            (!query ||
              `${c.name} ${c.hint}`
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (!category ||
              (category === "Favorites"
                ? preferences.favorites.includes(c.type)
                : category === "Recent"
                  ? preferences.recent.includes(c.type)
                  : c.category === category)),
        )
          .sort((a, b) =>
            category === "Recent"
              ? preferences.recent.indexOf(a.type) -
                preferences.recent.indexOf(b.type)
              : 0,
          )
          .map((item) => (
            <PaletteItem
              key={item.type}
              item={item}
              add={insert}
              dragDisabled={readOnly}
              disabled={
                readOnly ||
                (!!parentId &&
                  (isLocked(project, parentId) ||
                    treeDepth(project, parentId) >= 4)) ||
                !canContain(project.page.elements[parentId], item.type)
              }
              favorite={preferences.favorites.includes(item.type)}
              toggleFavorite={() =>
                update({
                  ...preferences,
                  favorites: preferences.favorites.includes(item.type)
                    ? preferences.favorites.filter((t) => t !== item.type)
                    : [...preferences.favorites, item.type],
                })
              }
            />
          ))}
      </div>
    </>
  );
}

export function Layers({ expanded, setExpanded, reveal, inspect }) {
  const { state, select, sendCommand } = useBuilder();
  const { project, selection, readOnly } = state.editor;
  const [query, setQuery] = useState("");
  const expand = (id, value) =>
    setExpanded(
      value
        ? [...new Set([...expanded, id])]
        : expanded.filter((key) => key !== id),
    );
  const results = Object.values(project.page.elements)
    .filter((e) =>
      `${pathName(project, e.id)} ${e.type} ${e.htmlId} ${e.props.document?.nodes.map((n) => n.text).join(" ") || e.props.text || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .map((e) => e.id);
  const included = new Set(
    results.flatMap((id) => [...ancestors(project, id), id]),
  );
  const visible = [];
  function visit(id) {
    const e = project.page.elements[id];
    if (query && !included.has(id)) return;
    visible.push(id);
    if (query || expanded.includes(id)) e.children.forEach(visit);
  }
  project.page.rootElementIds.forEach(visit);
  function choose(id, toggle = false) {
    select([id], toggle);
    reveal(id);
    if (!toggle) inspect?.();
  }
  function keyDown(event, id) {
    if (event.target !== event.currentTarget) return;
    const e = project.page.elements[id];
    let next;
    if (event.key === "ArrowDown")
      next = visible[Math.min(visible.length - 1, visible.indexOf(id) + 1)];
    if (event.key === "ArrowUp")
      next = visible[Math.max(0, visible.indexOf(id) - 1)];
    if (event.key === "Home") next = visible[0];
    if (event.key === "End") next = visible.at(-1);
    if (event.key === "ArrowRight") {
      if (!expanded.includes(id)) expand(id, true);
      else next = e.children[0];
    }
    if (event.key === "ArrowLeft") {
      if (expanded.includes(id)) expand(id, false);
      else next = e.parentId;
    }
    if (event.key === "Enter" || event.key === " ") choose(id, event.shiftKey);
    if (next) {
      choose(next);
      document.getElementById(`layer-${next}`)?.focus();
    }
    if (
      [
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "Enter",
        " ",
      ].includes(event.key)
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  return (
    <>
      <label>
        Search elements
        <input
          type="search"
          placeholder="Name, text, type, ID or path…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <p className="pb-muted">
        Shift-click to select several layers. Arrow keys navigate the tree.
      </p>
      <div
        role="tree"
        aria-label="Page layers"
        aria-multiselectable="true"
        className="pb-layer-tree"
      >
        {visible.map((id) => {
          const e = project.page.elements[id];
          const parents = ancestors(project, id);
          const parentLocked = parents.some(
            (key) => project.page.elements[key].locked,
          );
          const siblings = e.parentId
            ? project.page.elements[e.parentId].children
            : project.page.rootElementIds;
          const index = siblings.indexOf(id);
          return (
            <div
              key={id}
              role="treeitem"
              aria-level={parents.length + 1}
              aria-selected={selection.includes(id)}
              aria-expanded={
                e.children.length
                  ? !!(query || expanded.includes(id))
                  : undefined
              }
              aria-label={e.name}
              tabIndex={0}
              id={`layer-${id}`}
              className={`pb-layer-row ${selection.includes(id) ? "is-selected" : ""}`}
              style={{ paddingLeft: `${parents.length * 12}px` }}
              onClick={(event) =>
                choose(id, event.shiftKey || event.metaKey || event.ctrlKey)
              }
              onKeyDown={(event) => keyDown(event, id)}
            >
              <button
                type="button"
                aria-label={`${expanded.includes(id) ? "Collapse" : "Expand"} ${e.name}`}
                disabled={!e.children.length}
                onClick={(event) => {
                  event.stopPropagation();
                  expand(id, !expanded.includes(id));
                }}
              >
                {expanded.includes(id) ? "▾" : "▸"}
              </button>
              <input
                type="checkbox"
                aria-label={`Select layer ${e.name}`}
                checked={selection.includes(id)}
                onClick={(event) => event.stopPropagation()}
                onChange={() => {
                  select([id], true);
                  reveal(id);
                }}
              />
              <span className="pb-layer-label">
                {e.name}
                {e.visibility.globalHidden ? " (hidden)" : ""}
                {isLocked(project, id) ? " 🔒" : ""}
              </span>
              <button
                type="button"
                disabled={readOnly || parentLocked}
                aria-label={`${e.locked ? "Unlock" : "Lock"} ${e.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  sendCommand({
                    type: "PATCH",
                    ids: [id],
                    patch: { locked: !e.locked },
                  });
                }}
              >
                {e.locked ? "🔒" : "◇"}
              </button>
              <button
                type="button"
                disabled={readOnly || protectedSubtree(project, id)}
                aria-label={`${e.visibility.globalHidden ? "Show" : "Hide"} ${e.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  sendCommand({
                    type: "PATCH",
                    ids: [id],
                    patch: {
                      visibility: { globalHidden: !e.visibility.globalHidden },
                    },
                  });
                }}
              >
                {e.visibility.globalHidden ? "◌" : "◉"}
              </button>
              <div className="pb-layer-order">
                <button
                  type="button"
                  disabled={
                    readOnly || index === 0 || protectedSubtree(project, id)
                  }
                  aria-label={`Move ${e.name} up`}
                  onClick={(event) => {
                    event.stopPropagation();
                    sendCommand({
                      type: "MOVE",
                      ids: [id],
                      parentId: e.parentId,
                      index: index - 1,
                    });
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={
                    readOnly ||
                    index === siblings.length - 1 ||
                    protectedSubtree(project, id)
                  }
                  aria-label={`Move ${e.name} down`}
                  onClick={(event) => {
                    event.stopPropagation();
                    sendCommand({
                      type: "MOVE",
                      ids: [id],
                      parentId: e.parentId,
                      index: index + 1,
                    });
                  }}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!visible.length && <p>No matching layers.</p>}
    </>
  );
}
