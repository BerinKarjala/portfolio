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
- [Private text canary and remaining activation gates](private-text-canary.md)
- [Observed GPT evaluation and whole-context cost proof](model-evaluation.md)
- [Real preview identity and remaining cross-site verification](private-proxy-verification.md)
- [Image-model contract and decoding research](image-model-research.md)
- [M5 accessibility and reflow verification](verification-m5.md)
- [M4 server verification](verification-m4-server.md)
- [Owned-media transport and activation limits](owned-media.md)
- [Live AI prerequisites](live-ai-setup.md)
- [Unmodified supplied handoff](handoff/README.md)

The supplied 248-photo catalog, thumbnails, credits and standalone browser are
integrated under public/css-studio/. Live inference remains disabled. The bounded
IndexedDB cache now supports Studio image proposals, explicit Apply, restoration,
history/comparison and downloads. These paths use injected responses in tests; the
public app has no image generator enabled. The Worker includes signed identity,
a transactional SQLite quota authority and a private, bounded Cloudflare text
canary. The browser discovers supported operations through fixed same-origin
endpoints when Studio opens, retaining manual controls when AI is unavailable.
Public inference remains disabled. See the canary and readiness records for live
deployment evidence and outstanding provider, image and proxy acceptance gates.
