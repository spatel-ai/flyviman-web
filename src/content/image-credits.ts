import type { StaticImageData } from "next/image";
import airAmbulance from "./images/air-ambulance-calm-sky.jpg";
import cabinCream from "./images/cabin-cream-seats.jpg";
import cabinTan from "./images/cabin-tan-seats.jpg";
import charterJetDusk from "./images/charter-jet-at-dusk.jpg";
import cockpitNight from "./images/cockpit-at-night.jpg";
import heliport from "./images/helicopter-city-heliport.jpg";
import jetNose from "./images/jet-nose-in-sun.jpg";
import runwayCockpit from "./images/runway-from-cockpit.jpg";
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
  // Added 2026-11-13 for M4 round 2, chosen by the product owner.
  charterJetDusk: {
    src: charterJetDusk,
    alt: "A white long-range business jet parked on an apron under a dusk sky",
    photographer: "Niklas Jonasson",
    sourceUrl: "https://unsplash.com/photos/vr7QkWk6bzM",
    added: "2026-11-13",
    // The registration on the tail fin was painted out (D-082).
    ...UNSPLASH,
  },
  cabinCream: {
    src: cabinCream,
    alt: "Empty cream leather seats in a private jet cabin, facing a walnut bar",
    photographer: "Andy Wang",
    sourceUrl: "https://unsplash.com/photos/ogUyaf8JWA4",
    added: "2026-11-13",
    ...UNSPLASH,
  },
  heliport: {
    src: heliport,
    alt: "A helicopter lifting off a waterside heliport between tall buildings",
    photographer: "Jon Flobrant",
    sourceUrl: "https://unsplash.com/photos/-USxtr0RpUA",
    added: "2026-11-13",
    ...UNSPLASH,
  },
  cockpitNight: {
    src: cockpitNight,
    alt: "A cockpit's glowing instruments at night, an orange horizon beyond the windscreen",
    photographer: "Andrés Dallimonti",
    sourceUrl: "https://unsplash.com/photos/kjqTlMHLci4",
    added: "2026-11-13",
    ...UNSPLASH,
  },
  jetNose: {
    src: jetNose,
    alt: "The nose of a white business jet on the apron in bright sunshine",
    photographer: "Niklas Jonasson",
    sourceUrl: "https://unsplash.com/photos/A8O5zhN5hF4",
    added: "2026-11-13",
    ...UNSPLASH,
  },
  cabinTan: {
    src: cabinTan,
    alt: "Tan quilted leather seats beside round windows in a small jet cabin",
    photographer: "Yaroslav Muzychenko",
    sourceUrl: "https://unsplash.com/photos/xG-pV6Eu-bE",
    added: "2026-11-13",
    ...UNSPLASH,
  },
  runwayCockpit: {
    src: runwayCockpit,
    alt: "A runway between hills, seen through a cockpit window on approach",
    photographer: "Benjamin Chambon",
    sourceUrl: "https://unsplash.com/photos/AzMSyv2ikwI",
    added: "2026-11-13",
    ...UNSPLASH,
  },
} as const satisfies Record<string, SiteImage>;

export type SiteImageName = keyof typeof IMAGES;
