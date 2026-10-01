import { t } from "./i18n.js";

const LOCK = "chordleaf-workspace";
const HANDOFF_TIMEOUT = 2500;

/** Hold one editor lease per origin. Locks disappear automatically on crashes.
 * Another tab can ask for the workspace: the owner saves, releases and pauses. */
export async function openWorkspaceSession(root) {
  const channel =
    "BroadcastChannel" in globalThis ? new BroadcastChannel(LOCK) : null;
  const lease = { held: false, release() {}, beforeHandOff: () => true };
  function acquire(options) {
    return new Promise((resolve) => {
      navigator.locks
        .request(LOCK, options, (lock) => {
          if (!lock) return resolve(false);
          lease.held = true;
          resolve(true);
          return new Promise((release) => {
            lease.release = () => {
              lease.held = false;
              release();
            };
          });
        })
        .catch(() => {
          // A newer tab stole the lock after the hand-off timed out.
          if (lease.held) {
            lease.held = false;
            location.reload();
          }
          resolve(false);
        });
    });
  }
  channel?.addEventListener("message", (event) => {
    if (event.data?.type !== "take-over" || !lease.held) return;
    // Failed persistence must retain the only live copy and its editing lease.
    if (lease.beforeHandOff() === false) {
      channel?.postMessage({
        type: "handoff-failed",
        requestId: event.data.requestId,
      });
      return;
    }
    lease.release();
    location.reload();
  });
  if (navigator.locks && (await acquire({ ifAvailable: true }))) return lease;

  root.replaceChildren();
  const panel = document.createElement("main");
  panel.className = "workspace-locked";
  const logo = document.createElement("img");
  logo.src = "/logo.svg";
  logo.alt = "";
  const heading = document.createElement("h1");
  heading.textContent = t("Chordleaf está abierto en otra pestaña");
  const description = document.createElement("p");
  description.textContent = navigator.locks
    ? t(
        "Puedes seguir aquí. La otra pestaña guardará tus canciones y se pausará.",
      )
    : t(
        "Abre Chordleaf por HTTPS en un navegador actualizado para guardar tus canciones de forma segura.",
      );
  panel.append(logo, heading, description);
  root.append(panel);
  if (!navigator.locks) return new Promise(() => {});
  const use = document.createElement("button");
  use.className = "primary";
  use.textContent = t("Usar aquí");
  panel.append(use);
  use.focus();
  await new Promise((resolve) => {
    use.addEventListener("click", async () => {
      if (use.disabled) return;
      use.disabled = true;
      use.textContent = t("Abriendo tus canciones…");
      const controller = new AbortController();
      const requestId = crypto.randomUUID();
      const failed = (event) => {
        if (
          event.data?.type === "handoff-failed" &&
          event.data.requestId === requestId
        )
          controller.abort();
      };
      channel?.addEventListener("message", failed);
      // Queue first, then ask. Never steal from an owner with unsaved changes.
      const timer = setTimeout(() => controller.abort(), HANDOFF_TIMEOUT);
      const queued = acquire({ signal: controller.signal });
      channel?.postMessage({ type: "take-over", requestId });
      const acquired = await queued;
      clearTimeout(timer);
      channel?.removeEventListener("message", failed);
      if (acquired) return resolve();
      description.textContent = t(
        "No se pudo cambiar de pestaña. Guarda o exporta tus cambios en la otra pestaña y vuelve a intentarlo.",
      );
      description.setAttribute("role", "alert");
      use.disabled = false;
      use.textContent = t("Usar aquí");
    });
  });
  return lease;
}
