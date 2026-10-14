import { expect } from "@playwright/test";

export const lyricValue = (field) =>
  field.evaluate((el) => (el.isContentEditable ? el.innerText : el.value));

export async function expectLyricValue(field, value) {
  if (await field.evaluate((el) => el.isContentEditable))
    await expect(field).toHaveText(value, { useInnerText: true });
  else await expect(field).toHaveValue(value);
}
