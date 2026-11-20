import { useRef } from "react";

/**
 * A random key for one attempt. `crypto.randomUUID` exists only on secure
 * pages (https or localhost); a phone testing over a local network address
 * gets the same format from `getRandomValues`.
 */
export function newKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10),
  ]
    .map((part) => part.join(""))
    .join("-");
}

/**
 * The Idempotency-Key for a money-moving or booking-creating request. The
 * same body keeps the same key, so a retry after a lost answer cannot create
 * a second booking; a changed body gets a new one (the API refuses one key
 * with two bodies). Call `rotate` after a definitive answer from the API.
 */
export function useAttemptKey() {
  const last = useRef<{ body: string; key: string } | null>(null);
  return {
    keyFor(body: unknown): string {
      const text = JSON.stringify(body ?? null);
      if (last.current?.body !== text) {
        last.current = { body: text, key: newKey() };
      }
      return last.current.key;
    },
    rotate() {
      last.current = null;
    },
  };
}
