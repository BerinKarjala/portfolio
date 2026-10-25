# Issue resolution and weekly reports

Add **in progress** to an open issue in `BerinKarjala/portfolio` to start the
**Codex issue fix** workflow. A repository writer must add the label or manually
dispatch the workflow. The runner reads live labels and permissions, skips
existing open/merged closing PRs, and creates `codex/issue-<number>` from an
immutable revision of main before starting work. Dependabot tracking issues
use `codex/dependabot-alert-<alert number>` and the same runner. `todo` is removed
if present and is not required. Removing `in progress` prevents publication.

Existing in-progress issues do not generate a retroactive label event. Start
them through **Actions > Codex issue fix > Run workflow**, supplying the issue
number. The existing `codex-dependabot-fix.yml` filename now holds the shared
runner, keeping its registered dispatch endpoint and a single label listener.

## Credentials and activation

Merge the automation PR into main to activate label events and weekly reports.
Both event and schedule workflows need to exist on the default branch.
The owner authorized the existing **PORTFOLIOCODEXACTIONS** Actions secret for
OpenAI API calls on October 24, 2026. Its value stays in Actions; this change
does not copy it into a local file or create a new key. API billing and model
access apply. Missing or invalid credentials stop the run visibly.

Dependabot issues also require **DEPENDABOT_ALERTS_TOKEN** with alerts read
access to this repository. The token is only available in preparation, never
to generated application code. GitHub Actions must be allowed to create PRs.
Optionally set `CODEX_ISSUE_MODEL`; `CODEX_SECURITY_MODEL` is the fallback,
followed by the pinned action's default. Runs use `xhigh` reasoning.

## Test-driven resolution

The agent follows [development standards](development-standards.md): define
observable acceptance, write a meaningful failing regression, implement the
smallest fix, and keep correcting failures until checks pass. Each generation
has a 90-minute limit; independent validation has a 60-minute limit.

The generation job has read-only repository access and no persisted Git
credentials. A fresh validator receives no API key or write credential. Trusted
validators are saved from the workflow revision before applying the candidate.
They require at least one **new Vitest regression test in src/ or server/**,
preserve existing tests, and protect workflows, configuration, instruction files,
runtime check programs, package scripts/engines and existing security overrides.

Use the [local/cloud working methods](browser-testing.md) for interactive work.
The issue validator runs on cloud workers and explicitly selects `test:e2e:cloud`;
the low-memory local smoke tier never replaces those release gates. The agent's
restricted sandbox continues to hand socket/subprocess limitations to independent
cloud validation, without reducing the browser matrix.

The validator copies only the new regressions onto an unchanged base worktree
with its original dependencies and independently requires assertion failures.
Missing imports, setup crashes and tests that already pass do not qualify.
Vitest promise assertions (`resolves`/`rejects`) count as assertion failures;
an unexpected promise rejection in such an assertion is meaningful evidence of
the behavior under test. Raw runtime errors outside assertions still fail the gate.
It then installs the candidate and runs:

- Root requirements, unit/integration tests, production build and build checks.
- The default Chromium/Firefox/WebKit browser matrix with zero retries, plus
  full CSS Studio and image storage coverage in all three browsers.
- CSS Studio server runtime, native image and browser/fetch runtime checks.
- Studio dependency/security regressions and production build.
- Automation regression tests and a target-advisory audit for Dependabot fixes.

Source/dependency changes made during testing invalidate the frozen candidate.
The tracked `studio13/dist` output is restored to the base after the Studio
build check, because generated build assets are outside the allowed candidate
scope. All application/dependency changes must still match the frozen tree.
Only the tested tree reaches a fresh publisher job. It rechecks the issue,
unchanged main revision, PR duplicates and unchanged issue branch, then commits
and opens a focused PR with the issue closing reference, exact commit and run
evidence. Artifacts are retained for 14 days. PRs made using `GITHUB_TOKEN` may
not start additional CI; dispatch required extra checks explicitly before merge.
No PR is merged or deployed by this automation.

Automatic changes cover application source, dependency fields/lockfiles,
documentation and added regressions. Issues requiring protected test edits,
configuration/workflow changes, deletions, binary assets or manual acceptance
need a focused maintainer implementation. Those requirements are reported as
blockers; they do not silently weaken the gates. Physical-device and other
manual acceptance cannot be established by this workflow.

## Failures and retries

Every failed or cancelled attempt posts the run link on the issue. It stays
in progress and the weekly report shows the latest result. Inspect the failed
step and agent notes, resolve infrastructure/acceptance blockers, then dispatch
the issue again. The agent can iterate within a run; failed independent gates
never publish a PR. Retries reuse only an unchanged branch at current main.
If main or the branch moved, inspect and advance the untouched branch to current
main before retrying. A partially pushed fix or an existing PR is never replaced.

For a validator/infrastructure retry, supply the original **candidate_run_id**
along with **issue_number** in Run workflow. This downloads the saved task and
candidate from that run in this repository and requires identical issue,
acceptance text, advisory, branch and base revision before reuse. It makes no
OpenAI API call and repeats all independent red/green, scope, audit and publication
gates. If main or acceptance changed, generate a fresh candidate instead.

The agent receives preinstalled baseline dependencies. It must not reinstall
them inside its restricted sandbox: failed subprocess/network operations can
remove working dependencies without establishing a candidate failure. Record
such limitations once; normal runner jobs install and test the candidate.

## Monday report

**Weekly issue progress report** publishes a repository issue every Monday at
**9:00 a.m. America/New_York**, following daylight saving time. UTC triggers at
13:00 and 14:00 select only the local 9 a.m. occurrence. Actions scheduling can
be delayed; manual dispatch also works. A marker keyed to the New York week
makes repeat runs update that week's report instead of creating duplicates.

Reports paginate all issue states and complete label timelines. They include
every issue that has ever been labeled in progress, even after closure or label
removal, and show current status, linked PRs, branch names, actual PR merge
timestamps, and latest recorded automation status. A closed issue or deleted
branch is never treated as proof of merge. Timeline references are checked
against GitHub's paginated closing-issue links; incidental mentions do not count
as resolution PRs or block new work. Deterministic automation PRs also appear.
The same report is available in the Actions run summary. Errors fetching state
fail the report instead of presenting incomplete data as a clean status.

Run `node --test scripts/*dependabot*.test.cjs scripts/issue-automation.test.cjs`
and the pinned actionlint checks before changing these workflows.
