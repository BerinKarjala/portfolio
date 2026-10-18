import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { isContainer } from "../domain/catalog";
import { plainText } from "../domain/project";
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
function ImageContent({ element }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="pb-image-fallback">
      {element.props.alt || "Image unavailable"}
      <small>Set an image URL in Content.</small>
    </div>
  ) : (
    <img
      key={element.props.src}
      src={element.props.src}
      alt={element.props.alt}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFailed(true)}
    />
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
}) {
  const e = project.page.elements[id];
  const blocked = readOnly || protectedSubtree(project, id);
  const selected = selection.includes(id);
  const drag = useDraggable({
    id: `element:${id}`,
    disabled: blocked || e.positionMode !== "flow",
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
    ...e.styles.overrides,
    ...(draft?.id === id && draft.style ? draft.style : {}),
    position: e.positionMode === "absolute" ? "absolute" : "relative",
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
  let content;
  if (e.type === "heading") {
    const Heading = `h${e.props.level}`;
    content = <Heading>{plainText(e)}</Heading>;
  } else if (e.type === "paragraph") content = <p>{plainText(e)}</p>;
  else if (e.type === "link")
    content = <span className="pb-preview-link">{e.props.text} ↗</span>;
  else if (e.type === "image")
    content = <ImageContent key={e.props.src} element={e} />;
  else if (e.type === "divider") content = <hr />;
  else if (e.type === "listItem") content = <span>• {plainText(e)}</span>;
  const handleClick = (event) => {
    event.stopPropagation();
    selectAt(event, id);
  };
  return (
    <div
      ref={drag.setNodeRef}
      data-element-id={id}
      data-type={e.type}
      data-testid={`canvas-${e.type}`}
      data-selected={selected}
      data-locked={blocked}
      tabIndex={0}
      role="group"
      aria-label={`${e.name}${selected ? ", selected" : ""}${blocked ? ", locked" : ""}`}
      className={`pb-canvas-node ${nested ? "pb-node-container" : ""} ${drag.isDragging ? "pb-dragging" : ""}`}
      style={style}
      onClick={handleClick}
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
        <div
          data-container-id={id}
          className="pb-node-children"
          style={{
            display: e.layoutMode === "grid" ? "grid" : "flex",
            flexDirection: e.layout.direction,
            flexWrap: e.layout.wrap ? "wrap" : "nowrap",
            alignItems: e.layout.align,
            justifyContent: e.layout.justify,
            gap: e.styles.overrides.gap || "0",
            gridTemplateColumns: `repeat(${Math.min(e.layout.columns, workspace.viewport < 600 ? 1 : workspace.viewport < 900 ? 2 : 12)}, minmax(0,1fr))`,
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
                style={
                  g.axis === "x" ? { left: `${g.at}%` } : { top: `${g.at}%` }
                }
              />
            ))}
        </div>
      ) : (
        content
      )}
      <div className="pb-node-controls">
        {e.positionMode === "flow" ? (
          <button
            type="button"
            ref={drag.setActivatorNodeRef}
            {...drag.attributes}
            {...drag.listeners}
            disabled={blocked}
            aria-label={`Move ${e.name}`}
            className="pb-move-handle"
            onClick={(event) => event.stopPropagation()}
          >
            ⠿<span>{e.name}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={blocked}
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
          disabled={blocked}
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
