import { expect, it, vi } from "vitest";
import {
  deployCanary,
  summarizeModelSchema,
} from "./deploy-css-studio-canary.mjs";
const token = "test-only-api-token",
  secret = "cd".repeat(32);
const now = () => Date.UTC(2026, 9, 21, 12);
function fixture({
  identity = true,
  changedNamespace = false,
  failDryRun = false,
  quotaEnvironment = "",
  beforeBindings = (bindings) => bindings,
  afterBindings = (bindings) => bindings,
} = {}) {
  let reads = 0;
  const bindings = [
    { name: "AI", type: "ai" },
    {
      name: "QUOTA",
      type: "durable_object_namespace",
      class_name: "QuotaAuthority",
      namespace_id: "01".repeat(16),
      environment: quotaEnvironment,
    },
    ...(identity ? [{ name: "IDENTITY_SECRET", type: "secret_text" }] : []),
  ];
  const fetch = vi.fn(async (url) => {
    if (new URL(url).pathname.endsWith("/models/schema"))
      return Response.json({
        success: true,
        result: {
          input: {
            schema: {
              properties: {
                input: { type: "string" },
                max_output_tokens: {
                  type: "integer",
                  description: "Includes generated output.",
                },
              },
            },
          },
          output: { schema: { properties: { output: { type: "array" } } } },
        },
      });
    reads++;
    return Response.json({
      success: true,
      result: {
        bindings:
          reads === 1
            ? beforeBindings(bindings)
            : afterBindings([
                ...bindings.filter(
                  (b) => b.name !== "QUOTA" && b.name !== "IDENTITY_SECRET",
                ),
                {
                  name: "QUOTA",
                  type: "durable_object_namespace",
                  class_name: "QuotaAuthority",
                  namespace_id: changedNamespace
                    ? "02".repeat(16)
                    : "01".repeat(16),
                },
                { name: "IDENTITY_SECRET", type: "secret_text" },
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
                { name: "IMAGES", type: "images" },
              ]),
      },
    });
  });
  const cli = vi.fn(async (args, options) => ({
    status: failDryRun && args.includes("--dry-run") ? 1 : 0,
    stdout: "private command output",
    stderr: "private error",
  }));
  const check = vi.fn(async () => ({ calls: 2 }));
  const writeSummary = vi.fn(async () => {});
  return { fetch, cli, check, writeSummary };
}
it("preserves identity and namespace, rotates only canary, dry-runs before mutation, and redacts CLI output", async () => {
  const f = fixture(),
    log = vi.fn();
  await deployCanary({ token, ...f, now, randomSecret: () => secret, log });
  const args = f.cli.mock.calls.map(([args]) => args);
  expect(args[0]).toContain("--dry-run");
  expect(args.filter((a) => a[0] === "secret").map((a) => a[2])).toEqual([
    "CANARY_SECRET",
  ]);
  expect(f.check).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ secret }),
  );
  expect(JSON.stringify(log.mock.calls)).not.toMatch(
    /private command output|private error|cdcdcdcd|test-only-api-token/,
  );
});
it("creates identity once when missing and stops before inference on namespace changes", async () => {
  const missing = fixture({ identity: false });
  await deployCanary({
    token,
    ...missing,
    now,
    randomSecret: () => secret,
    log: () => {},
  });
  expect(
    missing.cli.mock.calls
      .filter(([args]) => args[0] === "secret")
      .map(([args]) => args[2]),
  ).toEqual(["IDENTITY_SECRET", "CANARY_SECRET"]);
  const changed = fixture({ changedNamespace: true });
  await expect(
    deployCanary({
      token,
      ...changed,
      now,
      randomSecret: () => secret,
      log: () => {},
    }),
  ).rejects.toThrow(/namespace/i);
  expect(changed.check).not.toHaveBeenCalled();
});
it("does not mutate secrets after a failed bundle dry-run", async () => {
  const f = fixture({ failDryRun: true });
  await expect(
    deployCanary({
      token,
      ...f,
      now,
      randomSecret: () => secret,
      log: () => {},
    }),
  ).rejects.toThrow(/dry-run/i);
  expect(f.cli).toHaveBeenCalledOnce();
  expect(f.check).not.toHaveBeenCalled();
});
it("keeps only schema field contracts, not model examples or response bodies", () => {
  const summary = summarizeModelSchema({
    input: {
      schema: {
        properties: {
          max_output_tokens: {
            type: "integer",
            description: "Output limit",
            example: "not retained",
          },
        },
      },
    },
  });
  expect(summary.fields).toContainEqual(
    expect.objectContaining({ name: "max_output_tokens", type: "integer" }),
  );
  expect(JSON.stringify(summary)).not.toContain("not retained");
});

it("rejects environment-specific quota bindings before deployment can change them", async () => {
  const f = fixture({ quotaEnvironment: "staging" });
  await expect(
    deployCanary({
      token,
      ...f,
      now,
      randomSecret: () => secret,
      log: () => {},
    }),
  ).rejects.toThrow(/quota/i);
  expect(f.cli).not.toHaveBeenCalled();
});
it("projects documented schema-string envelopes", () => {
  const summary = summarizeModelSchema({
    input_schema: JSON.stringify({
      properties: { max_output_tokens: { type: "integer" } },
    }),
  });
  expect(summary.fields).toContainEqual(
    expect.objectContaining({ name: "max_output_tokens" }),
  );
});

it("stops before secret mutation when metadata cannot establish a field contract", async () => {
  const f = fixture(),
    original = f.fetch.getMockImplementation();
  f.fetch.mockImplementation((url, options) =>
    new URL(url).pathname.endsWith("/models/schema")
      ? Response.json({ success: true, result: { unknown: "schema" } })
      : original(url, options),
  );
  await expect(
    deployCanary({
      token,
      ...f,
      now,
      randomSecret: () => secret,
      log: () => {},
    }),
  ).rejects.toThrow(/field contract/);
  expect(f.cli).toHaveBeenCalledOnce();
  expect(f.check).not.toHaveBeenCalled();
  expect(f.writeSummary).not.toHaveBeenCalled();
});

it("accepts absent or correctly named existing Images and value bindings retained by keep_vars", async () => {
  for (const images of [[], [{ name: "IMAGES", type: "images" }]]) {
    const retained = [
      { name: "OTHER_SECRET", type: "secret_text" },
      { name: "OTHER_VARIABLE", type: "plain_text", text: "retained" },
      { name: "OTHER_JSON", type: "json", json: { retained: true } },
    ];
    const f = fixture({
      beforeBindings: (bindings) => [...bindings, ...images, ...retained],
      afterBindings: (bindings) => [...bindings, ...retained],
    });
    await expect(
      deployCanary({
        token,
        ...f,
        now,
        randomSecret: () => secret,
        log: () => {},
      }),
    ).resolves.toEqual({ calls: 2 });
    expect(f.check).toHaveBeenCalledOnce();
  }
});

const incompatibleBindings = [
  ["wrong Images type", [{ name: "IMAGES", type: "plain_text" }]],
  [
    "duplicate Images binding",
    [
      { name: "IMAGES", type: "images" },
      { name: "IMAGES", type: "images" },
    ],
  ],
  [
    "differently named Images resource",
    [{ name: "OTHER_IMAGES", type: "images" }],
  ],
  ["unrecognized resource", [{ name: "DATABASE", type: "d1" }]],
  ["duplicate AI resource", [{ name: "AI", type: "ai" }]],
  [
    "duplicate quota resource",
    [
      {
        name: "QUOTA",
        type: "durable_object_namespace",
        namespace_id: "01".repeat(16),
      },
    ],
  ],
];

it.each(incompatibleBindings)(
  "aborts before mutation for %s in existing settings",
  async (_name, additions) => {
    const f = fixture({
      beforeBindings: (bindings) => [...bindings, ...additions],
    });
    await expect(
      deployCanary({
        token,
        ...f,
        now,
        randomSecret: () => secret,
        log: () => {},
      }),
    ).rejects.toThrow(/binding/i);
    expect(f.cli).not.toHaveBeenCalled();
    expect(f.writeSummary).not.toHaveBeenCalled();
    expect(f.check).not.toHaveBeenCalled();
  },
);

it.each([["missing Images binding", []], ...incompatibleBindings])(
  "does not probe after %s in deployed settings",
  async (_name, additions) => {
    const f = fixture({
      afterBindings: (bindings) => [
        ...bindings.filter((binding) => binding.name !== "IMAGES"),
        ...additions,
      ],
    });
    await expect(
      deployCanary({
        token,
        ...f,
        now,
        randomSecret: () => secret,
        log: () => {},
      }),
    ).rejects.toThrow(/binding|namespace/i);
    expect(f.cli).toHaveBeenCalledTimes(3);
    expect(f.check).not.toHaveBeenCalled();
  },
);

it("uses only the scoped API token and strips inherited global credentials and application secrets from CLI environment", async () => {
  for (const name of [
    "CANARY_SECRET",
    "IDENTITY_SECRET",
    "CLOUDFLARE_API_KEY",
    "CLOUDFLARE_EMAIL",
  ])
    vi.stubEnv(name, "private-inherited-value");
  try {
    const f = fixture();
    await deployCanary({
      token,
      ...f,
      now,
      randomSecret: () => secret,
      log: () => {},
    });
    for (const [, { env }] of f.cli.mock.calls) {
      expect(env.CLOUDFLARE_API_TOKEN).toBe(token);
      expect(env).not.toHaveProperty("CANARY_SECRET");
      expect(env).not.toHaveProperty("IDENTITY_SECRET");
      expect(env).not.toHaveProperty("CLOUDFLARE_API_KEY");
      expect(env).not.toHaveProperty("CLOUDFLARE_EMAIL");
    }
  } finally {
    vi.unstubAllEnvs();
  }
});
