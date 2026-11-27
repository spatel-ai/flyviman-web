import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { HERO_V1_SCRIPT } from "@/features/home-v1/hero-script";
import { HERO_SCRIPT, STILL_POSTER_SCRIPT } from "@/features/home/hero-script";

/**
 * Our own inline scripts. The prerendered pages' policy allows inline
 * scripts in general (lib/csp.ts); a page given a nonce-based policy must
 * list these hashes in it, or they are blocked.
 */
export const INLINE_SCRIPTS = [
  THEME_SCRIPT,
  HERO_SCRIPT,
  STILL_POSTER_SCRIPT,
  HERO_V1_SCRIPT,
];

/** The CSP source that allows an inline script with exactly this text. */
export async function scriptHashSource(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`;
}

/** Hash sources of INLINE_SCRIPTS. */
export function inlineScriptHashes(): Promise<string[]> {
  return Promise.all(INLINE_SCRIPTS.map(scriptHashSource));
}
