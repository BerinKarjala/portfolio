// Local-only provider fixture and bindings. No external service is reachable from these tests.
export const runtimeOptions = (persist) => ({
  modules: true,
  scriptPath: "server/css-studio/runtime/fixture-worker.js",
  modulesRules: [{ type: "ESModule", include: ["**/*.js"] }],
  compatibilityDate: "2026-07-01",
  durableObjects: { QUOTA: { className: "QuotaAuthority", useSQLite: true } },
  durableObjectsPersist: persist,
  bindings: {
    APP_ORIGIN: "https://studio.test",
    IDENTITY_SECRET: "ab".repeat(32),
  },
  outboundService: () => {
    throw Error("Unexpected outbound network request");
  },
});
