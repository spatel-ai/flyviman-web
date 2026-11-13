"use client";

import { useSyncExternalStore, type ButtonHTMLAttributes } from "react";
import { buttonClasses, type Size, type Variant } from "./button-classes";

const subscribe = () => () => {};

/**
 * False in the server-rendered HTML and until React has taken over the
 * page; true after. A submit button stays disabled until then (D-095):
 * clicked earlier, the browser would send the form itself, as a GET to the
 * same address, putting every field (passwords, passenger details) into
 * the URL, where history and server logs keep it. While the default button
 * is disabled, pressing Enter in a field does not submit either.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows progress and blocks repeat submission. */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const hydrated = useHydrated();
  return (
    <button
      type={type}
      disabled={disabled || loading || (type === "submit" && !hydrated)}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
