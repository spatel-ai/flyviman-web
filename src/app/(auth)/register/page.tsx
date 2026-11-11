import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return (
    <>
      <h1 className="text-h2">Create your account</h1>
      <p className="mt-2 mb-6 text-muted">
        Flying for a company that operates aircraft?{" "}
        <Link href="/operator/register" className="text-accent hover:underline">
          Register as an operator
        </Link>
      </p>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <RegisterForm />
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
