"use client";

import { useEffect } from "react";

/**
 * Asks the browser to confirm before the tab is closed, reloaded or sent to
 * another address while a form holds edits that are not saved. In-app links
 * are not intercepted: the app has no navigation guard.
 */
export function useUnsavedChangesWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
