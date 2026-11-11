import Link from "next/link";

export interface NavItem {
  href: string;
  label: string;
}

export interface AppShellProps {
  /** Shown beside the wordmark, for example "Operator" or "Admin". */
  surface: string;
  /** Add an item only when its page exists. */
  nav: NavItem[];
  children: React.ReactNode;
}

/** Shared frame for the operator and admin portals: sidebar, top bar, content. */
export function AppShell({ surface, nav, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-1 bg-surface text-body-sm">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-surface-raised md:flex">
        <div className="flex h-14 items-center gap-2 px-5">
          <span className="text-title tracking-tight">Flyviman</span>
          <span className="text-caption text-muted">{surface}</span>
        </div>
        <nav aria-label={`${surface} navigation`} className="flex-1 px-3 py-2">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex h-10 items-center rounded-sm px-3 font-medium text-foreground transition-colors duration-150 ease-standard hover:bg-surface"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border/60 bg-surface-raised px-4 md:hidden">
          <span className="text-title tracking-tight">Flyviman</span>
          <span className="ml-2 text-caption text-muted">{surface}</span>
        </header>
        <main className="mx-auto w-full max-w-wide flex-1 px-4 py-8 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
