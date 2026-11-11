"use client";

import { Button } from "@/components/ui/button";

/**
 * Shown when a page fails to render, for example because the API could not
 * be reached. The error itself is never shown to the visitor.
 */
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-h2">Something went wrong</h1>
      <p className="max-w-reading text-muted">
        We could not load this page. Try again in a moment.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
