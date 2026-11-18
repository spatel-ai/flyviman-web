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
  /** Phones only, after the value (the hint is hidden there): an airport's code. */
  phoneSuffix?: string;
  icon?: LucideIcon;
  error?: string;
}

/**
 * One field of the search widget, as a large tappable tile that opens its
 * picker. The accessible name is the label and the current value.
 */
export const FieldTile = forwardRef<HTMLButtonElement, FieldTileProps>(
  function FieldTile(
    {
      label,
      value,
      placeholder,
      hint,
      phoneSuffix,
      icon: Icon,
      error,
      className,
      ...props
    },
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
            "flex h-full min-h-14 w-full min-w-0 flex-col items-start gap-0.5 rounded-md bg-surface px-3 py-2 sm:min-h-24 sm:px-4 sm:gap-1 sm:py-3 text-left",
            "transition duration-150 ease-standard hover:bg-border/40 active:scale-99 motion-reduce:active:scale-100",
            "outline-none focus-visible:ring-2 focus-visible:ring-accent",
            error && "ring-1 ring-danger",
            className,
          )}
          {...props}
        >
          <span className="flex items-center gap-1.5 text-caption font-medium tracking-wide text-muted uppercase">
            {Icon ? (
              <Icon aria-hidden="true" className="size-3.5 max-sm:hidden" />
            ) : null}
            {label}
          </span>
          <span
            data-field-value=""
            className={cn(
              // Phones: the whole value, wrapping to a second line if need be.
              "w-full text-body font-semibold wrap-anywhere sm:truncate sm:text-h3",
              value ? "text-foreground" : "text-subtle",
            )}
          >
            {value ?? placeholder}
            {value && phoneSuffix ? (
              <span
                aria-hidden="true"
                className="font-normal text-muted sm:hidden"
              >
                {" "}
                {phoneSuffix}
              </span>
            ) : null}
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
