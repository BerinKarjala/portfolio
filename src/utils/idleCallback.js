export const runWhenIdle = (callback, options = {}) => {
  if (typeof window === "undefined") {
    callback();
    return null;
  }

  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, {
      timeout: 2000,
      ...options,
    });
  }

  return window.setTimeout(callback, 1);
};

export const cancelIdle = (handle) => {
  if (handle === null || typeof window === "undefined") {
    return;
  }

  if ("cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
};
