"use client";

import { useRef, type HTMLAttributes } from "react";
import { usePointerMotion, type Apply } from "./use-pointer-motion";

/** Degrees at the card's edge. */
const MAX_TILT = 4;

const tilt: Apply = (element, x, y) => {
  element.style.transform = `perspective(1200px) rotateX(${(-y * MAX_TILT).toFixed(2)}deg) rotateY(${(x * MAX_TILT).toFixed(2)}deg)`;
};

/**
 * A card that leans a few degrees towards the pointer (motion level 1,
 * pointer feedback). Customer marketing sections only: never around prices,
 * forms, status badges or the air ambulance tile.
 */
export function TiltCard(props: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  usePointerMotion(ref, tilt);
  return <div ref={ref} {...props} />;
}
