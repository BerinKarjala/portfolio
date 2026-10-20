# Requirement-to-test ledger

October 20, 2026. IDs and milestone mapping come from the unchanged v2.2
Acceptance_Test_Plan retained in `handoff/`. Status describes the current curated/manual increment. Each row states its
evidence and remaining scope; it does not imply live inference, physical-device
certification or untested browser-engine coverage. A `not run` row
can have passing subset evidence; its remaining acceptance work is stated.

Commands and final run results are in `verification.md`; precise test sources are
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
| AC-06 | M3/M4 | not run | ai.test.js and Studio.test.jsx cover mock theme proposals, explicit Apply and stale contexts. Generated backgrounds/history not implemented. |
| AC-07 | M3/M5 | not run | Mock recognition explicit Start/Stop/editable transcript/manual Send passes. Denied/error/real-browser microphone matrix not run. |
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
| AC-30 | M3/M4 | blocked | No public inference endpoint; no shared quota authority. Live AI disabled. |
| AC-31 | M3 | partial | Bounded IndexedDB byte cache verified with eight unit tests and four Chromium storage tests, including reload, pinned eviction, corruption, denied storage and concurrent clients. Studio selection restoration/history/download integration remains unimplemented. See verification-m3-storage.md. |
| AC-32 | M4 | blocked | Cloudflare account, models and supporting free limits unknown; no inference enabled. |
| AC-33 | M4 | blocked | Default-disabled adapter performs zero fetch calls; protected live route not implemented. |
| AC-34 | M4 | blocked | No durable server counter; live dispatch disabled. Cannot claim 3/day enforcement. |
| AC-35 | M4 | blocked | No durable server counter; live dispatch disabled. Cannot claim 10/day enforcement. |
| AC-36 | M4 | blocked | No durable coordinated shared ledger; concurrency/reservation/UTC checks not run. |
| AC-37 | M4 | blocked | No server-issued browser identity or protected endpoint; identity/quota tests not run. |
| AC-38 | M4 | blocked | No live model comparison or image-route test; zero inference performed. |
| AC-39 | M2 | passed | 16 manually selectable holiday palettes with context labels; separate retained season and provider state. |
| AC-40 | M2/M3 | passed | Curated image IDs and token overrides persist in separate profiles; migration and unknown-ID recovery tested. Generated bytes remain AC-31 work. |
| AC-41 | M2/M5 | not run | 64 solid-palette appearance combinations checked for resolved text contrast. Photo/cultural/complete accessibility review pending. |
| AC-42 | M3/M4 | not run | Mock intended-context Apply/stale isolation pass. Holiday media and shared server quotas not implemented. |
| AC-43 | M2/M3 | passed | Same resolver and selected photo; portable exports normalize asset base only. Exact binary ZIP/credits unit tests and holiday browser download pass. |
| AC-44 | M2 | passed | Unit reset/Undo preserves independent holiday/seasonal profiles and original state. |
| AC-45 | M2 | passed | check-css-studio-assets.py: all 248 photos + 248 thumbnails decoded; exact hashes/dimensions, unique IDs/source identities, counts/split/path checks pass. |
| AC-46 | M2 | passed | backgrounds.test.js and Chromium: wilderness ordinary days, cross-folder holiday tag matches, manual overrides preserved; no calendar inference. |
| AC-47 | M2 | passed | Full source/license/creator/changes/original metadata retained in catalog and CREDITS.json; two personality notes preserved. Source-site legal audit not claimed. |
| AC-48 | M2/M5 | not run | All assets decode; all four contact sheets reviewed; standalone filters and representative Winter crops pass. Full photo/appearance contrast/device review remains. |
| AC-49 | M2/M3 | passed | Chromium network assertions: no eager full library, no inference; selected samples/thumbnail paging and missing-photo fallback operate independently of AI. |
