/**
 * Copy and choices for the `/search` landing (M5). Prices on this page come
 * from the fare calendar and are always estimates (business rule 1).
 */

/** Shown in the airport picker before anything is typed (IATA or ICAO). */
export const POPULAR_LOCATIONS = [
  "BOM",
  "DEL",
  "BLR",
  "GOI",
  "HYD",
  "MAA",
  "CCU",
  "JAI",
] as const;

export const SEARCH_LANDING = {
  hero: {
    overline: "Private jets and helicopters",
    title: "Fly private, on your schedule",
    lead: "Compare approved aircraft for your trip, each with a clear estimate. The operator confirms the final price.",
  },
  calendarLegend:
    "Lowest estimates per day, for departures at 10:00. The operator confirms the final price.",
  popularRoutes: {
    title: "Popular routes",
    lead: "Where people fly most. Choose one to start your search.",
    routes: [
      { from: "BOM", to: "GOI", image: "charterJetDusk" },
      { from: "DEL", to: "JAI", image: "jetNose" },
      { from: "BLR", to: "MAA", image: "charter" },
      { from: "BOM", to: "DEL", image: "runwayCockpit" },
      { from: "HYD", to: "BLR", image: "hero" },
      { from: "DEL", to: "BOM", image: "cabinCream" },
    ],
  },
  aircraft: {
    title: "Choose your aircraft",
    lead: "From quick hops to long journeys. Every aircraft is listed by an approved operator.",
    classes: [
      {
        category: "TURBOPROP",
        name: "Turboprop",
        seats: "6 to 9 seats",
        range: "Short regional trips",
        use: "Shorter runways and smaller airports",
        image: "charter",
      },
      {
        category: "LIGHT_JET",
        name: "Light jet",
        seats: "4 to 8 seats",
        range: "Up to about 3,000 km",
        use: "Business trips and weekend escapes",
        image: "jetNose",
      },
      {
        category: "MIDSIZE_JET",
        name: "Midsize jet",
        seats: "7 to 9 seats",
        range: "Up to about 5,000 km",
        use: "Standing cabin for longer flights",
        image: "cabinTan",
      },
      {
        category: "HEAVY_JET",
        name: "Heavy jet",
        seats: "10 to 16 seats",
        range: "Long range",
        use: "Large groups and long journeys",
        image: "charterJetDusk",
      },
      {
        category: "HELICOPTER",
        name: "Helicopter",
        seats: "4 to 6 seats",
        range: "City to city, heliport to heliport",
        use: "Skip the traffic, land close to where you are going",
        image: "helicopter",
      },
    ],
  },
  steps: {
    title: "How it works",
    items: [
      {
        title: "Search",
        text: "Tell us where, when and how many. We find the approved aircraft that can fly it.",
      },
      {
        title: "Compare",
        text: "Each aircraft comes with an estimate and how it is made up. No hidden extras.",
      },
      {
        title: "Request",
        text: "Choose one and send a request. Nothing is booked or charged yet.",
      },
      {
        title: "Fly",
        text: "The operator confirms the aircraft and the price, and we arrange the rest.",
      },
    ],
  },
  why: {
    title: "Why fly with Flyviman",
    items: [
      {
        title: "Approved operators only",
        text: "Every operator and aircraft is checked before it can appear in search.",
      },
      {
        title: "Estimates you can read",
        text: "Flight time, positioning, airport charges, fees and tax, line by line.",
      },
      {
        title: "People who help",
        text: "Our team follows your request from the first message to landing.",
      },
    ],
  },
  faq: {
    title: "Questions",
    items: [
      {
        question: "Is the price I see final?",
        answer:
          "No. Search shows an estimate. The operator confirms the aircraft, crew and price before you pay, and availability and price are checked again then.",
      },
      {
        question: "What happens when I request an aircraft?",
        answer:
          "We send your request to the operator and our team contacts you. Nothing is booked or charged until you accept the operator's quote.",
      },
      {
        question: "Can I cancel?",
        answer:
          "Cancellation conditions are set by the operator and shown with its quote, before you commit to anything.",
      },
    ],
  },
} as const;
