"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The sidebar's scrolling navigation area. A fade at the bottom (and at the
 * top once scrolled) tells the user there are more links out of view; the
 * header above it stays pinned. Tokens only, so it follows the theme.
 */
export function SidebarScroll({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const scroller = useRef<HTMLElement>(null);
  const [more, setMore] = useState({ above: false, below: false });

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () =>
      setMore({
        above: element.scrollTop > 4,
        below:
          element.scrollTop + element.clientHeight < element.scrollHeight - 4,
      });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      <nav
        ref={scroller}
        aria-label={label}
        className="h-full overflow-y-auto px-3 pb-6 pt-2"
      >
        <div>{children}</div>
      </nav>
      <div
        aria-hidden="true"
        data-testid="sidebar-fade-top"
        className={`pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b from-surface-raised to-transparent transition-opacity duration-150 ${more.above ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden="true"
        data-testid="sidebar-fade-bottom"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-surface-raised to-transparent transition-opacity duration-150 ${more.below ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
