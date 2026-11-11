import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Schemas } from "@/lib/api/types";

type Policy = Schemas["PolicyResponseDto"];

const POLICIES = ["terms", "privacy"];

export const metadata: Metadata = { title: "Policy" };

// Policies are public and change rarely, so they can be cached. Prices,
// availability and statuses never are.
async function getPolicy(slug: string): Promise<Policy | null> {
  "use cache";
  cacheLife("hours");
  try {
    return (
      await apiFetch<Policy>(`content/policies/${encodeURIComponent(slug)}`)
    ).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function PolicyText({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Only real policies are looked up, so made-up slugs cannot fill the cache.
  if (!POLICIES.includes(slug)) notFound();
  const policy = await getPolicy(slug);
  if (!policy) notFound();

  return (
    <article>
      <h1 className="text-h1">{policy.title}</h1>
      <p className="mt-2 text-body-sm text-muted">Version {policy.version}</p>
      <div className="mt-8 flex flex-col gap-4 text-body-lg">
        {policy.body.split(/\n{2,}/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

export default function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  return (
    <div className="mx-auto w-full max-w-reading px-4 py-12 md:px-6 md:py-16">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <PolicyText params={params} />
      </Suspense>
    </div>
  );
}
