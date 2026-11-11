"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Moves to another page from inside a streamed page, without a reload.
 *
 * `redirect()` called after streaming has started makes Next.js add a
 * `<meta http-equiv="refresh">` tag as well as navigating on the client, so
 * the destination is loaded a second time a moment later and anything the
 * visitor has started there is lost. Use this instead when the destination
 * is a page people type into. Without JavaScript the link is shown.
 */
export function ClientRedirect({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return (
    <p className="text-muted">
      <Link href={href} replace className="text-accent hover:underline">
        {label}
      </Link>
    </p>
  );
}
