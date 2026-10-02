// Shared outline icons for document actions, matching the navigation's stroke.
const paths = {
  left: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  right: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  undo: '<path d="m9 5-5 5 5 5M4 10h10a5 5 0 0 1 0 10h-4"/>',
  done: '<path d="m5 12 4 4L19 6"/>',
  edit: '<path d="m4 20 4.5-1 10-10a2 2 0 0 0-3-3l-10 10L4 20Zm10-13 3 3"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  fit: '<path d="M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4"/>',
};

export function icon(name) {
  return `<svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
