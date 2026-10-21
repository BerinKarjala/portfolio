import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readJson } from "../src/shared/studioTransfer.js";
import { deployProxyCheck } from "./deploy-css-studio-proxy.mjs";
import {
  runProxyCheck,
  ProxyCheckError,
  PROXY_BACKEND,
} from "./check-css-studio-proxy.mjs";
import { checkImageReadiness } from "./check-css-studio-image-readiness.mjs";
const ORIGIN = "https://berinkarjala.netlify.app";
const DIRECTORY = new URL(
  "../artifacts/css-studio-image-info/",
  import.meta.url,
);
async function writeArtifact(value) {
  await mkdir(DIRECTORY, { recursive: true });
  await writeFile(
    new URL("info.json", DIRECTORY),
    JSON.stringify(value, null, 2) + "\n",
  );
}
const ensure = (condition) => {
  if (!condition)
    throw new ProxyCheckError(
      "Private image metadata verification failed. Raw details withheld.",
    );
};
const validProof = (p) =>
  p?.session === true &&
  p.cookie === true &&
  p.crossOriginRejected === true &&
  Number.isInteger(p.remainingPrompts) &&
  p.remainingPrompts >= 0 &&
  p.remainingPrompts <= 10 &&
  Number.isInteger(p.remainingImages) &&
  p.remainingImages >= 0 &&
  p.remainingImages <= 3 &&
  Number.isInteger(p.sharedRemaining) &&
  p.sharedRemaining >= 0 &&
  p.sharedRemaining <= 8000;
// Binding + info is free. Account visibility never enables a transform or AI.
export async function probeImageInfo({
  token = process.env.CLOUDFLARE_API_TOKEN,
  readiness = checkImageReadiness,
  deploy = deployProxyCheck,
  proxy = runProxyCheck,
  write = writeArtifact,
  now = Date.now,
  log = console.log,
} = {}) {
  const account = await readiness({ token, now, log });
  return deploy({
    token,
    now,
    log,
    check: async (options) => {
      const before = await proxy(options);
      ensure(validProof(before));
      const day = new Date(now()).toISOString().slice(0, 10);
      let response, value;
      try {
        response = await options.fetch(
          PROXY_BACKEND + "/api/css-studio/image-info-probe",
          {
            method: "POST",
            redirect: "error",
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
            headers: {
              Origin: ORIGIN,
              "X-CSS-Studio": "1",
              "X-CSS-Studio-Canary": options.secret,
              "Content-Type": "application/json",
            },
            body: "{}",
          },
        );
        value = await readJson(response, 4096);
        if (!response.ok)
          throw new ProxyCheckError(
            value?.code === 9432
              ? "Private Images metadata is unavailable (code 9432); billing was not changed."
              : "Private image metadata request failed. No retry was made.",
          );
      } catch (error) {
        if (error instanceof ProxyCheckError) throw error;
        throw new ProxyCheckError(
          "Private image metadata request failed. No retry was made.",
        );
      }
      ensure(
        value?.info?.width === 64 &&
          value.info.height === 64 &&
          value.info.format === "image/png" &&
          Number.isInteger(value.elapsedWallMs) &&
          value.elapsedWallMs >= 0 &&
          value.elapsedWallMs <= 5000 &&
          value.inferencePerformed === false &&
          value.transformationPerformed === false &&
          value.cpuMeasured === false,
      );
      const after = await proxy(options);
      ensure(
        validProof(after) &&
          before.sharedRemaining === after.sharedRemaining &&
          new Date(now()).toISOString().slice(0, 10) === day,
      );
      // Each proxy proof verifies its own identity/allowances internally. They
      // use different fresh browser identities; compare only the shared ledger.
      const artifact = {
        observedAt: new Date(now()).toISOString(),
        billingVisibility: account.billingVisibility,
        imagesPlan: "unknown",
        readyForTransform: false,
        info: { width: 64, height: 64, format: "image/png" },
        elapsedWallMs: value.elapsedWallMs,
        bindingVerified: true,
        sessionChecksPassed: true,
        sharedRemaining: before.sharedRemaining,
        inferencePerformed: false,
        transformationPerformed: false,
        cpuMeasured: false,
      };
      await write(artifact);
      log(JSON.stringify(artifact));
      log(
        "PASS: Private Images metadata probe passed; no inference or transformation requested. Billing, CPU and full decoding remain separate gates.",
      );
      return artifact;
    },
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await probeImageInfo();
  } catch (error) {
    console.error(
      error instanceof ProxyCheckError
        ? error.message
        : "Private image metadata probe failed. Raw output withheld.",
    );
    process.exitCode = 1;
  }
}
