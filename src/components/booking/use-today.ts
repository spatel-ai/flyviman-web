"use client";

import { useSyncExternalStore } from "react";
import { todayIn } from "@/lib/format/zoned";

const noop = () => () => {};

/**
 * Today in India, read in the browser only: a page built ahead of time
 * cannot know the date (Next.js refuses `new Date()` while prerendering).
 * Empty until the page is interactive.
 */
export function useToday(): string {
  return useSyncExternalStore(
    noop,
    () => todayIn("Asia/Kolkata"),
    () => "",
  );
}
