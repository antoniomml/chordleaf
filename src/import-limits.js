import { MAX_TEXT_LENGTH } from "./song-state.js";
import { t } from "./i18n.js";

/** Bound text and geometry before proportional-font measurement or layout. */
export function countPdfContent(content, budget) {
  const characters = content.items.reduce(
    (sum, item) => sum + (item.str?.length || 0),
    0,
  );
  if (
    budget.characters + characters > MAX_TEXT_LENGTH ||
    budget.items + content.items.length > 20000 ||
    content.items.some((item) => (item.str?.length || 0) > 2000)
  )
    throw new Error(
      t(
        "El PDF contiene demasiado texto o fragmentos demasiado largos. Usa TXT o divide el documento.",
      ),
    );
  budget.characters += characters;
  budget.items += content.items.length;
}
