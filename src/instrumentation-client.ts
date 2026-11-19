import { z } from "zod";

// Runs before the app hydrates. Zod otherwise probes for `eval` with
// `new Function("")` on its first object parse; the strict
// Content-Security-Policy (lib/csp.ts) blocks it and reports a violation
// even though Zod catches the error. Jitless mode skips the probe.
z.config({ jitless: true });
