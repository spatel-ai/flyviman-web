import { Badge } from "@/components/ui/badge";
import { statusPresentation } from "@/lib/air-ambulance/labels";
import { formatDateTime } from "@/lib/format/date";

/** An air ambulance request's status; says "request" until CONFIRMED. */
export function AirAmbulanceStatusBadge({ status }: { status: string }) {
  const { label, tone } = statusPresentation(status);
  return <Badge tone={tone}>{label}</Badge>;
}

/** The status changes, oldest first. */
export function AirAmbulanceTimeline({
  entries,
}: {
  entries: { status: string; at: string }[];
}) {
  return (
    <ol aria-label="Timeline" className="flex flex-col gap-3">
      {entries.map((entry, index) => (
        <li
          key={`${entry.status}-${entry.at}-${index}`}
          className="flex flex-wrap items-center gap-3"
        >
          <AirAmbulanceStatusBadge status={entry.status} />
          <span className="text-body-sm text-muted">
            {formatDateTime(entry.at)}
          </span>
        </li>
      ))}
    </ol>
  );
}
