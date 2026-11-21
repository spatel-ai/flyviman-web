import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/**
 * A dashboard tile that links to the list it counts. The figure and its
 * caption are one link, so the whole tile is the target.
 */
export function StatTile({
  href,
  label,
  value,
  caption,
}: {
  href: string;
  label: string;
  value: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <Link href={href} className="block rounded-lg focus-visible:outline-2">
      <Card variant="interactive" className="h-full">
        <p className="text-body-sm text-muted">{label}</p>
        <p className="mt-2 text-h2 tabular-nums">{value}</p>
        {caption ? (
          <p className="mt-1 text-body-sm text-muted">{caption}</p>
        ) : null}
      </Card>
    </Link>
  );
}
