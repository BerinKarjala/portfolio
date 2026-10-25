'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const {trackedAlert, validateManifest} = require('./codex-dependabot-fix.cjs');

const labels = issue => new Set((issue.labels || []).map(label => typeof label === 'string' ? label : label.name));
function eligible(issue, permission) {
  if (!['admin', 'maintain', 'write'].includes(permission)) throw new Error('Only a repository writer can start an issue fix.');
  return !issue.pull_request && issue.state === 'open' && labels(issue).has('in progress');
}
const regressionFile = name => /^(?:src|server)\/[A-Za-z0-9_./-]+\.test\.[cm]?[jt]sx?$/.test(name);
function validateEntries(entries) {
  if (!entries.length) throw new Error('No candidate changes.');
  const regressions = [];
  for (const {name, mode, status} of entries) {
    if (mode !== '100644' || !['A', 'M'].includes(status)) throw new Error(`Only added/modified regular files are allowed: ${name}`);
    if (name.split('/').includes('..') || name.startsWith('server/css-studio/runtime/') || /(?:^|\/)(?:AGENTS(?:\.override)?\.md|node_modules|\.git|__tests__|setupTests\.[^/]+|.*config\.[^/]+)(?:\/|$)/i.test(name)) throw new Error(`Change requires manual review: ${name}`);
    if (/\.(?:test|spec)\.[^/]+$/i.test(name)) {
      if (status !== 'A') throw new Error(`Existing tests cannot be changed: ${name}`);
      if (!regressionFile(name) && !/^e2e\/[A-Za-z0-9_./-]+\.spec\.js$/.test(name)) throw new Error(`Test runner requires manual review: ${name}`);
      if (regressionFile(name)) regressions.push(name);
      continue;
    }
    const source = /^(?:src\/|server\/css-studio\/|studio13\/(?:schemas|schemaTypes|components)\/)[A-Za-z0-9_./-]+\.(?:[cm]?[jt]sx?|css|json)$/.test(name);
    const manifest = /^(?:studio13\/)?package(?:-lock)?\.json$/.test(name);
    const docs = /^docs\/[A-Za-z0-9_./-]+\.md$/.test(name);
    if (!source && !manifest && !docs) throw new Error(`Change requires manual review: ${name}`);
  }
  if (!regressions.length) throw new Error('At least one new Vitest regression test in src/ or server/ is required.');
  return regressions;
}
function git(...args) { return cp.execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}); }
function checkWorktree(base) {
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid immutable base.');
  if (git('diff', '--name-only').trim()) throw new Error('All candidate changes must be staged.');
  const records = git('diff', '--cached', '--raw', '-z', '--no-renames', base).split('\0');
  const entries = [];
  for (let i = 0; records[i]; i += 2) {
    const match = /^:\d{6} (\d{6}) [a-f0-9]+ [a-f0-9]+ ([AMDT])$/.exec(records[i]);
    if (!match || !records[i + 1]) throw new Error('Unsupported patch entry.');
    entries.push({name: records[i + 1], mode: match[1], status: match[2]});
  }
  const regressions = validateEntries(entries);
  for (const file of ['package.json', 'studio13/package.json']) {
    if (entries.some(entry => entry.name === file)) validateManifest(JSON.parse(git('show', `${base}:${file}`)), JSON.parse(git('show', `:${file}`)));
  }
  return regressions;
}
function requireRed(report, status) {
  const failures = (report.testResults || []).flatMap(result => result.assertionResults || []).filter(result => result.status === 'failed');
  const assertion = /AssertionError|expected .* (?:to|not)|promise rejected .* instead of resolving|promise resolved .* instead of rejecting/is;
  const missingImport = /ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find (?:package|module)|Failed to resolve import/i;
  const rejected = failures.filter(result => (result.failureMessages || []).some(message => missingImport.test(message)) || !(result.failureMessages || []).some(message => assertion.test(message)));
  if (status !== 1 || !report.numFailedTests || report.numRuntimeErrorTestSuites || !failures.length || rejected.length) {
    const details = {exitStatus: status, failedTests: report.numFailedTests || 0, runtimeErrorSuites: report.numRuntimeErrorTestSuites || 0, rejectedTests: rejected.map(result => result.fullName || result.title || 'unnamed test')};
    throw new Error(`Regression must fail on a real assertion against the unmodified base; setup/import/runtime errors are not red evidence. ${JSON.stringify(details)}`);
  }
}
function verifyCandidateTask(current, previous) {
  for (const key of ['repository', 'issue_number', 'base_sha', 'base_branch', 'branch', 'title', 'body', 'alert_number', 'ghsa_id', 'manifest_path', 'package', 'first_patched_version']) {
    if (current[key] !== previous[key]) throw new Error(`Candidate task mismatch: ${key}. Generate a fresh candidate for the current issue/base.`);
  }
}
function captureValidated(base, expectedTree) {
  if (!/^[a-f0-9]{40}$/.test(base) || !/^[a-f0-9]{40}$/.test(expectedTree)) throw new Error('Invalid immutable base or frozen tree.');
  // Studio commits generated assets; its build is a check, not part of an agent patch.
  // Candidates cannot modify this protected directory in the first place.
  if (git('ls-tree', '--name-only', base, '--', 'studio13/dist').trim()) {
    git('restore', `--source=${base}`, '--staged', '--worktree', '--', 'studio13/dist');
  }
  git('add', '--update');
  const regressions = checkWorktree(base);
  if (git('write-tree').trim() !== expectedTree) throw new Error('Source/dependency tree changed during validation.');
  return regressions;
}
function checkRed(base, evidenceDirectory) {
  const regressions = checkWorktree(base);
  const directory = path.join(evidenceDirectory, 'red-baseline');
  fs.mkdirSync(evidenceDirectory, {recursive: true});
  git('worktree', 'add', '--detach', directory, base);
  for (const name of regressions) {
    fs.mkdirSync(path.dirname(path.join(directory, name)), {recursive: true});
    fs.writeFileSync(path.join(directory, name), git('show', `:${name}`));
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  for (const args of [['ci'], ['ci', '--prefix', 'studio13']]) {
    const installed = cp.spawnSync(npm, args, {cwd: directory, stdio: 'inherit'});
    if (installed.status !== 0) throw new Error('Baseline dependency installation failed.');
  }
  const reportPath = path.join(evidenceDirectory, 'red.json');
  const result = cp.spawnSync(process.execPath, [path.join(directory, 'node_modules/vitest/vitest.mjs'), 'run', ...regressions, '--reporter=json', `--outputFile=${reportPath}`], {cwd: directory, stdio: 'inherit'});
  requireRed(JSON.parse(fs.readFileSync(reportPath, 'utf8')), result.status);
}

async function linkedPRs(github, repo, issueNumber) {
  const events = await github.paginate(github.rest.issues.listEventsForTimeline, {...repo, issue_number: issueNumber, per_page: 100});
  const numbers = new Set(events.filter(event => event.event === 'cross-referenced' && event.source?.issue?.pull_request && event.source.issue.repository?.full_name?.toLowerCase() === `${repo.owner}/${repo.repo}`.toLowerCase()).map(event => event.source.issue.number));
  const prs = [];
  for (const number of numbers) {
    const pr = (await github.rest.pulls.get({...repo, pull_number: number})).data;
    let after = null;
    pr.closesIssue = false;
    do {
      const result = await github.graphql(`query($owner:String!, $repo:String!, $number:Int!, $after:String) {
        repository(owner:$owner, name:$repo) { pullRequest(number:$number) {
          closingIssuesReferences(first:100, after:$after) { nodes { number repository { nameWithOwner } } pageInfo { hasNextPage endCursor } }
        } }
      }`, {...repo, number, after});
      const connection = result.repository.pullRequest.closingIssuesReferences;
      if (connection.nodes.some(issue => issue.number === issueNumber && issue.repository.nameWithOwner.toLowerCase() === `${repo.owner}/${repo.repo}`.toLowerCase())) pr.closesIssue = true;
      after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    } while (after);
    prs.push(pr);
  }
  return {events, prs};
}
async function prepare({github, alertGithub, context, core, issueNumber}) {
  const repo = context.repo;
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) throw new Error('Invalid issue number.');
  const permission = (await github.rest.repos.getCollaboratorPermissionLevel({...repo, username: context.actor})).data.permission;
  const issue = (await github.rest.issues.get({...repo, issue_number: issueNumber})).data;
  if (!eligible(issue, permission)) { core.notice('Issue is not currently open and in progress.'); return null; }
  const alert = trackedAlert(issue, `${repo.owner}/${repo.repo}`);
  if (labels(issue).has('dependabot') && !alert) throw new Error('Dependabot issue must identify exactly one alert in this repository.');
  const branch = alert ? `codex/dependabot-alert-${alert.number}` : `codex/issue-${issueNumber}`;
  const prs = await github.paginate(github.rest.pulls.list, {...repo, state: 'all', head: `${repo.owner}:${branch}`, per_page: 100});
  const linked = await linkedPRs(github, repo, issueNumber);
  const existing = prs[0] || linked.prs.find(pr => pr.closesIssue && (pr.state === 'open' || pr.merged_at));
  if (existing) {core.notice(`Existing issue PR: ${existing.html_url}; no duplicate work.`); return null;}
  const repository = (await github.rest.repos.get(repo)).data;
  const base = (await github.rest.repos.getBranch({...repo, branch: repository.default_branch})).data.commit.sha;
  const task = {repository: `${repo.owner}/${repo.repo}`, issue_number: issueNumber, title: issue.title, body: issue.body || '', branch, base_sha: base, base_branch: repository.default_branch};
  if (alert) {
    if (!alertGithub) throw new Error('Configure DEPENDABOT_ALERTS_TOKEN to validate the live alert.');
    const live = (await alertGithub.rest.dependabot.getAlert({...repo, alert_number: alert.number})).data;
    const ghsa = live.security_advisory?.ghsa_id;
    if (live.state !== 'open' || live.security_advisory?.withdrawn_at || !live.security_vulnerability?.first_patched_version?.identifier || !/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(ghsa || '')) throw new Error('Alert is not open with a known patched version. Review it before retrying.');
    if (!/^(?:studio13\/)?package(?:-lock)?\.json$/.test(live.dependency?.manifest_path || '')) throw new Error('Unsupported alert manifest.');
    Object.assign(task, {alert_number: alert.number, ghsa_id: ghsa, manifest_path: live.dependency.manifest_path, package: live.dependency.package.name, first_patched_version: live.security_vulnerability.first_patched_version.identifier});
  }
  try {
    const current = (await github.rest.git.getRef({...repo, ref: `heads/${branch}`})).data.object.sha;
    if (current !== base) throw new Error(`Branch ${branch} contains an earlier revision or unpublished changes. Review it before retrying.`);
  } catch (error) {
    if (error.status !== 404) throw error;
    await github.rest.git.createRef({...repo, ref: `refs/heads/${branch}`, sha: base});
  }
  if (labels(issue).has('todo')) await github.rest.issues.removeLabel({...repo, issue_number: issueNumber, name: 'todo'});
  await github.rest.issues.createComment({...repo, issue_number: issueNumber, body: `<!-- codex-issue-run:${context.runId} -->\nStarted branch \`${branch}\` from \`${base}\`. A PR will open only after a failing regression is reproduced on the base and all validation gates pass.\n\n[Workflow run](https://github.com/${task.repository}/actions/runs/${context.runId})`});
  return task;
}

function reportDue(eventName, schedule, now = new Date()) {
  if (eventName === 'workflow_dispatch') return true;
  const offset = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', timeZoneName: 'shortOffset'}).formatToParts(now).find(part => part.type === 'timeZoneName').value;
  return schedule === (offset === 'GMT-4' ? '0 13 * * 1' : '0 14 * * 1');
}
function weekKey(now = new Date()) {
  const local = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
  const monday = new Date(`${local}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return monday.toISOString().slice(0, 10);
}
const cell = value => String(value || '').replace(/[&<>|`\[\]@]/g, character => `&#${character.charCodeAt(0)};`).replace(/[\r\n]+/g, ' ');
function reportRows(records) {
  return records.filter(({issue, events}) => !issue.pull_request && (labels(issue).has('in progress') || events.some(event => event.event === 'labeled' && event.label?.name === 'in progress'))).map(({issue, prs = [], run, branch}) => {
    const status = issue.state === 'closed' ? `closed (${cell(issue.state_reason || 'unspecified')})` : labels(issue).has('in progress') ? 'in progress' : 'open; label removed';
    const prStatus = prs.length ? prs.map(pr => `[#${pr.number}](${pr.html_url}): ${pr.merged_at ? `merged ${pr.merged_at.slice(0, 10)}` : pr.state === 'closed' ? 'closed without merge' : 'open; not merged'} (\`${cell(pr.head?.ref)}\`)`).join('<br>') : `${branch ? `\`${cell(branch)}\`; ` : ''}no linked PR; merge not established`;
    const latest = run ? `[${cell(run.status)}${run.conclusion ? ` / ${cell(run.conclusion)}` : ''}](${run.html_url})` : 'No recorded run';
    return `| #${issue.number} ${cell(issue.title)} | ${status} | ${prStatus} | ${latest} |`;
  });
}
async function publishReport({github, repo, issues, body, now = new Date()}) {
  const week = weekKey(now);
  const marker = `<!-- weekly-issue-report:${week} -->`;
  const existing = issues.find(issue => !issue.pull_request && (issue.body || '').includes(marker));
  const data = {...repo, title: `Weekly issue progress report - ${week}`, body: `${marker}\n\n${body}`};
  return existing ? github.rest.issues.update({...data, issue_number: existing.number}) : github.rest.issues.create(data);
}
async function weeklyReport({github, context, core, now = new Date(), publish = true}) {
  const repo = context.repo;
  const issues = await github.paginate(github.rest.issues.listForRepo, {...repo, state: 'all', per_page: 100});
  const records = [];
  for (const issue of issues) {
    if (issue.pull_request || /<!-- weekly-issue-report:/.test(issue.body || '')) continue;
    const {events, prs} = await linkedPRs(github, repo, issue.number);
    if (!labels(issue).has('in progress') && !events.some(event => event.event === 'labeled' && event.label?.name === 'in progress')) continue;
    const alert = trackedAlert({...issue, state: 'open'}, `${repo.owner}/${repo.repo}`);
    const branchName = alert ? `codex/dependabot-alert-${alert.number}` : `codex/issue-${issue.number}`;
    const deterministic = await github.paginate(github.rest.pulls.list, {...repo, state: 'all', head: `${repo.owner}:${branchName}`, per_page: 100});
    const allPRs = [...new Map([...prs.filter(pr => pr.closesIssue), ...deterministic].map(pr => [pr.number, pr])).values()];
    let branch;
    try {await github.rest.git.getRef({...repo, ref: `heads/${branchName}`}); branch = branchName;} catch (error) {if (error.status !== 404) throw error;}
    const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: issue.number, per_page: 100});
    const expression = new RegExp(`https://github\\.com/${repo.owner}/${repo.repo}/actions/runs/([0-9]+)`, 'g');
    const runIds = comments.filter(comment => comment.user?.login === 'github-actions[bot]').flatMap(comment => [...(comment.body || '').matchAll(expression)].map(match => Number(match[1])));
    let run;
    if (runIds.length) run = (await github.rest.actions.getWorkflowRun({...repo, run_id: runIds.at(-1)})).data;
    records.push({issue, events, prs: allPRs, run, branch});
  }
  const rows = reportRows(records);
  const body = `Issues that currently have, or have ever had, the **in progress** label. Snapshot: ${now.toISOString()}.\n\n| Issue | Current status | Linked PRs / branch merge status | Latest automation |\n| --- | --- | --- | --- |\n${rows.join('\n') || '| None | No issues have been labeled in progress | - | - |'}\n\nIssue closure is reported separately from PR merge state. PRs are matched by GitHub closing-issue links or deterministic automation branches. Incidental mentions are excluded.\n\nScheduled Mondays at 9:00 a.m. America/New_York. [Report run](https://github.com/${repo.owner}/${repo.repo}/actions/runs/${context.runId}).`;
  if (core?.summary) await core.summary.addRaw(body).write();
  if (publish) await publishReport({github, repo, issues, body, now});
  return {body, records};
}

module.exports = {eligible, validateEntries, checkWorktree, requireRed, checkRed, prepare, weekKey, reportDue, reportRows, publishReport, weeklyReport, linkedPRs, verifyCandidateTask, captureValidated};
if (require.main === module) {
  const [command, base, directory] = process.argv.slice(2);
  if (command === 'check-worktree') console.log(JSON.stringify(checkWorktree(base)));
  else if (command === 'check-red') checkRed(base, directory);
  else if (command === 'capture-validated') console.log(JSON.stringify(captureValidated(base, directory)));
  else throw new Error('Expected check-worktree <base>, check-red <base> <evidence-directory> or capture-validated <base> <tree>.');
}
