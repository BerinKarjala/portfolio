import { UUID } from "./quota.js";
export const COOKIE_NAME = "__Host-css-studio";
const MAX_AGE = 7 * 86400;
const encode = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
const decode = (value) =>
  Uint8Array.from(
    atob(value.replaceAll("-", "+").replaceAll("_", "/") + "="),
    (c) => c.charCodeAt(0),
  );
export function createIdentity(secret, { clock = Date.now } = {}) {
  if (typeof secret !== "string" || !/^[0-9a-f]{64}$/.test(secret))
    throw Error("Identity signing configuration unavailable");
  const key = crypto.subtle.importKey(
    "raw",
    Uint8Array.from(secret.match(/../g), (v) => parseInt(v, 16)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return {
    async issue() {
      const id = crypto.randomUUID(),
        issued = Math.floor(clock() / 1000),
        payload = `v1.${id}.${issued}.${issued + MAX_AGE}`;
      const signature = encode(
        await crypto.subtle.sign(
          "HMAC",
          await key,
          new TextEncoder().encode(payload),
        ),
      );
      return {
        id,
        cookie: `${COOKIE_NAME}=${payload}.${signature}; Path=/; Max-Age=${MAX_AGE}; Secure; HttpOnly; SameSite=Strict`,
      };
    },
    async read(header) {
      if (typeof header !== "string" || header.length > 8192) return null;
      const values = header
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part.startsWith(COOKIE_NAME + "="));
      if (values.length !== 1) return null;
      const token = values[0].slice(COOKIE_NAME.length + 1);
      if (token.length > 160) return null;
      const [version, id, issued, expires, signature, ...extra] =
        token.split(".");
      if (
        extra.length ||
        version !== "v1" ||
        !UUID.test(id) ||
        !/^\d{10}$/.test(issued) ||
        !/^\d{10}$/.test(expires) ||
        !/^[a-zA-Z0-9_-]{43}$/.test(signature || "")
      )
        return null;
      const now = Math.floor(clock() / 1000);
      if (
        Number(expires) - Number(issued) !== MAX_AGE ||
        Number(expires) <= now ||
        Number(issued) > now + 60
      )
        return null;
      try {
        return (await crypto.subtle.verify(
          "HMAC",
          await key,
          decode(signature),
          new TextEncoder().encode([version, id, issued, expires].join(".")),
        ))
          ? id
          : null;
      } catch {
        return null;
      }
    },
  };
}
