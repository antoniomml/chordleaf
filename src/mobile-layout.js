/** Keep touch phones in the mobile workspace when rotated past 760px.
 * The CSS media queries mirror this condition. */
export const MOBILE_LAYOUT_QUERY =
  "(max-width: 760px), (max-width: 1024px) and (max-height: 500px) and (hover: none) and (pointer: coarse)";
export function isMobileLayout() {
  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
}
