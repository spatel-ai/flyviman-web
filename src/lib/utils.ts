import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our type-scale names (globals.css, --text-*). Without them the merge takes
// "text-body-lg" for a colour and drops a real colour such as
// "text-accent-foreground" that comes before it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display",
        "h1",
        "h2",
        "h3",
        "title",
        "body-lg",
        "body",
        "body-sm",
        "caption",
        "overline",
      ],
    },
  },
});

/** Joins class names and resolves conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a UUID, the only shape a record id in a page address may take. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
