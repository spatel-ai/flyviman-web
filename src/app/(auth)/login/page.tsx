import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/login-form";
import { RedirectIfSignedIn } from "@/features/auth/redirect-if-signed-in";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="text-h2">Sign in</h1>
      <p className="mt-2 mb-6 text-muted">
        Use the email and password for your Flyviman account.
      </p>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 border-t border-border/60 pt-6 text-center text-body-sm text-muted">
        New to Flyviman?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
