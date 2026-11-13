"use client";

import { useEffect, type RefObject } from "react";
import { Spring } from "./spring";

/** Pointer position within the element: -1 (left/top) to 1 (right/bottom). */
export type Apply = (element: HTMLElement, x: number, y: number) => void;

/**
 * Follows the pointer over an element with a spring and hands the smoothed
 * position to `apply`, which writes a transform. Only with a mouse or
 * trackpad (`pointer: fine`) and never under reduced motion. The loop runs
 * only while the value is moving.
 */
export function usePointerMotion(
  ref: RefObject<HTMLElement | null>,
  apply: Apply,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const x = new Spring();
    const y = new Spring();
    let frame = 0;
    let last = 0;

    const tick = (now: number) => {
      const seconds = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      x.step(seconds);
      y.step(seconds);
      if (x.settled && y.settled) {
        x.snap();
        y.snap();
        frame = 0;
        last = 0;
      } else {
        frame = requestAnimationFrame(tick);
      }
      // Back at rest: leave no transform behind.
      if (!frame && x.value === 0 && y.value === 0) {
        element.style.transform = "";
      } else {
        apply(element, x.value, y.value);
      }
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      x.target = ((event.clientX - box.left) / box.width) * 2 - 1;
      y.target = ((event.clientY - box.top) / box.height) * 2 - 1;
      start();
    };
    const onLeave = () => {
      x.target = 0;
      y.target = 0;
      start();
    };

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", onLeave);
    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
      element.style.transform = "";
    };
  }, [ref, apply]);
}
