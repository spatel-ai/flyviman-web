import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyLegDetail } from "@/features/empty-legs/empty-leg-detail";

export const metadata: Metadata = {
  title: "Empty leg offer",
  robots: { index: false },
};

async function Detail({
  params,
}: Pick<PageProps<"/empty-legs/[id]">, "params">) {
  const { id } = await params;
  return <EmptyLegDetail id={id} />;
}

export default function Page({ params }: PageProps<"/empty-legs/[id]">) {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-wide px-4 py-16 md:px-6">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Detail params={params} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
