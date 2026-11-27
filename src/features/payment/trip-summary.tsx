import { Card } from "@/components/ui/card";
import type { Schemas } from "@/lib/api/types";
import { categoryLabel } from "@/lib/format/aircraft";
import { formatDateTime } from "@/lib/format/date";

type Booking = Schemas["BookingResponseDto"];

/** What is being paid for, in the words of the trip page. */
export function TripSummary({ booking }: { booking: Booking }) {
  const { itinerary } = booking;
  const { aircraft, passengerCount } = itinerary;
  return (
    <Card className="flex flex-col gap-3" aria-label="Trip summary">
      <h2 className="text-title">Your trip</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
        {itinerary.legs.map((leg, index) => (
          <div key={`${leg.originId}-${leg.departureAt}`} className="contents">
            <dt className="text-muted">
              {itinerary.legs.length > 1 ? `Leg ${index + 1}` : "Route"}
            </dt>
            <dd>
              {leg.originName} to {leg.destinationName}
              <span className="block text-muted">
                {itinerary.emptyLeg
                  ? `Between ${formatDateTime(leg.departureAt)} and ${formatDateTime(itinerary.emptyLeg.departureTo)}`
                  : formatDateTime(leg.departureAt)}
              </span>
            </dd>
          </div>
        ))}
        <dt className="text-muted">Aircraft</dt>
        <dd>
          {aircraft.manufacturer} {aircraft.model} ·{" "}
          {categoryLabel(aircraft.category)}
        </dd>
        <dt className="text-muted">Passengers</dt>
        <dd>{passengerCount}</dd>
        <dt className="text-muted">Reference</dt>
        <dd>{booking.reference}</dd>
      </dl>
    </Card>
  );
}
