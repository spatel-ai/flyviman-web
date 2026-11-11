import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { AuthShowcase } from "@/features/auth/auth-showcase";

/**
 * Sign-in and registration pages: one card, styled like a boarding pass.
 * On wide screens a photograph sits beside it.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="mx-auto flex h-14 w-full max-w-wide items-center justify-between px-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="text-title tracking-tight"
          aria-label="Flyviman home"
        >
          Flyviman
        </Link>
        <ThemeSwitch />
      </header>
      <div className="mx-auto grid w-full max-w-wide flex-1 gap-8 px-4 pb-8 md:px-6 lg:grid-cols-2 lg:px-8 lg:pb-12">
        <AuthShowcase />
        <main className="flex items-start justify-center py-8 md:py-16">
          <div className="w-full max-w-md self-start rounded-xl bg-surface-raised p-6 shadow-md md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
