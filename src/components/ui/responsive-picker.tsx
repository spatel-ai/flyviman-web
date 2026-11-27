"use client";

import { Popover } from "radix-ui";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const DESKTOP = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Under the sticky header, with a little air. */
const HEADER_CLEARANCE = 64;

/**
 * What a picker inside a scroll-linked section cannot measure itself: the
 * home page hero's film holds the card still, then lifts it, as the page
 * scrolls (motion-design.md). `settle` says how far the page must still
 * scroll before the card moves, and how far the card will still rise.
 * `onHide` tells the picker when the card is fading out again.
 */
export interface PickerSettle {
  settle: () => { slack: number; rise: number };
  onHide: (callback: () => void) => () => void;
}

const PickerSettleContext = createContext<PickerSettle | null>(null);

export const PickerSettleProvider = PickerSettleContext.Provider;

/** `--ease-in-out` (globals.css) as a function of time, 0 to 1. */
function easeInOut(t: number) {
  const [x1, y1, x2, y2] = [0.65, 0, 0.35, 1];
  const at = (u: number, a: number, b: number) =>
    3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u ** 2 * b + u ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (at(mid, x1, x2) < t) low = mid;
    else high = mid;
  }
  return at((low + high) / 2, y1, y2);
}

/**
 * How far the page must scroll so `room` px are free below the field where
 * it will settle: the hero's slack, then only as far as the picker needs,
 * and never so far that the top of the field's card goes under the header.
 */
function distanceFor(
  field: HTMLElement,
  room: number,
  context: PickerSettle | null,
) {
  const { slack, rise } = context?.settle() ?? { slack: 0, rise: 0 };
  const rect = field.getBoundingClientRect();
  const free = window.innerHeight - (rect.bottom - rise);
  const scope = field.closest("[data-picker-scope]") ?? field;
  const top = scope.getBoundingClientRect().top - rise;
  const needed = Math.max(0, room - free);
  return slack + Math.min(needed, Math.max(0, top - HEADER_CLEARANCE));
}

/**
 * Scrolls `distance` px with an ease in and out, setting each frame itself:
 * a smooth scroll is cut short when the picker takes focus. The visitor's own
 * wheel, touch or keys end it. Resolves when it stops; `cancel` stops it.
 */
function glide(distance: number, done: () => void) {
  const from = window.scrollY;
  const duration = Math.min(600, Math.max(250, 200 + distance * 0.5));
  const began = performance.now();
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const name of ["wheel", "touchstart", "keydown"]) {
      window.removeEventListener(name, stop);
    }
    done();
  };
  const step = (now: number) => {
    const t = Math.min(1, (now - began) / duration);
    window.scrollTo({
      top: from + distance * easeInOut(t),
      behavior: "instant",
    });
    if (t < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  for (const name of ["wheel", "touchstart", "keydown"]) {
    window.addEventListener(name, stop, { passive: true });
  }
  frame = requestAnimationFrame(step);
  return stop;
}

/** True from the md breakpoint up; the server renders the desktop form. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
}

/**
 * A picker that opens as a popover under its field on desktop and as a
 * bottom sheet on phones, where a popover would not fit. Popovers and sheets
 * are motion level 1 and 2 (motion-design.md); nothing inside them moves.
 */
export function ResponsivePicker({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  width = "md",
  room = 360,
  align = "start",
  side = "bottom",
  initialFocus,
  scroll = true,
  modal = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A button, rendered as the trigger. */
  trigger: ReactNode;
  /** Names the sheet on phones (shown) and the popover (screen readers). */
  title: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
  /** Pixels the picker needs below its field (desktop). */
  room?: number;
  align?: "start" | "center";
  /**
   * Where the popover opens on desktop. `left` keeps a field's popover off
   * whatever sits below it (the travellers picker would cover Search).
   */
  side?: "bottom" | "left";
  /**
   * Where focus lands on opening, instead of the first control (a stepper's
   * minus button looked pressed). Give the element `tabIndex={-1}`.
   */
  initialFocus?: RefObject<HTMLElement | null>;
  /**
   * Whether the page may scroll to make room (desktop). `false` keeps the
   * page still and lets the popover flip to the side with space instead.
   */
  scroll?: boolean;
  /**
   * Desktop: the popover holds focus and scrolling, and a click outside
   * closes only it, never a dialog it opens over (the form fields' pickers).
   */
  modal?: boolean;
}) {
  const desktop = useIsDesktop();
  const context = useContext(PickerSettleContext);
  const gliding = useRef<(() => void) | null>(null);
  // The film is hiding the card: take the picker with it, so it is never
  // left floating where its field was.
  useEffect(() => {
    if (!open || !context) return;
    return context.onHide(() => onOpenChange(false));
  }, [open, context, onOpenChange]);
  useEffect(() => () => gliding.current?.(), []);
  function openAfterRoom(event: MouseEvent<HTMLElement>) {
    if (open) return;
    // Radix would toggle now; the picker opens once the page has settled.
    if (gliding.current) return event.preventDefault();
    const distance = distanceFor(event.currentTarget, room, context);
    if (distance < 1) return;
    event.preventDefault();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollBy({ top: distance, behavior: "instant" });
      onOpenChange(true);
      return;
    }
    gliding.current = glide(distance, () => {
      gliding.current = null;
      onOpenChange(true);
    });
  }
  const onOpenAutoFocus = initialFocus
    ? (event: Event) => {
        event.preventDefault();
        initialFocus.current?.focus();
      }
    : undefined;
  if (!desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent title={title} onOpenAutoFocus={onOpenAutoFocus}>
          {children}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <Popover.Trigger
        asChild
        // Like a travel site: when the field sits too low for the picker,
        // the page glides first so the picker opens below it, in full.
        onClick={scroll ? openAfterRoom : undefined}
      >
        {trigger}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={title}
          onOpenAutoFocus={onOpenAutoFocus}
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          // Never flipped over the header: the page makes room first (above),
          // and if space is still short the picker scrolls inside. Where the
          // page may not scroll, it flips instead.
          avoidCollisions={!scroll}
          className={cn(
            // The hairline separates the popover from the card it opens over,
            // which has the same surface; in dark mode the shadow cannot.
            "z-50 overflow-y-auto rounded-lg border border-foreground/12 bg-surface-raised p-4 text-foreground shadow-lg outline-none",
            "max-h-(--radix-popover-content-available-height) max-w-(--radix-popover-content-available-width)",
            "transition duration-150 ease-standard starting:translate-y-1 starting:opacity-0",
            width === "sm" && "w-72",
            width === "md" && "w-96",
            width === "lg" && "w-2xl",
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
