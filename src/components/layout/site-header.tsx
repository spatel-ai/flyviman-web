import Link from "next/link";

/** Customer-surface navigation: translucent, sticky, minimal. */
export function SiteHeader() {
  return (
    <header className="material-bar sticky top-0 z-40 border-b border-border/60">
      <div className="mx-auto flex h-12 max-w-wide items-center justify-between px-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="text-title tracking-tight"
          aria-label="Flyviman home"
        >
          Flyviman
        </Link>
      </div>
    </header>
  );
}
