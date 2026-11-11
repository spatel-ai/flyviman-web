import { Reveal } from "@/components/motion/reveal";

const STEPS = [
  {
    name: "Search",
    description: "Tell us where and when. One search covers every way to fly.",
  },
  {
    name: "Compare",
    description:
      "See options side by side, each price labelled as an estimate, a live fare or a quote.",
  },
  {
    name: "Request",
    description:
      "Send your request. Charter and helicopter trips are confirmed only once the operator accepts.",
  },
  {
    name: "Fly",
    description: "Your confirmation, documents and updates stay in one place.",
  },
];

/**
 * The route arc: Flyviman's one illustration motif. Rendered in its final
 * state; on wide screens the cover (`route-story__wipe`, globals.css) shrinks
 * as the page scrolls, so the arc appears to draw itself.
 */
function RouteArc() {
  return (
    <figure>
      <svg viewBox="0 0 800 220" aria-hidden="true" className="w-full">
        <path
          d="M40 200 Q400 -60 760 200"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-accent"
        />
        <circle cx="40" cy="200" r="6" className="fill-accent" />
        <circle cx="760" cy="200" r="6" className="fill-accent" />
        <rect
          x="52"
          y="-10"
          width="760"
          height="240"
          className="route-story__wipe fill-surface"
        />
      </svg>
      <figcaption className="mt-3 flex justify-between text-title tabular-nums">
        <span>
          BOM <span className="sr-only">(Mumbai)</span>
        </span>
        <span className="sr-only">to</span>
        <span>
          GOI <span className="sr-only">(Goa)</span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * From search to flight in four steps. The home page's story section (motion
 * level 5): pinned on wide screens while the arc draws and the steps light up
 * in turn (globals.css, `.route-story`); a plain section everywhere else.
 */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="route-story bg-surface">
      <div className="route-story__stage mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <h2 id="how-heading" className="text-h2">
          From search to sky
        </h2>
        <Reveal className="mx-auto mt-10 w-full max-w-content">
          <RouteArc />
        </Reveal>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.name} className="route-story__step">
              <Reveal index={index}>
                <p className="text-overline text-accent tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-title">{step.name}</h3>
                <p className="mt-2 text-body-sm text-muted">
                  {step.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
