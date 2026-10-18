# Page Builder: project and canvas guide

Open **Projects → HTML Page Builder**. The left preview launches the workspace full screen; the right panel displays the implementation source. Use **Close** or Escape to return to the portfolio project page.

Choose **New project**, enter a name, and select Blank, Portfolio, Landing, Business, Blog, Contact or Gallery. You can edit page title, description, language, favicon URL and indexing settings. Changes save about one second after you stop typing. Use Components to add elements, move handles to arrange them, and Layers to inspect or reorder them. Use **Preview selected template** before creating a project, or **Preview and export** from the editor to review and download its webpage.

The dashboard supports search, template filtering, favorites, sorting, and grid/list views. Rename and duplicate projects from their cards. Trash retains deleted projects indefinitely; restore them or explicitly delete them permanently. Browser storage usage includes Trash.

Use a card's **JSON** button for one project, **Back up all projects** for your collection, or select cards and choose **Back up selected**. Enable **Include Trash in backup** if needed. Backups download to your device; they are not saved to an account or cloud service. Clearing site data removes local projects.

**Import JSON** previews a project or collection backup before changing anything. Select valid entries, review duplicate comparisons, then confirm restore. Restored projects are independent copies; existing projects are preserved and duplicate names are numbered. Trashed entries remain in Trash. Invalid records are excluded with an explanation.

If saving fails, keep the workspace open. Use **Download unsaved JSON**, free browser storage if needed, and choose **Retry save now**. The last successful save remains intact. An unfinished invalid setting can be included in a recovery download and may need correction before that file can be imported.

When another tab owns the project, settings are read-only. **Take over editing** starts editing immediately and may cause the other tab's unsaved work to be lost. A tab with unsaved changes should download its JSON before reloading or taking over.

Damaged or unsupported saved records appear under **Stored data needs attention**. Download their original stored data before deleting them. Import a known-good JSON backup to restore an independent project copy. Raw diagnostic recovery data is for manual recovery and is not a normal project backup.

An already-open session can continue offline using local storage. Reopening the app offline is not guaranteed. Close/back actions and page-exit events try to flush pending changes, but browser/process termination can skip these events. Download backups regularly.


Choose **Content** to rename an element or edit its initial text/link/image settings. **Layout** changes its parent, flow sizing, Flex/Grid behavior, free-form placement, z-index or visibility. **Style**, **Effects** and **Accessibility** provide visual design, animation and breakpoint controls. **Page** holds metadata and global styles/effects.

Move components with a mouse, touch long press, or keyboard: focus a drag/move handle, press Space, use arrows to choose a drop target, then Space/Enter to drop. Escape cancels. Add buttons, Layers reorder controls and the **Move into** selector offer alternatives. Nest at most four levels; illegal or locked targets are blocked.

Select several elements with Shift/Ctrl/Command click, or checkboxes in Layers. Use Group/Ungroup or internal Copy/Cut/Paste; shortcuts follow the same rules and leave text fields to the browser. Delete a container and choose whether to keep its children. Locked descendants protect themselves from parent operations. Undo/Redo keeps up to 50 actions for this open session and resets after reload/project switching.

Free-form positions are percentages of the parent. Drag the move handle or resize corner, or enter numbers in Layout. Alt bypasses snapping; Shift preserves resize proportions. Alignment/distribution/match-size tools apply to compatible free-form siblings. For overlapping elements, use Alt/Option click, **Select layer**, breadcrumbs or Layers.

Choose a viewport preset, enter a custom width, or drag the canvas edge. Zoom with the slider, Fit/100%, or Ctrl/Command wheel. Pan with Space-drag/middle-drag, or touch background gestures; pinch zoom uses two fingers. Viewport/zoom/scroll/panels/selection are restored separately from the page and do not create undo actions. On mobile, **Library / Layers** and **Inspector** open drawers.


Double-click/double-tap text or choose **Edit rich text**. Select text and use the toolbar for fonts, weights, colors, highlight, links, icons and superscript/subscript. The toolbar stays full size when zooming. **Done editing text** or Escape finishes editing; Ctrl/Command Z uses builder history. Pasted content becomes plain text. Editing the plain **Text content** field replaces rich formatting.

Forms, tables, galleries and media have contextual Content controls. Form visitor inputs and submission stay disabled in the editing canvas; only field definitions are saved. Form endpoints require HTTPS; GET warns about personal information in URLs. Embeds require a supported provider URL and load only when requested. Replace sample image URLs with your own hosted images; original artwork placeholders appear if samples cannot load.

In **Style**, use categories for typography, sizing/spacing, appearance and transitions. Enter HEX, RGB(A) or HSL(A) colors, change alpha, and save swatches. Select a state to edit hover/focus/active/disabled styling. **Style presets** creates shared category presets, parent inheritance and variants; the computed-values table shows the result. **Computed box model** displays measured margin, border, padding and CSS size. Reset an individual override to use inherited styling. Removing a preset confirms that its appearance will be baked into independent styles. A linked component may be detached when that is necessary to preserve a different parent context; Undo restores the operation.

**Make reusable component** turns a selected tree into a linked master. Open **Reusable** to insert it again. **Edit master** from any instance updates shared content/styles everywhere; placement, sizing, visibility and locks remain local. **Exit master editing** returns to instance controls. **Detach component** makes it independent. Removing a used master asks to detach its instances while keeping their appearance. The Reusable panel can copy another saved project's master and style dependencies as an independent definition.

**Effects** configures animations, triggers, timing, repetition and direction. Inherit uses the global page animation; None disables it. Pause/Replay affect this editor session. Reduced-motion preferences suppress animations. **Accessibility** edits labels and responsive visibility; image descriptions, form labels, media captions and table headers are in Content. Sticky containers are available in Layout, with an offset and overflow warning.


In **Preview and export**, choose Mobile (390px), Tablet (768px), Desktop (1280px), a numeric width, or drag the resize handle. Arrow keys also resize the preview. The preview keeps its real layout width; scroll horizontally when it is wider than the panel. Section links, native menus and form controls work. External navigation and form submission are blocked; visitor entries are never saved. Some external players require capabilities that the isolated preview blocks.

Review **Preflight** before downloading. Critical errors block all output. Use **Show affected element** to select and inspect an affected node, or **Back to editor** to fix page settings. Warnings require the **I reviewed the warnings and want to export** checkbox. A warning about an external background or remote resource does not establish whether that resource works for every visitor. Review responsive appearance, accessibility and URLs yourself.

**Download website ZIP** contains exactly `index.html` and `styles.css`; its filename comes from the project name. **Individual files** downloads the same files separately. Keep both files in one folder. The webpage uses native HTML/CSS with no generated JavaScript. External images, fonts, media, embeds and form endpoints still depend on their providers. HTML and CSS tabs show the final exported code with line numbers and copy; use **Select code manually** if clipboard access is unavailable. Use a JSON backup to reopen and edit your project later.

Collection restores show a downloadable per-project **Restore report**. The default is to roll back newly added copies after a batch failure where possible. Choose **Keep successful copies if some restores fail** only when you want partial recovery. A report identifies any copy that could not be rolled back. Existing saved projects are preserved in either mode.

If the Library or Inspector fails, retry that panel. A critical canvas failure pauses saving and offers stored-data and unsaved JSON recovery before restarting. **Copy diagnostics** and **Download diagnostics** in export review contain diagnostic codes only, without your page content or URLs.
