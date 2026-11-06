# Proposed Sanity project-card rollout

This is a proposed plan, not a record of completed uploads, CMS edits,
publication, or deployment. The website and Studio source target Sanity project
`umy7f73e`, dataset `production`. Confirm the target and permissions again
before any write. The website reads published content through the CDN; a regular
Netlify preview is not a draft preview.

## Records and source images

The [pilot record](./sanity-content-agent-pilot.md) identifies these published
project documents on 2026-11-02. Both already had `thumbnail.asset` and
`thumbnail.alt`; their actual images and any later changes were not verified by
that inventory. Do not assume the image fields are empty.

| Project | Existing published ID | Current website image to upload |
| --- | --- | --- |
| Sudoku Solver | `c0a1c1ee-3b33-4b80-b423-12f0ab0c8b6f` | [`src/assets/sudoku-solver-preview.svg`](../src/assets/sudoku-solver-preview.svg) |
| Minesweeper | `c3e9c324-e055-4146-9335-55e2d7e28e29` | [`src/assets/minesweeper-preview.svg`](../src/assets/minesweeper-preview.svg) |

Use the existing website image and matching alt text for each game: `Sudoku
Solver board with Solve and Reset controls` and `Minesweeper board with
instructions, flags remaining, and reset controls`, respectively. Proposed new
records, subject to a fresh authenticated duplicate and ID check:

| Project | Proposed ID | Proposed fields |
| --- | --- | --- |
| CSS Theme Studio | `project-css-theme-studio` | `name`: `CSS Theme Studio`; `kind`: `cssStudio`; `description`: `Style this portfolio with seasonal and international holiday palettes. Explore CSS variables and keep your own presets.` No image currently exists on this card. Its action must continue to open Theme Studio. |
| HTML Page Builder | `project-html-page-builder` | `name`: `HTML Page Builder`; `link`: `/projects/page-builder`; `description`: `A visual React page builder with browser-local projects, starter templates, and portable JSON backups. Open the project to explore the code and launch the workspace.` `thumbnail`: [`public/page-builder-preview.svg`](../public/page-builder-preview.svg), alt `Page Builder workspace illustration`. |

The proposed IDs are examples, not verified vacant. Check the published,
`drafts.` and release-version namespaces, and search by identity and link
before creating anything. Reconcile any match with the owner; never create a
duplicate or overwrite an existing document. `kind` requires the matching
repository Studio schema and frontend support; do not assume the hosted legacy
Studio understands it.

Sanity supports SVG image assets, but does not support its normal image
transformations for SVGs; use the original asset URLs and verify rendering.
See [Sanity image documentation](https://www.sanity.io/docs/studio/image-type).
Do not generate a CSS Studio image or substitute a different image.

## Before writing

1. Review the exact code, fields, image files, actions, fallback behavior, and
   both website surfaces with the owner. Confirm the production project and
   dataset and identify the account and its permissions. Check for matching
   projects, proposed IDs, release versions, and existing drafts with an
   authenticated, non-CDN client using the raw perspective. Capture document
   IDs, `_rev`, `_updatedAt`, asset references, and relevant field values. The
   pilot's point-in-time inventory is not a current draft audit.
2. Protect the existing Landing Page draft: do not open it for editing, change,
   publish, discard, or use it as a fixture. If a game already has a draft,
   stop and reconcile it with the owner; do not overwrite, replace, or publish
   someone else's draft. Recheck revisions immediately before each write and
   use revision preconditions to catch concurrent changes.
3. Agree on a secure backup destination and retention with the owner; take and
   verify an authenticated dataset export covering the relevant documents,
   accessible drafts, and asset binaries. Check the archive, references and
   missing-asset warnings. Verify a recovery method, including a restore
   rehearsal only in a separately verified isolated target; never test a
   restore against production. Dataset recovery and Studio-application
   rollback are separate matters. A backup alone is not a tested restore.

## Proposed content preparation and review

1. Upload the three original SVG files as Sanity image assets after the
   preflight. Record their asset IDs, URLs and alt text; check each uploaded
   image. These uploads write to production even before a document is published.
2. If the game draft checks are clear, create drafts based on their latest
   published revisions. Change only each `thumbnail` image reference and alt
   text to the current website image and its matching alt text; retain all
   other fields and existing document identities. Never overwrite an existing
   draft. Verify the final draft changes against the captured baseline.
3. Create the two new project drafts only after the duplicate and vacant-ID
   checks. Populate the fields shown above and reference the uploaded Page
   Builder asset. Leave CSS Studio without an image. Review exact draft values,
   image previews, and the CSS launch action with the owner. Do not make the
   drafts visible on the public site by publishing them during preparation.
4. The owner controls publication and decides whether and when to publish each
   reviewed draft. Recheck draft revisions and the target before publication; if
   anything changed, stop and review again. Do not publish the Landing Page
   draft or any unrelated content. Follow the verified recovery procedure if a
   published change needs to be reversed.

## Website, Studio, and checks

- The website must consume the same Sanity records for the Projects page and
  landing carousel, prefer their image/alt fields, avoid duplicate built-in
  cards, and retain the CSS Studio launch button. Preserve fallback behavior if
  the content request fails or the new records have not been published.
- Test with synthetic data and mocked requests, not production CMS writes. Cover
  both surfaces, all four cards, image and alt changes, CSS launch behavior,
  duplicate prevention, unsafe links, and fetch failures. Run the applicable
  existing tests and CI; check the exact preview commit. Avoid heavy local
  browser processes on the resource-constrained machine.
- After owner-controlled publication, verify the raw non-CDN result first,
  then allow for CDN propagation and check the rendered live Projects page and
  landing carousel, including images, alt text, destinations, CSS launch, and
  absence of duplicates or errors. A code preview or test pass alone does not
  establish the published website result.
- Upgrading the hosted Studio is a separate deployment decision, with schema
  and recovery review before the owner's explicit approval. A branch or website
  preview does not update the hosted Studio.
- Adding `https://deploy-preview-322--berinkarjala.netlify.app` as an allowed
  origin without credentials remains unapproved. The owner's “Yes” concerned
  image synchronization, not CORS. Request a separate owner decision before
  changing that origin, credential access, or other Sanity settings.
