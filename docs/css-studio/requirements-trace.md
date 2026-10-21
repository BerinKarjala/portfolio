# Requirement-to-test ledger

October 21, 2026. IDs and milestone mapping come from the unchanged v2.2
Acceptance_Test_Plan retained in `handoff/`. Status describes the current curated/manual and client image-workflow increment. Each row states its
evidence and remaining scope; it does not imply physical-device certification.
At source `6fa22a2`, the focused matrix passes all 66 Studio/storage checks in
Chromium, Firefox and WebKit with zero retries. Broader portfolio CI run
[39564020424](https://github.com/BerinKarjala/portfolio/actions/runs/39564020424)
passes 219 checks with six recorded skips. A `not run` or `partial` row can have
passing subset evidence; its remaining acceptance work is stated.

The M5 follow-up adds four local Chromium acceptance cases for representative
rendered surfaces, keyboard/resize behavior, enlarged default text and reduced
motion. Their three-engine CI verification is pending. Viewport emulation and a
200% root-text preference proxy do not establish native browser zoom or physical
phone/TV compatibility. Physical TV remotes are excluded from release acceptance
by the owner decision recorded in `docs/development-standards.md`.

Commands and final run results are in `verification.md`, `verification-m3.md` and `verification-m4-server.md`; precise test sources are
`src/features/css-studio/{theme,Studio,ai}.test.*`, `e2e/css-studio*.spec.js`,
`e2e/css-studio-images.browser.js`, and
existing Page Builder/portfolio regression files. `passed` rows need review again
when supplied photos or live generation change the relevant paths.

| ID | Milestone | Status | Evidence / remaining scope |
| --- | --- | --- | --- |
| AC-01 | M1/M2 | passed | theme.test.js + Studio.test.jsx; browser seasonal matrix and real starter preview. Curated backgrounds are now integrated. |
| AC-02 | M1 | passed | Workspace controls and autosaved profile resolution; curated photo selection and export are also tested. |
| AC-03 | M1/M5 | partial | All 16 seasonal palette combinations pass computed-token contrast in three engines. M5 Chromium checks actual paragraph/link/button surfaces and focus contrast over representative photos in all four appearance modes. Complete manual/assistive-technology review remains open; this is not full AA conformance. |
| AC-04 | M1/M3 | passed | Every resolved token matches CSS export; system font stacks need no external dependency. Exact portable ZIP image bytes/credits and generated metadata pass unit tests and three-engine download workflows. |
| AC-05 | M1/M2 | passed | Unit corrupt/unknown/denied-preference recovery, three-engine reload and real IndexedDB denied-storage visit fallback pass. Browser localStorage denied-write and actual disk-quota/private-mode coverage remain to broaden. |
| AC-06 | M3/M4 | partial | Structured theme/image proposals remain previews until Apply; injected-byte tests cover late/canceled/malformed responses, refinement-base isolation and failure preservation. Two private Llama fixtures passed; GPT evaluation is prepared but not yet run. Public inference and image/refinement remain unavailable. |
| AC-07 | M3/M5 | not run | Mock recognition Start/Stop/editable transcript/manual Send and denied-permission typing fallback pass. Real target-browser microphone/permission matrix remains unverified. |
| AC-08 | M2 | passed | Examples imports actual TEMPLATES/createProject/compiler; sandboxed portfolio starter content checked. |
| AC-09 | M1 | passed | Moon and CMS-independent gallery launch the same provider/workspace in Chromium, Firefox and WebKit. |
| AC-10 | M1/M5 | partial | Three-engine context/navigation and nonmodal behavior pass. M5 Chromium follows Tab/Enter/Space through tools, examples, page links and both launcher focus returns. Full canvas form/input and assistive-technology sweeps remain open. |
| AC-11 | M1 | passed | Parameterized appearance matrix preserves preset identity and independent contrast. |
| AC-12 | M1 | passed | Automatic settings writes, close/reopen and browser reload tested. |
| AC-13 | M1 | passed | Spring/Winter overrides survive switching and reload in unit tests and all three browser engines. |
| AC-14 | M2 | passed | Shared resolver feeds real template previews; template state remains separate from provider. |
| AC-15 | M1 | passed | Both launchers work in all three engines; initiating control reference has a navigation fallback. M5 Chromium keyboard checks close-to-moon and close-to-gallery focus restoration; new three-engine acceptance verification is pending. |
| AC-16 | M1/M5 | not run | USNO primary-date fixtures pass; refresh visibility/timer implemented. Geometric/visual reference phase sweep not automated. |
| AC-17 | M1 | passed | Reserved wide columns and nonmodal drawers; content retained; independent toggles tested. |
| AC-18 | M1 | passed | Theme controls affect root tokens and same page; no replacement canvas. |
| AC-19 | M1 | passed | Applied theme remains after tools close and restores after reload. |
| AC-20 | M1 | passed | Provider above routes preserves theme, drafts and open controls through navigation/closing in unit tests and all three engines. |
| AC-21 | M1 | passed | Wide independent controls and retained in-session draft tested. |
| AC-22 | M1 | partial | Page navigation/scrollable canvas and retained tools pass in three engines. M5 Chromium adds keyboard page-link access and resize traversal. Complete interactive-form and focus-obscuration review remains open. |
| AC-23 | M1/M5 | partial | 360/390/430/768/1440/1920/3840 viewport checks pass in all three engines. M5 Chromium explicitly resizes through 320/390/1440/3840 while retaining theme/draft and phone drawer exclusivity. New three-engine resize/reflow verification is pending; physical devices and native browser zoom remain unverified. |
| AC-24 | M1 | passed | Routes preserve provider, drafts and open controls; phone exclusivity tested. |
| AC-25 | M2 | passed | Native modal example dialog with separate focus behavior; close preserves canvas/draft. |
| AC-26 | M1 | partial | Icon-only accessible name and launch behavior pass in three engines; M5 Chromium verifies focus tooltip and keyboard activation. Physical touch/hover/assistive-technology review remains open. |
| AC-27 | M1/M5 | not run | Independent reference-date fixtures and northern-view SVG implemented; full visual waxing/waning sweep still not run. |
| AC-28 | M1 | passed | Three color controls, system font choices and button shapes connected to live resolver. |
| AC-29 | M1/M2 | passed | Scoped reset/Undo and removal of active styling preserve other saved profiles. |
| AC-30 | M3/M4 | partial | Default-disabled Worker boundary and local injected-provider admission are implemented. Storage/identity/schema failures never dispatch. Production inference and owned-media/image routes remain unavailable. |
| AC-31 | M3 | passed | Twelve cache unit tests, five actual storage browser cases per engine and integrated Studio workflows cover portable persistence, reload, fresh-client concurrency, bounds, protected eviction/deletion, comparison, exact downloads, corruption and denied-storage fallback. Full protected capacity retains a downloadable preview and retries saving without inference. Real disk-quota/private-browser conditions remain unverified. |
| AC-32 | M4 | partial | The observed Workers Free private canary accepted AI/SQLite bindings and two Llama calls. Reviewed Llama and exact GPT whole-context plans retain 1,000/4,000 Neurons and expire October 28 00:00 UTC. Actual billed usage, public supporting-service headroom and image eligibility remain unverified; no paid fallback is configured. |
| AC-33 | M4 | partial | Fixed same-origin endpoints, schema validation and default-unavailable public dispatch pass local tests. Private Llama deployment/invocation is observed; private GPT and real preview proxy checks are prepared but have no new live result. Public activation remains unavailable. |
| AC-34 | M4 | partial | SQLite authority caps generated/refined image admissions at three per browser/UTC day. Node SQLite tests cover the fourth rejection. Public image/media dispatch remains closed, so live image-route acceptance is outstanding. |
| AC-35 | M4 | partial | SQLite tests admit ten prompts, reject an eleventh and reset on UTC day. The observed private Llama session decremented prompt allowance to 9/8 while retaining the shared charges. Full live cap/reset acceptance and public activation remain outstanding. |
| AC-36 | M4 | partial | Actual workerd/SQLite concurrency and restart tests enforce one durable 8,000-Neuron ceiling. Earlier private Llama execution retained 2,000 and reported 6,000 remaining on October 21 UTC. The exact preflight GPT plan reserves 4,000 against a documented 3,491 whole-context maximum. Reservations are not actual billed usage; GPT/live service-failure verification remains open. |
| AC-37 | M4 | partial | HMAC-signed HttpOnly/Secure/Strict host cookie is checked server-side. Chromium confirms persistence through reload, JavaScript overwrite rejection, cross-origin cookie exclusion and proxy simulation. Invalid identity/authoritative client quota fields are rejected; real Netlify proxy/account deployment is not verified. |
| AC-38 | M4 | partial | Two fixed Llama integration fixtures passed with 2,228/2,320 ms latency. The documented GPT whole-context proof permits a prepared private one-fixture evaluation, pending live execution. No image inference or model winner is claimed; representative comparison remains incomplete. |
| AC-39 | M2 | passed | 16 manually selectable holiday palettes with context labels; separate retained season and provider state. |
| AC-40 | M2/M3 | passed | Curated IDs/token overrides and generated references retain separate seasonal/holiday profiles. Migration, unknown-ID recovery and missing-byte fallback pass; two seasons/two holidays restore independently in Chromium, Firefox and WebKit. |
| AC-41 | M2/M5 | partial | All 64 holiday palette combinations pass computed-token contrast in three engines. M5 Chromium checks representative Christmas/Holi/Diwali/Hanukkah photo surfaces and focus across all four appearance modes. Full cultural, all-photo and assistive-technology review remains open. |
| AC-42 | M3/M4 | partial | Intended preset/appearance/base isolation passes client/server contracts, and the observed private Diwali Llama fixture used the shared identity/counters. Public holiday inference, image/refinement and deployed full-cap/provider checks remain unavailable or unverified. |
| AC-43 | M2/M3 | passed | One resolver serves canvas, examples and CSS export. Exact ZIP bytes/credits and generated metadata pass unit tests; curated/generated downloads and opaque-frame image decoding pass in all three engines. Portable paths exclude object URLs, receipts and invented curated licenses. |
| AC-44 | M2 | passed | Unit reset/Undo preserves independent holiday/seasonal profiles and original state. |
| AC-45 | M2 | passed | check-css-studio-assets.py: all 248 photos + 248 thumbnails decoded; exact hashes/dimensions, unique IDs/source identities, counts/split/path checks pass. |
| AC-46 | M2 | passed | Background resolver tests and all three engines verify ordinary wilderness selection, cross-folder holiday tags and manual override preservation; no calendar inference is claimed. |
| AC-47 | M2 | passed | Full source/license/creator/changes/original metadata retained in catalog and CREDITS.json; two personality notes preserved. Source-site legal audit not claimed. |
| AC-48 | M2/M5 | partial | All assets decode and all four contact sheets were reviewed. Standalone filters and representative crop/history workflows pass in three engines. M5 Chromium adds bright-snow/dark-aurora desktop/phone screenshots and rendered-surface/focus contrast. Full 248-photo/cultural and physical-device review remains open. |
| AC-49 | M2/M3 | passed | Three-engine network assertions show no eager full-library load or inference from bundled samples. Lazy paging, selection and missing-photo fallback remain usable independently of AI. |
