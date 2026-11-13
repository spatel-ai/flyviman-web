"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

/** Only opacity and transforms follow the scroll (motion-design.md). */
export interface ScrubValues {
  opacity?: number;
  y?: number;
  yPercent?: number;
  scale?: number;
  scaleX?: number;
}

export interface ScrollScrubProps extends HTMLAttributes<HTMLDivElement> {
  from: ScrubValues;
  to: ScrubValues;
  /** What the scroll range is measured against. */
  trigger?: "self" | "section";
  /** ScrollTrigger positions, for example "top bottom". */
  start?: string;
  end?: string;
}

/**
 * Motion level 5 (scroll-linked): the content moves between two states as
 * the page scrolls, and back again. The server renders the resting state;
 * GSAP and ScrollTrigger load after the page is idle, so nothing waits on
 * them. Native scrolling is never taken over. Not under reduced motion.
 *
 * The scroll range is measured again whenever the page's height changes (a
 * client navigation under a shared layout, an answer opening), so an
 * instance in a layout never keeps another page's measurements.
 */
export function ScrollScrub({
  from,
  to,
  trigger = "self",
  start = "top bottom",
  end = "bottom top",
  ...props
}: ScrollScrubProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Fixed for the life of the component: the tween is built once.
  const config = useRef({ from, to, trigger, start, end });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cancelled = false;
    let revert: (() => void) | undefined;

    const load = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const { from, to, trigger, start, end } = config.current;
      const context = gsap.context(() => {
        gsap.fromTo(element, from, {
          ...to,
          ease: "none",
          scrollTrigger: {
            trigger:
              trigger === "section"
                ? (element.closest("section, footer") ?? element)
                : element,
            start,
            end,
            scrub: true,
          },
        });
      });
      // Measure again when the page's height changes.
      let timer = 0;
      const observer = new ResizeObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
      });
      observer.observe(document.body);
      revert = () => {
        window.clearTimeout(timer);
        observer.disconnect();
        context.revert();
      };
    };
    // If the script cannot be fetched the content stays at rest.
    const start = () => void load().catch(() => undefined);

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start)
      : window.setTimeout(start, 200);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      revert?.();
    };
  }, []);

  return <div ref={ref} {...props} />;
}
