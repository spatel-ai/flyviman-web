/** Phones and small tablets get no pointer or scroll-linked motion (CR-2). */
export const WIDE_QUERY = "(min-width: 768px)";
export const POINTER_QUERY =
  "(min-width: 768px) and (hover: hover) and (pointer: fine)";

/**
 * Runs `setup` while `query` matches and undoes it when it stops matching,
 * so a rotated phone or a resized window turns the effect on or off without
 * a reload. Does nothing where matchMedia is missing. Returns a cleanup.
 */
export function whenMedia(query: string, setup: () => () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const list = window.matchMedia(query);
  let undo: (() => void) | undefined;
  const sync = () => {
    if (list.matches && !undo) undo = setup();
    else if (!list.matches && undo) {
      undo();
      undo = undefined;
    }
  };
  sync();
  list.addEventListener("change", sync);
  return () => {
    list.removeEventListener("change", sync);
    undo?.();
  };
}
