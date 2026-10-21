import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
} from "@dnd-kit/core";
import { useBuilder } from "../state/BuilderProvider";
import { canContain, isContainer } from "../domain/catalog";
import {
  ancestors,
  canMoveTo,
  captureClipboard,
  isLocked,
  pathName,
  protectedSubtree,
  selectedRoots,
  treeDepth,
} from "../domain/structure";
import { clamp, rectToGeometry } from "../domain/geometry";
import useCanvasCamera, { isTextInput } from "../hooks/useCanvasCamera";
import useCanvasPointer from "../hooks/useCanvasPointer";
import ErrorBoundary from "./ErrorBoundary";
import CanvasInspector, { CommitField } from "./CanvasInspector";
import { Layers, Palette } from "./CanvasLibrary";
import { CanvasNode, DropZone } from "./CanvasTree";
import { Modal } from "./Dialog";
import ReusableControls from "./ReusableControls";
import CanvasStyles from "./CanvasStyles";
import { reactStyles } from "../domain/styles";
import ExternalPaste from "./ExternalPaste";
import ElementWizard from "./ElementWizard";
import ReadyKeyboardSensor from "../sensors/ReadyKeyboardSensor";

function keyboardCoordinates(event, { context, currentCoordinates }) {
  if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.code))
    return;
  event.preventDefault();
  const targets = context.droppableContainers
    .getEnabled()
    .map((container) => ({
      container,
      rect: context.droppableRects.get(container.id),
    }))
    .filter((item) => item.rect)
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
  if (!targets.length) return;
  let index = targets.findIndex(
    (item) => item.container.id === context.over?.id,
  );
  if (index < 0)
    index = targets.reduce(
      (best, item, i) =>
        Math.hypot(
          item.rect.left - currentCoordinates.x,
          item.rect.top - currentCoordinates.y,
        ) <
        Math.hypot(
          targets[best].rect.left - currentCoordinates.x,
          targets[best].rect.top - currentCoordinates.y,
        )
          ? i
          : best,
      0,
    );
  index =
    (index +
      (event.code === "ArrowDown" || event.code === "ArrowRight" ? 1 : -1) +
      targets.length) %
    targets.length;
  const rect = targets[index].rect;
  const collision = context.collisionRect;
  return {
    x: rect.left + rect.width / 2 - (collision?.width || 0) / 2,
    y: rect.top + rect.height / 2 - (collision?.height || 0) / 2,
  };
}
const SHORTCUTS = [
  ["Undo / Redo", "Ctrl/⌘ Z · Ctrl/⌘ Shift Z · Ctrl Y"],
  ["Copy / Cut / Paste", "Ctrl/⌘ C · X · V (internal clipboard)"],
  ["Duplicate", "Ctrl/⌘ D"],
  ["Delete", "Delete / Backspace"],
  ["Nudge free-form selection", "Arrow keys · Shift for 10px"],
  ["Multi-select", "Shift / Ctrl / ⌘ click"],
  ["Cycle overlapping elements", "Alt / Option click · Select layer menu"],
  [
    "Structured keyboard drag",
    "Focus a move handle · Space · arrows · Space to drop",
  ],
  ["Cancel gesture / clear selection", "Escape"],
  ["Camera", "Ctrl/⌘ wheel · Space-drag · middle-drag · touch pan/pinch"],
  ["Snapping / aspect ratio", "Alt bypasses snap · Shift locks resize aspect"],
  ["Layers", "Arrow keys · Home / End · Enter / Space to select"],
];

export default function CanvasEditor({ workspace, setWorkspace, scrollRef }) {
  const { state, select, sendCommand, report, notice, repository, dispatch } =
    useBuilder();
  const { project, selection, readOnly, past, future } = state.editor;
  const projectRef = useRef(project);
  projectRef.current = project;
  const [recentVersion, setRecentVersion] = useState(0);
  const [pageHeight, setPageHeight] = useState(600);
  const documentRef = useRef(null);
  const [insertion, setInsertion] = useState("selection");
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  dragRef.current = drag;
  useEffect(() => {
    if (readOnly) {
      dragRef.current = null;
      setDrag(null);
      setDeletion(null);
      setLayerMenu(null);
    }
  }, [readOnly]);
  const [clipboard, setClipboard] = useState(null);
  const clipboardRef = useRef(clipboard);
  clipboardRef.current = clipboard;
  const [deletion, setDeletion] = useState(null);
  const [layerMenu, setLayerMenu] = useState(null);
  const [help, setHelp] = useState(false);
  const [helpQuery, setHelpQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [wizardTarget, setWizardTarget] = useState(null);
  const [wizardId, setWizardId] = useState(null);
  const [pickerError, setPickerError] = useState("");
  const wandRef = useRef(null);
  const widthGesture = useRef(null);
  const lastPoint = useRef(null);
  const previousSelection = useRef("");
  const active = project.page.elements[selection[0]];
  const automaticParent = active
    ? isContainer(active)
      ? active.id
      : active.parentId
    : null;
  const parentId =
    insertion === "selection"
      ? automaticParent
      : insertion === "page" || !project.page.elements[insertion]
        ? null
        : insertion;
  const elementNode = useCallback(
    (id) => scrollRef.current?.querySelector(`[data-element-id="${id}"]`),
    [],
  );
  const parentBox = useCallback(
    (id) =>
      scrollRef.current
        ?.querySelector(`[data-container-id="${id || "__page_root__"}"]`)
        ?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 },
    [],
  );
  const placements = useCallback((ids, destination) => {
    const result = {};
    for (const id of ids) {
      const node = elementNode(id);
      const e = projectRef.current.page.elements[id];
      const rect = parentBox(
        destination === undefined ? e.parentId : destination,
      );
      if (node && rect.width > 0 && rect.height > 0)
        result[id] = rectToGeometry(node.getBoundingClientRect(), rect);
    }
    return result;
  }, []);
  const pointer = useCanvasPointer({
    project,
    selection,
    select,
    readOnly,
    sendCommand,
    scrollRef,
    parentBox,
    elementNode,
    zoom: workspace.zoom,
  });
  const camera = useCanvasCamera({
    scrollRef,
    workspace,
    setWorkspace,
    sessionKey: readOnly,
  });
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(ReadyKeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );
  const update = (patch) => setWorkspace((ws) => ({ ...ws, ...patch }));
  useEffect(() => {
    setPicking(false);
    setWizardTarget(null);
    setWizardId(null);
  }, [project.projectId]);
  useEffect(() => {
    if (readOnly || state.editor.masterEdit) setPicking(false);
  }, [readOnly, state.editor.masterEdit]);
  function armWizard() {
    pointer.cancel();
    endWidth(null, true);
    dispatch({ type: "RICH_MODE", id: null });
    setDrag(null);
    dragRef.current = null;
    setPickerError("");
    setWizardTarget(null);
    setPicking(!picking);
  }
  function configureTarget(id) {
    if (!project.page.elements[id] || readOnly || state.editor.masterEdit)
      return;
    if (protectedSubtree(project, id)) {
      setPickerError(
        "Unlock this element and its locked descendants before configuring it.",
      );
      return;
    }
    select([id]);
    setPicking(false);
    setWizardId(id);
    update({ mobilePanel: null });
  }
  function restoreWizardFocus() {
    const target = elementNode(wizardId);
    const layer = document.getElementById(`layer-${wizardId}`);
    const visible = (node) => node?.isConnected && node.getClientRects().length;
    (visible(target)
      ? target
      : visible(layer)
        ? layer
        : wandRef.current
    )?.focus();
  }
  function targetAt(event) {
    return event.target.closest?.("[data-element-id]")?.dataset.elementId;
  }
  function pickerClick(event) {
    if (!picking) {
      camera.handlers.onClickCapture?.(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const id = targetAt(event);
    if (id) configureTarget(id);
  }
  function pickerDown(event) {
    if (picking) event.stopPropagation();
  }
  function pickerKey(event) {
    if (
      !picking ||
      !["Enter", " "].includes(event.key) ||
      isTextInput(event.target)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const id = targetAt(event);
    if (id) configureTarget(id);
  }
  useEffect(() => {
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(() =>
      setPageHeight(documentRef.current?.offsetHeight || 600),
    );
    observer.observe(documentRef.current);
    return () => observer.disconnect();
  }, [readOnly]);
  useEffect(() => {
    if (
      state.editor.richEditingId &&
      window.matchMedia?.("(max-width: 760px)").matches
    )
      setWorkspace((ws) => ({ ...ws, mobilePanel: null }));
  }, [state.editor.richEditingId]);
  useEffect(() => {
    if (
      window.matchMedia?.("(max-width: 760px)").matches &&
      workspace.mobilePanel
    ) {
      const panel = document.querySelector(
        workspace.mobilePanel === "right"
          ? ".pb-inspector-content"
          : ".pb-library-content",
      );
      if (panel) panel.scrollTop = 0;
    }
  }, [workspace.mobilePanel]);
  const selectionKey = selection.join(",");
  useEffect(() => {
    if (selectionKey && previousSelection.current !== selectionKey)
      setWorkspace((ws) => ({
        ...ws,
        inspectorTab: "content",
        rightOpen: true,
        expandedIds: [
          ...new Set([
            ...ws.expandedIds,
            ...selection.flatMap((id) => ancestors(project, id)),
          ]),
        ],
      }));
    previousSelection.current = selectionKey;
  }, [selectionKey]);
  function reveal(id) {
    const node = elementNode(id);
    const el = scrollRef.current;
    if (!node || !el) return;
    const rect = node.getBoundingClientRect();
    const view = el.getBoundingClientRect();
    if (rect.top < view.top || rect.bottom > view.bottom)
      el.scrollTop += rect.top - view.top - 40;
    if (rect.left < view.left || rect.right > view.right)
      el.scrollLeft += rect.left - view.left - 40;
  }
  function overlaps(point) {
    const nodes = document.elementsFromPoint
      ? document.elementsFromPoint(point.x, point.y)
      : [];
    return [
      ...new Set(
        nodes
          .map((node) => node.closest?.("[data-element-id]")?.dataset.elementId)
          .filter(
            (id) =>
              project.page.elements[id] &&
              !project.page.elements[id].visibility.globalHidden,
          ),
      ),
    ];
  }
  function selectAt(event, id) {
    if (picking) {
      configureTarget(id);
      return;
    }
    if (window.matchMedia?.("(max-width: 760px)").matches)
      update({ mobilePanel: "right", rightOpen: true });
    if (event.clientX !== undefined && event.clientY !== undefined)
      lastPoint.current = { x: event.clientX, y: event.clientY };
    if (event.altKey && lastPoint.current) {
      const ids = overlaps(lastPoint.current);
      if (ids.length) {
        const previous = ids.indexOf(selection[0]);
        select([ids[(previous + 1) % ids.length]]);
        return;
      }
    }
    select([id], event.shiftKey || event.metaKey || event.ctrlKey);
  }
  function canDrop(destination) {
    const data = dragRef.current;
    if (!data || readOnly || picking || wizardId) return false;
    if (data.kind === "element")
      return canMoveTo(
        project,
        selection.includes(data.id) ? selection : [data.id],
        destination,
      );
    const parent = project.page.elements[destination];
    return (
      (!destination ||
        (isContainer(parent) &&
          !isLocked(project, destination) &&
          treeDepth(project, destination) < 4)) &&
      canContain(parent, data.component)
    );
  }
  function add(component, destination = parentId, beforeId) {
    if (picking || wizardId) return;
    setWorkspace((ws) => ({
      ...ws,
      rightOpen: true,
      inspectorTab: "content",
      mobilePanel: window.matchMedia?.("(max-width: 760px)").matches
        ? "right"
        : ws.mobilePanel,
    }));
    sendCommand({ type: "ADD", component, parentId: destination, beforeId });
    try {
      const value = repository.palettePreferences();
      repository.savePalettePreferences({
        ...value,
        recent: [
          component,
          ...value.recent.filter((type) => type !== component),
        ].slice(0, 8),
      });
      setRecentVersion((version) => version + 1);
    } catch (error) {
      report(error);
    }
  }
  function dragStart(event) {
    const data = event.active.data.current;
    dragRef.current = data;
    setDrag(data);
    if (data.kind === "element" && !selection.includes(data.id))
      select([data.id]);
  }
  function dragEnd(event) {
    const data = event.active.data.current;
    const target = event.over?.data.current;
    if (target) {
      if (data.kind === "palette")
        add(data.component, target.parentId, target.beforeId);
      else {
        const ids = selection.includes(data.id)
          ? selectedRoots(project, selection)
          : [data.id];
        sendCommand({
          type: "MOVE",
          ids,
          parentId: target.parentId,
          beforeId: target.beforeId,
          placements: placements(ids, target.parentId),
        });
      }
    }
    dragRef.current = null;
    setDrag(null);
  }
  function collision(args) {
    const hits = pointerWithin(args);
    return hits.length ? hits : closestCenter(args);
  }
  function requestDelete(ids = selection) {
    const roots = selectedRoots(project, ids);
    if (!roots.length) return;
    if (roots.some((id) => protectedSubtree(project, id))) {
      report(new Error("A locked element or descendant prevents deletion."));
      return;
    }
    if (roots.some((id) => project.page.elements[id].children.length))
      setDeletion(roots);
    else sendCommand({ type: "DELETE", ids: roots });
  }
  function copy(cut = false) {
    if (!selection.length) return;
    try {
      if (
        cut &&
        (readOnly || selection.some((id) => protectedSubtree(project, id)))
      )
        throw new Error("Locked or read-only elements cannot be cut.");
      const value = captureClipboard(project, selection);
      setClipboard(value);
      clipboardRef.current = value;
      if (cut) sendCommand({ type: "DELETE", ids: selection });
      notice(
        cut
          ? "Selection cut to the internal clipboard."
          : "Selection copied to the internal clipboard.",
      );
    } catch (error) {
      report(error);
    }
  }
  function paste() {
    if (clipboardRef.current)
      sendCommand({ type: "PASTE", clipboard: clipboardRef.current, parentId });
  }
  function startWidth(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    widthGesture.current = {
      x: event.clientX,
      width: workspace.viewport,
      zoom: workspace.zoom,
      target: event.currentTarget,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveWidth(event) {
    const gesture = widthGesture.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    update({
      viewport: Math.round(
        clamp(
          gesture.width + (event.clientX - gesture.x) / gesture.zoom,
          240,
          3840,
        ),
      ),
    });
  }
  function endWidth(event, cancel = false) {
    const gesture = widthGesture.current;
    if (!gesture || (event && event.pointerId !== gesture.pointerId)) return;
    // Engines may coalesce the last move. Commit the release coordinate before ending capture.
    if (!cancel && event) moveWidth(event);
    widthGesture.current = null;
    if (cancel) update({ viewport: gesture.width });
    try {
      gesture.target.releasePointerCapture(gesture.pointerId);
    } catch {
      /* Native capture can end before this callback. */
    }
  }
  const actions = useRef(null);
  actions.current = {
    project,
    selection,
    readOnly,
    parentId,
    copy,
    paste,
    requestDelete,
    clipboard,
    pointer,
    picking,
    wizardId,
    cancelWidth: () => endWidth(null, true),
  };
  useEffect(() => {
    function key(event) {
      const current = actions.current;
      if (current.wizardId) return;
      if (current.picking) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setPicking(false);
          wandRef.current?.focus();
        }
        return;
      }
      if (event.key === "Escape" && widthGesture.current) {
        event.preventDefault();
        event.stopPropagation();
        current.cancelWidth();
        return;
      }
      if (event.key === "Escape" && dragRef.current) {
        event.preventDefault();
        return;
      }
      if (event.key === "Escape" && current.pointer.active.current) {
        event.preventDefault();
        event.stopPropagation();
        current.pointer.cancel();
        return;
      }
      if (
        dragRef.current ||
        deletion ||
        layerMenu ||
        help ||
        isTextInput(event.target)
      )
        return;
      const modified = event.ctrlKey || event.metaKey;
      const letter = event.key.toLowerCase();
      let handled = true;
      if (modified && letter === "c") current.copy();
      else if (modified && letter === "x") current.copy(true);
      else if (modified && letter === "v" && current.clipboard) current.paste();
      else if (modified && letter === "d")
        sendCommand({ type: "DUPLICATE", ids: current.selection });
      else if (modified && letter === "z")
        sendCommand(event.shiftKey ? "REDO" : "UNDO");
      else if (modified && letter === "y") sendCommand("REDO");
      else if (
        ["Delete", "Backspace"].includes(event.key) &&
        current.selection.length
      )
        current.requestDelete();
      else if (event.key === "Escape" && current.selection.length) select([]);
      else if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
          event.key,
        ) &&
        current.selection.length &&
        current.selection.every(
          (id) => current.project.page.elements[id].positionMode === "absolute",
        )
      ) {
        const result = {};
        const step = event.shiftKey ? 10 : 1;
        for (const id of current.selection) {
          const e = current.project.page.elements[id];
          const box = parentBox(e.parentId);
          if (!box.width || !box.height) continue;
          result[id] = {
            ...e.geometry,
            x:
              e.geometry.x +
              ((event.key === "ArrowRight"
                ? step
                : event.key === "ArrowLeft"
                  ? -step
                  : 0) *
                100 *
                workspace.zoom) /
                box.width,
            y:
              e.geometry.y +
              ((event.key === "ArrowDown"
                ? step
                : event.key === "ArrowUp"
                  ? -step
                  : 0) *
                100 *
                workspace.zoom) /
                box.height,
          };
        }
        sendCommand(
          { type: "GEOMETRY", ids: current.selection, placements: result },
          `nudge:${current.selection.join(",")}`,
        );
      } else handled = false;
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [deletion, layerMenu, help, workspace.zoom]);
  const selectedLocked = selection.some((id) => protectedSubtree(project, id));
  const canvas = (
    <DndContext
      key={readOnly ? "read-only" : "editable"}
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={dragStart}
      onDragEnd={dragEnd}
      onDragCancel={() => {
        dragRef.current = null;
        setDrag(null);
      }}
      autoScroll
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Press Space to pick up a component or move handle. Use arrow keys to choose a drop zone, Space or Enter to drop, and Escape to cancel. You can also use Add buttons and the Move into selector.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${active.data.current?.label}.`,
          onDragOver: ({ over }) =>
            over ? `Drop ${over.data.current?.label}.` : "No valid drop zone.",
          onDragEnd: ({ over }) =>
            over ? `Dropped ${over.data.current?.label}.` : "Drop cancelled.",
          onDragCancel: () => "Drag cancelled.",
        },
      }}
    >
      <CanvasStyles
        project={project}
        paused={state.editor.effectsPaused}
        replay={state.editor.replayVersion}
      />
      <div className="pb-canvas-actions">
        <button
          ref={wandRef}
          type="button"
          className="pb-wizard-wand"
          aria-label="Configure an element"
          aria-pressed={picking}
          disabled={readOnly || !!state.editor.masterEdit}
          title={
            state.editor.masterEdit
              ? "Exit master editing to configure a selected copy."
              : "Choose an element to configure"
          }
          onClick={armWizard}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              d="m4 20 12-12 4 4L8 24M14 10l4 4M6 3v6M3 6h6M18 1v4M16 3h4M21 18v4M19 20h4"
              transform="translate(0 -2)"
            />
          </svg>
          Configure
        </button>
        <button
          type="button"
          aria-label="Undo"
          disabled={readOnly || !past.length}
          onClick={() => sendCommand("UNDO")}
        >
          ↶ Undo
        </button>
        <button
          type="button"
          aria-label="Redo"
          disabled={readOnly || !future.length}
          onClick={() => sendCommand("REDO")}
        >
          ↷ Redo
        </button>
        <button
          type="button"
          disabled={!selection.length}
          onClick={() => copy()}
        >
          Copy
        </button>
        <button
          type="button"
          disabled={readOnly || !selection.length || selectedLocked}
          onClick={() => copy(true)}
        >
          Cut
        </button>
        <button type="button" disabled={readOnly || !clipboard} onClick={paste}>
          Paste
        </button>
        <button
          type="button"
          disabled={readOnly || selection.length < 2 || selectedLocked}
          onClick={() => sendCommand({ type: "GROUP", ids: selection })}
        >
          Group
        </button>
        <button
          type="button"
          disabled={
            readOnly ||
            selection.length !== 1 ||
            !active?.layout.group ||
            selectedLocked
          }
          onClick={() =>
            sendCommand({
              type: "UNGROUP",
              ids: selection,
              placements: placements(active.children, active.parentId),
            })
          }
        >
          Ungroup
        </button>
        <button
          type="button"
          onClick={() =>
            update({
              leftOpen: !workspace.leftOpen,
              mobilePanel: workspace.mobilePanel === "left" ? null : "left",
            })
          }
        >
          Library / Layers
        </button>
        <button
          type="button"
          onClick={() =>
            update({
              rightOpen: !workspace.rightOpen,
              mobilePanel: workspace.mobilePanel === "right" ? null : "right",
            })
          }
        >
          Inspector
        </button>
        <button
          type="button"
          onClick={() => {
            setHelp(true);
            setHelpQuery("");
          }}
        >
          Shortcuts
        </button>
      </div>
      {picking && (
        <div className="pb-wizard-picker-message" role="status">
          <p>Choose an element to configure.</p>
          <p>
            Click the canvas or choose a layer. Enter or Space confirms a
            focused element.
          </p>
          <p
            className="pb-wizard-picker-target"
            title={wizardTarget ? pathName(project, wizardTarget) : undefined}
          >
            {wizardTarget
              ? pathName(project, wizardTarget)
              : "No element targeted"}
          </p>
          {pickerError && <p role="alert">{pickerError}</p>}
          <button
            type="button"
            onClick={() => {
              setPicking(false);
              wandRef.current?.focus();
            }}
          >
            Cancel configuration
          </button>
        </div>
      )}
      {selection.length >= 2 && (
        <div className="pb-arrange-toolbar" aria-label="Arrange selection">
          {[
            "left",
            "centerX",
            "right",
            "top",
            "centerY",
            "bottom",
            "distributeX",
            "distributeY",
            "matchWidth",
            "matchHeight",
          ].map((operation) => (
            <button
              type="button"
              key={operation}
              disabled={
                readOnly ||
                selectedLocked ||
                !selection.every(
                  (id) =>
                    project.page.elements[id].positionMode === "absolute" &&
                    project.page.elements[id].parentId === active.parentId,
                )
              }
              onClick={() =>
                sendCommand({ type: "ARRANGE", ids: selection, operation })
              }
            >
              {{
                centerX: "Center horizontally",
                centerY: "Center vertically",
                distributeX: "Distribute horizontally",
                distributeY: "Distribute vertically",
                matchWidth: "Match width",
                matchHeight: "Match height",
              }[operation] || `Align ${operation}`}
            </button>
          ))}
        </div>
      )}
      <div
        className="pb-canvas-editor"
        style={{
          "--pb-left-size": workspace.leftOpen ? "265px" : "0px",
          "--pb-right-size": workspace.rightOpen ? "290px" : "0px",
        }}
      >
        <aside
          className={`pb-canvas-left ${workspace.leftOpen ? "" : "pb-panel-collapsed"}`}
          data-mobile-open={workspace.mobilePanel === "left"}
          aria-label="Components and Layers"
        >
          <button
            type="button"
            className="pb-mobile-close"
            onClick={() => update({ mobilePanel: null })}
          >
            Close library
          </button>
          <div className="pb-inspector-tabs">
            <button
              type="button"
              aria-pressed={workspace.leftTab === "palette"}
              onClick={() => update({ leftTab: "palette" })}
            >
              Components
            </button>
            <button
              type="button"
              aria-pressed={workspace.leftTab === "layers"}
              onClick={() => update({ leftTab: "layers" })}
            >
              Layers
            </button>
            <button
              type="button"
              aria-pressed={workspace.leftTab === "reusable"}
              onClick={() => update({ leftTab: "reusable" })}
            >
              Reusable
            </button>
          </div>
          <div className="pb-library-content">
            <ErrorBoundary panelName="Library">
              {workspace.leftTab === "reusable" ? (
                <ReusableControls library />
              ) : workspace.leftTab === "palette" ? (
                <Palette
                  picking={picking}
                  {...{
                    add,
                    parentId,
                    insertion,
                    setInsertion,
                    recentVersion,
                  }}
                />
              ) : (
                <Layers
                  picking={picking}
                  configure={configureTarget}
                  targetFocus={setWizardTarget}
                  expanded={workspace.expandedIds}
                  setExpanded={(expandedIds) => update({ expandedIds })}
                  reveal={reveal}
                  inspect={() => {
                    if (window.matchMedia?.("(max-width: 760px)").matches)
                      update({ mobilePanel: "right", rightOpen: true });
                  }}
                />
              )}
            </ErrorBoundary>
          </div>
        </aside>
        <section
          className={`pb-canvas-area ${picking ? "pb-wizard-picking" : ""}`}
          aria-label="Page canvas"
        >
          <div className="pb-canvas-toolbar">
            <label>
              Layout width
              <select
                aria-label="Layout width"
                value={workspace.viewport}
                onChange={(e) => update({ viewport: Number(e.target.value) })}
              >
                {![390, 768, 1280].includes(workspace.viewport) && (
                  <option value={workspace.viewport}>
                    Custom · {workspace.viewport}px
                  </option>
                )}
                <option value={390}>Mobile · 390px</option>
                <option value={768}>Tablet · 768px</option>
                <option value={1280}>Desktop · 1280px</option>
              </select>
            </label>
            <CommitField
              label="Custom canvas width"
              type="number"
              min={240}
              max={3840}
              value={workspace.viewport}
              onCommit={(viewport) =>
                update({ viewport: clamp(viewport, 240, 3840) })
              }
            />
            <label>
              Zoom
              <input
                type="range"
                min={50}
                max={200}
                step={1}
                value={Math.round(workspace.zoom * 100)}
                onChange={(e) => camera.zoomTo(Number(e.target.value) / 100)}
              />
            </label>
            <span>{Math.round(workspace.zoom * 100)}%</span>
            <button type="button" onClick={camera.fit}>
              Fit
            </button>
            <button type="button" onClick={() => camera.zoomTo(1)}>
              100%
            </button>
            <button
              type="button"
              onClick={() => {
                const ids = lastPoint.current
                  ? overlaps(lastPoint.current)
                  : [];
                setLayerMenu(
                  ids.length
                    ? ids
                    : Object.values(project.page.elements)
                        .filter((e) => !e.visibility.globalHidden)
                        .map((e) => e.id),
                );
              }}
            >
              Select layer
            </button>
          </div>
          {state.editor.masterEdit && (
            <div className="pb-master-banner">
              Editing master ·{" "}
              {project.masters[state.editor.masterEdit.masterId]?.name}
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "MASTER_MODE", id: null });
                }}
              >
                Exit master editing
              </button>
            </div>
          )}
          <div className="pb-rich-dock" aria-label="Inline text tools" />
          <ExternalPaste parentId={parentId} />
          <nav className="pb-breadcrumb" aria-label="Selection path">
            <button type="button" onClick={() => select([])}>
              Page
            </button>
            {active &&
              [...ancestors(project, active.id), active.id].map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => {
                    select([id]);
                    reveal(id);
                  }}
                >
                  {project.page.elements[id].name}
                </button>
              ))}
          </nav>
          <div
            ref={scrollRef}
            data-testid="canvas-scroll"
            className={`pb-canvas-scroll ${camera.panning ? "pb-camera-panning" : ""}`}
            {...camera.handlers}
            onClickCapture={pickerClick}
            onDoubleClickCapture={(event) => {
              if (picking || wizardId) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            onPointerDownCapture={pickerDown}
            onMouseDownCapture={pickerDown}
            onTouchStartCapture={pickerDown}
            onKeyDownCapture={pickerKey}
            onPointerMoveCapture={(event) => {
              if (picking) setWizardTarget(targetAt(event) || null);
            }}
            onFocusCapture={(event) => {
              if (picking) setWizardTarget(targetAt(event) || null);
            }}
            onScroll={(e) => {
              const scrollTop = e.currentTarget.scrollTop,
                scrollLeft = e.currentTarget.scrollLeft;
              setWorkspace((ws) => ({ ...ws, scrollTop, scrollLeft }));
            }}
            onClick={(event) => {
              if (
                !event.target.closest(
                  "[data-element-id],button,input,select,textarea",
                )
              )
                select([]);
            }}
          >
            <div
              className="pb-canvas-spacer"
              style={{
                width: workspace.viewport * workspace.zoom + 96,
                height: pageHeight * workspace.zoom + 96,
              }}
            >
              <div
                className="pb-canvas-stage"
                style={{
                  width: workspace.viewport,
                  transform: `scale(${workspace.zoom})`,
                }}
              >
                <div
                  ref={documentRef}
                  data-container-id="__page_root__"
                  className="pb-canvas-document"
                  style={reactStyles(project.globalStyles)}
                >
                  {project.page.rootElementIds.map((id) => (
                    <CanvasNode
                      key={id}
                      {...{
                        id,
                        project,
                        selection,
                        selectAt,
                        pointer,
                        readOnly,
                        canDrop,
                        workspace,
                        picking,
                        wizardTarget,
                      }}
                      draft={pointer.draft}
                      guides={pointer.draft}
                    />
                  ))}
                  {!project.page.rootElementIds.length && (
                    <div className="pb-blank-page">
                      <h3>Your page starts here.</h3>
                      <p>Add a component or drop one onto this page.</p>
                    </div>
                  )}
                  <DropZone
                    id="root-end"
                    parentId={null}
                    label="At end of page"
                    canDrop={canDrop}
                    className={`pb-drop-root ${!project.page.rootElementIds.length ? "pb-drop-empty" : ""}`}
                  />
                  {pointer.draft?.parentId === null &&
                    pointer.draft.guides.map((g, i) => (
                      <i
                        key={i}
                        className={`pb-snap-guide pb-snap-${g.axis}`}
                        style={
                          g.axis === "x"
                            ? { left: `${g.at}%` }
                            : { top: `${g.at}%` }
                        }
                      />
                    ))}
                </div>
                <button
                  type="button"
                  aria-label="Resize canvas width"
                  className="pb-canvas-width-handle"
                  style={{
                    width: 24 / workspace.zoom,
                    right: -24 / workspace.zoom,
                  }}
                  onPointerDown={startWidth}
                  onPointerMove={moveWidth}
                  onPointerUp={(event) => endWidth(event)}
                  onPointerCancel={(event) => endWidth(event, true)}
                  onLostPointerCapture={(event) => endWidth(event, true)}
                  onClick={(event) => event.stopPropagation()}
                >
                  ↔
                </button>
              </div>
            </div>
          </div>
          <p className="pb-canvas-caption" aria-live="polite">
            {selection.length
              ? `${selection.length} selected · ${active?.name || ""}`
              : "Select an element to begin."}{" "}
            · Links stay inactive in the editor.
          </p>
        </section>
        <aside
          className={`pb-canvas-right ${workspace.rightOpen ? "" : "pb-panel-collapsed"}`}
          data-mobile-open={workspace.mobilePanel === "right"}
          aria-label="Element inspector"
        >
          <button
            type="button"
            className="pb-mobile-close"
            onClick={() => update({ mobilePanel: null })}
          >
            Close inspector
          </button>
          <ErrorBoundary panelName="Inspector">
            <CanvasInspector
              tab={workspace.inspectorTab}
              setTab={(inspectorTab) => update({ inspectorTab })}
              {...{ placements, requestDelete }}
            />
          </ErrorBoundary>
        </aside>
      </div>
      {Object.keys(project.page.elements).length > 200 && (
        <p className="pb-banner pb-warning">
          This page has more than 200 elements. Complex pages may respond more
          slowly; there is no separate element-count cap.
        </p>
      )}
      <DragOverlay>
        {drag && <div className="pb-drag-overlay">{drag.label}</div>}
      </DragOverlay>
      {deletion && (
        <Modal title="Remove container" onClose={() => setDeletion(null)}>
          <p>
            Choose whether to remove its content or keep the children. Locked
            descendants are protected.
          </p>
          <div className="pb-modal-actions">
            <button type="button" onClick={() => setDeletion(null)}>
              Cancel
            </button>
            {deletion.length === 1 && (
              <button
                type="button"
                onClick={() => {
                  const node = project.page.elements[deletion[0]];
                  sendCommand({
                    type: "DELETE",
                    ids: deletion,
                    mode: "unwrap",
                    placements: placements(node.children, node.parentId),
                  });
                  setDeletion(null);
                }}
              >
                Remove container, keep children
              </button>
            )}
            <button
              type="button"
              className="pb-danger"
              onClick={() => {
                sendCommand({ type: "DELETE", ids: deletion });
                setDeletion(null);
              }}
            >
              Delete container and contents
            </button>
          </div>
        </Modal>
      )}
      {layerMenu && (
        <Modal title="Select a layer" onClose={() => setLayerMenu(null)}>
          <div className="pb-layer-picker">
            {layerMenu.map((id) => (
              <button
                type="button"
                key={id}
                onClick={() => {
                  select([id]);
                  reveal(id);
                  setLayerMenu(null);
                }}
              >
                {pathName(project, id)}
                {isLocked(project, id) ? " · locked" : ""}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="Keyboard and canvas controls"
          onClose={() => setHelp(false)}
        >
          <label>
            Search shortcuts
            <input
              type="search"
              value={helpQuery}
              onChange={(e) => setHelpQuery(e.target.value)}
            />
          </label>
          <dl className="pb-shortcuts">
            {SHORTCUTS.filter((entry) =>
              entry.join(" ").toLowerCase().includes(helpQuery.toLowerCase()),
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>
            Shortcuts leave text inputs to the browser. Undo history is limited
            to 50 semantic actions and resets when you switch projects or
            reload.
          </p>
        </Modal>
      )}
    </DndContext>
  );
  return (
    <>
      {canvas}
      {wizardId && (
        <ElementWizard
          key={`${project.projectId}:${wizardId}`}
          targetId={wizardId}
          designWidth={workspace.viewport}
          measure={placements}
          restoreFocus={restoreWizardFocus}
          onClose={() => setWizardId(null)}
        />
      )}
    </>
  );
}
