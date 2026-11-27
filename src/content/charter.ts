import type { ConceptIcon } from "@/components/marketing/concept-icons";
import type { EnquiryTopic } from "./contact";
import type { IMAGES } from "./image-credits";

/**
 * Charter page copy, imported from https://flyviman.com/book-charter/
 * (WordPress page 8693, modified 2026-02-09) on 2026-11-13. The live site's
 * "Book now" buttons become enquiries: nothing here is bookable inventory
 * (rule 4), and a charter is confirmed only once an operator accepts it.
 */
export interface CharterKind {
  name: string;
  topic: EnquiryTopic;
  icon: ConceptIcon;
  /** The card's photograph, from the credited list (image-credits.ts). */
  image: keyof typeof IMAGES;
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
    {
      name: "Private charter",
      image: "charter",
      icon: "plane",
      topic: "PRIVATE_CHARTER",
    },
    {
      name: "Celebrity charter",
      image: "cabinCream",
      icon: "celebrity",
      topic: "CELEBRITY_CHARTER",
    },
    {
      name: "Election charter",
      image: "jetNose",
      icon: "election",
      topic: "ELECTION_CHARTER",
    },
    {
      name: "Marriage charter",
      image: "cabinTan",
      icon: "marriage",
      topic: "MARRIAGE_CHARTER",
    },
    {
      name: "Pilgrimage charter",
      image: "emptyLeg",
      icon: "pilgrimage",
      topic: "PILGRIMAGE_CHARTER",
    },
    {
      name: "Medical charter",
      image: "airAmbulance",
      icon: "ambulance",
      topic: "MEDICAL_CHARTER",
      notice:
        "In an emergency, call 112 or your local emergency services first.",
    },
    {
      name: "Group charter",
      image: "scheduled",
      icon: "group",
      topic: "GROUP_CHARTER",
    },
    {
      name: "Flower drop charter",
      image: "helicopter",
      icon: "flowers",
      topic: "FLOWER_DROP_CHARTER",
    },
  ] satisfies readonly CharterKind[],
} as const;
