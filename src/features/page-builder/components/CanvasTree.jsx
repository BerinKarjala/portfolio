import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { isContainer } from "../domain/catalog";
import { useBuilder } from "../state/BuilderProvider";
import ComponentContent from "./ComponentContent";
import { RichTextEditor } from "./RichText";
import { ownStyles, reactStyles, resolveStyles } from "../domain/styles";
import { childrenOf, protectedSubtree } from "../domain/structure";

export function DropZone({
  id,
  parentId,
  beforeId = null,
  label,
  canDrop,
  className = "",
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !canDrop(parentId),
    data: { parentId, beforeId, label },
  });
  return (
    <div
      ref={setNodeRef}
      data-drop-id={id}
      data-over={isOver}
      aria-label={label}
      className={`pb-drop-zone ${className}`}
    >
      <span>{isOver ? label : ""}</span>
    </div>
  );
}
export function CanvasNode({
  id,
  project,
  selection,
  selectAt,
  pointer,
  readOnly,
  canDrop,
  workspace,
  draft,
  guides,
  picking = false,
  wizardTarget,
}) {
  const { state, dispatch, sendCommand, select } = useBuilder();
  const editing = state.editor.richEditingId === id;
  const e = project.page.elements[id];
  const masterReadOnly = !!e.instance && !state.editor.masterEdit;
  const effective = resolveStyles(project, id);
  const blocked = readOnly || protectedSubtree(project, id);
  const gestureBlocked = picking || blocked;
  const selected = selection.includes(id);
  const drag = useDraggable({
    id: `element:${id}`,
    disabled: gestureBlocked || e.positionMode === "absolute",
    data: { kind: "element", id, label: e.name },
  });
  const viewport =
    workspace.viewport < 600
      ? "mobile"
      : workspace.viewport < 1024
        ? "tablet"
        : "desktop";
  if (e.visibility.globalHidden || !e.visibility[viewport]) return null;
  const geometry = draft?.placements[id] || e.geometry;
  const style = {
    "--pb-control-scale": 1 / workspace.zoom,
    ...reactStyles(ownStyles(project, id)),
    ...(draft?.id === id && draft.style ? draft.style : {}),
    position:
      e.positionMode === "absolute"
        ? "absolute"
        : e.positionMode === "sticky"
          ? "sticky"
          : "relative",
    zIndex: e.geometry.zIndex,
    ...(e.positionMode === "absolute"
      ? {
          left: `${geometry.x}%`,
          top: `${geometry.y}%`,
          width: `${geometry.width}%`,
          height: `${geometry.height}%`,
          minHeight: 0,
        }
      : {}),
    overflowX: e.layout.overflowX,
    overflowY: e.layout.overflowY,
  };
  const siblings = childrenOf(project, e.parentId);
  const next = siblings[siblings.indexOf(id) + 1] || null;
  const nested = isContainer(e);
  const content =
    editing && e.props.document ? (
      <RichTextEditor
        document={e.props.document}
        disabled={blocked}
        onHistory={sendCommand}
        onChange={(document, key) =>
          sendCommand(
            { type: "PATCH", ids: [id], patch: { props: { document } } },
            key ? `rich:${id}:${key}` : undefined,
          )
        }
        onDone={() => {
          dispatch({ type: "RICH_MODE", id: null });
          requestAnimationFrame(() =>
            document.querySelector(`[data-element-id="${id}"]`)?.focus(),
          );
        }}
      />
    ) : (
      <ComponentContent
        element={e}
        styles={effective}
        viewport={workspace.viewport}
      />
    );
  const childrenContent = nested ? (
    <div
      data-container-id={id}
      className="pb-node-children"
      style={{
        display: e.layoutMode === "grid" ? "grid" : "flex",
        flexDirection: e.layout.direction,
        flexWrap: e.layout.wrap ? "wrap" : "nowrap",
        alignItems: e.layout.align,
        justifyContent: e.layout.justify,
        gap: effective.gap || "0",
        gridTemplateColumns: `repeat(${Math.min(e.layout.columns, workspace.viewport < 600 ? 1 : workspace.viewport < 1024 ? 2 : 12)}, minmax(0,1fr))`,
        minHeight: e.children.some(
          (child) => project.page.elements[child].positionMode === "flow",
        )
          ? undefined
          : "6rem",
      }}
    >
      {e.children.map((child) => (
        <CanvasNode
          key={child}
          id={child}
          {...{
            project,
            selection,
            selectAt,
            pointer,
            readOnly,
            canDrop,
            workspace,
            draft,
            guides,
            picking,
            wizardTarget,
          }}
        />
      ))}
      {!e.children.length && (
        <p className="pb-container-placeholder">
          {e.layout.group ? "Group" : e.name} · Drop elements here
        </p>
      )}
      <DropZone
        id={`inside:${id}`}
        parentId={id}
        label={`Inside ${e.name}`}
        canDrop={canDrop}
        className="pb-drop-inside"
      />
      {guides?.parentId === id &&
        guides.guides.map((g, i) => (
          <i
            key={i}
            className={`pb-snap-guide pb-snap-${g.axis}`}
            style={g.axis === "x" ? { left: `${g.at}%` } : { top: `${g.at}%` }}
          />
        ))}
    </div>
  ) : null;
  const handleClick = (event) => {
    event.stopPropagation();
    selectAt(event, id);
  };
  return (
    <div
      ref={drag.setNodeRef}
      data-element-id={id}
      data-wizard-target={picking && wizardTarget === id}
      data-type={e.type}
      data-testid={`canvas-${e.type}`}
      data-selected={selected}
      data-rich-editing={editing}
      data-locked={blocked}
      tabIndex={0}
      role="group"
      aria-label={`${e.name}${selected ? ", selected" : ""}${blocked ? ", locked" : ""}`}
      className={`pb-canvas-node ${nested ? "pb-node-container" : ""} ${drag.isDragging ? "pb-dragging" : ""}`}
      style={style}
      onClick={(event) => {
        if (!editing) handleClick(event);
        else event.stopPropagation();
      }}
      onDoubleClick={(event) => {
        if (e.props.document && !gestureBlocked && !masterReadOnly) {
          event.stopPropagation();
          select([id]);
          dispatch({ type: "RICH_MODE", id });
        }
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && event.key === "Enter") {
          event.stopPropagation();
          event.preventDefault();
          selectAt(event, id);
        }
      }}
    >
      <DropZone
        id={`before:${id}`}
        parentId={e.parentId}
        beforeId={id}
        label={`Before ${e.name}`}
        canDrop={canDrop}
        className="pb-drop-before"
      />
      {nested ? (
        e.type === "nav" ? (
          <nav className="pb-native-nav" aria-label={e.props.label}>
            {workspace.viewport < 768 ? (
              <details>
                <summary>{e.props.menuLabel}</summary>
                {childrenContent}
              </details>
            ) : (
              childrenContent
            )}
          </nav>
        ) : (
          childrenContent
        )
      ) : (
        content
      )}
      <div className="pb-node-controls">
        {e.positionMode !== "absolute" ? (
          <button
            type="button"
            ref={drag.setActivatorNodeRef}
            {...drag.attributes}
            {...drag.listeners}
            disabled={gestureBlocked}
            aria-label={`Move ${e.name}`}
            className="pb-move-handle"
            onClick={(event) => event.stopPropagation()}
          >
            ⠿<span>{e.name}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={gestureBlocked}
            className="pb-move-handle"
            aria-label={`Move ${e.name}`}
            onPointerDown={(event) => pointer.start(event, id, "move")}
            {...pointer.handlers}
            onClick={(event) => event.stopPropagation()}
          >
            ⠿<span>{e.name}</span>
          </button>
        )}
      </div>
      {selected && (
        <button
          type="button"
          className="pb-resize-handle"
          disabled={gestureBlocked}
          aria-label={`Resize ${e.name}`}
          onPointerDown={(event) => pointer.start(event, id, "resize")}
          {...pointer.handlers}
          onClick={(event) => event.stopPropagation()}
        >
          ↘
        </button>
      )}
      <DropZone
        id={`after:${id}`}
        parentId={e.parentId}
        beforeId={next}
        label={`After ${e.name}`}
        canDrop={canDrop}
        className="pb-drop-after"
      />
    </div>
  );
}
