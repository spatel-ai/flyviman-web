"use client";

import { useEffect } from "react";

/** How far the page scrolls before the header changes. */
export const SCROLLED_AFTER_PX = 8;

/**
 * Marks the page as scrolled (`data-scrolled` on the root element) once it
 * leaves the top, so the customer header can gain its hairline and stronger
 * glass (globals.css, `.site-header`). Renders nothing.
 */
export function HeaderScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.toggleAttribute("data-scrolled", window.scrollY > SCROLLED_AFTER_PX);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      root.removeAttribute("data-scrolled");
    };
  }, []);
  return null;
}
