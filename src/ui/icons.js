// Shared outline icons for document actions, matching the navigation's stroke.
const paths = {
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  paste:
    '<path d="M9 5H6a2 2 0 0 0-2 2v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a2 2 0 0 0-2-2h-3"/><rect x="9" y="3" width="6" height="4" rx="1"/>',
  delete: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
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
