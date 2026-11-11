import type { StaticImageData } from "next/image";
import airAmbulance from "./images/air-ambulance-calm-sky.jpg";
import charter from "./images/charter-jets-on-apron.jpg";
import emptyLeg from "./images/empty-leg-wing-at-dusk.jpg";
import helicopter from "./images/helicopter-over-hills.jpg";
import hero from "./images/hero-wing-above-clouds.jpg";
import scheduled from "./images/scheduled-airliner-at-sunset.jpg";

/**
 * Every photograph the site uses, with where it came from. Components take
 * their images from this list, so a photograph cannot be shown without a
 * credit. These are interim free-licence stock images, used as atmosphere
 * only and replaced by Flyviman's own photography later.
 * Rules: docs/frontend/motion-design.md, Imagery.
 */
export interface SiteImage {
  src: StaticImageData;
  /** Describes the picture for people who cannot see it. */
  alt: string;
  photographer: string;
  /** The photograph's page at its source. */
  sourceUrl: string;
  source: "Unsplash";
  licence: "Unsplash licence";
  /** ISO date the image was added to the site. */
  added: string;
}

const UNSPLASH = { source: "Unsplash", licence: "Unsplash licence" } as const;

export const LICENCE_URLS: Record<SiteImage["licence"], string> = {
  "Unsplash licence": "https://unsplash.com/license",
};

export const IMAGES = {
  hero: {
    src: hero,
    alt: "An aircraft wing above sunlit clouds",
    photographer: "Ross Parmly",
    sourceUrl: "https://unsplash.com/photos/rf6ywHVkrlY",
    added: "2026-11-11",
    ...UNSPLASH,
  },
  scheduled: {
    src: scheduled,
    alt: "An airliner climbing across an orange evening sky",
    photographer: "Daniel De Ciantis",
    sourceUrl: "https://unsplash.com/photos/_SVOl7zHs5E",
    added: "2026-11-11",
    ...UNSPLASH,
  },
  charter: {
    src: charter,
    alt: "Two white business jets parked on a wet apron",
    photographer: "Niklas Jonasson",
    sourceUrl: "https://unsplash.com/photos/9XO1oFE9cvc",
    added: "2026-11-11",
    ...UNSPLASH,
  },
  helicopter: {
    src: helicopter,
    alt: "A helicopter crossing a golden sky above dark hills",
    photographer: "Rafael Garcin",
    sourceUrl: "https://unsplash.com/photos/qBe1NflOOiE",
    added: "2026-11-11",
    ...UNSPLASH,
  },
  emptyLeg: {
    src: emptyLeg,
    alt: "A wingtip against a deep blue sky at dusk",
    photographer: "Danylo Sorokin",
    sourceUrl: "https://unsplash.com/photos/dy4qJCRz1zM",
    added: "2026-11-11",
    ...UNSPLASH,
  },
  airAmbulance: {
    src: airAmbulance,
    alt: "A calm pastel sky above a layer of cloud",
    photographer: "Samuel Arkwright",
    sourceUrl: "https://unsplash.com/photos/FxObxrP06aI",
    added: "2026-11-11",
    ...UNSPLASH,
  },
} as const satisfies Record<string, SiteImage>;

export type SiteImageName = keyof typeof IMAGES;
