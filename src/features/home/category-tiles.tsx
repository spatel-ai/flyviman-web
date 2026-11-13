import Image from "next/image";
import Link from "next/link";
import { IMAGES, type SiteImageName } from "@/content/image-credits";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

interface Category {
  name: string;
  description: string;
  image: SiteImageName;
  /** Shown under the description; never animated or hidden. */
  notice?: string;
  /** The first two tiles are wide; the rest sit three to a row. */
  wide?: boolean;
  /** Opens the search with this service chosen. */
  href: string;
  linkLabel: string;
}

const CATEGORIES: Category[] = [
  {
    name: "Scheduled airlines",
    description: "Compare live fares across airlines.",
    image: "scheduled",
    wide: true,
    href: "/search?service=flights",
    linkLabel: "Search flights",
  },
  {
    name: "Private charter",
    description: "Aircraft matched to your route, with a clear estimate.",
    image: "charter",
    wide: true,
    href: "/search?service=charter",
    linkLabel: "Search private jets",
  },
  {
    name: "Helicopter",
    description: "Point-to-point travel between heliports and airports.",
    image: "helicopter",
    href: "/search?service=helicopter",
    linkLabel: "Search helicopters",
  },
  {
    name: "Empty-leg deals",
    description: "Repositioning flights offered at reduced prices.",
    image: "emptyLeg",
    href: "/search?service=empty-legs",
    linkLabel: "See empty legs",
  },
  {
    name: "Air ambulance",
    description: "Medical transfers coordinated by our operations team.",
    image: "airAmbulance",
    notice: "In an emergency, call 112 or your local emergency services first.",
    href: "/search?service=air-ambulance",
    linkLabel: "Request an air ambulance",
  },
];

/** The five ways to travel, each with a photograph. */
export function CategoryTiles() {
  return (
    <section
      id="ways-to-fly"
      aria-labelledby="categories-heading"
      className="mx-auto max-w-wide scroll-mt-16 px-4 py-16 md:px-6 md:py-24 lg:px-8"
    >
      <h2 id="categories-heading" className="text-h2">
        Choose how you travel
      </h2>
      <ul className="mt-8 grid gap-4 md:grid-cols-6">
        {CATEGORIES.map((category, position) => {
          const image = IMAGES[category.image];
          // Staggered per row: the two wide tiles, then the three narrow ones.
          const index = category.wide ? position : position - 2;
          // A tile with a safety notice (air ambulance) is never animated:
          // it is simply there, like the notice itself.
          const Tile = category.notice ? "div" : Reveal;
          return (
            <li
              key={category.name}
              className={category.wide ? "md:col-span-3" : "md:col-span-2"}
            >
              <Tile
                index={category.notice ? undefined : index}
                className="flex h-full flex-col overflow-hidden rounded-xl bg-surface"
              >
                <div
                  className={cn(
                    "relative aspect-3/2",
                    category.wide ? "md:aspect-video" : "md:aspect-4/3",
                  )}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    placeholder="blur"
                    sizes={
                      category.wide
                        ? "(min-width: 768px) 50vw, 100vw"
                        : "(min-width: 768px) 33vw, 100vw"
                    }
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-title">{category.name}</h3>
                  <p className="mt-2 text-body-sm text-muted">
                    {category.description}
                  </p>
                  {category.notice ? (
                    <p className="mt-3 text-body-sm font-medium text-foreground">
                      {category.notice}
                    </p>
                  ) : null}
                  <Link
                    href={category.href}
                    className="mt-4 text-body-sm font-medium text-accent hover:underline"
                  >
                    {category.linkLabel}
                  </Link>
                </div>
              </Tile>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
