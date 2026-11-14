"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { shortRupees } from "@/components/booking/format";
import {
  SearchWidget,
  type Service,
  type WidgetInitial,
} from "@/components/booking/search-widget";
import { Reveal } from "@/components/motion/reveal";
import { IMAGES } from "@/content/image-credits";
import { areaOf, SEARCH_LANDING } from "@/content/search";
import { useLocationByCode, useRouteFare } from "./use-route-fare";

const SERVICES: Service[] = [
  "charter",
  "helicopter",
  "empty-legs",
  "flights",
  "air-ambulance",
];

function initialFrom(params: URLSearchParams): WidgetInitial {
  const service = params.get("service");
  return SERVICES.includes(service as Service)
    ? { service: service as Service }
    : {};
}

/**
 * The hero with the search card over it, popular routes and aircraft
 * classes. Choosing a route or a class fills the card and brings it into
 * view; nothing searches until the visitor asks.
 */
export function SearchLanding() {
  const params = useSearchParams();
  const [initial, setInitial] = useState<WidgetInitial>(() =>
    initialFrom(params),
  );
  const [version, setVersion] = useState(0);
  const widget = useRef<HTMLDivElement>(null);

  function prefill(next: WidgetInitial) {
    setInitial(next);
    setVersion((value) => value + 1);
    widget.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const { hero, popularRoutes, aircraft } = SEARCH_LANDING;

  return (
    <>
      <section aria-labelledby="search-hero" className="relative">
        <div className="relative h-112 overflow-hidden md:h-136">
          <Image
            src={IMAGES.hero.src}
            alt={IMAGES.hero.alt}
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-scrim/40 via-scrim/20 to-scrim" />
          {/* The photo fades into the page behind the card's top (the card
              overlaps by -mt-28), instead of ending in a hard line. Kept
              below the hero text, which stays on the darkened photo. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-b from-transparent to-background"
          />
          <div className="relative mx-auto flex h-full w-full max-w-wide flex-col justify-center px-4 pb-24 md:px-6">
            <p className="text-overline text-on-photo/80 uppercase">
              {hero.overline}
            </p>
            <h1
              id="search-hero"
              className="mt-3 max-w-3xl text-display text-on-photo"
            >
              {hero.title}
            </h1>
            <p className="mt-4 max-w-reading text-body-lg text-on-photo/90">
              {hero.lead}
            </p>
          </div>
        </div>
        <div
          ref={widget}
          className="relative mx-auto -mt-28 w-full max-w-wide scroll-mt-24 px-4 md:px-6"
        >
          <SearchWidget key={version} initial={initial} />
        </div>
      </section>

      <section
        aria-labelledby="popular-routes"
        className="mx-auto w-full max-w-wide px-4 pt-20 md:px-6"
      >
        <h2 id="popular-routes" className="text-h2">
          {popularRoutes.title}
        </h2>
        <p className="mt-2 text-body text-muted">{popularRoutes.lead}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularRoutes.routes.map((route, index) => (
            <li key={`${route.from}-${route.to}`}>
              <Reveal index={index % 3} className="h-full">
                <RouteCard
                  from={route.from}
                  to={route.to}
                  image={route.image}
                  onChoose={(originId, destinationId) =>
                    prefill({ service: "charter", originId, destinationId })
                  }
                />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="aircraft-classes"
        className="mx-auto w-full max-w-wide px-4 pt-20 md:px-6"
      >
        <h2 id="aircraft-classes" className="text-h2">
          {aircraft.title}
        </h2>
        <p className="mt-2 text-body text-muted">{aircraft.lead}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {aircraft.classes.map((entry, index) => {
            const image = IMAGES[entry.image];
            return (
              <li key={entry.category}>
                <Reveal index={index % 5} className="h-full">
                  <button
                    type="button"
                    onClick={() =>
                      prefill(
                        entry.category === "HELICOPTER"
                          ? { service: "helicopter" }
                          : { service: "charter", category: entry.category },
                      )
                    }
                    className="group flex h-full w-full flex-col overflow-hidden rounded-xl bg-surface text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="relative aspect-4/3 w-full overflow-hidden">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        placeholder="blur"
                        sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-450 ease-emphasis group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-5">
                      <span className="text-title">{entry.name}</span>
                      <span className="text-body-sm text-muted">
                        {entry.seats}
                      </span>
                      <span className="text-body-sm text-muted">
                        {entry.range}
                      </span>
                      <span className="mt-2 text-body-sm">{entry.use}</span>
                    </div>
                  </button>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function RouteCard({
  from,
  to,
  image,
  onChoose,
}: {
  from: string;
  to: string;
  image: keyof typeof IMAGES;
  onChoose: (originId: string, destinationId: string) => void;
}) {
  const origin = useLocationByCode(from).data;
  const destination = useLocationByCode(to).data;
  const fare = useRouteFare(origin?.id, destination?.id).data;
  const photo = IMAGES[image];
  const ready = Boolean(origin && destination);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() =>
        origin && destination && onChoose(origin.id, destination.id)
      }
      className="group relative flex aspect-4/3 w-full overflow-hidden rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait"
    >
      <Image
        src={photo.src}
        alt=""
        fill
        placeholder="blur"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-450 ease-emphasis group-hover:scale-105"
      />
      {/* Two scrims, as on the hero (globals.css): solid under the text, so
          white text stays at least 4.5:1 even over a white fuselage (one
          40% scrim gave about 2.8:1); the top of the photo stays clear. */}
      <span className="absolute inset-0 bg-linear-to-t from-scrim from-40% to-transparent" />
      <span className="absolute inset-0 bg-linear-to-t from-scrim via-scrim/20 to-transparent" />
      <span className="relative mt-auto flex w-full items-end justify-between gap-3 p-5 text-on-photo">
        <span className="flex flex-col">
          {/* Place names from content, so the title reads "Mumbai → Goa"
              even before (or without) the API answering; codes below. */}
          <span className="text-title">
            {areaOf(from)}{" "}
            <ArrowRight aria-hidden="true" className="inline size-4" />{" "}
            {areaOf(to)}
          </span>
          <span className="text-body-sm text-on-photo/80">
            {from} to {to}
          </span>
        </span>
        <span className="flex flex-col items-end">
          {fare != null ? (
            <>
              <span className="text-caption text-on-photo/80">
                Estimate from
              </span>
              <span className="text-title tabular-nums">
                {shortRupees(fare)}
              </span>
            </>
          ) : (
            <span className="text-body-sm text-on-photo/80">See options</span>
          )}
        </span>
      </span>
    </button>
  );
}
