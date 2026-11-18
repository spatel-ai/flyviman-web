"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface ScrollFrame {
  /** Where the scroll is: 0 with the track's top at the top of the screen,
   *  1 when its bottom reaches the bottom. */
  target: number;
  /** Bottom edge of the track, in pixels from the top of the screen. */
  bottom: number;
}

interface Options {
  /** How far `progress` closes on `target` each 60th of a second; 1
   *  follows exactly. */
  lerp: number;
  /** Called with the eased progress whenever it, or the track, moves. */
  onFrame: (progress: number, frame: ScrollFrame) => void;
}

/** Below this the eased value counts as arrived. */
const SETTLED = 0.0005;

/** One frame at 60 Hz, the rate `lerp` is given for. */
const FRAME_MS = 1000 / 60;

/** How much of `range` has passed at `progress`, from 0 to 1. */
export function segment(progress: number, range: readonly [number, number]) {
  const t = (progress - range[0]) / (range[1] - range[0]);
  return Math.min(1, Math.max(0, t));
}

/**
 * Follows a tall track down the page. The scroll position sets a target;
 * the reported progress eases towards it once per animation frame, so a
 * mouse wheel's steps come out as one movement. The scroll itself is never
 * touched. The frame loop stops when progress arrives and while the track
 * is off screen. Returns `snap`, which makes the next frame land on the
 * target without easing (after a jump made for keyboard focus).
 */
export function useScrollProgress(
  track: RefObject<HTMLElement | null>,
  { lerp, onFrame }: Options,
) {
  const latest = useRef(onFrame);
  const snapNext = useRef(true);
  useEffect(() => {
    latest.current = onFrame;
  });

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    let current = 0;
    let frame = 0;
    let visible = true;

    const measure = (): ScrollFrame => {
      const rect = element.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      return {
        target:
          distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 1,
        bottom: rect.bottom,
      };
    };
    let last = 0;
    const tick = (time = performance.now()) => {
      frame = 0;
      // The same easing at any refresh rate: `lerp` is per 60th of a second.
      const elapsed = last ? Math.min(100, time - last) : FRAME_MS;
      last = time;
      const measured = measure();
      const gap = measured.target - current;
      if (snapNext.current || Math.abs(gap) < SETTLED) {
        current = measured.target;
        snapNext.current = false;
        last = 0;
      } else {
        current += gap * (1 - (1 - lerp) ** (elapsed / FRAME_MS));
        if (visible) frame = requestAnimationFrame(tick);
      }
      latest.current(current, measured);
    };
    const request = () => {
      frame ||= requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      // One more frame on the way out, so the last state is the true one.
      if (!visible) snapNext.current = true;
      request();
    });
    observer.observe(element);
    snapNext.current = true;
    tick();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      cancelAnimationFrame(frame);
    };
  }, [track, lerp]);

  return {
    snap: () => {
      snapNext.current = true;
    },
  };
}
