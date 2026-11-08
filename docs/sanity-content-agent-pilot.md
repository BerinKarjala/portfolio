# Sanity Content Agent pilot: execution record

Issue: [#321](https://github.com/BerinKarjala/portfolio/issues/321)

Source: [Sanity Content Agent handover](https://drive.google.com/drive/folders/1Hdt8xPzdsQL8s2xrs46d-AshXJ36gMDL)

This record starts the Dashboard-and-Studio pilot described in the handover. It
is not evidence that Content Agent has been configured or tested. No Sanity
documents or drafts have been created, changed, or published.

## Current isolation decision and checks: 2026-11-08

The owner chose a cloud browser smoke check for the test Studio because local
memory was insufficient. Issue [#338](https://github.com/BerinKarjala/portfolio/issues/338)
tracks that check. It must use a fresh unauthenticated browser and block or
mock external traffic; it cannot establish real account permissions, Dashboard
registration, or Content Agent behavior. The local test server previously
served the intended configuration, but its UI and connection were not verified.

The owner allowlisted project `umy7f73e`, dataset `content-agent-test`, for
synthetic pilot content only. The dataset metadata identifies it as private.
This decision does not authorize copying production data, deploying or
registering a Studio, or writing test documents. Permissions for the test
workspace and synthetic writes have not yet been verified. The production
project and dataset pair remains outside the test-write allowlist.

An authenticated, non-CDN raw-perspective metadata audit found one accessible
production draft, of type `landingPage`; the test dataset returned only system
documents. This is a point-in-time, permission-scoped observation, not a
guarantee about inaccessible or future records. Preserve the production draft
and repeat the audit before acting. The Dashboard still reported that Studio
action was required, and the observed monthly AI usage was 0 of 1,000 credits.
No Content Agent prompt or action was run as part of these checks.

The isolation decision supplies a named target; it does not establish a working
Studio workspace, registered schema, test permissions, or a recovery method.
The recovery and deployment safeguards below continue to apply. Earlier
observations in this record describe their stated dates and are retained as
historical evidence.

## Baseline and scope

- On 2026-11-02, the repository baseline was `origin/main` at
  `01e1bd3ea390a2c0ca8974bc0af42409ede918ba`. The Studio and frontend source
  target project `umy7f73e`, dataset `production`; the frontend uses the CDN.
- The repository's [`project` schema](../studio13/schemas/project.js) defines
  `name` and `description` as required, an optional `thumbnail` with `alt`,
  and an optional `link`. This branch proposes validation for internal paths
  and HTTP/HTTPS URLs. No project SEO title, meta-description, or keyword fields
  are defined there. Repository source does not prove which schema is registered
  or deployed.
- On 2026-11-02, Sanity Manage showed the `Berin Karjala` organization
  (`oA1XjC8YD`) containing the active `Studio13` project (`umy7f73e`), on the
  **Developer (Legacy)** plan. Its dataset list showed `production` as public
  and as the only existing dataset; usage showed one of two dataset slots used.
  An available slot is not an approved or configured test environment.
- The organization and project members screens both identified the current
  user as an **Administrator**. The AI usage screen showed **0 of 1,000 AI
  credits used** for the month to date on 2026-11-02; Content Agent queries
  and actions each showed zero. This is a usage reading, not a guarantee about
  future availability or pricing.
- The authenticated Dashboard showed a Content Agent navigation item and no
  recent apps. Its developer setup guide listed three steps remaining. The
  Content Agent panel reported **Studio action required**: use Studio 5.1.0 or
  later and open the Studio to connect it.
- Manage lists `https://berinkarjala.sanity.studio` as Sanity-hosted, last
  updated on 2025-09-02, with version `N/A` and an empty manifest cell. In the
  signed-in deployed Studio, its upgrade panel reported installed
  `@sanity/core` and `@sanity/base` versions **2.26.0**. The repository's
  [`studio13/package.json`](../studio13/package.json) declares Sanity `^6.20.0`;
  that source version has not been deployed to the hosted Studio by this pilot.
- Registered schema and an isolated non-production target remain **unverified**.
  The authenticated draft inventory below is a point-in-time, permission-scoped
  result and must be repeated before acting.
  Do not infer them from the repository configuration or available capacity.
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
`/projects/Minesweeper`. They are present, but the baseline repository URL rule
did not set `allowRelative`. [Sanity's URL documentation](https://www.sanity.io/docs/studio/url-type)
states that relative URLs are disallowed by default. An offline check using
the repository's project schema and Sanity 6.20.0's validator confirmed that
synthetic records containing each existing route fail with `Not a valid URL`;
an HTTPS URL passed, and a `javascript:` URL failed. This check did not access
or modify CMS data and was not a test in a deployed Studio. Such
[validation errors can block publication](https://www.sanity.io/docs/studio/validation).
The branch-only change now accepts those paths without rewriting the records;
it has not been deployed. The asset references and alt values
are present, but this query did not verify the images or their suitability.
The descriptions and alt values may need editorial judgment; that is distinct
from a missing-field finding.

A second anonymous query on 2026-11-03 used the `published` perspective. It
returned the same two IDs and unchanged `_updatedAt` values. For both published
records, the historical editor fields `title`, `date`, `place`, `projectType`,
and `tags` were absent or null; `name`, `description`, `link`, `thumbnail`, and
`thumbnail.alt` were defined. This does not describe existing drafts, releases,
or historical revisions, and does not prove the exact deployed source.

## Branch-only link validation

The owner approved preparing the validation change on the feature branch. The
new rule accepts relative paths and HTTP/HTTPS URLs while rejecting unsafe
schemes, protocol-relative URLs, backslashes, and control characters. The link
remains optional. This changes the repository schema only, not existing data or
the hosted Studio.

The Projects page also resolves path-relative links from the site root. This
keeps a link such as `projects/example` pointed at the same path from both
`/project` and `/project/`, including in a Deploy Preview. Absolute URLs remain
unchanged. This repository change does not rewrite any Sanity documents.

The new `test:project-links` command runs a single-worker, offline regression
test against the project schema and Sanity's document validator; Studio CI
runs it before the build. Before the fix, all five initial relative-path cases
failed with `Not a valid URL`. Afterward, those cases and the original HTTP(S),
optional-value, unsafe-scheme, and disguised-external-path cases passed.

The local test used Node `v22.21.1` and Sanity 6.20.0 dependencies from the
original checkout. Because that local dependency tree is missing a
`framer-motion` file, an in-memory module-resolution hook supplied Sanity's
schema helpers from `@sanity/types`; the actual project schema, Sanity schema
compiler, and document validator were exercised with an offline client. This
is not an unmodified Studio runtime test. CI must run the same test without
that local hook and with the repository's pinned Node version.

## Branch-only author field preservation

The owner approved restoring Name, Slug, and Image in the feature branch. The
[author schema](../studio13/schemas/author.js) now includes those optional
fields alongside the existing Bio and Certificates fields. Slug keeps the
legacy name source and 96-character maximum; Image retains hotspot support. The
existing biography and certificate validation rules and author preview remain
unchanged. This has not been deployed and changes no CMS data.

The new `test:author-schema` check compiles the actual author schema with
Sanity's built-in types and runs its validator against synthetic data. It stubs
the JSX certificate input and answers the slug-uniqueness query in memory; it
does not contact Sanity. The test initially detected the three missing fields
and their unknown-field warnings. After the change, it covered the restored
types and options, retained Bio and Certificates, optional identity fields,
slug validation, and existing required-field rules. Sanity reports duplicate
slugs as a warning in this validation path.

The local focused run used Node `v22.21.1` and the existing Sanity 6.20.0
dependencies, with the same temporary in-memory `sanity` resolution hook
described above because the original local dependency tree is incomplete. CI
runs the test without that local hook and builds the actual Studio component.

This snapshot reflects public data at the time of the query, not an exhaustive
audit of drafts, historical versions, image content, destination health, or
future records. Repeat the query and reconcile with Studio before acting.

## Dashboard connection and deployment assessment

After the owner signed in to the hosted Studio, the Dashboard still showed
**Studio action required**. Its setup page listed Studio13 with unknown
compatibility, no version, and its **Show in Dashboard** checkbox unchecked;
zero studios were included. An unauthenticated HEAD request to the hosted Studio's
`/static/create-manifest.json` returned HTTP 404 on 2026-11-02. That does not
by itself establish the complete server-side schema registration state. No
Dashboard setting was changed during this check.

For a Sanity-hosted Studio, the setup page and
[Sanity's Dashboard guidance](https://www.sanity.io/docs/dashboard/dashboard-configure)
describe redeploying a compatible Studio to generate and upload its schema and
manifest. The [Content Agent prerequisites](https://www.sanity.io/docs/content-agent/introduction)
specify Studio 5.1.0 or newer. Signing in to an older or unregistered Studio
does not by itself establish that these prerequisites are satisfied.

The signed-in Studio showed a **Post** section with no documents, while the
repository's [schema index](../studio13/schemas/index.js) does not
register a `post` type and its [desk structure](../studio13/deskStructure.js)
adds a **Landing Page** entry. Repository commit
[`b162b5f`](https://github.com/BerinKarjala/portfolio/commit/b162b5f122f4b0493c43f1cde24c7e366860acbe)
explicitly removed the blog schema, so do not restore it without an owner
decision. An unauthenticated count on 2026-11-02 returned zero published
`post` documents; it does not rule out drafts or historical content.
Redeploying the repository version could therefore change the owner's editing
interface. It must not be assumed to delete existing documents, or to preserve
every existing editing capability without comparison.

The deployed Studio listed both existing project documents as **Untitled**.
Their editor fields included Title, Date, Place, Description, Project type,
Link, and Tags; Developer info reported the actual `name` and `thumbnail`
fields as unknown on both records. These fields are present in the repository's
current project schema and must not be removed from the documents. Both
documents displayed disabled Publish and Discard changes actions when
inspected; that UI observation is not an independent exhaustive draft audit.
No field, draft, or document action was changed.

An anonymous published-perspective query on 2026-11-03 also returned one
`author` document, `8559eb2d-79f8-4c6d-936b-d3383355b1e9`, with defined
`name`, `slug`, `image`, and `bio` fields and nine `certificates` entries.
Before the branch-only preservation change, the repository's author schema
exposed `bio` and `certificates` but not `name`, `slug`, or `image`. On
2026-11-04 UTC, the signed-in deployed author editor showed Name, Slug, Image,
and Bio; its Developer info identified `certificates` as an unknown field.
Publish and Discard changes were disabled when inspected. Do not remove either
set of existing values; the branch now defines all five fields, but the hosted
Studio has not been updated.

Historical commit
[`4e119dc`](https://github.com/BerinKarjala/portfolio/commit/4e119dcdeb786acd09076489a7c3cc5865d66f43)
declares Sanity 2.26-era dependencies and contains the same visible legacy
project fields. The hosted JavaScript asset also reported a 2022-02-28
Last-Modified date. This is a source-comparison candidate, not proof that the
commit produced the deployed Studio or a verified rollback path.

## Recovery and draft-audit preparation

Dataset recovery and Studio-application rollback are separate concerns:

- Sanity's [dataset export guidance](https://www.sanity.io/docs/content-lake/exporting-data)
  describes an authenticated point-in-time export including accessible drafts
  and asset binaries by default. Exports consume API quota, may contain private
  unpublished content, and can complete while reporting missing assets. Before
  an export, agree on a secure destination and retention with the owner; do not
  put the archive in the repository or overwrite another file. Check the
  archive, draft/document coverage, asset warnings, and references. No export
  or restore has been performed in this pilot.
- An export is not a tested restore. Rehearse recovery only against a verified
  isolated target; do not import or replace production data during a test.
  [Sanity's backup service](https://www.sanity.io/docs/content-lake/backups) is a
  paid feature and is disabled by default, but its availability and state for
  this dataset have not been verified.
- An exported dataset would not establish how to roll back the hosted Studio
  application. The historical source candidate above is not a verified build
  or redeployment method. Sanity supports
  [multiple Studio deployment targets](https://www.sanity.io/docs/studio/deployment),
  but a separate Studio pointed at `production` would still expose production
  content and edits. Do not create, register, deploy, or reconfigure a Studio
  without the owner's separate decision and a verified target.

For the read-only draft audit, use an authenticated client with permission to
read drafts, the [raw perspective](https://www.sanity.io/docs/content-lake/perspectives),
and the non-CDN API. Start with metadata rather than draft content:

```groq
*[_id in path("drafts.**")] | order(_id asc){_id, _type, _updatedAt}
```

On 2026-11-04 at approximately 02:36 UTC, the signed-in Studio session used the
non-CDN API and `raw` perspective for this metadata-only query. The same API
host confirmed a signed-in user, and the query returned one accessible draft,
of type `landingPage`. It returned no draft for either published project ID or
the published author ID. A separate metadata-only query for
`_id in path("versions.**")` returned no accessible release versions. No draft
content or document action was changed, and the Landing Page draft was not
opened. These results are scoped to the account's permissions and that moment;
they do not establish historical revisions, future state, or inaccessible
documents. Repeat the audit and inspect any selected draft before proposing
edits; never use the existing Landing Page draft as a test fixture.

Before any production Studio deployment, inspect the signed-in Studio and its
drafts, reconcile the deployed and repository schemas and desired navigation,
identify a verified recovery path, and obtain the owner's explicit deployment
decision. A cloud Studio dependency and build job passed for commit
`22b555b4c30d050268b7849f26a9e2a4b5a56146`; the machine's active Node version
was `v22.21.1`, below the Studio's declared `>=22.22.2 <23` requirement. Do
not deploy, switch account settings, or create test data as part of this
read-only assessment. A successful code preview does not deploy the Studio.

## Website ownership and display context

- [`Home.jsx`](../src/components/Home.jsx) and
  [`Project.jsx`](../src/components/Project.jsx) fetch project documents.
  The homepage merges matching Sudoku and Minesweeper CMS copy into bundled
  cards but keeps bundled thumbnails. The Projects page also replaces their
  thumbnails and alt text with bundled previews. A CMS thumbnail-alt edit for
  either record therefore does not establish a change to the displayed image.
- [`About.jsx`](../src/components/About.jsx) reads the published author's
  biography and certificates, so changes to those fields can affect the About
  page. The anonymous count above does not validate the rendered content.
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
| CA-01 access and context | BLOCKED | Organization and project administrator roles, active project, plan, production dataset, AI usage, and deployed Studio 2.26.0 verified. Content Agent requires a compatible connected Studio and registered schema. |
| CA-02 inventory fixtures | BLOCKED | The owner allowlisted `umy7f73e` / `content-agent-test` for synthetic content; a configured Studio workspace, test permissions, and fixtures remain unverified or unavailable. The published baseline above is not this fixture test. |
| CA-03 schema and unknown metadata | BLOCKED | Deployed Studio schema differs from the repository; project and author field preservation, registered schema, and agent response need verification. |
| CA-04 editorial accuracy and untrusted content | BLOCKED | Requires the agent and controlled synthetic fixtures. |
| CA-05 proposal and discard | BLOCKED | Requires the agent and an appropriate isolated test record. |
| CA-06 existing draft protection | BLOCKED | One accessible production Landing Page draft exists and must be preserved; testing requires an isolated fixture with an existing draft. |
| CA-07 confirm draft in isolation | BLOCKED | The synthetic target is allowlisted, but its Studio workspace and test permissions are not yet verified. |
| CA-08 display and fallbacks | NOT RUN | Source inspected; no controlled-data browser test or approved isolated preview performed. |
| CA-09 publication and recovery rehearsal | BLOCKED | The synthetic target is allowlisted, but its workspace and permissions are unverified and no recovery method has been tested. |
| CA-10 usage and failure handling | NOT RUN | Baseline usage is 0 of 1,000 credits for the month to date. No agent prompts were sent; a before/after pilot comparison is pending. |
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

1. Verify the branch-only link-validation change in cloud CI; reconcile the
   inspected deployed Studio's schema and navigation with the repository,
   repeat the authenticated draft audit before acting, and agree on the
   connection and recovery approach before any production Studio deployment or
   account-setting change.
2. Once the compatible Studio and schema are connected, use the handover
   playbook's report-only inventory prompt. Compare its
   selected document IDs, field states, and published/draft context with a
   fresh baseline and the actual Studio schema. Treat content as data, not
   instructions; do not create or confirm changes during the inventory.
3. Verify the separately configured Studio workspace and permissions for the
   owner-allowlisted `umy7f73e` / `content-agent-test` target before any
   synthetic write. If they are unavailable, keep fixture, draft-confirmation,
   and recovery cases blocked. Do not copy production data to the test dataset.
4. With the owner, choose one record and authorized fields. Inspect any
   existing draft and review the exact proposal before draft confirmation;
   never overwrite unrelated draft work. The owner decides whether to publish.
   A verified recovery method and checks of both affected website surfaces
   are needed before and after any approved publication, respectively.

No new AI integration, Content Agent-specific schema fields, website draft
preview, or paid service is part of this initial pilot. The branch restores
existing author fields in the repository schema, as described above.
