import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifyForm } from "@/features/auth/verify-form";

export const metadata: Metadata = { title: "Verify" };

export default function Page() {
  return (
    <>
      <h1 className="text-h2">Enter your code</h1>
      <div className="mt-2" />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <VerifyForm />
      </Suspense>
      <p className="mt-6 text-center text-body-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
