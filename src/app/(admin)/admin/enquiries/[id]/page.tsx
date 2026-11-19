import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnquiryDetail } from "@/features/admin-enquiries/enquiry-detail";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiry" };

export default async function AdminEnquiryPage({
  params,
}: PageProps<"/admin/enquiries/[id]">) {
  const { id } = await params;
  // Only a UUID may reach the API path built from this id.
  if (!isUuid(id)) notFound();
  return <EnquiryDetail id={id} />;
}
