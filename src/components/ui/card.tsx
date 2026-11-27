import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "flat" | "raised" | "interactive";

const VARIANTS: Record<Variant, string> = {
  flat: "bg-surface",
  raised: "bg-surface-raised shadow-sm",
  interactive:
    "bg-surface-raised shadow-sm transition duration-150 ease-standard hover:shadow-md active:scale-99 motion-reduce:active:scale-100",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Card({ variant = "flat", className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg p-6", VARIANTS[variant], className)}
      {...props}
    />
  );
}
