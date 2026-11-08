# Content Agent test Studio

This separate Studio has one workspace targeting project `umy7f73e` and dataset
`content-agent-test`. It shares the repository Studio's schema and desk
structure. Its configuration does not create or verify the dataset, register a
Studio, or grant permissions.

After the owner approves a verified test environment, run `npm run
start:test-studio` from `studio13` to start this Studio. Follow the repository's
local server and memory rules; do not start a duplicate Studio on port 3333.
Confirm the active workspace and dataset before interacting with content.
The offline configuration checks run with `npm run test:test-studio`; the
isolated build runs in cloud CI with `npm run build:test-studio`.

The CLI configuration supplies defaults, not an authorization boundary:
explicit flags can select another target, and an authenticated user may have
production access. Before any fixture write, verify the target and an
appropriately limited identity, and independently establish that it cannot
write production. Do not use production documents or drafts as test fixtures.
Starting this Studio does not authorize writes, deployment, registration, or
account changes. The ordinary website preview still reads production content.
