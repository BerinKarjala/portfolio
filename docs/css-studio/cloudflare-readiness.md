# Cloudflare readiness observations

## Account setup verified October 21, 2026

The user confirmed the account ID and Worker URL as text and supplied a dashboard
screenshot showing Workers Free active without a payment method. The user created
the starter Worker at `https://css-studio-ai.berin-karjala.workers.dev` and its AI
binding. The dashboard starter was subsequently replaced by the private
implementation described below.

[GitHub Actions run 39552385317](https://github.com/BerinKarjala/portfolio/actions/runs/39552385317)
passed at workflow source `7e8a487`. The read-only check verified the repository
secret's token status and validity dates, read the Worker's settings and confirmed
the `AI` binding, and read Workers AI model metadata without inference. The helper
workflow is on `css-studio-token-check`, proposed in draft PR #241. It rejects
redirects, bounds response sizes and duration, and prints no credentials or raw
responses. Twenty simulated success/failure scenarios also passed locally.

A future TTL start date caused the earlier authorization failures; the user
corrected it. Token permission edits preserve its value; rolling replaces it and
requires updating the GitHub secret. The credential is held by GitHub Actions,
not by the managed development environment.

That read-only run established access, without proving deployment or inference.
The subsequent [private canary run 39558243040](https://github.com/BerinKarjala/portfolio/actions/runs/39558243040)
passed from source `0813a3d`: the CSS Studio Worker, initial identity secret and
SQLite quota namespace were provisioned, and two Llama theme requests returned
valid tokens. The durable application ledger retained 2,000 Neurons and reported
6,000 remaining for October 21 UTC. Public requests stayed unavailable. This
confirms that the account accepted these bindings and execution; it does not
measure billed usage, prove supporting-service headroom under public traffic,
establish a model-comparison winner or complete Netlify proxy acceptance. See
[the canary evidence and bounds](private-text-canary.md). Image/refinement,
comparative evaluation and public activation remain blocked on their listed gates.

## Documentation baseline from October 20, 2026

Observed October 20, 2026. Official documentation source was read from Cloudflare's
public cloudflare-docs repository `production` branch through raw.githubusercontent.com.
The published pages below are the corresponding official references. This is a
current documentation check, not account-level eligibility or billing verification.
The managed environment reports no configured secrets or external account capability.
No authentication flow, deployment, account mutation or inference was performed.

| Topic | Documentation observation | Remaining account evidence |
| --- | --- | --- |
| Workers AI | [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) states 10,000 free Neurons/day and requires Workers Paid to exceed that allocation. The app's 8,000 ceiling remains lower. | Actual plan, other account usage, eligible models/terms and reliable usage/cost bounds remain unverified. |
| Durable Objects | [Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and its plans note state that Free supports SQLite-backed objects; exhaustion fails further operations, resetting daily limits at 00:00 UTC. | Actual Free account eligibility/limits and operational usage must be checked before deployment. No paid account is assumed. |
| Free compute/storage | The pricing table lists 100,000 DO requests/day, 13,000 GB-s/day, five million SQLite rows read/day, 100,000 rows written/day and 5 GB total storage. Index writes/deletes and other account activity matter. | Local tests are not a billing model. Traffic, abuse and query/write overhead must fit actual free allowances; supporting-service exhaustion must remain unavailable. |
| Consistency | [Access storage](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/) describes private, transactional, strongly consistent durable storage. The SQLite migration uses new_sqlite_classes. | The implementation uses this SQLite design; real production persistence/placement and route behavior still require deployment verification. |

Source paths examined in the official repository:

- `src/content/docs/workers-ai/platform/pricing.mdx`
- `src/content/docs/durable-objects/platform/pricing.mdx`
- `src/content/docs/durable-objects/best-practices/access-durable-objects-storage.mdx`
- `src/content/partials/durable-objects/do-plans-note.mdx`
- `src/content/partials/durable-objects/durable-objects-pricing.mdx`

The documentation observations above are historical; the private canary now has
a reviewed Llama bound of 1,000 Neurons per call and actual execution evidence.
The Llama/GPT-OSS comparison remains incomplete. The observed GPT-OSS schema does
not resolve its total reasoning/output cap; FLUX.1 Schnell does not establish the
required refinement/fixed-geometry contract. Recheck the references and actual
account facts at activation; do not enable Workers Paid, buy credits, create a
paid fallback or assume unrelated account usage cannot exhaust the free allocation.
