/** Only promise offline use after the active worker confirms this build is cached. */
export function registerServiceWorker(onState = () => {}) {
  if (location.protocol === "chordleaf:" || !import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) {
    onState("unavailable");
    return;
  }
  let ready = false;
  let lastState;
  let deadline;
  const publish = (state) => {
    if (ready && state !== "ready") return;
    if (state === lastState) return;
    lastState = state;
    if (state === "ready") {
      ready = true;
      clearTimeout(deadline);
    }
    if (state === "update") clearTimeout(deadline);
    onState(state);
  };
  function check(worker) {
    if (!worker || worker.state !== "activated") return;
    const channel = new MessageChannel();
    const timeout = setTimeout(() => channel.port1.close(), 5000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timeout);
      channel.port1.close();
      if (data?.ready === true) publish("ready");
    };
    try {
      worker.postMessage(
        { type: "CHORDLEAF_OFFLINE_STATUS", asset: import.meta.url },
        [channel.port2],
      );
    } catch {
      clearTimeout(timeout);
      channel.port1.close();
      publish("unavailable");
    }
  }
  function watch(registration) {
    check(registration.active);
    const watchWorker = () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") check(worker);
        else if (worker.state === "redundant") publish("unavailable");
        else if (worker.state === "installed" && registration.waiting)
          publish("update");
      });
    };
    watchWorker();
    registration.addEventListener("updatefound", watchWorker);
    if (registration.waiting) publish("update");
  }
  const register = async () => {
    publish("preparing");
    deadline = setTimeout(() => publish("unavailable"), 30000);
    navigator.serviceWorker.addEventListener("controllerchange", () =>
      check(navigator.serviceWorker.controller),
    );
    try {
      const existing = await navigator.serviceWorker.getRegistration("/");
      if (existing) watch(existing);
      watch(
        await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        }),
      );
    } catch {
      publish("unavailable");
    }
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
