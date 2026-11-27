import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountNav } from "@/features/account/account-nav";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  // A page of this section with a dynamic title (a trip's reference) needs
  // the template here: it does not reach it from the root layout.
  title: { default: "Your account", template: "%s · Flyviman" },
};

async function CustomersOnly({ children }: { children: React.ReactNode }) {
  await requireRole(["CUSTOMER"], "/account");
  return children;
}

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 md:px-6 md:py-12">
      <p className="text-h2 print:hidden">Your account</p>
      <div className="mt-6 mb-8 print:hidden">
        {/* It reads the address, which a page with a dynamic segment
            (/account/air-ambulance/[reference]) knows only at request time. */}
        <Suspense fallback={<Skeleton className="h-11" />}>
          <AccountNav />
        </Suspense>
      </div>
      {/* Shown once the session and role are confirmed. The pages get
          their data from the API, which checks the role on every request. */}
      <Suspense fallback={<Skeleton className="h-64" />}>
        <CustomersOnly>{children}</CustomersOnly>
      </Suspense>
    </div>
  );
}
