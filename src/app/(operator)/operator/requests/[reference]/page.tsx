import type { Metadata } from "next";
import { RequestDetail } from "@/features/operator-requests/request-detail";
import { RequestsAccess } from "@/features/operator-requests/requests-access";

export async function generateMetadata({
  params,
}: PageProps<"/operator/requests/[reference]">): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `Request ${reference}`,
  };
}

export default async function OperatorRequestPage({
  params,
}: PageProps<"/operator/requests/[reference]">) {
  const { reference } = await params;
  return (
    <RequestsAccess title="Request" approvedOnly={false}>
      <RequestDetail reference={reference} />
    </RequestsAccess>
  );
}
