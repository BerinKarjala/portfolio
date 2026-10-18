export function ensure(condition, message) {
  if (!condition) throw new Error(message);
}
export function object(value, keys, label = "Data") {
  ensure(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).every((key) => keys.includes(key)),
    `${label} contains unsupported fields or is not an object.`,
  );
}
export function text(value, max, label = "Text", empty = true) {
  ensure(
    typeof value === "string" &&
      value.length <= max &&
      (empty || value.trim().length),
    `Invalid ${label}.`,
  );
}
export const identifier = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value);
export function safeUrl(value, { link = false, empty = false } = {}) {
  if (empty && value === "") return true;
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\u0000-\u0020\u007f<>"'\\]/.test(value)
  )
    return false;
  if (link && /^#[A-Za-z][\w:.-]*$/.test(value)) return true;
  if (link && /^mailto:[^@?]+@[^@?]+\.[^@?]+$/.test(value)) return true;
  if (link && /^tel:\+?[\d()-]+$/.test(value)) return true;
  // HTTPS spellings without an authority can resolve against the current host.
  // Require an explicit authority so validation and hosted-page navigation agree.
  if (!/^https:\/\/[^/]/i.test(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
