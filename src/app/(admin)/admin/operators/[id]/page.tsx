import type { Metadata } from "next";
import { Suspense } from "react";
import {
  OperatorDetail,
  OperatorDetailSkeleton,
} from "@/features/admin-operators/operator-detail";

export const metadata: Metadata = { title: "Operator" };

// The id is only known at request time, so it is read inside Suspense.
async function Operator({
  params,
}: Pick<PageProps<"/admin/operators/[id]">, "params">) {
  const { id } = await params;
  return <OperatorDetail id={id} />;
}

export default function AdminOperatorPage({
  params,
}: PageProps<"/admin/operators/[id]">) {
  return (
    <Suspense fallback={<OperatorDetailSkeleton />}>
      <Operator params={params} />
    </Suspense>
  );
}
