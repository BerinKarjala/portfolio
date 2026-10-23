'use strict';

const LABELS = [
  { name: 'security', color: 'B60205', description: 'Security remediation' },
  { name: 'dependabot', color: '0366D6', description: 'Tracks a GitHub Dependabot security alert' },
  { name: 'todo', color: 'EDEDED', description: 'Ready to be started' },
  { name: 'in progress', color: 'FBCA04', description: 'Security remediation is in progress' },
];
const INITIAL_ISSUE_LABELS = ['security', 'dependabot', 'todo'];

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${field} in Dependabot alert`);
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim();
}

function markdown(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_{}[\]()|]/g, '\\$&').replace(/@/g, '&#64;');
}

function escapedRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAlert(alert) {
  if (!Number.isSafeInteger(alert.number) || alert.number < 1) throw new Error('Invalid Dependabot alert number');
  const advisory = alert.security_advisory;
  const vulnerability = alert.security_vulnerability;
  const ghsa = requiredText(advisory?.ghsa_id, 'advisory identifier');
  if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(ghsa)) throw new Error(`Invalid advisory identifier for alert #${alert.number}`);
  const severity = requiredText(advisory?.severity, 'severity').toLowerCase();
  if (!['low', 'medium', 'moderate', 'high', 'critical'].includes(severity)) throw new Error(`Invalid severity for alert #${alert.number}`);
  return {
    number: alert.number,
    ghsa,
    severity,
    summary: requiredText(advisory?.summary, 'advisory summary'),
    package: requiredText(alert.dependency?.package?.name, 'package name'),
    ecosystem: requiredText(alert.dependency?.package?.ecosystem, 'package ecosystem'),
    manifest: requiredText(alert.dependency?.manifest_path, 'manifest path'),
    range: requiredText(vulnerability?.vulnerable_version_range, 'vulnerable version range'),
    fixed: vulnerability?.first_patched_version?.identifier
      ? requiredText(vulnerability.first_patched_version.identifier, 'patched version')
      : 'No patched version listed by GitHub',
  };
}

function payload(repository, alert) {
  const source = `https://github.com/${repository}/security/dependabot/${alert.number}`;
  return {
    title: Array.from(`[Dependabot #${alert.number}][${alert.severity}] ${alert.package}: ${alert.summary}`).slice(0, 240).join(''),
    body: [
      '> **Public issue:** This ticket contains public advisory metadata. Keep private evidence and exploit details out of this issue.',
      '',
      `<!-- dependabot-alert:${repository.toLowerCase()}:${alert.number} -->`,
      '',
      `Track [Dependabot alert #${alert.number}](${source}).`,
      '',
      `- Advisory: [${alert.ghsa}](https://github.com/advisories/${alert.ghsa})`,
      `- Summary: ${markdown(alert.summary)}`,
      `- Severity: ${alert.severity}`,
      `- Package: ${markdown(alert.package)} (${markdown(alert.ecosystem)})`,
      `- Manifest: ${markdown(alert.manifest)}`,
      `- Vulnerable range: ${markdown(alert.range)}`,
      `- First patched version: ${markdown(alert.fixed)}`,
      '',
      'Acceptance criteria:',
      '- [ ] Update the affected dependency path to a patched version, or document an upstream blocker.',
      '- [ ] Verify the affected lockfile and run the relevant security regression checks, tests, and build.',
      '- [ ] Open a focused pull request only after the required checks pass; link this issue.',
      '- [ ] Confirm the Dependabot alert is resolved after the fix reaches the default branch.',
      '',
      'Start work by adding `in progress` while `todo` is still present. The agent runner removes `todo` after accepting the transition.',
    ].join('\n'),
    labels: INITIAL_ISSUE_LABELS,
  };
}

async function syncDependabotIssues({ owner, repo, alertClient, issueClient, onProgress = () => {} }) {
  if (!/^[a-z0-9-]+$/i.test(owner) || !/^[a-z0-9_.-]+$/i.test(repo)) throw new Error('Invalid repository identity');
  const repository = `${owner}/${repo}`;
  // Never turn an authorization or network error into an empty alert list.
  const rawAlerts = await alertClient.paginate(alertClient.rest.dependabot.listAlertsForRepo, {
    owner, repo, state: 'open', per_page: 100,
  });
  if (!Array.isArray(rawAlerts)) throw new Error('Dependabot returned an invalid alert list');
  const alerts = rawAlerts.map(normalizeAlert).sort((a, b) => a.number - b.number);
  if (new Set(alerts.map(alert => alert.number)).size !== alerts.length) throw new Error('Duplicate Dependabot alert numbers returned');

  const issues = await issueClient.paginate(issueClient.rest.issues.listForRepo, {
    owner, repo, state: 'all', per_page: 100,
  });
  const marker = new RegExp(`<!--\\s*dependabot-alert:${escapedRegex(repository)}:([1-9]\\d*)\\s*-->`, 'gi');
  const alertUrl = new RegExp(`https://github\\.com/${escapedRegex(repository)}/security/dependabot/([1-9]\\d*)(?![a-z0-9/_-])`, 'gi');
  const tracked = new Map();
  const openAlertNumbers = new Set(alerts.map(alert => alert.number));
  for (const issue of issues) {
    if (issue.pull_request) continue;
    const numbers = new Set();
    for (const expression of [marker, alertUrl]) {
      for (const match of (issue.body || '').matchAll(expression)) numbers.add(Number(match[1]));
    }
    if (numbers.size > 1 && [...numbers].some(number => openAlertNumbers.has(number))) {
      throw new Error(`Issue #${issue.number} references multiple Dependabot alerts; split it into one tracking issue per alert before syncing`);
    }
    for (const number of numbers) tracked.set(number, [...(tracked.get(number) || []), issue]);
  }

  // Validate and plan the entire batch before creating labels or issues.
  const result = { created: [], reused: [], openAlerts: alerts.length };
  const toCreate = [];
  for (const alert of alerts) {
    const matches = tracked.get(alert.number) || [];
    if (matches.length > 1) throw new Error(`Alert #${alert.number} has duplicate tracking issues: ${matches.map(issue => `#${issue.number}`).join(', ')}`);
    if (matches.length === 1) {
      const issue = matches[0];
      result.reused.push({ alert: alert.number, issue: issue.number, state: issue.state, url: issue.html_url });
      continue;
    }
    toCreate.push({ alert: alert.number, ...payload(repository, alert) });
  }
  if (!alerts.length) return result;

  const labels = await issueClient.paginate(issueClient.rest.issues.listLabelsForRepo, { owner, repo, per_page: 100 });
  for (const label of LABELS) {
    if (labels.some(existing => existing.name.toLowerCase() === label.name)) continue;
    await issueClient.rest.issues.createLabel({ owner, repo, ...label });
  }
  for (const { alert, ...issuePayload } of toCreate) {
    // A failed/uncertain write stops the batch. The next run reconciles all states
    // by marker before retrying; never retry creates inside this invocation.
    const { data: issue } = await issueClient.rest.issues.create({ owner, repo, ...issuePayload });
    const receipt = { alert, issue: issue.number, url: issue.html_url };
    result.created.push(receipt);
    onProgress(`Dependabot #${alert}: created tracking issue #${issue.number} (${issue.html_url})`);
  }
  return result;
}

module.exports = { syncDependabotIssues };
