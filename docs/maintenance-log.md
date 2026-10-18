# Portfolio maintenance log

Repository: https://github.com/BerinKarjala/portfolio  
Netlify: https://app.netlify.com/projects/berinkarjala/overview

## Operating rules
- Weekly: inspect commits, open Dependabot PRs, GitHub CI/security signals accessible to the connection, Netlify deployment state and available deployment messages.
- Apply safe routine fixes only when justified and verifiable. Examine release notes/diffs and run available checks before dependency merges; do not merge breaking changes or bypass failed checks.
- Verify GitHub checks and matching Netlify production commit/deployment after changes. **Stop further changes on any failed or unavailable required verification**, record the blocker, and alert the owner.
- Preserve one compact entry (maximum approximately one page) per review, including findings, actions, verification evidence, failures and follow-ups. Do not claim inaccessible Netlify account notifications or GitHub security alerts were reviewed.
- Monthly: separately check repository and deployed-site consistency, report gaps, and ask for intervention where access or verification is insufficient.

## 2026-10-15 — Initial baseline
- **GitHub:** `main` latest reviewed SHA `a7869119603fa924abddb259e4063c30ad7908a7`; no open pull requests returned by search. Recent changes: PR #223 corrected Minesweeper/Sudoku source display; PR #222 updated `source-map-js` to 1.2.2 in `studio13`; PR #221 included Sanity upgrades and dependency patches.
- **Netlify:** project `berinkarjala`, site id `ccb86813-86e0-4bcd-ab8a-fb61c159aafe`. Production deploy `6ad03af57a7c70a113bcd5d2` is `ready`, published at 2026-10-15T02:31:30Z, based on the matching GitHub SHA. No deploy error reported. One redirect and two header rules processed.
- **Actions:** baseline inspection; added this maintenance log. No dependency or runtime changes needed based on visible open PRs.
- **Verification:** production deploy status and commit match confirmed through Netlify API. Full functional smoke test not performed. Direct Dependabot security alerts and Netlify account notification inbox are not available through current tools; deploy messages were inspected.
- **Outstanding:** obtain full security-alert and account-message visibility for complete verification. Next weekly run should check current state before edits; stop if a required check fails.

## 2026-10-15 — Weekly review (09:50 EDT)
- **Changes since baseline:** `main` remains at `9d440c8223b7a4da271ff859ab53ea9572f27f66` (maintenance-log creation); compare against that commit: 0 new commits. No open issues returned.
- **Dependabot:** Two new open PRs: [#224](https://github.com/BerinKarjala/portfolio/pull/224) (`studio13` `uuid` 14.0.2→14.0.3, bug-fix patch) and [#225](https://github.com/BerinKarjala/portfolio/pull/225) (root dev tools `npm-check-updates`, Vite and Vitest patch/minor group). Inspected PR metadata and diffs; both GitHub commit statuses show successful Netlify deploy previews, but **no associated GitHub Actions test runs** were returned for either PR head. Neither PR was merged because required test/build verification is unavailable.
- **CI/security:** Latest two Dependabot update jobs ([root](https://github.com/BerinKarjala/portfolio/actions/runs/38734050143), [studio13](https://github.com/BerinKarjala/portfolio/actions/runs/38734045191)) succeeded on Oct 15. An older [postcss-selector-parser update job](https://github.com/BerinKarjala/portfolio/actions/runs/38631798902) failed Oct 14; not evidence of a current production failure, but investigate if repeated. Direct GitHub Dependabot security-alert endpoint is blocked by connector; no claim of security-alert clearance.
- **Netlify:** Production deploy `6ad05d85097c2b8bd6b7703b` is **ready**, published Oct 15 04:59 UTC; commit `9d440c8` matches `main`. Deployment messages: files already uploaded, 1 redirect and 2 header rules processed without errors; no deploy error. Netlify account notification inbox is not exposed; only deploy messages inspected.
- **Actions / verification:** No code/dependency changes or PR merges. **Maintenance paused at verification gate:** PR CI/test runs absent and full security/account notification visibility unavailable. Production deployment status and SHA match verified; no functional smoke test. Follow-up: enable/inspect required PR build/test checks and review restricted alert/message inboxes before merging.


## 2026-10-17 — Portfolio Maintenance

Status: PARTIAL / UNVERIFIED

### Findings
- GitHub: live read-only Git access succeeded; origin HEAD matches local `4f8be80913179e78cb9469dead321a010dc2647e`. Latest historical checkpoint was the Oct 15 weekly review; it did not include functional verification.
- Dependabot: main now includes PR #225 via `9dea139` and PR #224 via `4f8be80`. No merges performed during this review. Current PR metadata and additional open PRs remain UNVERIFIED.
- GitHub Actions: the only checked-in workflow is the biweekly Sanity release monitor; no pull-request test/build workflow exists. Live Actions results and the Oct 14 update-job failure remain UNVERIFIED: GitHub API requests returned Forbidden.
- Netlify: production website and project API requests failed with proxy CONNECT 403. Latest deployment, messages, and production commit are UNVERIFIED.
- Security / Notifications: Dependabot alert API returned Forbidden. Netlify account notifications and both existing ChatGPT schedules are UNVERIFIED; no corresponding connector or scheduling tools are exposed.

### Actions performed
- Read the entire historical log, inspected commits, manifests, Dependabot configuration and workflow, and checked live read-only access. Paused CI changes and dependency maintenance at the required verification gate.
- Saved missing network destinations (`api.github.com`, `api.netlify.com`, `berinkarjala.netlify.app`) in the environment configuration draft, preserving prior domains. Saving does not apply or publish settings.
- Associated PR / Commit: none created; this failure record is a local documentation update, not a published GitHub update.

### Verification
- CI: remote status UNVERIFIED. Earlier setup in this same session at the same HEAD passed all 9 tests in 4 files and both frontend and Studio builds on Node 22.22.2; these do not establish GitHub Actions success.
- Production deployment / GitHub-Netlify commit match: UNVERIFIED.
- Functional checks: local frontend and Studio HTML and JavaScript requests passed during setup; live production behavior remains UNVERIFIED.

### Outstanding issues
- Apply the saved network settings, then retry GitHub/Netlify reads using existing authentication before diagnosing further permissions. No Netlify binding was found among current environment variable names; a supported authenticated Netlify connection may also be required.
- Restore supported scheduled-task access and inspect the existing weekly/monthly tasks without creating duplicates. Their enabled status, actual schedules and timezones remain unknown.

### Next action
- Review/save environment settings and publish, restore missing supported integrations, then resume Phase A. Only after required verification is available should a dedicated CI repair branch/PR proceed; do not merge based only on local tests or deploy previews.

## 2026-10-17 — Portfolio Maintenance (recovery follow-up)

Status: FAIL

### Findings
- GitHub: live access restored; reviewed `main` at `4f8be80913179e78cb9469dead321a010dc2647e`. Retained the preceding unpublished local record; this follow-up supersedes its access findings. Latest prior recorded production checkpoint was `9d440c8`, with incomplete security/functional verification.
- Dependabot: #225 and #224 were already merged on Oct 15 as `9dea139` and `4f8be80`; no open PRs returned. Both former heads retain successful Netlify previews but have no PR Actions runs.
- GitHub Actions: no PR test/build workflow; current main has zero runs/checks/statuses. Latest root/Studio update jobs succeeded. Oct 14 parser update failure was superseded by `fd1fe98`, which pins/locks `postcss-selector-parser` 7.1.6.
- Netlify: published deploy `6ad12a92bed06f275360e063` ready, published Oct 15 19:33:57 UTC, matching reviewed main; no deploy error or warning in returned summary.
- Security / Notifications: lockfile audit: root 0 findings; Studio 11 high + 4 moderate affected package entries, tracing to [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) advisories. Runtime exploitability unassessed. Dependabot alerts and GitHub inbox return integration/endpoint restrictions; Netlify account inbox and notification settings are not exposed: UNVERIFIED. Repository-authored advisories returned none, a separate signal.

### Actions performed
- Read logs/configurations, inspected PRs/diffs and Actions evidence, audited both lockfiles on Node 22.22.2, and checked live production. Audit did not change lockfiles.
- Code/dependency writes halted at required verification gate; no merge or CI PR created. Only this permitted documentation record is published.
- Existing weekly Thursday and monthly day-1 tasks are enabled; preserved both schedules and prompts without duplicates. Default timezone America/New_York, flexible morning timing; service supplied no next-run timestamps. Separate Security Watch left unchanged.

### Verification
- CI: required PR validation absent; no GitHub test/build success established. Proposed repair: dedicated branch/PR with read-only permissions, reproducible installs, root tests/build and Studio build on pinned Node; validate before merging.
- Production deployment / GitHub-Netlify match: PASS at reviewed pre-log SHA `4f8be80`; documentation commit deployment must be verified afterward.
- Functional checks: homepage rendered in Chromium without uncaught errors; all six first-party JS assets and CSS HTTP 200. Google Fonts blocked by environment proxy; other routes/interactions untested.

### Outstanding issues
- Studio audit FAIL; npm suggests major Sanity/Vision downgrades, unsuitable for automatic maintenance. Separately assess compatible fixes and verify both projects.
- Dependabot requires a supported authenticated API path with repository Dependabot-alert read permission; connector allowlist also needs support. Inspect GitHub inbox and Netlify account messages/settings through supported access. [Netlify deploy notifications](https://docs.netlify.com/deploy/deploy-notifications/) offers project-level alternatives; existing configuration remains UNVERIFIED.
- CI repair remains blocked; release-monitor cadence also needs decimal parsing of zero-prefixed ISO weeks when writes can resume.

### Next action
- Resolve audit and access blockers, then open/verify the CI repair PR before automatic changes resume. Enabled schedules may report findings and log failures; they must honor the same stop gate.
