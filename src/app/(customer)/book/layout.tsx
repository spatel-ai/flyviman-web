import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/session";

async function CustomersOnly({ children }: { children: React.ReactNode }) {
  await requireRole(["CUSTOMER"], "/account/trips");
  return children;
}

export default function BookLayout({ children }: LayoutProps<"/book">) {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 md:px-6 md:py-12">
      <Suspense fallback={<Skeleton className="h-[75rem] md:h-[64rem]" />}>
        <CustomersOnly>{children}</CustomersOnly>
      </Suspense>
    </div>
  );
}
