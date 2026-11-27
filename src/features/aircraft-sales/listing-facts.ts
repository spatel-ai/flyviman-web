/** What a card or table shows where a listing gives no value. */
export const NOT_STATED = "Not stated";

/** Listings shown before "Show more". */
export const PAGE_SIZE = 12;

interface Detail {
  label: string;
  value: string;
}

/** True for "", "0", "0 hrs" and the like: the live site's way of leaving a figure out. */
function isBlankFigure(value: string) {
  const text = value.trim();
  return text === "" || /^0+(\.0+)?(\s*[a-z]+)?$/i.test(text);
}

/**
 * The value to show for `label`, or "Not stated" when the listing has none.
 * Total time reads zero on the live site where the broker gave no figure,
 * and a zero is never shown as if it were a fact.
 */
export function shownValue(details: readonly Detail[], label: string) {
  const value = details.find((d) => d.label === label)?.value ?? "";
  if (label === "Total Time" && isBlankFigure(value)) return NOT_STATED;
  return value.trim() === "" ? NOT_STATED : value;
}

/** The first `shown` items: the page of a grid that offers "Show more". */
export function visibleItems<T>(items: readonly T[], shown: number) {
  return items.slice(0, Math.max(0, shown));
}

/** How many to show after "Show more": one more page, never past the end. */
export function nextShown(shown: number, total: number) {
  return Math.min(total, shown + PAGE_SIZE);
}
