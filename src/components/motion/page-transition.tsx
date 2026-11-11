import { ViewTransition, type ReactNode } from "react";

/**
 * Motion level 3: the page's content cross-fades when the visitor moves to
 * another page, while the header and footer stay still. Wrap the content of
 * each customer page (not a layout: layouts persist, so they never enter or
 * exit). Browsers without view transitions simply navigate. Customer site
 * only; reduced motion turns the fade off (globals.css).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      {children}
    </ViewTransition>
  );
}
