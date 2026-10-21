import { expect, it, vi } from "vitest";
import { deployProxyCheck } from "./deploy-css-studio-proxy.mjs";

const token = "test-only-cloudflare-token";
const secret = "cd".repeat(32);
const namespace = "01".repeat(16);
const now = () => Date.UTC(2026, 9, 21, 12);
function fixture({
  identity = true,
  quota = true,
  changedNamespace = false,
  quotaEnvironment = "",
  failDryRun = false,
  failSecret = false,
  badOrigin = false,
} = {}) {
  let reads = 0;
  const common = [
    { name: "AI", type: "ai" },
    ...(identity ? [{ name: "IDENTITY_SECRET", type: "secret_text" }] : []),
    ...(quota
      ? [
          {
            name: "QUOTA",
            type: "durable_object_namespace",
            class_name: "QuotaAuthority",
            namespace_id: namespace,
            environment: quotaEnvironment,
          },
        ]
      : []),
  ];
  const fetch = vi.fn(async () => {
    reads++;
    return Response.json({
      success: true,
      result: {
        bindings:
          reads === 1
            ? common
            : [
                ...common.filter((binding) => binding.name !== "QUOTA"),
                {
                  name: "QUOTA",
                  type: "durable_object_namespace",
                  class_name: "QuotaAuthority",
                  namespace_id: changedNamespace ? "02".repeat(16) : namespace,
                },
                { name: "CANARY_SECRET", type: "secret_text" },
                {
                  name: "APP_ORIGIN",
                  type: "plain_text",
                  text: "https://berinkarjala.netlify.app",
                },
                {
                  name: "ENDPOINT_ORIGIN",
                  type: "plain_text",
                  text: "https://css-studio-ai.berin-karjala.workers.dev",
                },
                {
                  name: "CANARY_APP_ORIGIN",
                  type: "plain_text",
                  text: badOrigin
                    ? "https://unexpected.invalid"
                    : "https://berinkarjala.netlify.app",
                },
                { name: "CANARY_MODEL", type: "plain_text", text: "llama" },
              ],
      },
    });
  });
  const cli = vi.fn(async (args) => ({
    status:
      (failDryRun && args.includes("--dry-run")) ||
      (failSecret && args[0] === "secret")
        ? 1
        : 0,
    stdout: token + secret,
    stderr: "sensitive command response",
  }));
  const check = vi.fn(async () => ({ inferenceCalls: 0 }));
  const log = vi.fn();
  return { fetch, cli, check, log, now, randomSecret: () => secret };
}

it("dry-runs, rotates only the private gate, preserves identity/namespace and invokes only the proxy check", async () => {
  const f = fixture();
  await expect(
    deployProxyCheck({ token: " \n" + token + "\n ", ...f }),
  ).resolves.toEqual({ inferenceCalls: 0 });
  expect(f.fetch).toHaveBeenCalledTimes(2);
  for (const [url, options] of f.fetch.mock.calls) {
    expect(new URL(url).pathname).toBe(
      "/client/v4/accounts/d33da711f0acb00005de85f10c11ab0f/workers/scripts/css-studio-ai/settings",
    );
    expect(options.method).toBe("GET");
    expect(options.redirect).toBe("error");
    expect(options.headers.Authorization).toBe("Bearer " + token);
  }
  expect(f.cli.mock.calls.map(([args]) => args.slice(0, 3))).toEqual([
    ["deploy", "--dry-run", "--outdir"],
    ["secret", "put", "CANARY_SECRET"],
    ["deploy", "--config", "server/css-studio/wrangler.proxy.toml"],
  ]);
  expect(f.check).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ secret }),
  );
  expect(JSON.stringify(f.log.mock.calls)).not.toMatch(
    /cdcdcdcd|test-only-cloudflare-token|sensitive command response/,
  );
});

it("refuses to create identity or quota and rejects environment-specific namespaces", async () => {
  for (const options of [
    { identity: false },
    { quota: false },
    { quotaEnvironment: "staging" },
  ]) {
    const f = fixture(options);
    await expect(deployProxyCheck({ token, ...f })).rejects.toThrow(
      /identity|quota/i,
    );
    expect(f.cli).not.toHaveBeenCalled();
    expect(f.check).not.toHaveBeenCalled();
  }
});

it("stops before rotation after dry-run failure and redacts mutation failures", async () => {
  const dry = fixture({ failDryRun: true });
  await expect(deployProxyCheck({ token, ...dry })).rejects.toThrow(/dry-run/i);
  expect(dry.cli).toHaveBeenCalledOnce();
  expect(dry.check).not.toHaveBeenCalled();
  const failed = fixture({ failSecret: true });
  await expect(deployProxyCheck({ token, ...failed })).rejects.toThrow(
    /command failed/i,
  );
  expect(failed.cli).toHaveBeenCalledTimes(2);
  expect(failed.check).not.toHaveBeenCalled();
  expect(JSON.stringify(failed.log.mock.calls)).not.toContain(secret);
});

it("does not probe after changed namespace or unexpected deployed origins", async () => {
  for (const options of [{ changedNamespace: true }, { badOrigin: true }]) {
    const f = fixture(options);
    await expect(deployProxyCheck({ token, ...f })).rejects.toThrow(
      /namespace|origin/i,
    );
    expect(f.check).not.toHaveBeenCalled();
  }
});

it("requires a valid credential and redacts upstream, transport and CLI exceptions", async () => {
  const empty = fixture();
  await expect(deployProxyCheck({ token: "", ...empty })).rejects.toThrow(
    /token/i,
  );
  expect(empty.fetch).not.toHaveBeenCalled();
  for (const fetch of [
    async () => new Response(secret, { status: 403 }),
    async () => {
      throw Error(secret);
    },
    async () =>
      Response.json({ success: false, errors: [{ message: secret }] }),
  ]) {
    const f = fixture();
    await expect(deployProxyCheck({ token, ...f, fetch })).rejects.toThrow(
      /configuration/i,
    );
    expect(f.cli).not.toHaveBeenCalled();
    expect(JSON.stringify(f.log.mock.calls)).not.toContain(secret);
  }
  const f = fixture();
  await expect(
    deployProxyCheck({
      token,
      ...f,
      cli: async () => {
        throw Error(secret);
      },
    }),
  ).rejects.toThrow(/command failed/i);
  expect(f.check).not.toHaveBeenCalled();
});
