# Dependabot issue tracking and security checks

The repository tracks each open Dependabot security alert in a separate public
GitHub issue. Newly created issues receive the `security`, `dependabot`, and
`todo` labels. The issue contains public advisory metadata, the affected manifest,
the vulnerable range, the first patched version when available, and an acceptance
checklist. Keep private evidence and exploit details out of these public issues.

## Alert access setup

Create a fine-grained GitHub token for `BerinKarjala/portfolio` with
**Dependabot alerts: Read-only** and the mandatory repository metadata access.
Save it as the Actions repository secret `DEPENDABOT_ALERTS_TOKEN`. It does not
need Issues or Contents write access. Restrict the token to this repository and
use an appropriate expiration and rotation policy.

### Create and save the token

An HTTP **403** means GitHub denied access; it is not an alert count. Every
workflow here is scoped to `BerinKarjala/portfolio`.

1. Open [GitHub's new fine-grained token page](https://github.com/settings/personal-access-tokens/new).
   Give it a name such as **Portfolio security alerts**, choose **BerinKarjala**
   as the resource owner, and choose an expiration date.
2. Under **Repository access**, choose **Only select repositories** and select
   **portfolio**. Under repository permissions, add **Dependabot alerts** with
   **Read-only** access. GitHub includes the required metadata read access.
   This token does not need Actions, Issues, or Contents write permissions.
3. Select **Generate token**, then copy the generated value into the **Secret**
   field on [this repository's new Actions secret page](https://github.com/BerinKarjala/portfolio/settings/secrets/actions/new).
   Set **Name** to `DEPENDABOT_ALERTS_TOKEN` and select **Add secret**. Do not
   paste the token into a chat, issue, or source file.
4. Once these workflows are merged, run **Actions → Dependabot security issue
   sync → Run workflow**. A successful run creates or reuses one issue for each
   currently open alert and reports the actual count.

The sync uses this credential only to read Dependabot alerts. The workflow's
separate default `GITHUB_TOKEN` receives **Issues: write** to create tracking
issues and the three initial labels, plus `in progress` for starting work.
Missing credentials, expired credentials,
or denied alert access fail the workflow; they are never reported as zero alerts.

## Sync behavior

`Dependabot security issue sync` runs daily at 12:25 UTC, on manual dispatch, and
when its workflow or scripts reach `main`. Its regression tests run on matching
pull requests without accessing alerts or creating issues. After the secret is
configured, use **Actions → Dependabot security issue sync → Run workflow** for
the initial backfill.

Each issue has a stable binding, for example:

```html
<!-- dependabot-alert:berinkarjala/portfolio:521 -->
```

The sync reads every page of open alerts and all issue states. It reuses existing
issues carrying the binding or an exact canonical alert URL, including manually
closed issues. It preserves existing content and status labels. It does not
reopen issues, automatically close issues when alerts disappear, or create one
issue per advisory across several alerts: the unit of tracking is the individual
Dependabot alert number. Duplicate tracking issues stop the entire batch before
writes so a maintainer can resolve the ambiguity. An uncertain create stops the
run; a later invocation reconciles current issues before creating anything else.
An existing issue that binds several alerts also stops the run so it can be split
into one issue per alert. The four tracking/status labels are provisioned even
when every open alert already has a matching issue; existing label definitions
are preserved.

For status-driven work, **add `in progress`**. The shared issue runner removes
`todo` if present; it is no longer a prerequisite. See [issue automation](issue-automation.md)
for runner configuration, test-first gates, weekly reports and retries. The sync itself only creates and
reuses issues and never resets an existing issue's status.

## Weekly security checks

`Weekly dependency security checks` audits both committed npm lockfiles every
Monday at **12:00 UTC** (08:00 New York during daylight time; 07:00 standard time).
It can also be dispatched manually. The two audits include development
dependencies and run independently, so one failure does not cancel the other.
Any reported vulnerability fails its job. Network or audit API failures also
fail the job rather than indicating a clean result. JSON audit output is uploaded
even on failure and retained for 30 days in Actions artifacts.

These lockfile audits complement GitHub's Dependabot alerts and the existing
weekly dependency-update checks. They do not establish runtime exploitability or
replace a full code security review. Security fixes still need relevant tests,
builds, and verification that the alert resolves after merging.

Run the sync regression tests locally with:

```sh
node --test scripts/sync-dependabot-issues.test.cjs
```
