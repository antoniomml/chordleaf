import { MAX_TEXT_LENGTH } from "./song-state.js";
import { t } from "./i18n.js";

export const PDF_ITEM_LIMIT = 20000;
export const PDF_FRAGMENT_LIMIT = 2000;

/** Bound text and geometry before proportional-font measurement or layout. */
export function countPdfItems(items, budget) {
  const characters = items.reduce(
    (sum, item) => sum + (item.str?.length || 0),
    0,
  );
  if (
    budget.characters + characters > MAX_TEXT_LENGTH ||
    budget.items + items.length > PDF_ITEM_LIMIT ||
    items.some((item) => (item.str?.length || 0) > PDF_FRAGMENT_LIMIT)
  )
    throw new Error(
      t(
        "El PDF contiene demasiado texto o fragmentos demasiado largos. Usa TXT o divide el documento.",
      ),
    );
  budget.characters += characters;
  budget.items += items.length;
}

/** Compatibility helper for callers that already hold a complete TextContent. */
export function countPdfContent(content, budget) {
  countPdfItems(content.items, budget);
}

/** Consume a pdf.js text stream, enforcing the budget on every chunk and
 * cancelling the stream as soon as the next fragment would exceed it. */
export async function readPdfContent(stream, budget, { signal } = {}) {
  const items = [];
  const styles = {};
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      signal?.throwIfAborted();
      countPdfItems(value.items || [], budget);
      items.push(...(value.items || []));
      Object.assign(styles, value.styles);
    }
  } finally {
    await Promise.resolve(reader.cancel()).catch(() => {});
  }
  return { items, styles };
}
