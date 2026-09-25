// Registers the offline service worker. Development builds skip it so Vite's
// module reloading is never served from a cache, and failures stay silent: the
// editor keeps working without offline support.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const register = () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => {});
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
