"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card } from "@/components/ui/card";

export interface LockedNext {
  href: string;
  label: string;
}

/**
 * The one pattern for a page a signed-in user cannot use: what it is, why
 * (the cause), and one next step. It only explains a refusal; the API is
 * the authority and refuses the same calls whatever this shows.
 */
export function LockedState({
  title,
  heading,
  reason,
  next,
}: {
  /** The page's own title. Omit it where the page already shows one. */
  title?: string;
  /** What is the case, for example "Managed by your administrator". */
  heading: string;
  /** Why, in a sentence that fits the cause. */
  reason: string;
  /** The one thing to do instead. */
  next: LockedNext;
}) {
  return (
    <>
      {title ? <h1 className="text-h2">{title}</h1> : null}
      <Card variant="raised" className="mt-6" data-testid="locked-state">
        <h2 className="text-title">{heading}</h2>
        <p className="mt-2 max-w-reading text-muted">{reason}</p>
        <Link
          href={next.href}
          className={buttonClasses({
            variant: "secondary",
            size: "sm",
            className: "mt-4",
          })}
        >
          {next.label}
        </Link>
      </Card>
    </>
  );
}

/** The signed-in portal's home, taken from the address. */
export function homeOf(pathname: string): LockedNext {
  if (pathname.startsWith("/admin"))
    return { href: "/admin", label: "Back to dashboard" };
  if (pathname.startsWith("/operator"))
    return { href: "/operator", label: "Back to dashboard" };
  return { href: "/account", label: "Back to your account" };
}

/** For a refusal the API sent back (403) where the page cannot know the cause. */
export function ForbiddenState() {
  const pathname = usePathname();
  return (
    <LockedState
      heading="Not part of your role"
      reason={
        pathname.startsWith("/operator")
          ? "Your access does not include this page. Ask your administrator if you need it."
          : "Your role does not include this page. Ask a super administrator if you need it."
      }
      next={homeOf(pathname)}
    />
  );
}

/** Staff of an operator that is not approved yet, or a page that waits for approval. */
export function NotApprovedState({ title }: { title?: string }) {
  return (
    <LockedState
      title={title}
      heading="Available once you are approved"
      reason="Flyviman approves your organisation after reviewing your company details and documents. This page opens then."
      next={{ href: "/operator/onboarding", label: "Company and documents" }}
    />
  );
}
