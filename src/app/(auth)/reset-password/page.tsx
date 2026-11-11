import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a password" };

export default function Page() {
  return (
    <>
      <h1 className="text-h2">Choose a password</h1>
      <div className="mt-2 mb-6" />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
