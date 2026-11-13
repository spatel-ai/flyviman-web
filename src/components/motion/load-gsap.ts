import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export interface GsapKit {
  gsap: typeof Gsap;
  ScrollTrigger: typeof ScrollTriggerType;
}

/**
 * Loads GSAP and ScrollTrigger once the page is idle and hands them to
 * `setup`, whose returned function undoes what it built. Scroll ranges are
 * measured again whenever the page's height changes (a client navigation
 * under a shared layout, an answer opening). The only place GSAP is
 * imported (motion-design.md). Returns a cancel function for an effect.
 */
export function whenGsapReady(setup: (kit: GsapKit) => () => void): () => void {
  let cancelled = false;
  let undo: (() => void) | undefined;

  const load = async () => {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
    ]);
    if (cancelled) return;
    gsap.registerPlugin(ScrollTrigger);
    const teardown = setup({ gsap, ScrollTrigger });
    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    observer.observe(document.body);
    undo = () => {
      window.clearTimeout(timer);
      observer.disconnect();
      teardown();
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
    undo?.();
  };
}
