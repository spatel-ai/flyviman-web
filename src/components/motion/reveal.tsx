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
  /**
   * "rise" (default) fades and rises. "slit" resolves the content through
   * thin vertical slits, for section headings (globals.css).
   */
  variant?: "rise" | "slit";
}

/**
 * Motion level 4: content rises about 24 px and fades in, once, the first
 * time it scrolls into view. Customer site only.
 *
 * The server renders the content visible. After loading, content wholly
 * below the screen is hidden and rises in when any part of it is scrolled
 * into view; content already partly on screen is left alone, so nothing
 * flashes. Without JavaScript,
 * without IntersectionObserver, or with reduced motion, nothing is hidden.
 */
export function Reveal({
  index = 0,
  variant = "rise",
  style,
  children,
  ...props
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("visible");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    // Any part already on screen (or above it) at load: leave it as
    // rendered. Only content wholly below the screen waits to be revealed.
    // (If it was left waiting while the page was kept in the background
    // and is on screen now, show it.)
    if (element.getBoundingClientRect().top < window.innerHeight) {
      setState((current) => (current === "waiting" ? "shown" : current));
      return;
    }

    setState("waiting");
    // Revealed as soon as any part enters the screen, so content can never
    // be left hidden, even at the very end of a short page.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setState("shown");
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const stagger = Math.min(Math.max(Math.trunc(index), 0), MAX_STAGGER_INDEX);
  return (
    <div
      ref={ref}
      data-reveal={state}
      data-reveal-variant={variant === "slit" ? "slit" : undefined}
      style={{ ...style, "--reveal-index": stagger } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}
