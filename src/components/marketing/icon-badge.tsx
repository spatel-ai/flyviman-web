import { cn } from "@/lib/utils";
import { CONCEPT_ICONS, type ConceptIcon } from "./concept-icons";

/**
 * A small line icon in a soft accent circle. It heads a card or a section
 * and is decoration only: the heading beside it names the concept.
 */
export function IconBadge({
  icon,
  className,
}: {
  icon: ConceptIcon;
  className?: string;
}) {
  const Icon = CONCEPT_ICONS[icon];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent",
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.5} />
    </span>
  );
}

/** A list marker: a check in a small soft circle. */
export function CheckMark() {
  const Icon = CONCEPT_ICONS.check;
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"
    >
      <Icon className="size-4" strokeWidth={1.5} />
    </span>
  );
}
