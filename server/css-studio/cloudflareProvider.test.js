import { expect, it, vi } from "vitest";
import {
  createCloudflareProvider,
  CLOUDFLARE_THEME_PLAN,
} from "./cloudflareProvider.js";
const input = {
  id: "00000000-0000-4000-8000-000000000001",
  operation: "theme",
  prompt: "Quiet winter colors",
  history: [],
  context: { family: "seasons", id: "winter", mode: "dark", contrast: false },
};
const proposal = {
  message: "A quiet winter palette.",
  overrides: {
    accent: "#99ccff",
    background: "#102030",
    text: "#ffffff",
    font: "system",
    radius: "8px",
  },
};
const binding = (output) => ({ run: vi.fn(async () => Response.json(output)) });
it("uses a fixed model and bounded JSON-mode settings, never model URLs or client cost fields", async () => {
  const ai = binding({ response: proposal });
  const provider = createCloudflareProvider(ai);
  const signal = new AbortController().signal;
  const result = await provider.propose(input, {
    signal,
    maxOutputTokens: 512,
  });
  expect(result.proposal).toEqual(proposal);
  const [model, args, options] = ai.run.mock.calls[0];
  expect(model).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  expect(args).toMatchObject({
    max_tokens: 512,
    stream: false,
    temperature: 0.2,
    response_format: { type: "json_schema" },
  });
  expect(options).toEqual({ returnRawResponse: true, signal });
  expect(args.messages).toHaveLength(2);
  expect(result.usage).toBeUndefined();
  expect(CLOUDFLARE_THEME_PLAN.reservedNeurons).toBe(1000);
});
it("accepts a JSON string response but never markup, unsafe tokens or usage nominated inside model content", async () => {
  const provider = createCloudflareProvider(
    binding({
      response: JSON.stringify(proposal),
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }),
  );
  expect((await provider.propose(input)).proposal).toEqual(proposal);
  expect((await provider.propose(input)).usage).toBeUndefined();
  await expect(
    createCloudflareProvider(
      binding({
        response: {
          ...proposal,
          overrides: { accent: "url(https://evil.test)" },
        },
      }),
    ).propose(input),
  ).rejects.toThrow(/output/i);
  await expect(
    createCloudflareProvider(binding({ response: "```json\n{}\n```" })).propose(
      input,
    ),
  ).rejects.toThrow(/output/i);
});
it("bounds serialized input before dispatch and rejects image operations", async () => {
  const ai = binding({ response: proposal });
  const provider = createCloudflareProvider(ai);
  const huge = {
    ...input,
    history: Array.from({ length: 10 }, () => ({
      role: "user",
      text: "x".repeat(2000),
    })),
  };
  expect(() => provider.validateRequest(huge)).toThrow(/large/i);
  await expect(provider.propose(huge)).rejects.toThrow(/large/i);
  await expect(
    provider.propose({ ...input, operation: "image" }),
  ).rejects.toThrow();
  expect(ai.run).not.toHaveBeenCalled();
});
it("redacts provider errors, stops on allowance/payment failures and bounds the actual response", async () => {
  for (const status of [402, 403, 429]) {
    const ai = {
      run: vi.fn(async () => new Response("private upstream text", { status })),
    };
    await expect(
      createCloudflareProvider(ai).propose(input),
    ).rejects.toMatchObject({ name: "ProviderLimitError" });
  }
  await expect(
    createCloudflareProvider({
      run: async () => new Response("x".repeat(65537)),
    }).propose(input),
  ).rejects.toThrow(/large/i);
  await expect(
    createCloudflareProvider({
      run: async () => new Response("private detail", { status: 500 }),
    }).propose(input),
  ).rejects.toThrow("Provider request failed");
});
it("honors an already aborted request without dispatching", async () => {
  const ai = binding({ response: proposal });
  const controller = new AbortController();
  controller.abort();
  await expect(
    createCloudflareProvider(ai).propose(input, { signal: controller.signal }),
  ).rejects.toThrow();
  expect(ai.run).not.toHaveBeenCalled();
});

it("preserves an uncertain body timeout instead of reporting completed invalid output", async () => {
  vi.useFakeTimers();
  try {
    const provider = createCloudflareProvider({
      run: async () => new Response(new ReadableStream({ start() {} })),
    });
    const outcome = provider.propose(input).then(
      () => null,
      (error) => error,
    );
    await vi.advanceTimersByTimeAsync(5001);
    expect(await outcome).toMatchObject({ status: 408 });
  } finally {
    vi.useRealTimers();
  }
});

it("preserves stream transport failures for conservative uncertain accounting", async () => {
  const provider = createCloudflareProvider({
    run: async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error("fixture transport interruption"));
          },
        }),
      ),
  });
  await expect(provider.propose(input)).rejects.toThrow(
    "fixture transport interruption",
  );
});
