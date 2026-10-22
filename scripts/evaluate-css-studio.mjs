import { pathToFileURL } from "node:url";
import { deployProxyCheck } from "./deploy-css-studio-proxy.mjs";
import {
  runProxyIdentityCheck,
  ProxyCheckError,
} from "./check-css-studio-proxy.mjs";
import { runGptCheck, GptCheckError } from "./check-css-studio-gpt.mjs";
import { GPT_THEME_PLAN } from "../server/css-studio/gptProvider.js";

export async function evaluateStudio({
  deploy = deployProxyCheck,
  proxy = runProxyIdentityCheck,
  gpt = runGptCheck,
  now = Date.now,
} = {}) {
  if (GPT_THEME_PLAN.verifiedUntil < now() + 120000)
    throw new ProxyCheckError(
      "The reviewed GPT cost plan is expired or too close to expiry.",
    );
  return deploy({
    check: async (context) => {
      const proof = await proxy(context);
      if (proof?.session !== true || proof?.cookie !== true)
        throw new ProxyCheckError(
          "Private model evaluation requires verified proxy identity and cookies.",
        );
      return gpt(context);
    },
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await evaluateStudio();
  } catch (error) {
    if (error instanceof ProxyCheckError || error instanceof GptCheckError)
      console.error(error.message);
    console.error(
      "Private evaluation stopped. No inference retry was made; raw output was withheld.",
    );
    process.exitCode = 1;
  }
}
