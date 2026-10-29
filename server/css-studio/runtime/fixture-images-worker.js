// LOCAL TEST ENTRY ONLY. Never deploy this fixture or its injected signing keys.
import { createApp } from "../http.js";
import { createIdentity } from "../identity.js";
import {
  createCloudflareProvider,
  CLOUDFLARE_THEME_PLAN,
} from "../cloudflareProvider.js";
import {
  createKleinImageProvider,
  KLEIN_IMAGE_MODEL,
  KLEIN_IMAGE_PLAN,
} from "../kleinProvider.js";
import { createImageNormalizer } from "../imageNormalizer.js";
import { boundedDimensions } from "../../../src/shared/studioRaster.js";
import production, { QuotaAuthority, quotaClient } from "../worker.js";
export { QuotaAuthority };
// Run this local-only image adapter fixture during the reviewed period without
// changing the production worker or the Durable Object's real-time clock.
// Translate its reservation deadline by the same offset so HTTP admission
// still compares the same remaining time that the real authority granted.
let reviewedOffset;
function reviewedClock() {
  if (reviewedOffset === undefined)
    reviewedOffset = Date.UTC(2026, 9, 27, 12) - Date.now();
  return Date.now() + reviewedOffset;
}
const facts = {
  inferencePerformed: false,
  aiCalls: 0,
  infoCalls: 0,
  nativeBase64Available: typeof Uint8Array.fromBase64 === "function",
  nativeBase64Decodes: 0,
  transforms: [],
  completedDecodes: 0,
  references: [],
  reservations: [],
  settlements: [],
  events: [],
};
// Wrap the actual workerd built-in only to count use. No decoder replacement
// or Node base64 shim participates in these runtime cases.
const nativeFromBase64 = Uint8Array.fromBase64;
if (facts.nativeBase64Available)
  Uint8Array.fromBase64 = function (...args) {
    facts.nativeBase64Decodes++;
    return nativeFromBase64.apply(this, args);
  };
export default {
  async fetch(request, env) {
    const authority = quotaClient(env.QUOTA);
    if (new URL(request.url).pathname === "/__fixture/stats") {
      const owner = await createIdentity(env.IDENTITY_SECRET, { clock: reviewedClock }).read(
        request.headers.get("cookie"),
      );
      return Response.json({
        ...facts,
        quota: await authority.snapshot(owner),
      });
    }
    const ai = {
      async run(model, args, options) {
        facts.aiCalls++;
        facts.events.push("ai");
        if (model !== KLEIN_IMAGE_MODEL || options.returnRawResponse !== true)
          throw Error("Unexpected local model fixture contract");
        const form = await new Response(args.multipart.body, {
          headers: { "content-type": args.multipart.contentType },
        }).formData();
        if (form.get("width") !== "512" || form.get("height") !== "512")
          throw Error("Unexpected local output geometry");
        const reference = form.get("input_image_0");
        if (reference) {
          const dimensions = boundedDimensions(
            new Uint8Array(await reference.arrayBuffer()),
            reference.type,
          );
          if (
            reference.type !== "image/png" ||
            dimensions.width !== 256 ||
            dimensions.height !== 256
          )
            throw Error("Unexpected local reference geometry");
          facts.references.push({ ...dimensions, mime: reference.type });
        }
        return Response.json({ image: env.FIXTURE_PNG });
      },
    };
    if (request.headers.get("x-fixture-production") === "1")
      return production.fetch(request, {
        ...env,
        AI: ai,
        IMAGES: {
          info(stream) {
            facts.infoCalls++;
            return env.IMAGES.info(stream);
          },
          input(stream) {
            facts.events.push("production-images-input");
            return env.IMAGES.input(stream);
          },
        },
      });
    // This wrapper only counts actual native Images calls. It does not supply
    // output bytes or metadata; local Miniflare/Sharp performs the full decode.
    const images = {
      input(stream) {
        facts.events.push("images-input");
        const native = env.IMAGES.input(stream);
        return {
          transform(options) {
            const transformed = native.transform(options);
            return {
              async output(settings) {
                facts.transforms.push(options.width);
                facts.events.push(`decode${options.width}`);
                const result = await transformed.output(settings);
                facts.completedDecodes++;
                return result;
              },
            };
          },
        };
      },
    };
    const ledger = {
      snapshot: authority.snapshot,
      async reserve(value) {
        const result = await authority.reserve(value);
        if (result.admitted) {
          facts.reservations.push([
            value.reservedNeurons,
            value.imageTransforms,
          ]);
          facts.events.push("admit");
        }
        return result.admitted
          ? { ...result, deadline: result.deadline + reviewedOffset }
          : result;
      },
      async settle(value) {
        facts.settlements.push(value.outcome);
        facts.events.push(`settle:${value.outcome}`);
        return authority.settle(value);
      },
    };
    return createApp({
      origin: env.APP_ORIGIN,
      secret: env.IDENTITY_SECRET,
      ledger,
      provider: {
        ...createCloudflareProvider(ai),
        image: createKleinImageProvider(ai, createImageNormalizer(images)),
      },
      policy: { ...CLOUDFLARE_THEME_PLAN, ...KLEIN_IMAGE_PLAN },
      clock: reviewedClock,
    })(request);
  },
};
