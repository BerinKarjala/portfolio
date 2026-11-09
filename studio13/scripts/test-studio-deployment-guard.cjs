const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function validateDeploymentRequest(request) {
  const requireMatch = (actual, expected, label) => {
    if (actual !== expected) throw new Error(`Refusing deployment: unexpected ${label}`);
  };
  requireMatch(request.event, 'workflow_dispatch', 'event');
  requireMatch(request.repository, 'BerinKarjala/portfolio', 'repository');
  requireMatch(request.ref, 'refs/heads/feat/340-sanity-studio-upgrade', 'branch');
  if (!/^[a-f0-9]{40}$/.test(request.sha || '')) throw new Error('Refusing deployment: invalid commit SHA');
  requireMatch(request.checkedOutSha, request.sha, 'checkout commit');
  requireMatch(request.expectedSha, request.sha, 'approved commit');
  requireMatch(request.confirmation, 'deploy-content-agent-test', 'confirmation');
  requireMatch(request.projectId, 'umy7f73e', 'project');
  requireMatch(request.dataset, 'content-agent-test', 'dataset');
  requireMatch(request.host, 'berinkarjala-content-agent-test', 'host');
  requireMatch(request.cliConfig?.api?.projectId, request.projectId, 'CLI project');
  requireMatch(request.cliConfig?.api?.dataset, request.dataset, 'CLI dataset');
  if (request.cliConfig?.deployment != null || request.cliConfig?.studioHost != null) {
    throw new Error('Refusing deployment: CLI deployment or host override');
  }
}

module.exports = { validateDeploymentRequest };

if (require.main === module) {
  (async () => {
    const configPath = path.resolve(__dirname, '../content-agent-test/sanity.cli.js');
    const { default: cliConfig } = await import(pathToFileURL(configPath).href);
    const request = {
      event: process.env.GITHUB_EVENT_NAME,
      repository: process.env.GITHUB_REPOSITORY,
      ref: process.env.GITHUB_REF,
      sha: process.env.GITHUB_SHA,
      checkedOutSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      expectedSha: process.env.EXPECTED_COMMIT,
      confirmation: process.env.DEPLOY_CONFIRMATION,
      projectId: 'umy7f73e',
      dataset: 'content-agent-test',
      host: 'berinkarjala-content-agent-test',
      cliConfig,
    };
    validateDeploymentRequest(request);
    console.log(`Approved test-only target ${request.projectId}/${request.dataset} at ${request.sha}`);
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
