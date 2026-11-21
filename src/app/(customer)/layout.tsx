import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteTabBar } from "@/components/layout/site-tab-bar";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-accent-fill focus:px-4 focus:py-2 focus:text-body-sm focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        {children}
      </main>
      <SiteFooter />
      <SiteTabBar />
    </>
  );
}
