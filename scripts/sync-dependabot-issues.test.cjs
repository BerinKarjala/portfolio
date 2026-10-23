const assert = require('node:assert/strict');
const { test } = require('node:test');
const { syncDependabotIssues } = require('./sync-dependabot-issues.cjs');

const repository = { owner: 'BerinKarjala', repo: 'portfolio' };
const alert = (number, overrides = {}) => ({
  number,
  dependency: { package: { name: 'dompurify', ecosystem: 'npm' }, manifest_path: 'studio13/package-lock.json', scope: 'runtime' },
  security_advisory: { ghsa_id: 'GHSA-aaaa-bbbb-cccc', severity: 'critical', summary: 'Sanitizer bypass' },
  security_vulnerability: { vulnerable_version_range: '< 3.4.17', first_patched_version: { identifier: '3.4.17' } },
  ...overrides,
});

function clients({ alerts = [], issues = [], labels = [], failAlerts, failCreateAt } = {}) {
  const calls = { pages: [], creates: [], labels: [] };
  const alertClient = {
    rest: { dependabot: { listAlertsForRepo() {} } },
    async paginate(method, args) {
      calls.pages.push({ client: 'alerts', method, args });
      if (failAlerts) throw failAlerts;
      return alerts;
    },
  };
  const issueClient = {
    rest: { issues: {
      listForRepo() {},
      listLabelsForRepo() {},
      async createLabel(args) { calls.labels.push(args); labels.push(args); return { data: args }; },
      async create(args) {
        calls.creates.push(args);
        if (calls.creates.length === failCreateAt) throw new Error('response lost');
        const issue = { ...args, state: 'open', number: 100 + calls.creates.length, html_url: `https://github.com/BerinKarjala/portfolio/issues/${100 + calls.creates.length}` };
        issues.push(issue);
        return { data: issue };
      },
    } },
    async paginate(method, args) {
      calls.pages.push({ client: 'issues', method, args });
      if (method === issueClient.rest.issues.listForRepo) return issues;
      if (method === issueClient.rest.issues.listLabelsForRepo) return labels;
      throw new Error('unexpected endpoint');
    },
  };
  return { alertClient, issueClient, calls };
}

test('uses separate clients, paginates complete states, and creates one todo issue per alert', async () => {
  const { calls, ...api } = clients({ alerts: [alert(521), alert(518)] });
  const result = await syncDependabotIssues({ ...repository, ...api });
  assert.equal(result.created.length, 2);
  assert.equal(calls.pages.find(p => p.client === 'alerts').args.state, 'open');
  assert.equal(calls.pages.find(p => p.client === 'issues').args.state, 'all');
  assert.equal(calls.pages.filter(p => p.args.per_page === 100).length, 3);
  assert.deepEqual(calls.creates.map(c => c.labels), [['security', 'dependabot', 'todo'], ['security', 'dependabot', 'todo']]);
  assert.ok(calls.labels.some(label => label.name === 'in progress'));
  const created = calls.creates[0];
  assert.match(created.title, /#518.*critical.*dompurify.*Sanitizer bypass/);
  assert.match(created.body, /Public issue/);
  assert.match(created.body, /<!-- dependabot-alert:berinkarjala\/portfolio:518 -->/);
  assert.match(created.body, /https:\/\/github.com\/advisories\/GHSA-aaaa-bbbb-cccc/);
  assert.match(created.body, /studio13\/package-lock.json/);
  assert.match(created.body, /3.4.17/);
});

test('reuses open and manually closed issues without resetting status or reopening', async () => {
  const { calls, ...api } = clients({
    alerts: [alert(521), alert(518)],
    issues: [
      { number: 1, state: 'closed', body: '<!-- dependabot-alert:berinkarjala/portfolio:521 -->' },
      { number: 2, state: 'open', body: 'Source: https://github.com/BerinKarjala/portfolio/security/dependabot/518' },
      { number: 3, pull_request: {}, body: '<!-- dependabot-alert:berinkarjala/portfolio:521 -->' },
    ],
  });
  const result = await syncDependabotIssues({ ...repository, ...api });
  assert.equal(result.reused.length, 2);
  assert.equal(result.reused.find(r => r.alert === 521).state, 'closed');
  assert.deepEqual(calls.creates, []);
  assert.deepEqual(calls.labels.map(label => label.name), ['security', 'dependabot', 'todo', 'in progress']);
});

test('preserves existing label definitions while making status labels available for reused issues', async () => {
  const existing = [{ name: 'Security', color: '000000' }, { name: 'todo', color: '111111' }];
  const { calls, ...api } = clients({ alerts: [alert(521)], labels: existing,
    issues: [{ number: 1, state: 'open', body: '<!-- dependabot-alert:berinkarjala/portfolio:521 -->' }],
  });
  await syncDependabotIssues({ ...repository, ...api });
  assert.deepEqual(calls.labels.map(label => label.name), ['dependabot', 'in progress']);
  assert.equal(existing[0].color, '000000');
  assert.deepEqual(calls.creates, []);
});

test('an existing issue tracking several alerts blocks the batch before writes', async () => {
  const { calls, ...api } = clients({ alerts: [alert(521), alert(518)],
    issues: [{ number: 17, body: 'https://github.com/BerinKarjala/portfolio/security/dependabot/521\nhttps://github.com/BerinKarjala/portfolio/security/dependabot/518' }],
  });
  await assert.rejects(syncDependabotIssues({ ...repository, ...api }), /#17.*multiple Dependabot alerts/);
  assert.deepEqual(calls.creates, []);
  assert.deepEqual(calls.labels, []);
});

test('duplicate tracking issues block the whole batch before any mutation', async () => {
  const { calls, ...api } = clients({
    alerts: [alert(1), alert(521)],
    issues: [
      { number: 7, body: '<!-- dependabot-alert:berinkarjala/portfolio:521 -->' },
      { number: 9, body: 'https://github.com/BerinKarjala/portfolio/security/dependabot/521' },
    ],
  });
  await assert.rejects(syncDependabotIssues({ ...repository, ...api }), /521.*#7.*#9/);
  assert.deepEqual(calls.creates, []);
  assert.deepEqual(calls.labels, []);
});

test('alert access failures propagate and never count as zero alerts', async () => {
  const { calls, ...api } = clients({ failAlerts: new Error('403 Dependabot alerts permission required') });
  await assert.rejects(syncDependabotIssues({ ...repository, ...api }), /403/);
  assert.deepEqual(calls.creates, []);
});

test('metadata cannot inject Markdown, mentions, markers, or arbitrary advisory links', async () => {
  const hostile = alert(521);
  hostile.security_advisory.summary = '[Click](https://evil.invalid) @all <!-- dependabot-alert:berinkarjala/portfolio:999 -->';
  hostile.security_advisory.html_url = 'https://evil.invalid';
  hostile.security_advisory.description = 'PRIVATE EXPLOIT DETAIL';
  hostile.dependency.manifest_path = 'folder/`file`\n@all';
  const { calls, ...api } = clients({ alerts: [hostile] });
  await syncDependabotIssues({ ...repository, ...api });
  const body = calls.creates[0].body;
  assert.equal(body.match(/<!-- dependabot-alert:/g).length, 1);
  assert.doesNotMatch(body, /PRIVATE EXPLOIT DETAIL|@all|\[Click\]\(https:\/\/evil.invalid\)/);
  assert.match(body, /&lt;!--/);
  assert.match(body, /https:\/\/github.com\/advisories\/GHSA-aaaa-bbbb-cccc/);
});

test('invalid source metadata blocks all creates rather than leaving a partial batch', async () => {
  const bad = alert(521);
  bad.security_advisory.ghsa_id = 'https://evil.invalid';
  const { calls, ...api } = clients({ alerts: [alert(1), bad] });
  await assert.rejects(syncDependabotIssues({ ...repository, ...api }), /advisory/);
  assert.deepEqual(calls.creates, []);
});

test('stops on an uncertain create without retrying or processing later alerts', async () => {
  const { calls, ...api } = clients({ alerts: [alert(1), alert(2), alert(3)], failCreateAt: 2 });
  await assert.rejects(syncDependabotIssues({ ...repository, ...api }), /response lost/);
  assert.equal(calls.creates.length, 2);
});

test('a later sync reuses the issues created by an earlier run', async () => {
  const { calls, ...api } = clients({ alerts: [alert(521), alert(518)] });
  await syncDependabotIssues({ ...repository, ...api });
  const later = await syncDependabotIssues({ ...repository, ...api });
  assert.equal(calls.creates.length, 2);
  assert.equal(later.created.length, 0);
  assert.equal(later.reused.length, 2);
});

test('a later sync reconciles a create that succeeded before its response was lost', async () => {
  const { calls, ...api } = clients({ alerts: [alert(521)] });
  const create = api.issueClient.rest.issues.create;
  api.issueClient.rest.issues.create = async args => {
    await create(args);
    throw new Error('response lost after successful write');
  };
  await assert.rejects(syncDependabotIssues({ ...repository, ...api }), /response lost/);
  api.issueClient.rest.issues.create = create;
  const later = await syncDependabotIssues({ ...repository, ...api });
  assert.equal(calls.creates.length, 1);
  assert.equal(later.reused.length, 1);
});
