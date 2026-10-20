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
const Examples = lazy(() => import("./Examples"));
const StudioContext = createContext(null);
export function StudioProvider({ children, designer = unavailableDesigner }) {
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
  const [warning, setWarning] = useState(loaded.warning);
  const [open, setOpen] = useState(false);
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
    const tokens = resolveTheme(preferences);
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
  }, [preferences]);
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
  const tokens = resolveTheme(preferences);
  const profile =
    preferences[preferences.family][
      preferences.family === "holidays"
        ? preferences.holiday
        : preferences.season
    ] || {};
  async function copy() {
    const value = exportCss(preferences);
    setCss(value);
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("CSS copied.");
    } catch {
      setCopyStatus("Select and copy the CSS below.");
    }
  }
  async function send() {
    if (!designer.available || pending) return;
    let request;
    try {
      request = makeRequest(preferences, draft, history);
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
      const response = await designer.propose(request, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const result = validateProposal(response, request);
      setProposal(result);
      setHistory((h) =>
        [...h, { role: "assistant", text: result.message }].slice(-30),
      );
      setAiStatus("Review the proposal before applying.");
    } catch {
      if (!controller.signal.aborted)
        setAiStatus(
          "The designer could not complete this request. Your existing theme is unchanged.",
        );
    } finally {
      if (activeRequest.current === controller) {
        setPending(false);
        activeRequest.current = null;
      }
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
                    value={exportCss(preferences)}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <p>
                  These variables match the active preset. Reference them in
                  your own stylesheet to reuse the design.
                </p>
              </>
            )}
          </aside>
        )}
        <div className="studio-canvas">{children}</div>
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
              disabled={!designer.available || pending || !draft.trim()}
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
                    updateProfile(preferences, proposal.overrides),
                  )}
                >
                  <p>Preview your proposed palette and typography</p>
                  <button disabled>Example button</button>
                </div>
                <pre>{JSON.stringify(proposal.overrides, null, 2)}</pre>
                <button
                  disabled={!canApply(proposal, preferences, requestId)}
                  onClick={() => {
                    if (canApply(proposal, preferences, requestId)) {
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
                  {canApply(proposal, preferences, requestId)
                    ? "Applies only after you choose Apply."
                    : "Return to the original preset and appearance to apply this proposal."}
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
