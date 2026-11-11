import { Card } from "@/components/ui/card";

const CATEGORIES = [
  {
    name: "Scheduled airlines",
    description: "Compare live fares across airlines.",
  },
  {
    name: "Private charter",
    description: "Aircraft matched to your route, with a clear estimate.",
  },
  {
    name: "Helicopter",
    description: "Point-to-point travel between heliports and airports.",
  },
  {
    name: "Empty-leg deals",
    description: "Repositioning flights offered at reduced prices.",
  },
  {
    name: "Air ambulance",
    description: "Medical transfers coordinated by our operations team.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-content px-4 pt-16 pb-12 text-center md:px-6 md:pt-24 md:pb-16 lg:px-8">
        <h1 className="text-h1 md:text-display">
          Every way to fly.
          <br />
          One place to book.
        </h1>
        <p className="mx-auto mt-5 max-w-reading text-body-lg text-muted">
          Scheduled flights, private charters, helicopters, empty legs and air
          ambulance transfers, compared side by side.
        </p>
      </section>

      <section
        aria-labelledby="categories-heading"
        className="bg-surface py-16 md:py-24"
      >
        <div className="mx-auto max-w-wide px-4 md:px-6 lg:px-8">
          <h2 id="categories-heading" className="text-h2">
            Choose how you travel
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => (
              <li key={category.name}>
                <Card variant="raised" className="h-full">
                  <h3 className="text-title">{category.name}</h3>
                  <p className="mt-2 text-body-sm text-muted">
                    {category.description}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
