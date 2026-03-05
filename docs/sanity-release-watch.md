# Sanity Release Watch

This repository uses `.github/workflows/sanity-dependabot-guardrails.yml` to:

1. Temporarily dismiss Dependabot alert `324` as tolerable risk (with comment).
2. Run a bi-weekly check for new `sanity` and `@sanity/vision` releases.
3. Open or update an issue when newer versions are available.

## Schedule

- Cron: every Monday at 14:00 UTC.
- The workflow only runs version checks on even ISO week numbers.
- You can also run it manually with **Actions -> Sanity Dependabot Guardrails -> Run workflow**.

## Why this exists

The current alert chain depends on an upstream Sanity dependency path that still resolves to a vulnerable `dompurify` range with no clean patched path available in the current major line. This workflow ensures we revisit it continuously and upgrade quickly when upstream releases allow it.

