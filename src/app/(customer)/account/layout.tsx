import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountNav } from "@/features/account/account-nav";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Your account" };

async function CustomersOnly({ children }: { children: React.ReactNode }) {
  await requireRole(["CUSTOMER"], "/account");
  return children;
}

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 md:px-6 md:py-12">
      <p className="text-h2">Your account</p>
      <div className="mt-6 mb-8">
        <AccountNav />
      </div>
      {/* Shown once the session and role are confirmed. The pages get
          their data from the API, which checks the role on every request. */}
      <Suspense fallback={<Skeleton className="h-64" />}>
        <CustomersOnly>{children}</CustomersOnly>
      </Suspense>
    </div>
  );
}
