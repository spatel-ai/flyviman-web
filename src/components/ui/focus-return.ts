"use client";

import { useRef } from "react";

type FocusEventHandler = (event: Event) => void;

/**
 * Returns focus to the control that opened a dialog or sheet. Radix does it
 * only for a `DialogTrigger`; most call sites open the dialog from their own
 * state, so the opener is noted when focus is about to move in (it is still
 * the active element then) and focused again on close, if it is still on
 * the page. A handler that prevents the default keeps its own behaviour.
 */
export function useFocusReturn(
  onOpenAutoFocus?: FocusEventHandler,
  onCloseAutoFocus?: FocusEventHandler,
) {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus(event: Event) {
      const active = document.activeElement;
      opener.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus(event: Event) {
      onCloseAutoFocus?.(event);
      const target = opener.current;
      opener.current = null;
      if (!event.defaultPrevented && target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
