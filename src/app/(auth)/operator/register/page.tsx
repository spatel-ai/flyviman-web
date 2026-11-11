import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OperatorRegisterForm } from "@/features/auth/operator-register-form";

export const metadata: Metadata = { title: "Register as an operator" };

export default function Page() {
  return (
    <>
      <h1 className="text-h2">Register your company</h1>
      <p className="mt-2 mb-6 text-muted">
        Create your operator account, then add your company details and
        compliance documents for review.
      </p>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <OperatorRegisterForm />
      </Suspense>
      <p className="mt-6 border-t border-border/60 pt-6 text-center text-body-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
