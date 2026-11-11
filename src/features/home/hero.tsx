import Image from "next/image";
import { IMAGES } from "@/content/image-credits";

/** Headline, one sentence, one action, one large photograph. */
export function Hero() {
  const image = IMAGES.hero;
  return (
    <section className="mx-auto max-w-wide px-4 pt-16 md:px-6 md:pt-24 lg:px-8">
      <div className="mx-auto max-w-content text-center">
        <h1 className="text-h1 md:text-display">
          Every way to fly.
          <br />
          One place to book.
        </h1>
        <p className="mx-auto mt-5 max-w-reading text-body-lg text-muted">
          Scheduled flights, private charters, helicopters, empty legs and air
          ambulance transfers, compared side by side.
        </p>
        <a
          href="#ways-to-fly"
          className="mt-8 inline-flex h-13 items-center justify-center rounded-pill bg-accent px-7 text-body-lg font-medium text-accent-foreground transition-colors duration-150 ease-standard hover:bg-accent-hover"
        >
          Explore ways to fly
        </a>
      </div>
      <div className="relative mt-12 aspect-4/3 overflow-hidden rounded-xl bg-surface md:mt-16 md:aspect-21/9">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          preload
          placeholder="blur"
          sizes="(min-width: 1200px) 1136px, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
