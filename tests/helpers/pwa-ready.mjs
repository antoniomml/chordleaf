// Passed directly to page.evaluate: keep this function self-contained.
export async function waitForPwaActivation(timeoutMs = 30000) {
  let worker,
    changed,
    timer,
    expired = false;
  const activation = (async () => {
    const registration = await navigator.serviceWorker.ready;
    if (expired) throw new Error("Service worker readiness timed out");
    // Retain the exact worker we wait on. Firefox can expose a fresh wrapper
    // with an earlier state when ready/active is read again in another call.
    worker = registration.active;
    if (!worker) throw new Error("No active service worker");
    if (worker.state !== "activated")
      await new Promise((resolve, reject) => {
        changed = () => {
          if (worker.state === "activated") resolve();
          else if (worker.state === "redundant")
            reject(
              new Error("Service worker became redundant before activation"),
            );
        };
        worker.addEventListener("statechange", changed);
        changed();
      });
    return {
      scope: new URL(registration.scope).pathname,
      state: worker.state,
      script: new URL(worker.scriptURL).pathname,
    };
  })();
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(new Error("Service worker activation timed out"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([activation, deadline]);
  } finally {
    clearTimeout(timer);
    if (changed) worker.removeEventListener("statechange", changed);
  }
}
