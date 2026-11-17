/**
 * Home page copy, imported from https://flyviman.com/ (WordPress page 8573)
 * on 2026-11-13. The wording is the live site's, with sentence case and
 * small typo fixes only. The business approved the full migration (D-092);
 * the few items still not shown, and why, are in docs/open-decisions.md.
 * How to import another page: the `site-content-import` skill.
 */

export interface FaqItem {
  question: string;
  answer: string;
  /** A bulleted list after the answer. */
  points?: readonly string[];
  /** A sentence after the list. */
  closing?: string;
}

export const HOME = {
  hero: {
    /** One entry per line of the headline. */
    headline: ["Your trusted partner", "for every aviation decision"],
  },
  /** The trust strip draws three of these claims (features/home/trust-strip.tsx). */
  services: {
    points: [
      {
        title: "One-stop aviation hub",
        description:
          "Sales, leasing, charter coordination, and advisory — all under one professional ecosystem.",
      },
      {
        title: "Diverse aviation portfolio",
        description:
          "Jets, turboprops, helicopters, drones, and mission-specific platforms.",
      },
      {
        title: "Strong global network",
        description:
          "Connections with OEMs, operators, lessors, and technical specialists worldwide.",
      },
      {
        title: "Regulatory & operational expertise",
        description:
          "Processes aligned with DGCA and international aviation standards.",
      },
    ],
  },
  faq: {
    overline: "FAQs",
    heading: "All your queries in one place",
    items: [
      {
        question: "What services does FlyViman provide?",
        answer:
          "FlyViman delivers a complete range of aviation services, including:",
        points: [
          "Private jet charter services",
          "Helicopter rental for travel & events",
          "Professional drone operations",
          "Aerial photography & cinematography",
          "Aviation consultancy & permissions",
          "Air logistics and time-critical cargo",
          "Pilot training & licensing support",
          "Aircraft maintenance & ground handling",
        ],
      },
      {
        question:
          "Is FlyViman’s service available in India alone, or can it be available internationally?",
        answer:
          "FlyViman caters to aviation needs in India and also helps with international sourcing, leasing, and advisory on a project basis.",
      },
      {
        question: "Is FlyViman suitable for corporate and business travel?",
        answer:
          "Yes, FlyViman specialises in executive and corporate jet travel. We manage multi-city itineraries, urgent meetings, last-minute travel, and premium business aviation solutions designed for speed and comfort.",
      },
      {
        question:
          "What makes FlyViman different from other aviation service providers?",
        answer: "FlyViman stands out through:",
        points: [
          "Transparent pricing",
          "Fast processing of permissions",
          "Highly trained aviation professionals",
          "Pan-India network across airports & helipads",
          "Advanced aviation technology & tracking",
          "24/7 operations support",
        ],
      },
      {
        question: "Who can use FlyViman’s services?",
        answer: "Our solutions are designed for:",
        points: [
          "Corporate travellers",
          "VIP & VVIP movements",
          "Film & media production houses",
          "Wedding planners & luxury events",
          "Real estate, surveying, and mapping agencies",
          "Logistics companies",
          "Aviation students & enthusiasts",
        ],
        closing:
          "Anyone seeking safe, fast, and premium air travel or drone solutions can rely on FlyViman.",
      },
      {
        question: "Which aircraft models does FlyViman assist with sourcing?",
        answer:
          "Jets and turboprops, helicopters, trainers, and specialized mission airplanes based on requirements.",
      },
      {
        question: "How can I request a quote or make a booking?",
        answer: "You can request a quote by:",
        points: [
          "Filling out the enquiry form on our website",
          "Contacting our flight operations team",
          "Connecting via WhatsApp or direct call",
        ],
        closing:
          "Our team responds quickly with customised options based on your route, timing, and requirements.",
      },
      {
        question: "Does FlyViman offer private jet charters in India?",
        answer:
          "Yes. FlyViman handles private jet flights through approved agents in India.",
      },
    ] satisfies readonly FaqItem[],
  },
} as const;
