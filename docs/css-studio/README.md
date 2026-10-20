# Four Seasons CSS Theme Studio

With Node 22.22.2, run `npm ci` and `npm run dev`. Open any portfolio page and
activate the moon in the navigation, or open the Theme Studio card on `/project`.
The current page remains the canvas. Tools are nonmodal; close them to keep your
theme, or restore the original appearance while retaining saved profiles.

This is a working client-workflow increment, not the completed v2.2 release.

- [Progress, architecture and decisions](progress.md)
- [Acceptance ledger AC-01–AC-49](requirements-trace.md)
- [Recorded M2 verification](verification.md)
- [M3 image-storage foundation verification](verification-m3-storage.md)
- [M3 client workflow verification](verification-m3.md)
- [Server boundary and accounting contract](server-boundary.md)
- [Cloudflare readiness observations](cloudflare-readiness.md)
- [M4 server verification](verification-m4-server.md)
- [Live AI prerequisites](live-ai-setup.md)
- [Unmodified supplied handoff](handoff/README.md)

The supplied 248-photo catalog, thumbnails, credits and standalone browser are
integrated under public/css-studio/. Live inference remains disabled. The bounded
IndexedDB cache now supports Studio image proposals, explicit Apply, restoration,
history/comparison and downloads. These paths use injected responses in tests; the
public app has no image generator enabled. A default-disabled Worker boundary with signed identity and a transactional
SQLite quota authority is implemented and locally tested. Deployment, owned-media
handling, real provider cost/usage validation and account eligibility remain
outstanding. Do not enable a provider by
replacing the disabled browser adapter with a privileged API call.
