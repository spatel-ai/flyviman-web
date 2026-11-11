import type { Role } from "@/lib/api/types";
import { MobileNav } from "./mobile-nav";
import { NavLinks, type NavItem } from "./nav-links";
import { UserMenu } from "./user-menu";

export type { NavItem };

export interface AppShellProps {
  /** Shown beside the wordmark, for example "Operator" or "Admin". */
  surface: string;
  /** Add an item only when its page exists. Already filtered by role. */
  nav: NavItem[];
  user: { name: string; role: Role };
  children: React.ReactNode;
}

/** Shared frame for the operator and admin portals: sidebar, top bar, content. */
export function AppShell({ surface, nav, user, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-1 bg-surface text-body-sm">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-surface-raised md:flex">
        <div className="flex h-14 items-center gap-2 px-5">
          <span className="text-title tracking-tight">Flyviman</span>
          <span className="text-caption text-muted">{surface}</span>
        </div>
        <nav aria-label={`${surface} navigation`} className="flex-1 px-3 py-2">
          <NavLinks items={nav} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border/60 bg-surface-raised px-2 md:justify-end md:px-6">
          <div className="md:hidden">
            <MobileNav surface={surface} items={nav} />
          </div>
          <div className="flex flex-1 items-center gap-2 md:hidden">
            <span className="text-title tracking-tight">Flyviman</span>
            <span className="text-caption text-muted">{surface}</span>
          </div>
          <UserMenu name={user.name} role={user.role} />
        </header>
        <main className="mx-auto w-full max-w-wide flex-1 px-4 py-8 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Shown while the session is being checked, in place of the real shell. */
export function AppShellSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-1 bg-surface"
      role="status"
      aria-label="Loading"
    >
      <div className="hidden w-60 shrink-0 border-r border-border/60 bg-surface-raised md:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b border-border/60 bg-surface-raised" />
      </div>
    </div>
  );
}
