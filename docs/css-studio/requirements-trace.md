# Requirement-to-test ledger

October 20, 2026. IDs and milestone mapping come from the unchanged v2.2
Acceptance_Test_Plan retained in `handoff/`. Status describes the current curated/manual and client image-workflow increment. Each row states its
evidence and remaining scope; it does not imply live inference, physical-device
certification or untested browser-engine coverage. A `not run` row
can have passing subset evidence; its remaining acceptance work is stated.

Commands and final run results are in `verification.md`, `verification-m3.md` and `verification-m4-server.md`; precise test sources are
`src/features/css-studio/{theme,Studio,ai}.test.*`, `e2e/css-studio.spec.js`, and
existing Page Builder/portfolio regression files. `passed` rows need review again
when supplied photos or live generation change the relevant paths.

| ID | Milestone | Status | Evidence / remaining scope |
| --- | --- | --- | --- |
| AC-01 | M1/M2 | passed | theme.test.js + Studio.test.jsx; browser seasonal matrix and real starter preview. Curated backgrounds are now integrated. |
| AC-02 | M1 | passed | Workspace controls and autosaved profile resolution; curated photo selection and export are also tested. |
| AC-03 | M1/M5 | not run | All 16 solid-palette combinations checked for resolved text contrast; full keyboard/overlay review still not run. |
| AC-04 | M1/M3 | passed | Every resolved token is checked against CSS export; system font stacks; selectable fallback. Portable image ZIP/credits are now covered by photoExport.test.js and Chromium. |
| AC-05 | M1/M2 | passed | Unit corrupt/unknown/denied-storage recovery and browser profile reload. Full browser denied-write flow remains to broaden. |
| AC-06 | M3/M4 | partial | Structured theme/image proposals remain previews until Apply; injected-byte tests cover late/canceled/malformed responses, refinement-base isolation and unchanged themes on failure. Live provider and protected route remain blocked. |
| AC-07 | M3/M5 | not run | Mock recognition Start/Stop/editable transcript/manual Send and denied-permission typing fallback pass. Real target-browser microphone/permission matrix remains unverified. |
| AC-08 | M2 | passed | Examples imports actual TEMPLATES/createProject/compiler; sandboxed portfolio starter content checked. |
| AC-09 | M1 | passed | Moon and CMS-independent gallery entry launch the same provider/workspace in Chromium. |
| AC-10 | M1/M5 | not run | Context, no inert, navigation and navigation-launcher focus tested. Complete manual keyboard/form sweep still not run. |
| AC-11 | M1 | passed | Parameterized appearance matrix preserves preset identity and independent contrast. |
| AC-12 | M1 | passed | Automatic settings writes, close/reopen and browser reload tested. |
| AC-13 | M1 | passed | Spring/Winter overrides survive switching and reload (unit + Chromium). |
| AC-14 | M2 | passed | Shared resolver feeds real template previews; template state remains separate from provider. |
| AC-15 | M1 | passed | Both launchers tested; initiating control reference with navigation fallback; full gallery-focus browser assertion still to broaden. |
| AC-16 | M1/M5 | not run | USNO primary-date fixtures pass; refresh visibility/timer implemented. Geometric/visual reference phase sweep not automated. |
| AC-17 | M1 | passed | Reserved wide columns and nonmodal drawers; content retained; independent toggles tested. |
| AC-18 | M1 | passed | Theme controls affect root tokens and same page; no replacement canvas. |
| AC-19 | M1 | passed | Applied theme remains after tools close and restores after reload. |
| AC-20 | M1 | passed | Provider above routes; themed state survives navigation and closing (unit + Chromium). |
| AC-21 | M1 | passed | Wide independent controls and retained in-session draft tested. |
| AC-22 | M1 | not run | Navigation/scrollable canvas tested; full keyboard/form/focus-obscuration sweep still not run. |
| AC-23 | M1/M5 | not run | 360/390/430/768/1440/1920/3840 viewport tests pass. Resize state and physical TV/browser combinations still not run. |
| AC-24 | M1 | passed | Routes preserve provider, drafts and open controls; phone exclusivity tested. |
| AC-25 | M2 | passed | Native modal example dialog with separate focus behavior; close preserves canvas/draft. |
| AC-26 | M1 | not run | Icon-only name/tooltip/focus implementation tested through launcher flows; manual touch/tooltip sweep pending. |
| AC-27 | M1/M5 | not run | Independent reference-date fixtures and northern-view SVG implemented; full visual waxing/waning sweep still not run. |
| AC-28 | M1 | passed | Three color controls, system font choices and button shapes connected to live resolver. |
| AC-29 | M1/M2 | passed | Scoped reset/Undo and removal of active styling preserve other saved profiles. |
| AC-30 | M3/M4 | partial | Default-disabled Worker boundary and local injected-provider admission are implemented. Storage/identity/schema failures never dispatch. Production inference and owned-media/image routes remain unavailable. |
| AC-31 | M3 | passed | Eight cache tests, four actual Chromium storage tests and integrated Studio tests cover restoration, bounds, protected eviction/deletion, comparison, byte downloads, corruption and denied-storage visit fallback. A full protected cache retains a downloadable preview and retries saving without inference. Browser data loss still requires fallback; real disk-quota/private-browser matrix remains a limitation. See verification-m3.md. |
| AC-32 | M4 | blocked | Current official documentation supports Workers Free SQLite objects and a 10,000-Neuron free allocation, but actual account/model/supporting-service eligibility and cost bounds remain unverified. No AI binding or paid fallback exists. |
| AC-33 | M4 | partial | Same-origin/proxy boundary, schema validation and default-unavailable production entry pass local Worker/HTTP tests. No privileged browser call, provider implementation, deployment or live invocation is claimed. |
| AC-34 | M4 | partial | SQLite authority caps generated/refined image admissions at three per browser/UTC day. Node SQLite tests cover the fourth rejection. Public image/media dispatch remains closed, so live image-route acceptance is outstanding. |
| AC-35 | M4 | partial | SQLite tests admit ten prompts, reject an eleventh and reset on UTC day. Images/refinements consume a prompt as well as a separate image slot under the conservative current interpretation. Local Worker/browser status proves cookie-bound accounting; live verification remains. |
| AC-36 | M4 | partial | Actual workerd/SQLite concurrency admits only two 4,000-Neuron requests from twelve visitors; full runtime restart retains the exhausted shared budget. Unit SQLite tests cover atomic rollback, retries, uncertainty, expiry, provider exhaustion and conservative midnight holds. Real model costs/usage and production service-failure checks remain unverified. |
| AC-37 | M4 | partial | HMAC-signed HttpOnly/Secure/Strict host cookie is checked server-side. Chromium confirms persistence through reload, JavaScript overwrite rejection, cross-origin cookie exclusion and proxy simulation. Invalid identity/authoritative client quota fields are rejected; real Netlify proxy/account deployment is not verified. |
| AC-38 | M4 | blocked | No live model comparison, verified cost plan or image-route test; zero inference performed. Fixtures are not model-selection evidence. |
| AC-39 | M2 | passed | 16 manually selectable holiday palettes with context labels; separate retained season and provider state. |
| AC-40 | M2/M3 | passed | Curated image IDs and token overrides persist in separate profiles; migration and unknown-ID recovery tested. Generated references also persist per preset, separate from bytes; missing bytes fall back without erasing references. Two seasons/two holidays are covered in Chromium. |
| AC-41 | M2/M5 | not run | 64 solid-palette appearance combinations checked for resolved text contrast. Photo/cultural/complete accessibility review pending. |
| AC-42 | M3/M4 | partial | Intended preset/appearance/base checks remain; server schemas accept the shipped seasonal/holiday IDs and all families share one authority. Local holiday requests use the same signed identity/counters. Live holiday inference and deployed shared-cap/provider checks remain blocked. |
| AC-43 | M2/M3 | passed | Same resolver and selected photo; portable exports normalize asset base only. Exact binary ZIP/credits unit tests and holiday browser download pass. Generated exports include verified bytes and GENERATED_IMAGE.json, with no object URLs or invented curated license; sandboxed examples use the same runtime image. |
| AC-44 | M2 | passed | Unit reset/Undo preserves independent holiday/seasonal profiles and original state. |
| AC-45 | M2 | passed | check-css-studio-assets.py: all 248 photos + 248 thumbnails decoded; exact hashes/dimensions, unique IDs/source identities, counts/split/path checks pass. |
| AC-46 | M2 | passed | backgrounds.test.js and Chromium: wilderness ordinary days, cross-folder holiday tag matches, manual overrides preserved; no calendar inference. |
| AC-47 | M2 | passed | Full source/license/creator/changes/original metadata retained in catalog and CREDITS.json; two personality notes preserved. Source-site legal audit not claimed. |
| AC-48 | M2/M5 | not run | All assets decode; all four contact sheets reviewed; standalone filters and representative Winter crops pass. Full photo/appearance contrast/device review remains. |
| AC-49 | M2/M3 | passed | Chromium network assertions: no eager full library, no inference; selected samples/thumbnail paging and missing-photo fallback operate independently of AI. |
