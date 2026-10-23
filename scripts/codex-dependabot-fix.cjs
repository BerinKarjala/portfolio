'use strict';

const fs = require('node:fs');
const cp = require('node:child_process');

const DEPENDENCY_FIELDS = new Set(['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'overrides']);
const MANIFESTS = ['package.json', 'studio13/package.json'];

function trackedAlert(issue, repository) {
  if (issue.pull_request || issue.state !== 'open') return null;
  const escaped = repository.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = String(issue.body || '');
  const ids = new Set();
  for (const expression of [
    new RegExp(`<!--\\s*dependabot-alert:${escaped}:([1-9][0-9]*)\\s*-->`, 'gi'),
    new RegExp(`https://github\\.com/${escaped}/security/dependabot/([1-9][0-9]*)(?![a-z0-9/_-])`, 'gi'),
  ]) for (const match of body.matchAll(expression)) ids.add(Number(match[1]));
  if (ids.size !== 1 || !Number.isSafeInteger([...ids][0])) return null;
  const labels = new Set((issue.labels || []).map(label => typeof label === 'string' ? label : label.name));
  return { number: [...ids][0], labels };
}

function readyIssue(issue, repository, permission, retry = false) {
  if (!['admin', 'maintain', 'write'].includes(permission)) throw new Error('Only a repository writer can start a security fix.');
  const alert = trackedAlert(issue, repository);
  if (!alert || !alert.labels.has('in progress')) return null;
  if (!retry && !alert.labels.has('todo')) return null;
  return alert.number;
}

function validatePaths(entries) {
  if (!entries.length) throw new Error('Codex produced no changes.');
  for (const { name, mode, status } of entries) {
    if (mode !== '100644' || !['A', 'M'].includes(status)) throw new Error(`Deleted, executable, symlink or non-file change is not allowed: ${name}`);
    const dependencyFile = /^(?:studio13\/)?package(?:-lock)?\.json$/.test(name);
    const appFile = /^(?:src\/|studio13\/(?:schemas|schemaTypes|components)\/)[A-Za-z0-9_./ -]+\.(?:[cm]?js|jsx|tsx?|css|json)$/.test(name);
    const protectedName = /(?:^|\/)(?:AGENTS(?:\.override)?\.md|node_modules|\.git|\.github|__tests__)(?:\/|$)/i.test(name) || /\.(?:test|spec)\.[^/]+$/i.test(name) || name.split('/').includes('..');
    if ((!dependencyFile && !appFile) || protectedName) throw new Error(`Change requires manual review outside the automatic fix scope: ${name}`);
  }
}

function validateManifest(before, after) {
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!DEPENDENCY_FIELDS.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw new Error(`Manifest field cannot change in an automatic fix: ${key}`);
  }
  function checkSpecs(value) {
    if (typeof value === 'string' && /(?:file:|link:|workspace:|git(?:\+|:)|https?:|\.\.\/)/i.test(value)) throw new Error('Dependency specifications must remain registry versions or npm aliases.');
    if (value && typeof value === 'object') Object.values(value).forEach(checkSpecs);
  }
  function preserveOverrides(previous, next) {
    if (!previous || typeof previous !== 'object') return;
    for (const [key, value] of Object.entries(previous)) {
      if (!next || !Object.hasOwn(next, key)) throw new Error('Existing override entries cannot be removed in an automatic fix.');
      preserveOverrides(value, next[key]);
    }
  }
  preserveOverrides(before.overrides, after.overrides);
  for (const field of DEPENDENCY_FIELDS) checkSpecs(after[field]);
}

function auditTargetAbsent(audit, ghsa) {
  if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(ghsa)) throw new Error('A valid GHSA id is required.');
  if (audit.error || audit.auditReportVersion !== 2 || !audit.vulnerabilities || typeof audit.vulnerabilities !== 'object' || !audit.metadata?.vulnerabilities) throw new Error('npm audit did not produce a valid vulnerability report.');
  const target = ghsa.toLowerCase();
  for (const vulnerability of Object.values(audit.vulnerabilities)) {
    if (!Array.isArray(vulnerability.via)) throw new Error('npm audit has an invalid vulnerability entry.');
    for (const via of vulnerability.via) {
      if (typeof via === 'object' && typeof via.url === 'string' && via.url.toLowerCase().replace(/\/$/, '').split('/').pop() === target) throw new Error(`Target advisory ${ghsa} is still present in npm audit.`);
    }
  }
}

function git(...args) { return cp.execFileSync('git', args, { encoding: 'utf8', cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }); }
function checkWorktree(base) {
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid immutable base revision.');
  if (git('diff', '--name-only').trim()) throw new Error('All generated changes must be staged before validation.');
  const records = git('diff', '--cached', '--raw', '-z', '--no-renames', base).split('\0');
  const names = [];
  for (let i = 0; i < records.length && records[i]; i += 2) {
    const match = /^:\d{6} (\d{6}) [a-f0-9]+ [a-f0-9]+ ([AMDT])$/.exec(records[i]);
    if (!match || !records[i + 1]) throw new Error('Unsupported generated patch entry.');
    names.push({ name: records[i + 1], mode: match[1], status: match[2] });
  }
  validatePaths(names);
  for (const file of MANIFESTS) {
    if (names.some(entry => entry.name === file)) validateManifest(JSON.parse(git('show', `${base}:${file}`)), JSON.parse(git('show', `:${file}`)));
  }
  return names;
}

async function prepare({ github, alertGithub, context, core, retry = false, issueNumber }) {
  const { owner, repo } = context.repo;
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) throw new Error('A valid issue number is required.');
  const { data: permission } = await github.rest.repos.getCollaboratorPermissionLevel({ owner, repo, username: context.actor });
  const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: issueNumber });
  const alertNumber = readyIssue(issue, `${owner}/${repo}`, permission.permission, retry);
  if (!alertNumber) { core.notice('No current tracked todo-to-in-progress transition; skipping.'); return null; }
  const branch = `codex/dependabot-alert-${alertNumber}`;
  const prs = await github.paginate(github.rest.pulls.list, { owner, repo, state: 'all', head: `${owner}:${branch}`, per_page: 100 });
  if (prs.length) { core.notice(`Existing remediation PR: ${prs[0].html_url}; no duplicate run.`); return null; }
  try {
    await github.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    throw new Error(`Remediation branch ${branch} already exists without a PR. Review the partial publication before retrying.`);
  } catch (error) { if (error.status !== 404) throw error; }
  const { data: alert } = await alertGithub.rest.dependabot.getAlert({ owner, repo, alert_number: alertNumber });
  if (alert.state !== 'open') throw new Error(`Dependabot alert #${alertNumber} is no longer open; review the issue before retrying.`);
  if (alert.security_advisory?.withdrawn_at) throw new Error('The advisory is withdrawn; review it manually.');
  const manifest = alert.dependency?.manifest_path;
  if (!['package-lock.json', 'studio13/package-lock.json', 'package.json', 'studio13/package.json'].includes(manifest)) throw new Error(`Unsupported manifest: ${manifest}`);
  const ghsa = alert.security_advisory?.ghsa_id;
  if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(ghsa || '') || !alert.security_vulnerability?.first_patched_version?.identifier) throw new Error('No valid advisory and known patched version is available; manual remediation planning is needed.');
  const { data: repository } = await github.rest.repos.get({ owner, repo });
  const { data: base } = await github.rest.repos.getBranch({ owner, repo, branch: repository.default_branch });
  const task = {
    repository: `${owner}/${repo}`, issue_number: issueNumber, alert_number: alertNumber,
    manifest_path: manifest, ghsa_id: ghsa,
    package: alert.dependency.package.name, vulnerable_range: alert.security_vulnerability.vulnerable_version_range,
    first_patched_version: alert.security_vulnerability.first_patched_version.identifier,
    summary: alert.security_advisory.summary, advisory_url: `https://github.com/advisories/${ghsa}`,
    base_sha: base.commit.sha, base_branch: repository.default_branch, branch,
  };
  await github.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: 'todo' }).catch(error => { if (error.status !== 404) throw error; });
  await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body: `Starting Codex with xhigh effort for Dependabot alert #${alertNumber}. A remediation PR will be published only after independent validation passes.\n\n[Workflow run](https://github.com/${owner}/${repo}/actions/runs/${context.runId})` });
  return task;
}

module.exports = { trackedAlert, readyIssue, validatePaths, validateManifest, auditTargetAbsent, checkWorktree, prepare };

if (require.main === module) {
  const [command, value] = process.argv.slice(2);
  if (command === 'check-worktree') console.log(JSON.stringify(checkWorktree(value)));
  else if (command === 'check-audit') {
    auditTargetAbsent(JSON.parse(fs.readFileSync(value, 'utf8')), process.argv[4]);
    console.log('Target advisory is absent from the npm audit report.');
  } else throw new Error('Expected check-worktree <base-sha> or check-audit <report> <GHSA-id>.');
}
