// LOCAL TEST FIXTURE ONLY. Never deploy this entry point or use its signing key outside tests.
import production, { QuotaAuthority, quotaClient } from "../worker.js";
import { createApp } from "../http.js";
export { QuotaAuthority };
export default {
  fetch(request, env) {
    if (env.TEST_DISABLED === "1") return production.fetch(request, env);
    return createApp({
      origin: "https://studio.test",
      endpointOrigin: env.ENDPOINT_ORIGIN || "https://studio.test",
      secret: env.IDENTITY_SECRET,
      ledger: quotaClient(env.QUOTA),
      provider: {
        async propose(input) {
          return {
            proposal: {
              message: `Local fixture: ${input.context.id}`,
              overrides: { accent: "#166534" },
            },
            usage: { verified: true, neurons: 25 },
          };
        },
      },
      policy: {
        verifiedUntil: Date.now() + 60000,
        reservedNeurons: 1000,
        maxOutputTokens: 512,
        timeoutMs: 1000,
      },
    })(request);
  },
};
