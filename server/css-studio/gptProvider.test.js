import { expect, it, vi } from "vitest";
import {
  createGptProvider,
  GPT_THEME_MODEL,
  GPT_THEME_PLAN,
} from "./gptProvider.js";
const input = {
  id: "00000000-0000-4000-8000-000000000001",
  operation: "theme",
  prompt: "A quiet winter palette",
  history: [{ role: "user", text: "Keep the text readable" }],
  context: { family: "seasons", id: "winter", mode: "dark", contrast: true },
};
const proposal = {
  message: "A quiet winter palette for review.",
  overrides: {
    accent: "#99ccff",
    background: "#102030",
    text: "#ffffff",
    font: "system",
    radius: "8px",
  },
};
const message = (text = JSON.stringify(proposal)) => ({
  type: "message",
  role: "assistant",
  status: "completed",
  content: [{ type: "output_text", text }],
});
const response = (output = [message()], extra = {}) => ({
  object: "response",
  status: "completed",
  output,
  ...extra,
});
function fixture(body = response()) {
  const run = vi.fn(async () => Response.json(body));
  return { run, provider: createGptProvider({ run }) };
}
it("uses one fixed native Responses generation, a whole-context cost bound, and no tools, retry or gateway", async () => {
  const { run, provider } = fixture();
  const signal = new AbortController().signal;
  const result = await provider.propose(input, { signal });
  expect(result).toEqual({ proposal });
  expect(run).toHaveBeenCalledOnce();
  const [model, payload, options] = run.mock.calls[0];
  expect(model).toBe("@cf/openai/gpt-oss-20b");
  expect(model).toBe(GPT_THEME_MODEL);
  expect(payload.reasoning).toEqual({ effort: "low" });
  expect(payload.stream).toBe(false);
  expect(payload.input).toHaveLength(2);
  expect(payload.input[0].role).toBe("system");
  expect(JSON.parse(payload.input[1].content)).toEqual({
    context: input.context,
    prompt: input.prompt,
    history: input.history,
  });
  expect(Object.keys(payload).sort()).toEqual(["input", "reasoning", "stream"]);
  expect(options).toEqual({ returnRawResponse: true, signal });
  expect(GPT_THEME_PLAN).toMatchObject({
    reservedNeurons: 4000,
    timeoutMs: 18000,
    maxOutputTokens: 128000,
    maxContextTokens: 128000,
    verifiedUntil: Date.UTC(2026, 9, 28),
  });
  expect(result.usage).toBeUndefined();
  expect(provider.model).toBe(GPT_THEME_MODEL);
  expect(provider.maxContextTokens).toBe(128000);
  expect(Object.isFrozen(provider)).toBe(true);
  expect(Object.isFrozen(GPT_THEME_PLAN)).toBe(true);
});
it("selects only assistant output text and never adopts reasoning, top-level text or usage as authority", async () => {
  const { provider } = fixture(
    response(
      [
        {
          type: "reasoning",
          content: [{ type: "reasoning_text", text: "private reasoning" }],
        },
        message(),
      ],
      { output_text: "not the selected message", usage: { total_tokens: 1 } },
    ),
  );
  expect(await provider.propose(input)).toEqual({ proposal });
});
it("rejects non-final responses, ambiguous assistants, chat fallbacks and tool/refusal content", async () => {
  const bad = [
    response([], { output_text: JSON.stringify(proposal) }),
    response([message()], { status: "incomplete" }),
    response([message()], { error: { message: "private error" } }),
    response([message()], {
      incomplete_details: { reason: "max_output_tokens" },
    }),
    response([message(), message()]),
    response([
      {
        type: "message",
        role: "user",
        status: "completed",
        content: message().content,
      },
    ]),
    response([{ ...message(), status: "in_progress" }]),
    response([
      message(),
      { type: "function_call", name: "untrusted", arguments: "{}" },
    ]),
    response([
      {
        ...message(),
        content: [{ type: "refusal", refusal: "Cannot comply" }],
      },
    ]),
    { response: JSON.stringify(proposal) },
    {
      choices: [
        { message: { role: "assistant", content: JSON.stringify(proposal) } },
      ],
    },
  ];
  for (const body of bad) {
    const { run, provider } = fixture(body);
    await expect(provider.propose(input)).rejects.toMatchObject({
      name: "ProviderOutputError",
    });
    expect(run).toHaveBeenCalledOnce();
  }
});
it("rejects prose, fenced JSON, unsafe tokens and unsupported output fields", async () => {
  for (const text of [
    "<script>private</script>",
    "```json\n" + JSON.stringify(proposal) + "\n```",
    JSON.stringify({ ...proposal, css: "body{display:none}" }),
    JSON.stringify({
      ...proposal,
      overrides: { accent: "url(https://evil.test)" },
    }),
  ]) {
    await expect(
      fixture(response([message(text)])).provider.propose(input),
    ).rejects.toMatchObject({ name: "ProviderOutputError" });
  }
});
it("rejects oversized serialized input and unsupported operations before native dispatch", async () => {
  const { run, provider } = fixture();
  const oversized = {
    ...input,
    history: Array.from({ length: 10 }, () => ({
      role: "user",
      text: "x".repeat(2000),
    })),
  };
  expect(() => provider.validateRequest(oversized)).toThrow(/large/i);
  await expect(provider.propose(oversized)).rejects.toMatchObject({
    status: 413,
  });
  await expect(
    provider.propose({ ...input, operation: "image" }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    provider.propose({ ...input, model: "other" }),
  ).rejects.toMatchObject({ status: 400 });
  expect(run).not.toHaveBeenCalled();
});
it("stops on provider allowance failures without exposing upstream details or retrying", async () => {
  for (const status of [402, 403, 429, 500]) {
    const run = vi.fn(
      async () => new Response("private upstream detail", { status }),
    );
    const failure = createGptProvider({ run }).propose(input);
    if (status === 500)
      await expect(failure).rejects.toThrow("Provider request failed");
    else
      await expect(failure).rejects.toMatchObject({
        name: "ProviderLimitError",
      });
    expect(run).toHaveBeenCalledOnce();
  }
});
it("preserves oversized and interrupted body reads as uncertain transport failures", async () => {
  const run = vi.fn(async () => new Response("x".repeat(65537)));
  await expect(createGptProvider({ run }).propose(input)).rejects.toMatchObject(
    { status: 413 },
  );
  const transport = new Error("fixture interrupted transport");
  await expect(
    createGptProvider({
      run: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(transport);
            },
          }),
        ),
    }).propose(input),
  ).rejects.toBe(transport);
});
it("preserves a stalled body timeout for uncertain accounting", async () => {
  vi.useFakeTimers();
  try {
    const provider = createGptProvider({
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
it("does not dispatch an already canceled request or invent an unavailable binding", async () => {
  expect(createGptProvider()).toBeUndefined();
  const { run, provider } = fixture();
  const controller = new AbortController();
  controller.abort();
  await expect(
    provider.propose(input, { signal: controller.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(run).not.toHaveBeenCalled();
});
