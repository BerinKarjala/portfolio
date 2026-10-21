import { connectHttpDesigner, DesignerError } from "./httpDesigner";
import {
  lazy,
  Suspense,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  SEASONS,
  HOLIDAYS,
  STORAGE_KEY,
  initialPreferences,
  readPreferences,
  resolveTheme,
  updateProfile,
  resetProfile,
  restoreReset,
  exportCss,
  profileId,
} from "./theme";
import { moonPath, moonPhase } from "./moon";
import "./studio.css";
import Voice from "./Voice";
import {
  unavailableDesigner,
  makeRequest,
  validateProposal,
  canApply,
} from "./ai";
import { useGeneratedImages, saveDownload } from "./useGeneratedImages";
import { isGeneratedId, generatedPath } from "./imageIds";
import GeneratedHistory from "./GeneratedHistory";
import { selectedBackground, backgroundUrl } from "./backgrounds";
const PhotoLibrary = lazy(() => import("./PhotoLibrary"));
const PhotoCredit = lazy(() =>
  import("./PhotoLibrary").then((module) => ({ default: module.PhotoCredit })),
);
const Examples = lazy(() => import("./Examples"));
const StudioContext = createContext(null);
export function StudioProvider({
  children,
  designer: suppliedDesigner,
  connectDesigner = false,
  imageCache,
}) {
  const [connectedDesigner, setConnectedDesigner] =
    useState(unavailableDesigner);
  const designer = suppliedDesigner ?? connectedDesigner;
  const operations = designer.operations ?? ["theme", "image", "refine"];
  const supports = (operation) =>
    designer.available && operations.includes(operation);
  const connection = useRef(null);
  const [loaded] = useState(() => {
    try {
      return readPreferences(window.localStorage);
    } catch {
      return {
        preferences: initialPreferences(),
        warning: "Settings cannot be saved in this browser.",
      };
    }
  });
  const [preferences, setPreferences] = useState(loaded.preferences);
  const generated = useGeneratedImages(imageCache);
  const [generatedOpen, setGeneratedOpen] = useState(false);
  const [comparison, setComparison] = useState([]);
  const [operation, setOperation] = useState("theme");
  const currentGeneratedId =
    preferences[preferences.family][profileId(preferences)]?.backgroundId;
  useEffect(() => {
    if (isGeneratedId(currentGeneratedId))
      void generated.ensure(currentGeneratedId);
  }, [currentGeneratedId, generated.ensure]);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState(new Set());
  const photoProfile = `${preferences.family}:${preferences.family === "holidays" ? preferences.holiday : preferences.season}:${preferences[preferences.family][preferences.family === "holidays" ? preferences.holiday : preferences.season]?.backgroundId || "auto"}`;
  useEffect(() => setFailedPhotos(new Set()), [photoProfile]);
  const photo = preferences.themed
    ? selectedBackground(preferences, failedPhotos, generated.images)
    : null;
  const [warning, setWarning] = useState(loaded.warning);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || !connectDesigner || suppliedDesigner || connection.current)
      return;
    const controller = new AbortController();
    connection.current = controller;
    void connectHttpDesigner({ signal: controller.signal }).then((remote) => {
      if (!controller.signal.aborted) setConnectedDesigner(remote);
    });
  }, [open, connectDesigner, suppliedDesigner]);
  useEffect(() => () => connection.current?.abort(), []);
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(false);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia?.("(max-width: 900px)").matches ?? false,
  );
  const [history, setHistory] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [aiStatus, setAiStatus] = useState("");
  const [pending, setPending] = useState(false);
  const activeRequest = useRef(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  const [draft, setDraft] = useState("");
  const [undo, setUndo] = useState(null);
  const pinState = useRef(null);
  pinState.current = { preferences, undo, proposal, comparison };
  function pinnedIds() {
    const state = pinState.current;
    return [
      ...Object.values(state.preferences.seasons),
      ...Object.values(state.preferences.holidays),
    ]
      .map((profile) => profile.backgroundId)
      .concat(
        state.undo?.previous?.backgroundId,
        state.proposal?.imageId,
        state.comparison,
      )
      .filter(isGeneratedId);
  }
  const [unsavedUrl, setUnsavedUrl] = useState("");
  const [savingPreview, setSavingPreview] = useState(false);
  useEffect(() => {
    if (!proposal?.unsavedImage) {
      setUnsavedUrl("");
      return;
    }
    const url = URL.createObjectURL(proposal.unsavedImage);
    setUnsavedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [proposal?.unsavedImage]);
  const [css, setCss] = useState("");
  const [examples, setExamples] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const launcher = useRef(null);
  const navLauncher = useRef(null);
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 900px)");
    const change = () => {
      setNarrow(media.matches);
      if (media.matches && left && right) setRight(false);
    };
    media?.addEventListener("change", change);
    return () => media?.removeEventListener("change", change);
  }, [left, right]);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      setWarning(
        "Settings cannot be saved in this browser. You can still edit and copy CSS.",
      );
    }
  }, [preferences]);
  useEffect(() => {
    const root = document.documentElement;
    const tokens = resolveTheme(preferences, {
      failed: failedPhotos,
      generatedImages: generated.images,
    });
    if (preferences.themed) {
      root.setAttribute("data-studio-theme", "");
      for (const [key, value] of Object.entries(tokens))
        root.style.setProperty(key, value);
    } else {
      root.removeAttribute("data-studio-theme");
      for (const key of Object.keys(tokens)) root.style.removeProperty(key);
    }
    return () => {
      root.removeAttribute("data-studio-theme");
      for (const key of Object.keys(tokens)) root.style.removeProperty(key);
    };
  }, [preferences, failedPhotos, generated.images]);
  function launch(event) {
    launcher.current = event.currentTarget;
    setOpen(true);
    if (!left && !right) setLeft(true);
  }
  function close() {
    setOpen(false);
    (launcher.current?.isConnected
      ? launcher.current
      : navLauncher.current
    )?.focus();
  }
  function toggle(side) {
    if (side === "left") {
      setLeft(!left);
      if (narrow) setRight(false);
    } else {
      setRight(!right);
      if (narrow) setLeft(false);
    }
  }
  function choose(changes) {
    setCss("");
    setPreferences((p) => ({ ...p, themed: true, ...changes }));
  }
  const tokens = resolveTheme(preferences, {
    failed: failedPhotos,
    generatedImages: generated.images,
  });
  const profile =
    preferences[preferences.family][
      preferences.family === "holidays"
        ? preferences.holiday
        : preferences.season
    ] || {};
  async function copy() {
    const value = exportCss(preferences, {
      failed: failedPhotos,
      assetBase: "./css-studio/",
      generatedImages: generated.images,
    });
    setCss(value);
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("CSS copied.");
    } catch {
      setCopyStatus("Select and copy the CSS below.");
    }
  }
  async function send() {
    if (!supports(operation) || pending) return;
    let request;
    try {
      request = makeRequest(preferences, draft, history, undefined, {
        operation,
        baseImageId: currentGeneratedId,
      });
    } catch (error) {
      setAiStatus(error.message);
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setRequestId(request.id);
    setProposal(null);
    setAiStatus("Designing…");
    setHistory((h) =>
      [...h, { role: "user", text: request.prompt }].slice(-30),
    );
    setDraft("");
    try {
      const baseImage =
        request.operation === "refine"
          ? await generated.ensure(request.baseImageId)
          : null;
      if (controller.signal.aborted) return;
      if (request.operation === "refine" && !baseImage)
        throw Error("Selected image unavailable");
      const response = await designer.propose(request, {
        signal: controller.signal,
        ...(baseImage
          ? { baseImage: baseImage.blob, baseReceipt: baseImage.receipt }
          : {}),
      });
      if (controller.signal.aborted) return;
      let result = validateProposal(response, request);
      if (result.image) {
        const saved = await generated.save(
          {
            blob: result.image,
            context: request.context,
            parentId: request.baseImageId,
            receipt: result.receipt,
          },
          pinnedIds,
        );
        if (controller.signal.aborted) {
          if (saved.recordId) await generated.remove(saved.recordId, pinnedIds);
          return;
        }
        const { image: responseBytes, ...proposalData } = result;
        result = {
          ...proposalData,
          ...saved,
          ...(saved.image
            ? {
                imageId: saved.image.id,
                overrides: {
                  ...result.overrides,
                  backgroundId: saved.image.id,
                },
              }
            : {}),
        };
      }
      if (controller.signal.aborted) return;
      setProposal(result);
      setHistory((h) =>
        [...h, { role: "assistant", text: result.message }].slice(-30),
      );
      setAiStatus("Review the proposal before applying.");
    } catch (error) {
      if (!controller.signal.aborted)
        setAiStatus(
          error instanceof DesignerError
            ? error.publicMessage
            : "The designer could not complete this request. Your existing theme is unchanged.",
        );
    } finally {
      if (activeRequest.current === controller) {
        setPending(false);
        activeRequest.current = null;
      }
    }
  }
  async function retryImageSave() {
    if (!proposal?.unsavedImage || savingPreview) return;
    const original = proposal;
    setSavingPreview(true);
    try {
      const saved = await generated.save(
        {
          blob: original.unsavedImage,
          context: original.context,
          parentId: original.baseImageId,
          receipt: original.receipt,
        },
        pinnedIds,
      );
      setProposal((current) => {
        if (current !== original) return current;
        if (!saved.image)
          return { ...current, imageWarning: saved.imageWarning };
        const { unsavedImage, imageWarning, ...rest } = current;
        return {
          ...rest,
          ...saved,
          imageId: saved.image.id,
          overrides: { ...rest.overrides, backgroundId: saved.image.id },
        };
      });
    } catch {
      setAiStatus(
        "This preview could not be saved. You can still download it.",
      );
    } finally {
      setSavingPreview(false);
    }
  }
  const value = { launch, navLauncher };
  return (
    <StudioContext.Provider value={value}>
      {open && (
        <section className="studio-toolbar" aria-label="Theme Studio tools">
          <strong>Theme Studio</strong>
          <button
            onClick={() => toggle("left")}
            aria-expanded={left}
            aria-controls="studio-styles"
          >
            Styles
          </button>
          <button
            onClick={() => toggle("right")}
            aria-expanded={right}
            aria-controls="studio-chat"
          >
            Chat
          </button>
          <button onClick={close}>Close tools</button>
        </section>
      )}
      {examples && (
        <Suspense fallback={<p role="status">Opening examples…</p>}>
          <Examples
            preferences={preferences}
            failed={failedPhotos}
            generatedImages={generated.images}
            onClose={() => setExamples(false)}
          />
        </Suspense>
      )}
      <div
        className={`studio-layout ${open && left ? "studio-has-left" : ""} ${open && right ? "studio-has-right" : ""}`}
      >
        {open && left && (
          <aside
            id="studio-styles"
            className="studio-panel studio-left"
            aria-label="Theme and style controls"
          >
            <h2>Make it your season</h2>
            <p>
              Presets set CSS variables across the portfolio. Your edits save in
              this browser.
            </p>
            {warning && <p role="status">{warning}</p>}
            {generated.warning && <p role="status">{generated.warning}</p>}
            {failedPhotos.size > 0 && (
              <p role="status">
                The selected photo could not load. A fallback background is
                shown.
              </p>
            )}
            <label>
              Theme family
              <select
                value={preferences.family}
                onChange={(e) => choose({ family: e.target.value })}
              >
                <option value="seasons">Seasons</option>
                <option value="holidays">Holidays</option>
              </select>
            </label>
            {preferences.family === "seasons" ? (
              <label>
                Season
                <select
                  value={preferences.season}
                  onChange={(e) => choose({ season: e.target.value })}
                >
                  {Object.entries(SEASONS).map(([id, [name]]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label>
                  Holiday
                  <select
                    value={preferences.holiday}
                    onChange={(e) => choose({ holiday: e.target.value })}
                  >
                    {Object.entries(HOLIDAYS).map(([id, [name]]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {HOLIDAYS[preferences.holiday][2]}. Manually selected; no
                  calendar detection.
                </p>
              </>
            )}
            <label>
              Appearance
              <select
                value={preferences.mode}
                onChange={(e) => choose({ mode: e.target.value })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="studio-checkbox">
              <input
                type="checkbox"
                checked={preferences.contrast}
                onChange={(e) => choose({ contrast: e.target.checked })}
              />
              High Contrast
            </label>
            {["accent", "background", "text"].map((key) => (
              <label key={key}>
                {key[0].toUpperCase() + key.slice(1)} color
                <input
                  type="color"
                  value={profile[key] || tokens[`--studio-${key}`]}
                  onChange={(e) => {
                    setCss("");
                    setPreferences((p) =>
                      updateProfile(p, { [key]: e.target.value }),
                    );
                  }}
                />
              </label>
            ))}
            <p>
              High Contrast uses protected foregrounds and surfaces. Saved color
              edits return when it is off. Text is adjusted for readable
              contrast when needed.
            </p>
            <label>
              Font
              <select
                value={profile.font || "system"}
                onChange={(e) =>
                  setPreferences((p) =>
                    updateProfile(p, { font: e.target.value }),
                  )
                }
              >
                <option value="system">System sans serif</option>
                <option value="serif">Georgia serif</option>
                <option value="mono">System monospace</option>
              </select>
            </label>
            <label>
              Button shape
              <select
                value={profile.radius || "8px"}
                onChange={(e) =>
                  setPreferences((p) =>
                    updateProfile(p, { radius: e.target.value }),
                  )
                }
              >
                <option value="0px">Square</option>
                <option value="8px">Soft</option>
                <option value="20px">Rounded</option>
              </select>
            </label>
            <button
              onClick={() => {
                const reset = resetProfile(preferences);
                setUndo(reset.undo);
                setPreferences(reset.preferences);
              }}
            >
              Reset current{" "}
              {preferences.family === "holidays" ? "holiday" : "season"}
            </button>
            {undo && (
              <button
                onClick={() => {
                  setPreferences((p) => restoreReset(p, undo));
                  setUndo(null);
                }}
              >
                Undo reset
              </button>
            )}
            <button onClick={() => choose({ themed: false })}>
              Restore original portfolio appearance
            </button>
            <button onClick={() => setPhotosOpen((v) => !v)}>
              Choose a background photo
            </button>
            {photosOpen && (
              <Suspense fallback={<p role="status">Opening photos…</p>}>
                <PhotoLibrary
                  preferences={preferences}
                  failed={failedPhotos}
                  generatedImages={generated.images}
                  getGeneratedImage={(id) => generated.cache.get(id)}
                  onSelect={(backgroundId) =>
                    setPreferences((p) => updateProfile(p, { backgroundId }))
                  }
                />
              </Suspense>
            )}
            <button
              onClick={() => {
                setGeneratedOpen((value) => !value);
                void generated.refresh();
              }}
            >
              Generated backgrounds
            </button>
            {generatedOpen && (
              <GeneratedHistory
                preferences={preferences}
                generated={generated}
                comparison={comparison}
                setComparison={setComparison}
                pinnedIds={pinnedIds}
                onSelect={(image) =>
                  setPreferences((p) =>
                    image.context.family === p.family &&
                    image.context.id === profileId(p)
                      ? updateProfile(p, { backgroundId: image.id })
                      : p,
                  )
                }
              />
            )}
            <button onClick={() => setExamples(true)}>
              Preview Page Builder examples
            </button>
            <button disabled={!preferences.themed} onClick={copy}>
              Copy CSS variables
            </button>
            {!preferences.themed && (
              <p>
                Choose a preset or edit a control to apply a theme before
                exporting.
              </p>
            )}
            {css && (
              <>
                <p role="status">{copyStatus}</p>
                <label>
                  Reusable CSS
                  <textarea
                    readOnly
                    value={exportCss(preferences, {
                      failed: failedPhotos,
                      assetBase: "./css-studio/",
                      generatedImages: generated.images,
                    })}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <p>
                  These variables match the active preset. Photo paths are
                  relative to your stylesheet; Download portable theme includes
                  the image and its credits.
                </p>
              </>
            )}
          </aside>
        )}
        <div className="studio-canvas">
          {photo && (
            <img
              className="studio-photo-probe"
              alt=""
              aria-hidden="true"
              src={backgroundUrl(photo)}
              onError={() =>
                setFailedPhotos((previous) => new Set([...previous, photo.id]))
              }
            />
          )}
          {children}
          {photo && (
            <details className="studio-photo-attribution">
              <summary>
                Background: {photo.title}
                {photo.kind === "generated" ? "" : " · photo credits"}
              </summary>
              {photo.kind === "generated" ? (
                <p>
                  Generated background · saved in this browser. No curated-photo
                  license is claimed.
                </p>
              ) : (
                <Suspense fallback={<p>Loading photo credits…</p>}>
                  <PhotoCredit imageId={photo.id} />
                </Suspense>
              )}
            </details>
          )}
        </div>
        {open && right && (
          <aside
            id="studio-chat"
            className="studio-panel studio-right"
            aria-label="AI designer"
          >
            <h2>Conversational designer</h2>
            <p role="status">
              {designer.available
                ? aiStatus
                : "AI design is currently unavailable. Keep exploring presets and manual controls."}
            </p>
            {generated.warning && <p role="status">{generated.warning}</p>}
            <ol aria-label="Conversation">
              {history.map((message, index) => (
                <li key={index}>
                  <strong>
                    {message.role === "user" ? "You" : "Designer"}:{" "}
                  </strong>
                  {message.text}
                </li>
              ))}
            </ol>
            <label>
              Design action
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
                disabled={pending || !designer.available}
              >
                <option value="theme" disabled={!supports("theme")}>
                  Theme styling
                </option>
                <option value="image" disabled={!supports("image")}>
                  Generate background
                </option>
                <option
                  value="refine"
                  disabled={
                    !supports("refine") || !isGeneratedId(currentGeneratedId)
                  }
                >
                  Refine selected background
                </option>
              </select>
            </label>
            <label>
              Message
              <textarea
                maxLength={4000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Describe your theme…"
              />
            </label>
            <p>Your draft stays here during this visit.</p>
            <Voice draft={draft} setDraft={setDraft} />
            <button
              disabled={
                !supports(operation) ||
                pending ||
                savingPreview ||
                !draft.trim()
              }
              onClick={send}
            >
              Send
            </button>
            {pending && (
              <button
                onClick={() => {
                  activeRequest.current?.abort();
                  activeRequest.current = null;
                  setPending(false);
                  setRequestId(null);
                  setAiStatus("Request canceled.");
                }}
              >
                Cancel request
              </button>
            )}
            {proposal && (
              <section aria-label="Theme proposal">
                <h3>Proposed theme</h3>
                <p>
                  For {proposal.context.id} · {proposal.context.mode}
                  {proposal.context.contrast ? " · High Contrast" : ""}
                </p>
                <p>{proposal.message}</p>
                <div
                  className="studio-proposal-preview"
                  style={resolveTheme(
                    updateProfile(
                      {
                        ...preferences,
                        family: proposal.context.family,
                        ...(proposal.context.family === "holidays"
                          ? { holiday: proposal.context.id }
                          : { season: proposal.context.id }),
                        mode: proposal.context.mode,
                        contrast: proposal.context.contrast,
                      },
                      proposal.overrides,
                    ),
                    { generatedImages: generated.images },
                  )}
                >
                  <p>Preview your proposed palette and typography</p>
                  <button disabled>Example button</button>
                </div>
                {(proposal.imageId || unsavedUrl) && (
                  <img
                    className="studio-generated-preview"
                    src={
                      proposal.imageId
                        ? generated.images[proposal.imageId]?.displayUrl
                        : unsavedUrl
                    }
                    alt="Proposed generated background"
                  />
                )}
                {proposal.imageWarning && (
                  <p role="status">
                    {proposal.imageWarning} Download this preview before
                    leaving.
                  </p>
                )}
                {(proposal.imageId || proposal.unsavedImage) && (
                  <button
                    onClick={async () => {
                      const image = proposal.imageId
                        ? await generated.cache.get(proposal.imageId)
                        : null;
                      const blob = image?.blob || proposal.unsavedImage;
                      if (blob)
                        saveDownload(
                          blob,
                          image
                            ? generatedPath(image).split("/").pop()
                            : `background-preview.${proposal.unsavedImage.type.split("/")[1] === "jpeg" ? "jpg" : proposal.unsavedImage.type.split("/")[1]}`,
                        );
                    }}
                  >
                    Download proposed background
                  </button>
                )}
                {proposal.unsavedImage && (
                  <button disabled={savingPreview} onClick={retryImageSave}>
                    Save proposed background
                  </button>
                )}
                <pre>{JSON.stringify(proposal.overrides, null, 2)}</pre>
                <button
                  disabled={
                    Boolean(proposal.unsavedImage) ||
                    !canApply(proposal, preferences, requestId)
                  }
                  onClick={() => {
                    if (
                      !proposal.unsavedImage &&
                      canApply(proposal, preferences, requestId)
                    ) {
                      setPreferences((p) =>
                        canApply(proposal, p, requestId)
                          ? updateProfile(p, proposal.overrides)
                          : p,
                      );
                      setProposal(null);
                      setAiStatus("Theme applied.");
                    }
                  }}
                >
                  Apply proposal
                </button>
                <p>
                  {proposal.unsavedImage
                    ? "Free space in image history, then save this preview before applying."
                    : canApply(proposal, preferences, requestId)
                      ? "Applies only after you choose Apply."
                      : "Return to the original preset, appearance and selected background to apply this proposal."}
                </p>
              </section>
            )}
          </aside>
        )}
      </div>
    </StudioContext.Provider>
  );
}
export function MoonLauncher() {
  const context = useContext(StudioContext);
  const { launch, navLauncher } = context || {};
  const [phase, setPhase] = useState(() => moonPhase());
  const id = useId();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "hidden") setPhase(moonPhase());
    };
    const timer = setInterval(refresh, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  if (!context) return null;
  return (
    <span className="studio-launch-wrap">
      <button
        ref={navLauncher}
        className="studio-moon"
        aria-label="Theme Studio"
        aria-describedby={id}
        onClick={launch}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="12" fill="#334155" stroke="#e2e8f0" />
          <path d={moonPath(phase)} fill="#f8fafc" />
        </svg>
      </button>
      <span id={id} role="tooltip" className="studio-tooltip">
        Theme Studio
      </span>
    </span>
  );
}
export function StudioGalleryEntry() {
  const context = useContext(StudioContext);
  if (!context) return null;
  const { launch } = context;
  return (
    <article className="studio-gallery">
      <p>FOUR SEASONS</p>
      <h3>CSS Theme Studio</h3>
      <p>
        Style this portfolio with seasonal and international holiday palettes.
        Explore CSS variables and keep your own presets.
      </p>
      <button onClick={launch}>Open Theme Studio</button>
    </article>
  );
}
