import type { Metadata } from "next";
import { RequestDetail } from "@/features/operator-requests/request-detail";
import { RequestsAccess } from "@/features/operator-requests/requests-access";

export const metadata: Metadata = { title: "Request" };

export default async function OperatorRequestPage({
  params,
}: PageProps<"/operator/requests/[reference]">) {
  const { reference } = await params;
  return (
    <RequestsAccess title="Request">
      <RequestDetail reference={reference} />
    </RequestsAccess>
  );
}
