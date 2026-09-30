import { t } from "./i18n.js";

const LOCK = "chordleaf-workspace";
const HANDOFF_TIMEOUT = 2500;

/** Hold one editor lease per origin. Locks disappear automatically on crashes.
 * Another tab can ask for the workspace: the owner saves, releases and pauses. */
export async function openWorkspaceSession(root) {
  const channel =
    "BroadcastChannel" in globalThis ? new BroadcastChannel(LOCK) : null;
  const lease = { held: false, release() {}, beforeHandOff() {} };
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
    lease.beforeHandOff();
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
  await new Promise((resolve) =>
    use.addEventListener("click", resolve, { once: true }),
  );
  use.disabled = true;
  use.textContent = t("Abriendo tus canciones…");
  // Queue first, then ask: the owner's release goes straight to this request.
  const queued = acquire({});
  channel?.postMessage({ type: "take-over" });
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve(false), HANDOFF_TIMEOUT),
  );
  if (!(await Promise.race([queued, timeout]))) await acquire({ steal: true });
  return lease;
}
