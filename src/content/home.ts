/**
 * Home page copy, imported from https://flyviman.com/ (WordPress page 8573)
 * on 2026-11-13. The wording is the live site's, with sentence case and
 * small typo fixes only. Items held back until the business confirms them
 * are listed in docs/open-decisions.md; do not add them here before then.
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
    action: { label: "Explore ways to fly", href: "#ways-to-fly" },
  },
  about: {
    overline: "About Flyviman",
    heading: "Your strategic partner in the sky and on the ground.",
    image: "cabinTan",
    action: { label: "View about", href: "/about" },
    paragraphs: [
      "FlyViman Aviation is a premium aviation solutions company built on clarity, trust, and operational discipline. We support businesses, operators, and private clients with structured aircraft services including sales, leasing, charters, and aviation advisory.",
      "Driven by a commitment to professionalism and safety, we approach every project with strategic insight and a deep understanding of aviation standards. Our goal is simple: deliver solutions that give our clients confidence in every decision they make.",
    ],
  },
  services: {
    overline: "Our services",
    heading: "Fly without limits – where possibilities take flight",
    lead: "Experience aviation services designed to exceed your ambitions — and redefine what’s possible.",
    image: "jetNose",
    action: { label: "View more", href: "/services" },
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
  charter: {
    overline: "Our luxury charter",
    heading: "Your gateway to effortless luxury travel",
    lead: "Discover personalized charter booking services crafted to meet your exact preferences, ensuring every journey is smooth, stylish, and stress-free.",
    scenes: [
      {
        name: "Private charter",
        image: "charterJetDusk",
        topic: "PRIVATE_CHARTER",
      },
      {
        name: "Celebrity charter",
        image: "cabinCream",
        topic: "CELEBRITY_CHARTER",
      },
      {
        name: "Election charter",
        image: "heliport",
        topic: "ELECTION_CHARTER",
      },
    ],
    action: "View more",
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
        // Held back: "Transparent pricing" and "24/7 operations support".
        points: [
          "Fast processing of permissions",
          "Highly trained aviation professionals",
          "Pan-India network across airports & helipads",
          "Advanced aviation technology & tracking",
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
