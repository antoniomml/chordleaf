import { t } from "../i18n.js";
import { setupWorkspaceBackups } from "./workspace-backups.js";
import { projectSignature, serializeProject } from "../project.js";
import { exportSong, download, downloadName } from "../files.js";

/** Export a snapshot so ongoing edits cannot mutate an in-flight document. */
export function setupSongExport({
  song,
  workspace,
  prepare = () => true,
  exportMenu,
  renderTabs,
  persist,
  toast,
}) {
  const $ = (selector) => document.querySelector(selector);
  let busy = false;
  function setBusy(value, type) {
    busy = value;
    $("#export-progress").hidden = !value;
    $("#export-progress-label").textContent = value
      ? type === "docx"
        ? t("Preparando Word…")
        : t("Preparando tu documento…")
      : "";
    document.documentElement.style.setProperty(
      "--export-status-height",
      value ? "28px" : "0px",
    );
    $("#export").setAttribute("aria-busy", String(value));
    document
      .querySelectorAll("[data-export]")
      .forEach((button) => (button.disabled = value || !song()));
  }
  setupWorkspaceBackups({ workspace, prepare, exportMenu, toast });
  $("#print-document").onclick = () => {
    if (!prepare()) return;
    exportMenu.close({ focus: true });
    // The print stylesheet paints only the A4 pages, whatever view is open.
    window.print();
  };
  function saveProject(target = song()) {
    if (!prepare()) return false;
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
        if (busy) return;
        if (!prepare()) return;
        exportMenu.close({ focus: true });
        const s = song();
        if (!s) return;
        setBusy(true, b.dataset.export);
        try {
          await exportSong(structuredClone(s), b.dataset.export);
          toast(t("Documento descargado."));
        } catch (e) {
          toast(
            t(
              "No se pudo exportar. Copia la letra del editor o descarga TXT. ",
            ) + e.message,
            "error",
          );
        } finally {
          setBusy(false);
        }
      }),
  );

  return { saveProject };
}
