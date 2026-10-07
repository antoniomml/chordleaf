import { t } from "../i18n.js";
import { workspaceBackupParts } from "../workspace-backup.js";
import { download } from "../files.js";

/** Large libraries use explicit downloads, avoiding automatic-download blockers. */
export function setupWorkspaceBackups({
  workspace,
  prepare,
  exportMenu,
  toast,
}) {
  const $ = (selector) => document.querySelector(selector);
  const dialog = $("#workspace-backup-dialog");
  $("#workspace-backup-close").onclick = () => dialog.close();
  $("#workspace-backup").onclick = () => {
    if (!prepare()) return;
    try {
      const state = workspace();
      const parts = workspaceBackupParts(
        state.songs,
        state.active,
        state.recent,
      );
      exportMenu.close({ focus: true });
      const save = (part) =>
        download(
          new Blob([part.text], { type: "application/json" }),
          part.name,
        );
      if (parts.length === 1) return save(parts[0]);
      const list = $("#workspace-backup-parts");
      list.replaceChildren();
      const downloaded = new Set();
      $("#workspace-backup-status").textContent = "";
      for (const [index, part] of parts.entries()) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        const label = t`Parte ${index + 1} de ${parts.length} · ${part.count} canciones`;
        button.type = "button";
        button.className = "outline";
        button.textContent = label;
        button.onclick = () => {
          save(part);
          downloaded.add(index);
          button.textContent = `${t("Descargada")}: ${label}`;
          $("#workspace-backup-status").textContent =
            t`${downloaded.size} de ${parts.length} partes descargadas`;
        };
        item.append(button);
        list.append(item);
      }
      dialog.showModal();
    } catch (error) {
      toast(error.message, "error");
    }
  };
}
