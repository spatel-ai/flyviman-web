/**
 * Charter fleet page copy, imported from https://flyviman.com/charter-fleet/
 * (WordPress page 8898, modified 2026-02-09) on 2026-11-14. Aircraft names
 * as on the live site, in its order, with spelling fixed ("Premier 1A",
 * "AgustaWestland"). Each "Book now" becomes an enquiry: these are aircraft
 * types operators fly for us, not bookable inventory (rule 4).
 */
export const FLEET = {
  hero: {
    overline: "Our charter fleet",
    title: "Exquisite fleet for unmatched charter experiences",
    lead: "Discover our exceptional charter fleet, meticulously selected to offer the utmost comfort, style, and safety. From sophisticated private jets to versatile helicopters, our diverse fleet ensures an unparalleled charter experience tailored to your specific requirements.",
    image: "charter",
  },
  note: "Availability depends on the operator and the date. Tell us your route and we will come back with the aircraft that suit it.",
  action: "Send an enquiry",
  groups: [
    {
      id: "jets",
      title: "Jets and turboprops",
      topic: "PRIVATE_CHARTER",
      aircraft: [
        "Caravan 208B",
        "Pilatus PC-12",
        "King Air C90",
        "King Air B200",
        "King Air B250",
        "Premier 1A",
        "Learjet 45XR",
        "Hawker 800XP",
        "Legacy 650",
        "Falcon 2000",
        "Falcon 8X",
        "Lineage 1000E",
        "Gulfstream G550XR",
        "Gulfstream G650ER",
      ],
    },
    {
      id: "helicopters",
      title: "Helicopters",
      topic: "PRIVATE_CHARTER",
      aircraft: [
        "Robinson R66",
        "Airbus B3",
        "Bell 206L4",
        "Bell 407",
        "Agusta 109P",
        "Bell 429",
        "Bell 412EP",
        "Agusta AW139",
      ],
    },
  ],
} as const;
