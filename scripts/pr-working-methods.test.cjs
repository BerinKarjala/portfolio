'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {validatePR, inspectPR, createDraftIssuePR} = require('./pr-working-methods.cjs');

const repo = {owner: 'BerinKarjala', repo: 'portfolio'};
const sha = 'a'.repeat(40);
const pr = (changes = {}) => ({number: 285, state: 'open', title: 'fix: resolve issue #284',
  base: {ref: 'main'}, head: {sha}, commits: 1, ...changes});
const commit = message => ({sha, commit: {message}});
const issue = (changes = {}) => ({number: 284, state: 'OPEN',
  repository: {nameWithOwner: 'BerinKarjala/portfolio'}, ...changes});
const args = (changes = {}) => ({repo, pr: pr(), commits: [commit('fix: restore preview')],
  closingIssues: [issue()], expectedHead: sha, ...changes});

test('normal draft or ready PRs use actual closing links and only new PR commits', () => {
  for (const draft of [true, false]) {
    assert.doesNotThrow(() => validatePR(args({pr: pr({draft})})));
  }
  // Old skip markers in main or documentation are outside the PR metadata input.
  assert.doesNotThrow(() => validatePR(args({pr: pr({body: 'Historical example: [skip netlify]'})})));
});

test('all deploy and Actions skip instructions are rejected in titles and commit bodies', () => {
  for (const marker of ['[skip netlify]', '[skip ci]', '[ci skip]', '[no ci]',
    '[skip actions]', '[actions skip]', '[SKIP NETLIFY]', 'skip-checks:true', 'skip-checks: true']) {
    assert.throws(() => validatePR(args({pr: pr({title: `fix preview ${marker}`})})), /skip instruction/i);
    assert.throws(() => validatePR(args({commits: [commit(`fix preview\n\nDetails\n\n${marker}`)]})), /skip instruction/i);
  }
  assert.throws(() => validatePR(args({pr: pr({commits: 2}), commits: [commit('old change [skip ci]'), commit('unmarked head')]})), /skip instruction/i);
});

test('every resolution PR needs an open closing issue in this repository', () => {
  assert.throws(() => validatePR(args({closingIssues: []})), /closing issue/i);
  assert.throws(() => validatePR(args({closingIssues: [issue({state: 'CLOSED'})]})), /open until.*merge/i);
  assert.throws(() => validatePR(args({closingIssues: [issue({repository: {nameWithOwner: 'other/repo'}})]})), /this repository/i);
});

test('stale head, wrong base and incomplete commit evidence fail closed', () => {
  assert.throws(() => validatePR(args({expectedHead: 'b'.repeat(40)})), /head changed/i);
  assert.throws(() => validatePR(args({pr: pr({base: {ref: 'release'}})})), /main/i);
  assert.throws(() => validatePR(args({commits: []})), /commit evidence/i);
  assert.throws(() => validatePR(args({pr: pr({state: 'closed'})})), /open PR/i);
});

function apiFixture({changed = false, hasNextPage = false} = {}) {
  let reads = 0;
  return {
    rest: {pulls: {
      get: async () => ({data: pr(reads++ && changed ? {head: {sha: 'b'.repeat(40)}} : {})}),
      listCommits: 'commits',
    }},
    paginate: async (endpoint, options) => {
      assert.equal(endpoint, 'commits'); assert.equal(options.pull_number, 285);
      return [commit('fix: restore preview')];
    },
    graphql: async (query, variables) => {
      assert.match(query, /closingIssuesReferences/); assert.equal(variables.number, 285);
      return {repository: {pullRequest: {closingIssuesReferences: {
        nodes: [issue()], pageInfo: {hasNextPage},
      }}}};
    },
  };
}

test('live inspection paginates PR commits and checks actual GitHub closing links', async () => {
  const result = await inspectPR({github: apiFixture(), repo, number: 285, expectedHead: sha});
  assert.deepEqual(result, {head: sha, issues: [284], commits: 1});
});

test('a concurrent push or truncated closing-issue result cannot pass', async () => {
  await assert.rejects(inspectPR({github: apiFixture({changed: true}), repo, number: 285, expectedHead: sha}), /head changed/i);
  await assert.rejects(inspectPR({github: apiFixture({hasNextPage: true}), repo, number: 285, expectedHead: sha}), /closing issue.*incomplete/i);
});

test('validated bot candidates publish a draft for owner preview acceptance and merge', async () => {
  const writes = [];
  const github = {rest: {pulls: {create: async value => {
    writes.push(value); return {data: {number: 9, draft: value.draft}};
  }}}};
  const result = await createDraftIssuePR({github, repo, base: 'main', head: 'codex/issue-284',
    issueNumber: 284, testedSha: sha, evidenceUrl: 'https://github.com/BerinKarjala/portfolio/actions/runs/1', notes: 'Fixed the behavior.'});
  assert.equal(writes.length, 1);
  assert.equal(writes[0].draft, true);
  assert.equal(result.draft, true);
  assert.match(writes[0].body, /Closes #284/);
  assert.match(writes[0].body, new RegExp(sha));
  assert.match(writes[0].body, /independent validation/i);
  assert.match(writes[0].body, /Netlify Deploy Preview/);
  assert.match(writes[0].body, /owner.*merge/i);
  assert.match(writes[0].body, /production.*automatically/i);
});
