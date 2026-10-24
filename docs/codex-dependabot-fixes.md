# Codex fixes for tracked Dependabot alerts

Dependabot tracking issues now use the shared [issue resolution and weekly
reporting workflow](issue-automation.md). Add `in progress` to start; `todo` is
optional. The branch remains `codex/dependabot-alert-<number>`.

The existing **Codex Dependabot fix** manual dispatch delegates to that same
runner for compatibility. It does not listen for label events, avoiding duplicate
agent runs. Both entry points use the approved **PORTFOLIOCODEXACTIONS** OpenAI
API secret and **DEPENDABOT_ALERTS_TOKEN** for live advisory reads.

The shared runner adds independent test-first regression verification, retains
the complete quality gates and target-advisory audit, preserves existing tests,
and opens a PR only after validation succeeds. See the shared guide for setup,
scope, evidence retention, failure/retry handling and Monday 9 a.m. New York
progress reports. Confirm the alert resolves after the reviewed fix reaches main.
