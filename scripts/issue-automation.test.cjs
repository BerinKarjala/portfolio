'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { eligible, validateEntries, requireRed, weekKey, reportRows, publishReport, prepare, reportDue, linkedPRs, verifyCandidateTask, captureValidated } = require('./issue-automation.cjs');

const issue = (overrides = {}) => ({number: 42, title: 'Fix layout', state: 'open', body: '', labels: [{name: 'in progress'}], ...overrides});
test('a writer can start any open in-progress issue without a todo prerequisite', () => {
  assert.equal(eligible(issue(), 'write'), true);
  assert.equal(eligible(issue({labels: ['in progress']}), 'admin'), true);
  for (const other of [{state: 'closed'}, {labels: ['todo']}, {pull_request: {}}]) assert.equal(eligible(issue(other), 'write'), false);
  assert.throws(() => eligible(issue(), 'read'), /writer/);
});

test('candidate preserves existing tests and gates while requiring a new regression test', () => {
  const entry = name => ({name, mode: '100644', status: 'A'});
  const regression = entry('src/regressions/issue-42.test.jsx');
  assert.deepEqual(validateEntries([regression, {...entry('src/App.jsx'), status: 'M'}]), [regression.name]);
  for (const name of ['.github/workflows/check.yml', 'scripts/issue-automation.cjs', 'vite.config.mjs', 'src/../package.json', 'src/setupTests.js', 'src/nested/AGENTS.md', 'server/css-studio/wrangler.toml']) {
    assert.throws(() => validateEntries([regression, entry(name)]), /manual review/);
  }
  assert.throws(() => validateEntries([{...regression, status: 'M'}]), /Existing tests/);
  assert.throws(() => validateEntries([{...regression, mode: '120000'}]), /regular/);
  assert.throws(() => validateEntries([entry('src/app.js')]), /regression/);
});

test('red evidence requires assertion failures, not missing imports, no tests or crashes', () => {
  const report = {numFailedTests: 1, numRuntimeErrorTestSuites: 0, testResults: [{assertionResults: [{status: 'failed', failureMessages: ['AssertionError: expected true to be false']}]}]};
  requireRed(report, 1);
  for (const [result, status] of [[report, 0], [{numFailedTests: 0, testResults: []}, 1], [{...report, numRuntimeErrorTestSuites: 1}, 1], [{...report, testResults: []}, 1]]) assert.throws(() => requireRed(result, status), /assertion/);
});

test('red gate accepts Vitest promise assertion failures but still rejects raw runtime errors', () => {
  for (const message of [
    'Error: promise rejected "TypeError: output[key].concat is not a function" instead of resolving\n at _Assertion.__VITEST_RESOLVES__',
    'Error: promise resolved "ok" instead of rejecting\n at _Assertion.__VITEST_REJECTS__',
  ]) {
    requireRed({numFailedTests: 1, testResults: [{assertionResults: [{status: 'failed', failureMessages: [message]}]}]}, 1);
  }
  for (const message of ['TypeError: output[key].concat is not a function', 'Error: Cannot find package undici', 'Error: promise rejected "Error: Cannot find package new-feature" instead of resolving']) {
    assert.throws(() => requireRed({numFailedTests: 1, testResults: [{assertionResults: [{status: 'failed', failureMessages: [message]}]}]}, 1), /assertion/);
  }
});

test('candidate reuse requires identical repository, issue, base, branch and acceptance data', () => {
  const task = {repository: 'o/r', issue_number: 253, base_sha: 'a'.repeat(40), base_branch: 'main', branch: 'codex/issue-253', title: 'Fix cache', body: 'Keep private data isolated', alert_number: 458, ghsa_id: 'GHSA-4cwx-7wf7-3272', manifest_path: 'package-lock.json', first_patched_version: '7.29.0'};
  verifyCandidateTask(task, {...task});
  for (const [key, value] of Object.entries(task)) {
    assert.throws(() => verifyCandidateTask(task, {...task, [key]: typeof value === 'number' ? value + 1 : `${value}-changed`}), /Candidate task mismatch/);
  }
});

test('validated capture excludes rebuilt Studio assets and rejects any source drift', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-validated-'));
  const previous = process.cwd();
  const git = (...args) => cp.execFileSync('git', args, {cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  try {
    git('init');
    fs.mkdirSync(path.join(directory, 'src'));
    fs.mkdirSync(path.join(directory, 'studio13/dist'), {recursive: true});
    fs.writeFileSync(path.join(directory, 'src/app.js'), 'export const value = 1;\n');
    fs.writeFileSync(path.join(directory, 'studio13/dist/index.html'), 'base build');
    git('add', '--all');
    git('-c', 'core.hooksPath=/dev/null', '-c', 'user.name=test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(directory, 'src/issue-253.test.js'), 'test("cache", () => {});\n');
    fs.writeFileSync(path.join(directory, 'src/app.js'), 'export const value = 2;\n');
    git('add', '--all');
    const frozenTree = git('write-tree');
    fs.writeFileSync(path.join(directory, 'studio13/dist/index.html'), 'rebuilt output');
    process.chdir(directory);
    captureValidated(base, frozenTree);
    assert.equal(git('write-tree'), frozenTree);
    assert.equal(fs.readFileSync('studio13/dist/index.html', 'utf8'), 'base build');
    fs.writeFileSync('src/app.js', 'export const value = 3;\n');
    assert.throws(() => captureValidated(base, frozenTree), /changed during validation/);
  } finally {
    process.chdir(previous);
    const absolute = path.resolve(directory);
    if (!absolute.startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe fixture cleanup path.');
    fs.rmSync(absolute, {recursive: true, force: true});
  }
});

test('report week follows New York calendar through both DST offsets and Sunday boundary', () => {
  assert.equal(weekKey(new Date('2026-10-26T13:00:00Z')), '2026-10-26');
  assert.equal(weekKey(new Date('2026-11-02T14:00:00Z')), '2026-11-02');
  assert.equal(weekKey(new Date('2026-10-26T02:00:00Z')), '2026-10-19');
});

test('report retains removed labels and closed issues and never equates closed with merged', () => {
  const rows = reportRows([
    {issue: issue({state: 'closed', labels: []}), events: [{event: 'labeled', label: {name: 'in progress'}}], prs: [{number: 5, state: 'closed', merged_at: null, head: {ref: 'fix/42'}, html_url: 'https://github.com/o/r/pull/5'}]},
    {issue: issue({number: 43, title: 'A | table\n@user', labels: []}), events: [{event: 'labeled', label: {name: 'in progress'}}], prs: [{number: 6, merged_at: '2026-10-23T00:00:00Z', head: {ref: 'fix/43'}, html_url: 'https://github.com/o/r/pull/6'}]},
    {issue: issue({number: 44, labels: []}), events: [], prs: []},
  ]);
  assert.equal(rows.length, 2);
  assert.match(rows[0], /closed without merge/);
  assert.match(rows[1], /merged 2026-10-23/);
  assert.doesNotMatch(rows.join('\n'), /@user|\| table\n|#44/);
});

test('weekly publication updates its exact marker and does not create duplicates', async () => {
  const writes = [];
  const github = {rest: {issues: {
    update: async x => writes.push(['update', x]), create: async x => writes.push(['create', x]),
  }}};
  const existing = [{number: 9, body: '<!-- weekly-issue-report:2026-10-26 -->'}];
  await publishReport({github, repo: {owner: 'o', repo: 'r'}, issues: existing, body: 'report', now: new Date('2026-10-26T13:00:00Z')});
  assert.equal(writes[0][0], 'update');
  assert.equal(writes[0][1].issue_number, 9);
});

function mockPrepare(overrides = {}) {
  const writes = [];
  const github = {rest: {
    repos: {getCollaboratorPermissionLevel: async () => ({data: {permission: overrides.permission || 'write'}}), get: async () => ({data: {default_branch: 'main'}}), getBranch: async () => ({data: {commit: {sha: 'a'.repeat(40)}}})},
    issues: {get: async () => ({data: overrides.issue || issue()}), removeLabel: async x => writes.push(['label', x]), createComment: async x => writes.push(['comment', x]), listEventsForTimeline: 'events'},
    pulls: {list: 'prs'},
    git: {getRef: async () => {if (overrides.branch) return {data: {object: {sha: overrides.branch}}}; throw Object.assign(new Error('missing'), {status: 404});}, createRef: async x => writes.push(['branch', x])},
  }, paginate: async endpoint => endpoint === 'events' ? (overrides.events || []) : (overrides.prs || [])};
  return {args: {github, context: {repo: {owner: 'o', repo: 'r'}, actor: 'writer', runId: 1}, core: {notice() {}}, issueNumber: 42}, writes};
}
test('preparation creates an issue branch at immutable main before recording acceptance', async () => {
  const {args, writes} = mockPrepare();
  const task = await prepare(args);
  assert.equal(task.branch, 'codex/issue-42');
  assert.equal(task.base_sha, 'a'.repeat(40));
  assert.equal(writes[0][0], 'branch');
});
test('preparation avoids duplicate PRs, modified branches, untrusted actors and stale labels', async () => {
  for (const overrides of [{prs: [{html_url: 'existing'}]}, {issue: issue({state: 'closed'})}]) {
    const {args, writes} = mockPrepare(overrides);
    assert.equal(await prepare(args), null);
    assert.deepEqual(writes, []);
  }
  for (const overrides of [{branch: 'b'.repeat(40)}, {permission: 'read'}]) {
    const {args, writes} = mockPrepare(overrides);
    await assert.rejects(() => prepare(args));
    assert.deepEqual(writes, []);
  }
});

test('both runners reference the approved credential and weekly schedule has a DST gate', () => {
  const workflow = fs.readFileSync('.github/workflows/codex-dependabot-fix.yml', 'utf8');
  assert.match(workflow, /secrets\.PORTFOLIOCODEXACTIONS/);
  assert.doesNotMatch(workflow, /secrets\.OPENAI_API_KEY/);
  const weekly = fs.readFileSync('.github/workflows/weekly-issue-report.yml', 'utf8');
  assert.match(weekly, /0 13 \* \* 1/);
  assert.match(weekly, /0 14 \* \* 1/);
  assert.match(weekly, /reportDue/);
});

test('runtime verification programs cannot be changed as application source', () => {
  assert.throws(() => validateEntries([
    {name: 'src/issue-42.test.js', mode: '100644', status: 'A'},
    {name: 'server/css-studio/runtime/images.runtime.mjs', mode: '100644', status: 'M'},
  ]), /manual review/);
});

test('weekly schedule selects the right UTC trigger even if Actions starts hours late', () => {
  assert.equal(reportDue('schedule', '0 13 * * 1', new Date('2026-10-26T17:00:00Z')), true);
  assert.equal(reportDue('schedule', '0 14 * * 1', new Date('2026-10-26T17:00:00Z')), false);
  assert.equal(reportDue('schedule', '0 14 * * 1', new Date('2026-11-02T17:00:00Z')), true);
  assert.equal(reportDue('schedule', '0 13 * * 1', new Date('2026-11-02T17:00:00Z')), false);
  assert.equal(reportDue('workflow_dispatch', undefined, new Date()), true);
});

test('a PR mentioning an issue does not block it unless GitHub links it as closing that issue', async () => {
  const events = [{event: 'cross-referenced', source: {issue: {number: 269, pull_request: {}, repository: {full_name: 'o/r'}}}}];
  const {args, writes} = mockPrepare({events});
  args.github.rest.pulls.get = async () => ({data: {number: 269, state: 'open', html_url: 'related'}});
  args.github.graphql = async () => ({repository: {pullRequest: {closingIssuesReferences: {nodes: [], pageInfo: {hasNextPage: false}}}}});
  assert.equal((await prepare(args)).branch, 'codex/issue-42');
  assert.equal(writes[0][0], 'branch');
});

test('closing-issue matching paginates and requires the exact repository', async () => {
  let pages = 0;
  const github = {
    rest: {issues: {listEventsForTimeline: 'events'}, pulls: {get: async () => ({data: {number: 5, state: 'open'}})}},
    paginate: async () => [{event: 'cross-referenced', source: {issue: {number: 5, pull_request: {}, repository: {full_name: 'o/r'}}}}],
    graphql: async () => ({repository: {pullRequest: {closingIssuesReferences: {
      nodes: pages++ ? [{number: 42, repository: {nameWithOwner: 'o/r'}}] : [{number: 42, repository: {nameWithOwner: 'other/repo'}}],
      pageInfo: {hasNextPage: pages === 1, endCursor: 'next'},
    }}}}),
  };
  const linked = await linkedPRs(github, {owner: 'o', repo: 'r'}, 42);
  assert.equal(linked.prs[0].closesIssue, true);
  assert.equal(pages, 2);
});

test('an ambiguous Dependabot identity cannot fall back to an ordinary issue fix', async () => {
  const {args, writes} = mockPrepare({issue: issue({labels: ['in progress', 'dependabot'], body: '<!-- dependabot-alert:o/r:1 -->\n<!-- dependabot-alert:o/r:2 -->'})});
  await assert.rejects(() => prepare(args), /Dependabot/);
  assert.deepEqual(writes, []);
});
