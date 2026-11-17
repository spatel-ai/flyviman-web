import { cn } from "@/lib/utils";

/**
 * A detail page's one primary action on phones (below md): sticks just above
 * the tab bar while its page scrolls, and rests in the page flow at the end so
 * the footer is never covered. Put it last inside the page's container, with
 * the page gutter (16 px) as its negative margin. Hidden from md and in print.
 */
export function StickyActionBar({
  label,
  className,
  children,
}: {
  /** Names the bar for assistive technology. */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "material-bar sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 border-t border-border/60 px-4 py-3 md:hidden print:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
