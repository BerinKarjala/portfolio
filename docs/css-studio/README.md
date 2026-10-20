# Four Seasons CSS Theme Studio

With Node 22.22.2, run `npm ci` and `npm run dev`. Open any portfolio page and
activate the moon in the navigation, or open the Theme Studio card on `/project`.
The current page remains the canvas. Tools are nonmodal; close them to keep your
theme, or restore the original appearance while retaining saved profiles.

This is a working manual-theme increment, not the completed v2.2 release.

- [Progress, architecture and decisions](progress.md)
- [Acceptance ledger AC-01–AC-49](requirements-trace.md)
- [Recorded verification](verification.md)
- [Live AI prerequisites](live-ai-setup.md)
- [Unmodified supplied handoff](handoff/README.md)

The supplied 248-photo catalog, thumbnails, credits and standalone browser are
integrated under public/css-studio/. Live inference remains disabled. Generated-image caching, history/comparison/downloads and protected
server quota/identity controls are not implemented. Do not enable a provider by
replacing the disabled browser adapter with a privileged API call.
