import {
  Ambulance,
  Fan,
  TicketsPlane,
  Timer,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { IMAGES } from "@/content/image-credits";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button-classes";

interface Tile {
  name: string;
  description: string;
  icon: LucideIcon;
  /** Opens the search with this service chosen. */
  href: string;
  /** Not bookable yet: said on the tile, never hidden (business rule 4). */
  soon?: boolean;
  /** Shown under the tile; never animated or hidden (business rule 7). */
  notice?: string;
}

const TILES: Tile[] = [
  {
    name: "Helicopter",
    description: "Between heliports and airports.",
    icon: Fan,
    href: "/search?service=helicopter",
  },
  {
    name: "Empty legs",
    description: "Repositioning flights at reduced prices.",
    icon: Timer,
    href: "/search?service=empty-legs",
    soon: true,
  },
  {
    name: "Scheduled flights",
    description: "Compare live fares across airlines.",
    icon: TicketsPlane,
    href: "/search?service=flights",
    soon: true,
  },
  {
    name: "Air ambulance",
    description: "Medical transfers coordinated by our operations team.",
    icon: Ambulance,
    href: "/search?service=air-ambulance",
    notice: "In an emergency, call 112 or your local emergency services first.",
  },
];

const photo = IMAGES.charter;

/** Charter leads: one large card, then the four other ways to travel. */
export function CategoryTiles() {
  return (
    <section
      id="ways-to-fly"
      aria-labelledby="categories-heading"
      className="mx-auto max-w-wide scroll-mt-16 px-4 pb-16 md:px-6 md:pb-24 lg:px-8"
    >
      <h2 id="categories-heading" className="text-h2">
        Choose how you travel
      </h2>
      <Reveal className="relative mt-8 flex aspect-4/3 flex-col justify-end overflow-hidden rounded-xl bg-surface md:aspect-3/1">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          placeholder="blur"
          sizes="(min-width: 1200px) 1136px, 100vw"
          className="object-cover"
        />
        {/* Two layers of the scrim, so white text stays legible on a light photograph. */}
        <div aria-hidden="true" className="absolute inset-0 bg-scrim" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-scrim to-transparent"
        />
        <div className="relative p-6 text-on-photo md:p-10">
          <h3 className="text-h3">Private charter</h3>
          <p className="mt-2 max-w-reading text-body">
            Aircraft matched to your route, with a clear estimate.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href="/search?service=charter"
              className={buttonClasses({ size: "md" })}
            >
              Search charter
            </Link>
            <Link
              href="/charter"
              className="inline-flex min-h-11 items-center text-body font-medium underline underline-offset-4"
            >
              About charter
            </Link>
          </div>
        </div>
      </Reveal>
      <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {TILES.map((tile, index) => {
          const Icon = tile.icon;
          const body = (
            <div
              className={
                tile.notice
                  ? "flex h-full flex-col rounded-xl bg-surface p-5"
                  : "flex h-full flex-col rounded-xl bg-surface p-5 transition-colors duration-150 ease-standard hover:bg-border/60"
              }
            >
              <Link
                href={tile.href}
                className="flex min-h-11 flex-1 flex-col items-start"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 items-center justify-center rounded-pill bg-accent/10 text-accent"
                >
                  <Icon className="size-6" strokeWidth={1.5} />
                </span>
                <h3 className="mt-4 text-title">{tile.name}</h3>
                <p className="mt-1 text-body-sm text-muted">
                  {tile.description}
                </p>
                {tile.soon ? (
                  <span className="mt-2 text-caption font-medium text-muted">
                    Coming soon
                  </span>
                ) : null}
              </Link>
              {tile.notice ? (
                <p className="mt-3 text-body-sm font-medium text-foreground">
                  {tile.notice}
                </p>
              ) : null}
            </div>
          );
          return (
            <li key={tile.name}>
              {/* The air ambulance tile is never animated: no reveal, no
                  hover transition. It is simply there, like its notice. */}
              {tile.notice ? (
                body
              ) : (
                <Reveal index={index} className="h-full">
                  {body}
                </Reveal>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
