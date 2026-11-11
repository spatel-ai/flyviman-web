import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/theme-switch";

/** Sign-in and registration pages: one centred card, nothing else. */
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
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:py-16">
        <div className="w-full max-w-md rounded-lg bg-surface-raised p-6 shadow-md md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
