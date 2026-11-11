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
 * The route arc: Flyviman's one illustration motif. Drawn here in its final
 * state; the signature animation (M2, phase 3) draws it as the page scrolls.
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

/** From search to flight in four steps. */
export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="bg-surface py-16 md:py-24"
    >
      <div className="mx-auto max-w-wide px-4 md:px-6 lg:px-8">
        <h2 id="how-heading" className="text-h2">
          From search to sky
        </h2>
        <div className="mx-auto mt-10 max-w-content">
          <RouteArc />
        </div>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.name}>
              <p className="text-overline text-accent tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-title">{step.name}</h3>
              <p className="mt-2 text-body-sm text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
