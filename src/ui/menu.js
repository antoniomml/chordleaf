/** Menu button: Enter/Space/arrows open it, arrows move, Escape and Tab close. */
export function setupMenu(button, menu) {
  const items = () =>
    [...menu.querySelectorAll('[role^="menuitem"]')].filter(
      (item) => !item.disabled && !item.hidden,
    );
  function fit() {
    if (menu.hidden) return;
    const viewport = window.visualViewport;
    const bottom = viewport
      ? viewport.offsetTop + viewport.height
      : window.innerHeight;
    menu.style.setProperty(
      "--menu-available-height",
      `${Math.max(32, bottom - menu.getBoundingClientRect().top - 16)}px`,
    );
  }
  function focusItem(item) {
    if (!item) return;
    item.focus({ preventScroll: true });
    const bounds = menu.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    if (rect.top < bounds.top + 6) menu.scrollTop -= bounds.top + 6 - rect.top;
    else if (rect.bottom > bounds.bottom - 6)
      menu.scrollTop += rect.bottom - bounds.bottom + 6;
  }
  function close({ focus = false } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (focus) button.focus();
  }
  function open(focusIndex = 0) {
    menu.hidden = false;
    fit();
    button.setAttribute("aria-expanded", "true");
    const list = items();
    focusItem(list.at(focusIndex));
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
    focusItem(list[next]);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(`#${button.id}, #${menu.id}`)) close();
  });
  window.addEventListener("resize", fit);
  window.visualViewport?.addEventListener("resize", fit);
  window.visualViewport?.addEventListener("scroll", fit);
  return { open, close };
}
