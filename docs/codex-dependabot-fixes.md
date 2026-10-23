# Codex fixes for tracked Dependabot alerts

The **Codex Dependabot fix** GitHub Actions workflow runs Codex with `xhigh`
reasoning effort for an individual tracked security issue. It creates a branch
and opens a pull request only after independent validation passes. The agent
appears as an Actions workflow run, not a new chat in the Codex UI.

## Activation

Merge the automation workflows into the default branch. Configure these
repository Actions secrets:

- `OPENAI_API_KEY`: reuse the existing OpenAI API key. These runs use the OpenAI
  API and its associated billing and model access.
- `DEPENDABOT_ALERTS_TOKEN`: a fine-grained GitHub token restricted to this
  repository with **Dependabot alerts: Read-only** and repository metadata
  access. The same read credential is used by the alert-to-issue sync.

Under **Settings → Actions → General → Workflow permissions**, enable
**Allow GitHub Actions to create and approve pull requests** if the repository
or organization policy permits it. The workflow requests only the job-specific
`GITHUB_TOKEN` permissions it needs. A missing secret or denied permission fails
clearly before an agent starts.

Optionally set the repository variable `CODEX_SECURITY_MODEL` to an API model
that supports `xhigh` reasoning. When unset, the pinned Codex action selects its
default model. An unsupported model or effort fails the run; the workflow does
not silently reduce reasoning effort.

## Starting a fix

On an open tracking issue that still has the `todo` label, **add `in progress`**.
Do not remove `todo` first: the workflow confirms that both labels are present,
then removes `todo` itself. Only a repository user with write, maintain, or admin
permission can start a fix. The issue must identify exactly one alert through
its stable marker or a canonical alert URL in this repository. Conflicting
alert identities and stale or closed issues do not authorize a run.

The workflow reads the live alert, requires an open alert with a known patched
version, and starts from an immutable revision of the current default branch.
The deterministic branch is `codex/dependabot-alert-<alert number>`. Existing
remediation PRs are reused as the existing work record; they never cause another
agent run. A branch left by partial publication blocks a retry for manual review.

## Validation and publication

The jobs separate credentials and duties:

1. Preparation verifies the actor, live issue labels, alert, existing PRs, and
   default-branch revision. It posts a workflow link to the issue.
2. Codex generates a patch with read-only GitHub permissions and no persisted
   Git credentials. It uses the existing API secret through the pinned Codex
   action with workspace permissions and `drop-sudo`.
3. A fresh job applies the patch, using a trusted copy of the validator taken
   before application. Changes are limited to npm dependency manifests and
   lockfiles, `src/`, and Studio schema/component source. Changes to workflow,
   test, configuration, instruction, or validator files; deletions; symlinks; and
   executable files block the automatic path. Package scripts and other
   nondependency manifest fields are preserved, and existing overrides cannot
   be removed. Broader fixes require manual implementation and review.
4. Validation regenerates lockfiles without install scripts, installs dependencies,
   and freezes the staged source/dependency tree before testing. It then runs root
   requirements, unit, build, and build-requirements checks; Chromium, Firefox,
   and WebKit E2E tests with zero retries; and Studio dependency tests and build.
   The target advisory must be absent from a valid npm audit report. Other known
   advisories remain separately tracked instead of blocking all individual fixes.
   Any tracked change made during the checks blocks publication: the validated
   artifact must match the exact source/dependency tree frozen before the tests.
5. Only after validation succeeds does a fresh publisher job receive Contents
   and Pull requests write access. It rechecks the issue and default-branch
   revision, applies the validated patch without executing application code,
   creates the deterministic branch only if it does not already exist, and
   opens a PR linking the issue and validation evidence.

GitHub may suppress further PR workflows for a PR created using `GITHUB_TOKEN`.
The independent validation run supplies the initial evidence; reviewers should
explicitly dispatch additional CI where required by repository policy. The
workflow does not merge PRs, dismiss alerts, or deploy changes. Confirm that the
Dependabot alert resolves after the reviewed fix reaches the default branch.

## Failures and retries

Failures post the workflow-run link on the issue, which stays `in progress`.
After resolving the blocker, use **Actions → Codex Dependabot fix → Run workflow**
and supply the tracking issue number. Manual retries still require writer
permission, an open tracked issue with `in progress`, and a live fixable alert.
Inspect any existing deterministic branch or PR before retrying a partially
successful publication. No existing branch is overwritten automatically.

Candidate patches and task data are retained for seven days; browser and audit
validation evidence is retained for fourteen days in Actions artifacts. The
default branch must remain at the tested revision until publication, so a
concurrent merge can require a fresh run.

Run the automation regression tests locally with the repository's Node version:

```sh
node --test scripts/codex-dependabot-fix.test.cjs
```
