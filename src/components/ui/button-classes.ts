import { cn } from "@/lib/utils";

// Kept apart from button.tsx, which is a client component: server
// components style links as buttons with this function.

export type Variant = "primary" | "secondary" | "ghost" | "destructive";
export type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent-fill text-accent-foreground hover:bg-accent-fill-hover",
  secondary: "bg-surface text-foreground hover:bg-border/60",
  ghost: "text-accent hover:bg-accent/10",
  destructive: "bg-danger text-danger-foreground hover:bg-danger/90",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-body-sm",
  md: "h-11 px-5 text-body",
  lg: "h-13 px-7 text-body-lg",
};

/**
 * The button look, for a link that must be styled as a button (for example a
 * page's primary action that navigates rather than submits).
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-pill font-medium whitespace-nowrap",
    // A press sinks the button slightly (motion level 1); not under reduced motion.
    "transition duration-150 ease-standard active:scale-97 motion-reduce:active:scale-100",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
