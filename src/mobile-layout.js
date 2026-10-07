/** Give portrait touch tablets a full-width preview; keep rotated phones in this layout.
 * The CSS media queries mirror this condition. */
export const MOBILE_LAYOUT_QUERY =
  "(max-width: 760px), (max-width: 1024px) and (max-height: 500px) and (hover: none) and (pointer: coarse), (max-width: 1024px) and (orientation: portrait) and (hover: none) and (pointer: coarse)";
export function isMobileLayout() {
  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
}
