/**
 * The tear line of a boarding pass: a dashed rule with a notch cut into each
 * edge of the card. Purely decorative. The notches take the page's surface
 * colour, so it must sit directly inside the auth card (`p-6 md:p-8`).
 */
export function TicketDivider() {
  return (
    <div aria-hidden="true" className="relative -mx-6 my-6 md:-mx-8">
      <div className="mx-5 border-t-2 border-dashed border-border/70" />
      <span className="absolute top-1/2 left-0 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface" />
      <span className="absolute top-1/2 right-0 size-5 translate-x-1/2 -translate-y-1/2 rounded-full bg-surface" />
    </div>
  );
}
