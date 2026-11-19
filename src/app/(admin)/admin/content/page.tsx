import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentManager } from "@/features/admin-content/content-manager";

export const metadata: Metadata = { title: "Content" };

export default function AdminContentPage() {
  return (
    <>
      <h1 className="text-h2">Content</h1>
      <p className="mt-2 max-w-reading text-body text-muted">
        Banners, questions and answers, policies and notification wording. Every
        change is recorded in the audit trail.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <ContentManager />
      </Suspense>
    </>
  );
}
