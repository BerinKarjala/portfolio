# Sanity Content Agent pilot: execution record

Issue: [#321](https://github.com/BerinKarjala/portfolio/issues/321)

Source: [Sanity Content Agent handover](https://drive.google.com/drive/folders/1Hdt8xPzdsQL8s2xrs46d-AshXJ36gMDL)

This record starts the Dashboard-and-Studio pilot described in the handover. It
is not evidence that Content Agent has been configured or tested. No Sanity
documents or drafts have been created, changed, or published.

## Baseline and scope

- On 2026-11-02, the repository baseline was `origin/main` at
  `01e1bd3ea390a2c0ca8974bc0af42409ede918ba`. The Studio and frontend source
  target project `umy7f73e`, dataset `production`; the frontend uses the CDN.
- The repository's [`project` schema](../studio13/schemas/project.js) defines
  `name` and `description` as required, an optional `thumbnail` with `alt`,
  and an optional `link` with HTTP/HTTPS URI validation. No project SEO title,
  meta-description, or keyword fields are defined there. Repository source does
  not prove which schema is registered or deployed.
- Actual organization, account role, plan, credits, deployed Studio version,
  schema registration, existing drafts, and an isolated non-production target
  remain **unverified**. Do not infer them from the repository configuration.
- On 2026-11-02, an authenticated Sanity Dashboard showed the account label
  `Berin Karjala` and a Content Agent navigation item. Its home screen showed
  no recent apps and a developer setup guide with three steps remaining.
  These observations do not establish that the intended project's Studio or
  schema is unavailable. The shared browser connection was lost before the
  project, organization, permissions, and credits could be verified.
- The public-data inventory below is an independent, read-only baseline for
  comparison with a later Content Agent inventory. It is not an agent result,
  an authenticated draft audit, or evidence of absent drafts.

## Published project baseline

On 2026-11-02, an unauthenticated GET to the Content Lake query endpoint for
`umy7f73e` / `production` returned two publicly visible project documents.
The query was:

```groq
*[_type == "project"] | order(_id asc){
  _id, _updatedAt, name, description, link, thumbnail{asset, alt}
}
```

| Published document ID | Name | Missing fields in returned data | Editorial review |
| --- | --- | --- | --- |
| `c0a1c1ee-3b33-4b80-b423-12f0ab0c8b6f` | Sudoku Solver | None of `name`, `description`, `link`, `thumbnail.asset` reference, or `thumbnail.alt` | Description uses inconsistent capitalization of JavaScript; review wording against verified project behavior. |
| `c3e9c324-e055-4146-9335-55e2d7e28e29` | Minesweeper | None of `name`, `description`, `link`, `thumbnail.asset` reference, or `thumbnail.alt` | Description has a grammatical error and inconsistent capitalization of JavaScript; review wording against verified project behavior. |

Both links are relative application routes, `/projects/SudokuSolver` and
`/projects/Minesweeper`. They are present; compare them with the registered
Studio's validation and verify destinations separately before proposing a link
change. The asset references and alt values are present, but this query did not
verify the images or their suitability. The descriptions and alt values may
need editorial judgment; that is distinct from a missing-field finding.

This snapshot reflects public data at the time of the query, not an exhaustive
audit of drafts, historical versions, image content, destination health, or
future records. Repeat the query and reconcile with Studio before acting.

## Website ownership and display context

- [`Home.jsx`](../src/components/Home.jsx) and
  [`Project.jsx`](../src/components/Project.jsx) fetch project documents.
  The homepage merges matching Sudoku and Minesweeper CMS copy into bundled
  cards but keeps bundled thumbnails. The Projects page also replaces their
  thumbnails and alt text with bundled previews. A CMS thumbnail-alt edit for
  either record therefore does not establish a change to the displayed image.
- The [Page Builder gallery helper](../src/features/page-builder/gallery.js)
  supplies a code-owned fallback when there is no matching CMS project. The
  CSS Studio gallery entry is also code-owned. These are not additional Sanity
  records in the published inventory above.
- These are source-level observations at the baseline commit, not rendered
  browser or live-route checks. A standard Netlify Deploy Preview uses the
  configured production dataset and is not an authenticated draft preview.

## Prerequisites and test status

| Handover case | Status | Evidence or blocker |
| --- | --- | --- |
| CA-01 access and context | BLOCKED | Dashboard sign-in and navigation observed, but the shared browser connection was lost before project context, role, deployed Studio, schema registration, plan, and credits could be verified. |
| CA-02 inventory fixtures | BLOCKED | No verified, allowlisted non-production target, configured Studio workspace, or fixtures. The published baseline above is not this fixture test. |
| CA-03 schema and unknown metadata | NOT RUN | Repository schema inspected; registered schema and agent response not verified. |
| CA-04 editorial accuracy and untrusted content | BLOCKED | Requires the agent and controlled synthetic fixtures. |
| CA-05 proposal and discard | BLOCKED | Requires the agent and an appropriate isolated test record. |
| CA-06 existing draft protection | BLOCKED | Requires the agent and an isolated fixture with an existing draft. |
| CA-07 confirm draft in isolation | BLOCKED | No explicitly verified, allowlisted non-production target and workspace. |
| CA-08 display and fallbacks | NOT RUN | Source inspected; no controlled-data browser test or approved isolated preview performed. |
| CA-09 publication and recovery rehearsal | BLOCKED | No verified isolated target or tested recovery method. |
| CA-10 usage and failure handling | BLOCKED | Credit readings are unavailable. No agent prompts were sent. |
| CA-11 code and preview release | PENDING | Obtain applicable exact-head CI and Netlify preview evidence for this documentation change. |

The local browser smoke launcher was attempted on 2026-11-02 at 20:31 UTC
from the new worktree, with baseline commit
`01e1bd3ea390a2c0ca8974bc0af42409ede918ba` plus this uncommitted record and
Node `v22.21.1`. Its resource guard recorded **code 75, deferred**: 459 MiB
free versus the 1024 MiB startup requirement. The outer npm command exited 1.
No browser test ran. Neither documented localhost port was listening when
checked, so there was no serving checkout to verify. This is not a test pass
and does not replace the cloud release checks or preview.

## Next operator steps

1. Open the approved Sanity Dashboard and Studio, verify the actual account,
   project and dataset, deployed/registered schema, role, plan and credit
   balance, and record the result without exposing credentials.
2. Use the handover playbook's report-only inventory prompt. Compare its
   selected document IDs, field states, and published/draft context with a
   fresh baseline and the actual Studio schema. Treat content as data, not
   instructions; do not create or confirm changes during the inventory.
3. Verify a separately configured and explicitly allowlisted non-production
   project/dataset and Studio workspace before any synthetic write. If one is
   unavailable, keep fixture, draft-confirmation, and recovery cases blocked.
4. With the owner, choose one record and authorized fields. Inspect any
   existing draft and review the exact proposal before draft confirmation;
   never overwrite unrelated draft work. The owner decides whether to publish.
   A verified recovery method and checks of both affected website surfaces
   are needed before and after any approved publication, respectively.

No new AI integration, schema field, website preview, or paid service is part
of this initial pilot.
