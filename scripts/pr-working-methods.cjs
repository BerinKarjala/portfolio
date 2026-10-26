'use strict';

const skipInstruction = /\[(?:skip netlify|skip ci|ci skip|no ci|skip actions|actions skip)\]|\bskip-checks\s*:\s*true\b/i;

function validatePR({repo, pr, commits, closingIssues, expectedHead}) {
  if (pr.state !== 'open') throw new Error('An open PR is required.');
  if (pr.base.ref !== 'main') throw new Error('Task PRs must target main.');
  if (!expectedHead || pr.head.sha !== expectedHead) throw new Error('PR head changed; check the current head.');
  if (!commits.length || commits.length !== pr.commits) throw new Error('PR commit evidence is incomplete; split oversized PRs rather than omit commits.');
  for (const value of [pr.title, ...commits.map(item => item.commit.message)]) {
    if (skipInstruction.test(value)) throw new Error('Remove every deploy/CI skip instruction from the PR title and new commits.');
  }
  if (!closingIssues.length) throw new Error('Add a closing issue reference, such as Closes #284, to the PR body.');
  for (const issue of closingIssues) {
    if (issue.repository.nameWithOwner.toLowerCase() !== `${repo.owner}/${repo.repo}`.toLowerCase()) {
      throw new Error('The closing issue must belong to this repository.');
    }
    if (issue.state.toLowerCase() !== 'open') throw new Error('Keep the linked issue open until the PR is merged.');
  }
}

async function inspectPR({github, repo, number, expectedHead}) {
  const pr = (await github.rest.pulls.get({...repo, pull_number: number})).data;
  const commits = await github.paginate(github.rest.pulls.listCommits, {...repo, pull_number: number, per_page: 100});
  const result = await github.graphql(`query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        closingIssuesReferences(first: 100) {
          nodes { number state repository { nameWithOwner } }
          pageInfo { hasNextPage }
        }
      }
    }
  }`, {owner: repo.owner, repo: repo.repo, number});
  const links = result.repository.pullRequest.closingIssuesReferences;
  if (links.pageInfo.hasNextPage) throw new Error('Closing issue evidence is incomplete; split this PR.');
  validatePR({repo, pr, commits, closingIssues: links.nodes, expectedHead});
  const current = (await github.rest.pulls.get({...repo, pull_number: number})).data;
  if (current.head.sha !== expectedHead) throw new Error('PR head changed during inspection; check the current head.');
  return {head: expectedHead, issues: links.nodes.map(issue => issue.number), commits: commits.length};
}

async function createDraftIssuePR({github, repo, base, head, issueNumber, testedSha, evidenceUrl, notes}) {
  return (await github.rest.pulls.create({...repo, base, head, draft: true,
    title: `fix: resolve issue #${issueNumber}`,
    body: `Closes #${issueNumber}.\n\nIndependent validation reproduced new regression assertion failures on the original base, then passed the complete root requirements/unit/build/browser matrix (zero retries), CSS Studio server/browser runtime checks, Studio dependency tests/build, automation tests, and target advisory audit when applicable.\n\nTested commit: \`${testedSha}\`. [Validation and evidence](${evidenceUrl}).\n\nAgent implementation notes (review alongside the independent evidence):\n\n${notes}\n\nCreated with GITHUB_TOKEN; additional PR workflows may be suppressed. Dispatch any missing required CI explicitly. A successful Netlify Deploy Preview of the current head is required; add its direct link and an acceptance checklist before handoff. The owner acceptance-tests the preview and merges this PR themselves. Keep the issue open until merge. Merging into main deploys to production automatically. This automation never merges or enables auto-merge.`})).data;
}

module.exports = {validatePR, inspectPR, createDraftIssuePR};
