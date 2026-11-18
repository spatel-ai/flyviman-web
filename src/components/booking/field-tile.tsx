import type { LucideIcon } from "lucide-react";
import { forwardRef, useId, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface FieldTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Small label above, for example "From". */
  label: string;
  /** The chosen value, large; `placeholder` when nothing is chosen. */
  value?: string;
  placeholder: string;
  /** A second line under the value, for example the airport's full name. */
  hint?: string;
  icon?: LucideIcon;
  error?: string;
}

/**
 * One field of the search widget, as a large tappable tile that opens its
 * picker. The accessible name is the label and the current value.
 */
export const FieldTile = forwardRef<HTMLButtonElement, FieldTileProps>(
  function FieldTile(
    { label, value, placeholder, hint, icon: Icon, error, className, ...props },
    ref,
  ) {
    const hintId = useId();
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <button
          ref={ref}
          type="button"
          data-field-tile=""
          aria-label={`${label}: ${value ?? placeholder}`}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            "flex h-full min-h-14 w-full min-w-0 flex-col items-start gap-0.5 rounded-md bg-surface px-4 py-2 sm:min-h-24 sm:gap-1 sm:py-3 text-left",
            "transition duration-150 ease-standard hover:bg-border/40 active:scale-99 motion-reduce:active:scale-100",
            "outline-none focus-visible:ring-2 focus-visible:ring-accent",
            error && "ring-1 ring-danger",
            className,
          )}
          {...props}
        >
          <span className="flex items-center gap-1.5 text-caption font-medium tracking-wide text-muted uppercase">
            {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
            {label}
          </span>
          <span
            className={cn(
              "w-full truncate text-title sm:text-h3",
              value ? "text-foreground" : "text-subtle",
            )}
          >
            {value ?? placeholder}
          </span>
          {hint ? (
            // Phones: hidden, still the field's accessible description.
            <span
              id={hintId}
              className="w-full truncate text-body-sm text-muted max-sm:sr-only"
            >
              {hint}
            </span>
          ) : null}
        </button>
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
