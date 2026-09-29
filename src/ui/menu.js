/** Menu button: Enter/Space/arrows open it, arrows move, Escape and Tab close. */
export function setupMenu(button, menu) {
  const items = () =>
    [...menu.querySelectorAll('[role^="menuitem"]')].filter(
      (item) => !item.disabled && !item.hidden,
    );
  function close({ focus = false } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (focus) button.focus();
  }
  function open(focusIndex = 0) {
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    const list = items();
    list.at(focusIndex)?.focus();
  }
  button.addEventListener("click", () => (menu.hidden ? open() : close()));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    open(event.key === "ArrowDown" ? 0 : -1);
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close({ focus: true });
      return;
    }
    if (event.key === "Tab") return close();
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const list = items();
    const current = list.indexOf(document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? list.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : list.length - 1)) %
            list.length;
    list[next]?.focus();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(`#${button.id}, #${menu.id}`)) close();
  });
  return { open, close };
}
