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
  /** About how long `progress` takes to catch up with `target` (95% of the
   *  way), in ms, at any refresh rate; 0 follows exactly. */
  settleMs: number;
  /** Called with the eased progress whenever it, or the track, moves. */
  onFrame: (progress: number, frame: ScrollFrame) => void;
}

/** Below this the eased value counts as arrived. */
const SETTLED = 0.0005;

/** One frame at 60 Hz, assumed for the first step after a pause. */
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
 * touched. The track's place on the page is measured only when it or the
 * window changes size, so the frame loop reads no layout. The loop stops
 * when progress arrives and while the track is off screen. Returns `snap`, which makes the next frame land on the
 * target without easing (after a jump made for keyboard focus).
 */
export function useScrollProgress(
  track: RefObject<HTMLElement | null>,
  { settleMs, onFrame }: Options,
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

    // The track's top on the page, its height and the window's height.
    const box = { top: 0, height: 0, screen: 0 };
    const place = () => {
      const rect = element.getBoundingClientRect();
      box.top = rect.top + window.scrollY;
      box.height = rect.height;
      box.screen = window.innerHeight;
    };
    const measure = (): ScrollFrame => {
      const top = box.top - window.scrollY;
      const distance = box.height - box.screen;
      return {
        target: distance > 0 ? Math.min(1, Math.max(0, -top / distance)) : 1,
        bottom: top + box.height,
      };
    };
    // Exponential easing: 95% of the gap closes in `settleMs`.
    const tau = settleMs / 3;
    let last = 0;
    const tick = (time = performance.now()) => {
      frame = 0;
      const elapsed = last ? Math.min(100, time - last) : FRAME_MS;
      last = time;
      const measured = measure();
      const gap = measured.target - current;
      if (snapNext.current || tau <= 0 || Math.abs(gap) < SETTLED) {
        current = measured.target;
        snapNext.current = false;
        last = 0;
      } else {
        current += gap * (1 - Math.exp(-elapsed / tau));
        if (visible) frame = requestAnimationFrame(tick);
      }
      latest.current(current, measured);
    };
    const request = () => {
      frame ||= requestAnimationFrame(tick);
    };
    const resized = () => {
      place();
      request();
    };
    const sizes = new ResizeObserver(resized);
    sizes.observe(element);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      // One more frame on the way out, so the last state is the true one.
      if (!visible) snapNext.current = true;
      request();
    });
    observer.observe(element);
    place();
    snapNext.current = true;
    tick();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", resized);
    return () => {
      observer.disconnect();
      sizes.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", resized);
      cancelAnimationFrame(frame);
    };
  }, [track, settleMs]);

  return {
    snap: () => {
      snapNext.current = true;
    },
  };
}
