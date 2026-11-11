import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function Page() {
  return (
    <>
      <h1 className="text-h2">Forgot your password?</h1>
      <p className="mt-2 mb-6 text-muted">
        Enter the email for your account and we will send a link to choose a new
        one.
      </p>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <ForgotPasswordForm />
      </Suspense>
      <p className="mt-6 border-t border-border/60 pt-6 text-center text-body-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
