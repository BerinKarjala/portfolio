import { expect, it, vi } from "vitest";
import { evaluateStudio } from "./evaluate-css-studio.mjs";
import { GPT_THEME_PLAN } from "../server/css-studio/gptProvider.js";

it("runs exactly one GPT check only after successful private proxy verification", async () => {
  const order = [];
  const gpt = vi.fn(async () => {
    order.push("gpt");
    return { calls: 1 };
  });
  const result = await evaluateStudio({
    now: () => GPT_THEME_PLAN.verifiedUntil - 86400000,
    deploy: async ({ check }) => {
      order.push("deploy");
      return check({});
    },
    proxy: async () => {
      order.push("proxy");
    },
    gpt,
  });
  expect(order).toEqual(["deploy", "proxy", "gpt"]);
  expect(gpt).toHaveBeenCalledOnce();
  expect(result).toEqual({ calls: 1 });
});

it("does not attempt GPT when deployment/proxy validation or the reviewed plan fails", async () => {
  const gpt = vi.fn();
  const deploy = vi.fn(async ({ check }) => check({}));
  await expect(
    evaluateStudio({
      now: () => GPT_THEME_PLAN.verifiedUntil - 86400000,
      deploy,
      proxy: async () => {
        throw Error("Proxy failed");
      },
      gpt,
    }),
  ).rejects.toThrow("Proxy failed");
  expect(gpt).not.toHaveBeenCalled();
  deploy.mockClear();
  await expect(
    evaluateStudio({ now: () => GPT_THEME_PLAN.verifiedUntil, deploy, gpt }),
  ).rejects.toThrow(/expired/);
  expect(deploy).not.toHaveBeenCalled();
  expect(gpt).not.toHaveBeenCalled();
});
