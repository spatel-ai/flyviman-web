import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { HOME } from "@/content/home";
import { SectionHeading } from "./section-heading";

/** The route arc, Flyviman's one illustration motif, as a quiet backdrop. */
function Arc() {
  return (
    <svg viewBox="0 0 400 120" aria-hidden="true" className="w-full">
      <path
        d="M20 110 Q200 -40 380 110"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-border"
      />
      <circle cx="20" cy="110" r="4" className="fill-border" />
      <circle cx="380" cy="110" r="4" className="fill-border" />
    </svg>
  );
}

/**
 * The three charter kinds the company leads with. Typographic until
 * Flyviman supplies photographs that meet the imagery rules
 * (docs/open-decisions.md).
 */
export function LuxuryCharter() {
  const { overline, heading, lead, cards } = HOME.charter;
  return (
    <section
      aria-labelledby="charter-heading"
      className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8"
    >
      <div className="max-w-content">
        <SectionHeading id="charter-heading" overline={overline}>
          {heading}
        </SectionHeading>
        <p className="mt-5 max-w-reading text-body-lg text-muted">{lead}</p>
      </div>
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {cards.map((name, index) => (
          <li key={name}>
            <Reveal index={index} className="h-full">
              <TiltCard className="flex h-full flex-col justify-between gap-12 rounded-xl bg-surface p-6 md:p-8">
                <Arc />
                <h3 className="text-h3">{name}</h3>
              </TiltCard>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
