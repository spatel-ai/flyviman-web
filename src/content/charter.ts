import type { EnquiryTopic } from "./contact";

/**
 * Charter page copy, imported from https://flyviman.com/book-charter/
 * (WordPress page 8693, modified 2026-02-09) on 2026-11-13. The live site's
 * "Book now" buttons become enquiries: nothing here is bookable inventory
 * (rule 4), and a charter is confirmed only once an operator accepts it.
 */
export interface CharterKind {
  name: string;
  topic: EnquiryTopic;
  /** Shown on the card, never animated (rule 7). */
  notice?: string;
}

export const CHARTER = {
  hero: {
    overline: "Our charter services",
    title: "Comprehensive charter solutions for unforgettable journeys",
    lead: "Explore our range of charter services tailored to meet your unique travel needs. From luxurious private jets to efficient helicopter transfers, we provide seamless and personalized charter solutions for unforgettable travel experiences.",
    image: "charterJetDusk",
  },
  heading: "Choose your charter",
  note: "Tell us your route, dates and passengers. A charter is confirmed only once an operator accepts it.",
  action: "Send an enquiry",
  kinds: [
    { name: "Private charter", topic: "PRIVATE_CHARTER" },
    { name: "Celebrity charter", topic: "CELEBRITY_CHARTER" },
    { name: "Election charter", topic: "ELECTION_CHARTER" },
    { name: "Marriage charter", topic: "MARRIAGE_CHARTER" },
    { name: "Pilgrimage charter", topic: "PILGRIMAGE_CHARTER" },
    {
      name: "Medical charter",
      topic: "MEDICAL_CHARTER",
      notice:
        "In an emergency, call 112 or your local emergency services first.",
    },
    { name: "Group charter", topic: "GROUP_CHARTER" },
    { name: "Flower drop charter", topic: "FLOWER_DROP_CHARTER" },
  ] satisfies readonly CharterKind[],
} as const;
