"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from "react";

/** A reveal staggers at most four items (motion-design.md). */
export const MAX_STAGGER_INDEX = 3;

type State = "visible" | "waiting" | "shown";

export interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  /** Position in a group revealed together: 0 to 3, 80 ms apart. */
  index?: number;
}

/**
 * Motion level 4: content rises about 24 px and fades in, once, the first
 * time it scrolls into view. Customer site only.
 *
 * The server renders the content visible. After loading, content that is
 * still below the screen is hidden and waits to be scrolled to; content
 * already on screen is left alone, so nothing flashes. Without JavaScript,
 * without IntersectionObserver, or with reduced motion, nothing is hidden.
 */
export function Reveal({ index = 0, style, children, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("visible");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let first = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // On screen at load: stay as rendered. Later: play the reveal.
          if (!first) setState("shown");
          observer.disconnect();
        } else if (first) {
          setState("waiting");
        }
        first = false;
      },
      // Start a little before the element is fully in view.
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const stagger = Math.min(Math.max(Math.trunc(index), 0), MAX_STAGGER_INDEX);
  return (
    <div
      ref={ref}
      data-reveal={state}
      style={{ ...style, "--reveal-index": stagger } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}
