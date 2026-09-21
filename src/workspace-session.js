import { t } from "./i18n.js";

/** Hold one editor lease per origin. Locks disappear automatically on crashes. */
export async function openWorkspaceSession(root) {
  const lease = { held: false, release() {} };
  while (!lease.held) {
    if (navigator.locks) {
      await new Promise((resolve, reject) => {
        navigator.locks
          .request("chordi-workspace", { ifAvailable: true }, async (lock) => {
            if (!lock) return resolve();
            lease.held = true;
            await new Promise((release) => {
              lease.release = () => {
                lease.held = false;
                release();
              };
              resolve();
            });
          })
          .catch(reject);
      });
      if (lease.held) return lease;
    }
    root.replaceChildren();
    const panel = document.createElement("main");
    panel.className = "workspace-locked";
    const heading = document.createElement("h1");
    heading.textContent = t("Tu espacio está abierto en otra pestaña");
    const description = document.createElement("p");
    description.textContent = navigator.locks
      ? t(
          "Cierra la otra pestaña y vuelve a intentarlo para proteger tus canciones.",
        )
      : t(
          "Abre Chordi por HTTPS en un navegador actualizado para guardar tus canciones de forma segura.",
        );
    const retry = document.createElement("button");
    retry.className = "primary";
    retry.textContent = t("Volver a intentar");
    panel.append(heading, description, retry);
    root.append(panel);
    await new Promise((resolve) =>
      retry.addEventListener("click", resolve, { once: true }),
    );
  }
  return lease;
}
