import { t } from "../i18n.js";
import { serializeWorkspace } from "../workspace-backup.js";
import { projectSignature, serializeProject } from "../project.js";
import { exportSong, download, downloadName } from "../files.js";

/** Export a snapshot so ongoing edits cannot mutate an in-flight document. */
export function setupSongExport({
  song,
  workspace,
  exportMenu,
  renderTabs,
  persist,
  toast,
}) {
  const $ = (selector) => document.querySelector(selector);
  $("#workspace-backup").onclick = () => {
    download(
      new Blob([serializeWorkspace(workspace().songs, workspace().active)], {
        type: "application/json",
      }),
      "chordleaf-workspace.json",
    );
    exportMenu.close({ focus: true });
  };
  $("#print-document").onclick = () => {
    exportMenu.close({ focus: true });
    // The print stylesheet paints only the A4 pages, whatever view is open.
    window.print();
  };
  function saveProject(target = song()) {
    if (!target) return false;
    try {
      const signature = projectSignature(target);
      const name = downloadName(target.title, t("Canción"));
      download(
        new Blob([serializeProject(target)], { type: "application/json" }),
        `${name}.chordleaf.json`,
      );
      target.projectSignature = signature;
      target.dirty = false;
      renderTabs();
      persist();
      toast(
        t("Proyecto editable descargado. Conserva el archivo para reabrirlo."),
      );
      return true;
    } catch (error) {
      toast(
        t(
          "No se pudo guardar el proyecto. Copia la letra del editor o descarga TXT. ",
        ) + error.message,
        "error",
      );
      return false;
    }
  }
  $("#save-project").onclick = () => {
    exportMenu.close({ focus: true });
    saveProject();
  };
  document.querySelectorAll("[data-export]").forEach(
    (b) =>
      (b.onclick = async () => {
        exportMenu.close({ focus: true });
        const s = song();
        try {
          toast(t("Preparando tu documento…"));
          await exportSong(structuredClone(s), b.dataset.export);
          toast(t("Documento descargado."));
        } catch (e) {
          toast(
            t(
              "No se pudo exportar. Copia la letra del editor o descarga TXT. ",
            ) + e.message,
            "error",
          );
        }
      }),
  );

  return { saveProject };
}
