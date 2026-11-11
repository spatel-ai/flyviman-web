import { Reveal } from "@/components/motion/reveal";

const POINTS = [
  {
    title: "Every price is labelled",
    description:
      "You always know whether you are looking at an estimate, a live fare, a quote or a confirmed price.",
  },
  {
    title: "A request stays a request",
    description:
      "Charter, helicopter and air ambulance bookings are confirmed only after the operator accepts.",
  },
  {
    title: "Operators are checked",
    description:
      "Our team reviews each operator's certificate and insurance before their aircraft can be offered.",
  },
];

/** What a customer can rely on, stated plainly. */
export function TrustStrip() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8"
    >
      <h2 id="trust-heading" className="text-h2">
        Clear at every step
      </h2>
      <ul className="mt-8 grid gap-8 md:grid-cols-3">
        {POINTS.map((point, index) => (
          <li key={point.title}>
            <Reveal index={index} className="border-t border-border pt-6">
              <h3 className="text-title">{point.title}</h3>
              <p className="mt-2 text-body-sm text-muted">
                {point.description}
              </p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
