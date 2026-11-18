"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "./theme-script";

export type Theme = "light" | "dark";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const EVENT = "flyviman-theme-change";

function read(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    // A display preference, not a credential: it is fine in local storage.
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts
    // until the page reloads.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Light is the default; a visitor can choose dark. */
export function ThemeSwitch({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex rounded-pill bg-border/50 p-0.5 text-caption",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => applyTheme(option.value)}
            className={cn(
              "h-7 rounded-pill px-3 font-medium transition-colors duration-150 ease-standard",
              selected
                ? "bg-surface-raised text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
