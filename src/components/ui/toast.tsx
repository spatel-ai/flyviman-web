"use client";

import { createContext, use, useRef, useState, type ReactNode } from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export type ToastTone = "neutral" | "success" | "danger";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
}

export interface ToastApi {
  /**
   * Confirms a completed action. Never the only place an error appears:
   * show the error in the page as well.
   */
  toast: (options: ToastOptions) => void;
}

interface ToastItem extends ToastOptions {
  id: number;
}

// The title colour supports the tone; the words carry the meaning.
const TONES: Record<ToastTone, string> = {
  neutral: "text-foreground",
  success: "text-success",
  danger: "text-danger",
};

const ToastContext = createContext<ToastApi | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  /** Milliseconds a toast stays before it closes itself. */
  duration?: number;
}

/** Wraps the app once and renders the toast viewport. */
export function ToastProvider({
  children,
  duration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  function toast(options: ToastOptions) {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current, { ...options, id }]);
  }

  function dismiss(id: number) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  return (
    <ToastContext value={{ toast }}>
      <ToastPrimitive.Provider duration={duration} swipeDirection="right">
        {children}
        {toasts.map(({ id, title, description, tone = "neutral" }) => (
          <ToastPrimitive.Root
            key={id}
            type={tone === "danger" ? "foreground" : "background"}
            data-tone={tone}
            onOpenChange={(open) => {
              if (!open) dismiss(id);
            }}
            className="flex items-start gap-3 rounded-md border border-border/60 bg-surface-raised p-4 shadow-md transition duration-250 ease-emphasis starting:translate-y-2 starting:opacity-0"
          >
            <div className="flex flex-1 flex-col gap-0.5">
              <ToastPrimitive.Title
                className={cn("text-body-sm font-medium", TONES[tone])}
              >
                {title}
              </ToastPrimitive.Title>
              {description ? (
                <ToastPrimitive.Description className="text-caption text-muted">
                  {description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-muted transition-colors duration-150 ease-standard hover:bg-surface hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="size-4"
              >
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 p-4 outline-none sm:left-auto sm:w-full sm:max-w-sm" />
      </ToastPrimitive.Provider>
    </ToastContext>
  );
}

/** `const { toast } = useToast()` inside a ToastProvider. */
export function useToast(): ToastApi {
  const context = use(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
}
