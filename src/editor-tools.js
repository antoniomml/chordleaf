/** UI-only workspace controls. The expanded editor moves the existing textarea,
 * so selection, undo history and autosave have a single source of truth. */
export function setupEditorTools({
  resizePages,
  onAlignment,
  onChord,
  diagram,
  fingerings,
}) {
  const $ = (selector) => document.querySelector(selector);
  const sourceArea = $("#source-area");
  const home = sourceArea.parentElement;
  const dialog = $("#editor-dialog");
  let selection;
  $("#expand-editor").onclick = () => {
    const input = $("#source");
    selection = [input.selectionStart, input.selectionEnd];
    dialog.append(sourceArea);
    dialog.showModal();
    input.focus();
    input.setSelectionRange(...selection);
  };
  $("#collapse-editor").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    const input = $("#source");
    selection = [input.selectionStart, input.selectionEnd];
    home.append(sourceArea);
    input.focus();
    input.setSelectionRange(...selection);
  });
  $("#chord-align").onchange = (event) => onAlignment(event.target.value);

  const splitter = $("#panel-splitter");
  const workspace = $(".workspace");
  function setWidth(width) {
    const max = Math.max(280, Math.min(760, workspace.clientWidth - 300));
    width = Math.round(Math.max(280, Math.min(max, width)));
    workspace.style.setProperty("--editor-width", `${width}px`);
    splitter.setAttribute("aria-valuenow", width);
    splitter.setAttribute("aria-valuemax", max);
    resizePages();
  }
  splitter.onpointerdown = (event) => {
    splitter.setPointerCapture(event.pointerId);
    splitter.classList.add("dragging");
  };
  splitter.onpointermove = (event) => {
    if (splitter.hasPointerCapture(event.pointerId))
      setWidth(event.clientX - workspace.getBoundingClientRect().left);
  };
  splitter.onlostpointercapture = () => splitter.classList.remove("dragging");
  splitter.onpointerup = (event) =>
    splitter.releasePointerCapture(event.pointerId);
  splitter.onkeydown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    event.preventDefault();
    setWidth(
      event.key === "Home"
        ? 365
        : $(".editor-panel").clientWidth +
            (event.key === "ArrowRight" ? 20 : -20),
    );
  };
  splitter.ondblclick = () => setWidth(365);
  window.addEventListener("resize", () =>
    setWidth($(".editor-panel").clientWidth),
  );

  let position = 0;
  const library = $("#chord-library");
  const name = $("#chord-name");
  function draw() {
    const positions = fingerings(name.value);
    position = Math.max(0, Math.min(position, positions.length - 1));
    $("#library-diagram").innerHTML = diagram(name.value, position);
    $("#position-count").textContent = positions.length
      ? `Posición ${position + 1} de ${positions.length}`
      : "Sin posición en el catálogo";
    $("#previous-position").disabled = position === 0;
    $("#next-position").disabled = position >= positions.length - 1;
    $("#insert-library-chord").disabled = !positions.length;
  }
  $("#browse-chords").onclick = () => {
    library.showModal();
    draw();
  };
  $("#close-library").onclick = () => library.close();
  name.oninput = () => {
    position = 0;
    draw();
  };
  $("#previous-position").onclick = () => {
    position--;
    draw();
  };
  $("#next-position").onclick = () => {
    position++;
    draw();
  };
  $("#insert-library-chord").onclick = () => {
    onChord(name.value);
    library.close();
  };
}
