"use client";

import { useRef, type HTMLAttributes } from "react";
import { usePointerMotion, type Apply } from "./use-pointer-motion";

/** Pixels the content moves when the pointer is at its edge. */
const PULL_X = 6;
const PULL_Y = 4;

const pull: Apply = (element, x, y) => {
  element.style.transform = `translate(${(x * PULL_X).toFixed(2)}px, ${(y * PULL_Y).toFixed(2)}px)`;
};

/**
 * Wraps a page's primary action so it leans slightly towards the pointer
 * (motion level 1). One per view, on customer marketing pages only.
 */
export function Magnetic({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  const ref = useRef<HTMLSpanElement>(null);
  usePointerMotion(ref, pull);
  return (
    <span
      ref={ref}
      className={["inline-block", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
