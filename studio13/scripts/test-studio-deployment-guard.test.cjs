const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { validateDeploymentRequest, deploymentOutput } = require('./test-studio-deployment-guard.cjs');

const sha = 'a'.repeat(40);
const safe = {
  event: 'workflow_dispatch',
  repository: 'BerinKarjala/portfolio',
  ref: 'refs/heads/main',
  sha,
  checkedOutSha: sha,
  expectedSha: sha,
  confirmation: 'deploy-content-agent-test',
  projectId: 'umy7f73e',
  dataset: 'content-agent-test',
  host: 'berinkarjala-content-agent-test',
  cliConfig: { api: { projectId: 'umy7f73e', dataset: 'content-agent-test' } },
};

test('allows only the explicitly confirmed test deployment', () => {
  assert.doesNotThrow(() => validateDeploymentRequest(safe));
  assert.equal(deploymentOutput(safe), 'host=berinkarjala-content-agent-test\n');
});

test('the deployment command uses the host output by the guard', () => {
  const workflow = readFileSync(path.resolve(__dirname, '../../.github/workflows/studio-dependencies.yml'), 'utf8');
  assert.match(workflow, /SANITY_TEST_HOST:\s*\$\{\{\s*steps\.target\.outputs\.host\s*\}\}/);
  assert.match(workflow, /sanity deploy[^\n]*--url "\$SANITY_TEST_HOST"/);
  assert.doesNotMatch(workflow, /sanity deploy[^\n]*--url\s+berinkarjala/);
  assert.throws(() => deploymentOutput({ ...safe, host: 'berinkarjala' }));
});

for (const [label, change] of Object.entries({
  'pull request event': { event: 'pull_request' },
  'wrong repository': { repository: 'other/portfolio' },
  'unmerged feature branch': { ref: 'refs/heads/feat/340-sanity-studio-upgrade' },
  'short or mismatched approval SHA': { expectedSha: 'abc123' },
  'wrong checked-out commit': { checkedOutSha: 'b'.repeat(40) },
  'missing confirmation': { confirmation: '' },
  'wrong project': { projectId: 'wrong' },
  'production dataset': { dataset: 'production' },
  'production host': { host: 'berinkarjala' },
  'CLI production target': { cliConfig: { api: { projectId: 'umy7f73e', dataset: 'production' } } },
  'CLI deployment app override': { cliConfig: { ...safe.cliConfig, deployment: { appId: 'existing-app' } } },
  'CLI hostname override': { cliConfig: { ...safe.cliConfig, studioHost: 'berinkarjala' } },
})) {
  test(`rejects ${label}`, () => {
    assert.throws(() => validateDeploymentRequest({ ...safe, ...change }));
  });
}
