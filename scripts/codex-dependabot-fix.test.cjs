'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { trackedAlert, readyIssue, validatePaths, validateManifest, auditTargetAbsent, checkWorktree, prepare } = require('./codex-dependabot-fix.cjs');
const repository = 'BerinKarjala/portfolio';
const marker = '<!-- dependabot-alert:berinkarjala/portfolio:521 -->';
function issue(overrides = {}) { return { number: 10, state: 'open', body: marker, labels: ['todo', {name: 'in progress'}], ...overrides }; }

test('recognizes exact repository marker or canonical URL and rejects conflicting alerts', () => {
  assert.equal(trackedAlert(issue(), repository).number, 521);
  assert.equal(trackedAlert(issue({body: 'https://github.com/BerinKarjala/portfolio/security/dependabot/521'}), repository).number, 521);
  assert.equal(trackedAlert(issue({body: `${marker}\nhttps://github.com/BerinKarjala/portfolio/security/dependabot/521`}), repository).number, 521);
  assert.equal(trackedAlert(issue({body: `${marker}\nhttps://github.com/BerinKarjala/portfolio/security/dependabot/522`}), repository), null);
  assert.equal(trackedAlert(issue({body: 'https://github.com/other/repo/security/dependabot/521'}), repository), null);
  assert.equal(trackedAlert(issue({body: 'https://github.com/BerinKarjala/portfolio/security/dependabot/5210extra'}), repository), null);
  assert.equal(trackedAlert(issue({state: 'closed'}), repository), null);
  assert.equal(trackedAlert(issue({pull_request: {}}), repository), null);
});

test('requires writer and a live todo plus in progress transition, with explicit retry exception', () => {
  assert.equal(readyIssue(issue(), repository, 'write'), 521);
  assert.throws(() => readyIssue(issue(), repository, 'triage'), /writer/);
  assert.equal(readyIssue(issue({labels: ['todo']}), repository, 'admin'), null);
  assert.equal(readyIssue(issue({labels: ['in progress']}), repository, 'admin'), null);
  assert.equal(readyIssue(issue({labels: ['in progress']}), repository, 'admin', true), 521);
});

test('allows dependency and source changes but rejects tests, workflow, instructions, and unsafe modes', () => {
  const entry = {name: 'package.json', mode: '100644', status: 'M'};
  for (const name of ['package.json', 'studio13/package-lock.json', 'src/App.jsx', 'studio13/schemaTypes/post.ts']) validatePaths([{...entry, name}]);
  for (const name of ['scripts/codex-dependabot-fix.cjs', '.github/workflows/test.yml', 'src/App.test.jsx', 'src/__tests__/App.jsx', 'src/../package.json', 'src/AGENTS.md', 'vite.config.js']) assert.throws(() => validatePaths([{...entry, name}]), /manual review/);
  for (const mode of ['100755', '120000', '160000', '000000']) assert.throws(() => validatePaths([{...entry, mode}]), /non-file/);
  assert.throws(() => validatePaths([{...entry, status: 'D'}]), /non-file/);
  assert.throws(() => validatePaths([]), /no changes/);
});

test('manifest changes preserve script/engine gates and reject nonregistry dependency sources', () => {
  const before = {scripts: {test: 'vitest --run'}, engines: {node: '22'}, dependencies: {safe: '^1.0.0'}};
  validateManifest(before, {...before, dependencies: {safe: '^1.0.1'}, overrides: {nested: '2.0.0'}});
  assert.throws(() => validateManifest(before, {...before, scripts: {test: 'true'}}), /scripts/);
  assert.throws(() => validateManifest(before, {...before, engines: {node: '24'}}), /engines/);
  assert.throws(() => validateManifest({...before, overrides: {oldFix: '2.0.0'}}, before), /override entries/);
  for (const spec of ['file:../evil', 'git+https://example.invalid/code', 'https://example.invalid/code.tgz']) assert.throws(() => validateManifest(before, {...before, dependencies: {safe: spec}}), /registry/);
});

test('target audit gate permits unrelated advisories but rejects target and malformed/error reports', () => {
  const report = {auditReportVersion: 2, metadata: {vulnerabilities: {total: 1}}, vulnerabilities: {other: {via: [{url: 'https://github.com/advisories/GHSA-1111-2222-3333'}]}}};
  auditTargetAbsent(report, 'GHSA-aaaa-bbbb-cccc');
  assert.throws(() => auditTargetAbsent(report, 'GHSA-1111-2222-3333'), /still present/);
  for (const invalid of [{}, {...report, error: {message: 'offline'}}, {...report, vulnerabilities: {bad: {via: null}}}]) assert.throws(() => auditTargetAbsent(invalid, 'GHSA-aaaa-bbbb-cccc'), /valid/);
});

function mockPrepare(overrides = {}) {
  const writes = [];
  const github = {
    rest: {
      repos: {
        getCollaboratorPermissionLevel: async () => ({data: {permission: overrides.permission || 'write'}}),
        get: async () => ({data: {default_branch: 'main'}}),
        getBranch: async () => ({data: {commit: {sha: 'a'.repeat(40)}}}),
      },
      git: {getRef: async () => { if (overrides.branchExists) return {data: {}}; throw Object.assign(new Error('missing'), {status: 404}); }},
      issues: {
        get: async () => ({data: overrides.issue || issue()}),
        removeLabel: async params => writes.push(['remove', params]),
        createComment: async params => writes.push(['comment', params]),
      },
      pulls: {list: 'pulls'},
    },
    paginate: async () => overrides.prs || [],
  };
  const alertGithub = {rest: {dependabot: {getAlert: async () => ({data: {
    state: 'open', dependency: {manifest_path: 'studio13/package-lock.json', package: {name: 'dompurify'}},
    security_advisory: {ghsa_id: 'GHSA-aaaa-bbbb-cccc', summary: 'Known advisory'},
    security_vulnerability: {first_patched_version: {identifier: '3.4.17'}, vulnerable_version_range: '<3.4.17'}, ...overrides.alert,
  }})}}};
  return {args: {github, alertGithub, context: {repo: {owner: 'BerinKarjala', repo: 'portfolio'}, actor: 'BerinKarjala', runId: 99}, core: {notice() {}}, issueNumber: 10}, writes};
}

test('prepares immutable base and removes todo only after live alert and duplicate checks pass', async () => {
  const {args, writes} = mockPrepare();
  const task = await prepare(args);
  assert.equal(task.branch, 'codex/dependabot-alert-521');
  assert.equal(task.base_sha, 'a'.repeat(40));
  assert.equal(task.first_patched_version, '3.4.17');
  assert.equal(writes[0][0], 'remove');
  assert.match(writes[1][1].body, /xhigh/);
});

test('stale labels, existing PRs, existing branches and unavailable fixes do not mutate issue', async () => {
  for (const override of [{issue: issue({labels: ['todo']})}, {prs: [{html_url: 'https://github.com/BerinKarjala/portfolio/pull/12'}]}]) {
    const {args, writes} = mockPrepare(override);
    assert.equal(await prepare(args), null);
    assert.deepEqual(writes, []);
  }
  for (const override of [{branchExists: true}, {alert: {state: 'fixed'}}, {alert: {security_vulnerability: {first_patched_version: null}}}, {permission: 'read'}]) {
    const {args, writes} = mockPrepare(override);
    await assert.rejects(() => prepare(args));
    assert.deepEqual(writes, []);
  }
});

test('staged worktree checks read actual modes and reject validator replacement before it can execute', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-fix-gate-'));
  const original = process.cwd();
  const git = (...args) => cp.execFileSync('git', args, {cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  try {
    git('init');
    fs.mkdirSync(path.join(directory, 'src'));
    fs.mkdirSync(path.join(directory, 'scripts'));
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({scripts: {test: 'real-tests'}, dependencies: {safe: '1.0.0'}}));
    fs.writeFileSync(path.join(directory, 'src', 'app.js'), 'export const version = 1;\n');
    fs.writeFileSync(path.join(directory, 'scripts', 'validator.cjs'), 'throw new Error("must not execute");\n');
    git('add', '--all');
    git('-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'baseline');
    const base = git('rev-parse', 'HEAD');
    process.chdir(directory);
    fs.writeFileSync(path.join(directory, 'src', 'app.js'), 'export const version = 2;\n');
    assert.throws(() => checkWorktree(base), /staged/);
    git('add', '--all');
    assert.equal(checkWorktree(base)[0].name, 'src/app.js');
    fs.chmodSync(path.join(directory, 'src', 'app.js'), 0o755);
    git('add', '--all');
    assert.throws(() => checkWorktree(base), /non-file/);
    git('reset', '--hard', base);
    fs.writeFileSync(path.join(directory, 'scripts', 'validator.cjs'), 'process.exit(0);\n');
    git('add', '--all');
    assert.throws(() => checkWorktree(base), /manual review/);
  } finally { process.chdir(original); fs.rmSync(directory, {recursive: true, force: true}); }
});
