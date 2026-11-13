import type { EnquiryTopic } from "./contact";

/**
 * Services page copy, imported from https://flyviman.com/our-services/
 * (WordPress page 9178, modified 2026-02-09) on 2026-11-13. Wording as on
 * the live site, with sentence case and small fixes only.
 *
 * Held back until the business confirms them (docs/open-decisions.md):
 * "Transparent pricing & clear communication", the medical and air
 * ambulance wording in Charter services, "Investor-exclusive access to
 * aircraft availability", and every "Insights" teaser (no articles exist).
 */
export interface Service {
  /** Anchor on the page, and the enquiry topic it leads to. */
  id: string;
  topic: EnquiryTopic;
  title: string;
  tagline: string;
  paragraphs: readonly string[];
  quote: string;
  listTitle: string;
  points: readonly string[];
  detailTitle: string;
  detail: readonly string[];
  /** Shown under the section, never animated. */
  notice?: string;
}

export const SERVICES_PAGE = {
  hero: {
    overline: "Our services",
    title: "Aviation services, structured end to end",
    lead: "Sales, leasing, charters, consultancy and investment — all under one professional ecosystem.",
    image: "jetNose",
  },
  services: [
    {
      id: "sale-purchase",
      topic: "AIRCRAFT_SALES",
      title: "Aircraft sale & purchase",
      tagline: "Aircraft transactions made clear and confident",
      paragraphs: [
        "Buying or selling an aircraft requires precision, technical understanding, and trusted guidance. FlyViman supports clients through every phase of the transaction from identifying the right aircraft to completing regulatory requirements and final delivery.",
        "Whether you’re a first-time buyer, an operator expanding your fleet, or an owner planning an exit, our structured approach ensures clarity, transparency, and confidence at every step.",
        "We combine global sourcing networks, regulatory knowledge, and professional due diligence to help you make decisions backed by reliable information and expert insight.",
      ],
      quote:
        "The right aircraft is never just purchased — it is chosen with insight, verified with expertise, and delivered with absolute precision.",
      listTitle: "What our sale & purchase service ensures",
      points: [
        "Verified sourcing through trusted global networks",
        "Transparent evaluation & documentation guidance",
        "Pre-purchase technical inspection coordination",
        "Clear communication at every stage",
        "End-to-end support through handover",
      ],
      detailTitle: "A structured path to the right aircraft",
      detail: [
        "Aircraft transactions are complex — but with the right partner, they become strategic, informed, and efficient. FlyViman bridges the gap between technical evaluation, regulatory processes, and commercial decision-making.",
        "We assist in comparing aircraft options based on mission needs, operational cost, and long-term suitability. Every assessment is objective and tailored to your goals, ensuring that you invest in the platform that genuinely fits your requirements.",
        "Whether it’s a jet, turboprop, helicopter, or special-mission aircraft, we guide you with a clear, confident approach backed by industry understanding.",
      ],
    },
    {
      id: "leasing",
      topic: "AIRCRAFT_SALES",
      title: "Aircraft leasing",
      tagline: "Leasing solutions that support your growth",
      paragraphs: [
        "Aircraft leasing is one of the most efficient ways to expand operations without the complexity of full ownership. FlyViman provides structured dry and wet lease solutions designed for flying schools, charter operators, corporates, and aviation investors.",
        "Our approach combines transparent lease terms, regulatory alignment, and a deep understanding of operational needs. Whether you need short-term capacity or long-term fleet support, we help you identify the aircraft and lease model that best fit your goals.",
        "With access to a strong network of lessors and aviation partners, FlyViman ensures that your leasing journey is smooth, compliant, and built on clarity.",
      ],
      quote:
        "A well-structured lease is more than a contract — it is the foundation that keeps your operations moving with confidence and control.",
      listTitle: "Our leasing support includes",
      points: [
        "Dry, wet & ACMI lease options",
        "DGCA-aligned documentation and compliance support",
        "Aircraft sourcing suited to mission profiles",
        "Transparent commercial terms with no hidden conditions",
        "Support for flying schools, operators & corporate programs",
      ],
      detailTitle: "Leasing built around your operational needs",
      detail: [
        "Every aviation operation is different — which is why leasing should be tailored, not standardized. At FlyViman, we begin by understanding your mission requirements, budget considerations, and long-term plans.",
        "From there, we evaluate available aircraft, negotiate clear terms, coordinate inspection requirements, and ensure all regulatory processes are handled correctly. Whether you’re inducting your first aircraft or expanding an existing fleet, our team ensures you receive solutions that are both practical and sustainable.",
        "With a focus on clarity and operational readiness, FlyViman helps you make leasing decisions that strengthen your capabilities today and support your growth tomorrow.",
      ],
    },
    {
      id: "charter",
      topic: "PRIVATE_CHARTER",
      title: "Charter services",
      tagline: "A tailored private travel experience",
      paragraphs: [
        "Private aviation is about more than reaching a destination — it is about control, comfort, and the freedom to move on your schedule. FlyViman coordinates premium charter solutions through certified operators, giving you access to a diverse fleet of jets, turboprops, and helicopters suited for every mission.",
        // Held back: "Whether traveling for business, leisure, medical needs,
        // or urgent mobility, ..." (medical wording, rule 7).
        "Every flight is handled with discretion, precision, and a commitment to delivering a refined travel experience.",
        "With FlyViman, private flying becomes effortless, reliable, and shaped entirely around you.",
      ],
      quote:
        "Those who fly privately don’t just save time — they reclaim it, and shape every journey on their own terms.",
      listTitle: "What you can expect from our charter service",
      // Held back: "Transparent pricing & clear communication" and
      // "Options for business, leisure, medical & special missions".
      points: [
        "Custom itineraries designed around your schedule",
        "Access to jets, turboprops & helicopters via certified operators",
        "Enhanced privacy, comfort, and on-ground assistance",
      ],
      detailTitle: "Charters built for business and personal travel",
      detail: [
        // Held back: the sentence naming "air ambulance requirements".
        "Every traveler has unique needs and private flying should reflect that.",
        "Our team evaluates aircraft suitability, availability, weather considerations, and airport access to ensure your mission runs smoothly and efficiently. We handle coordination, logistics, and communication so you can focus solely on your journey.",
        "With FlyViman, you receive more than a flight — you receive a carefully managed aviation experience that puts reliability and comfort first.",
      ],
      notice:
        "For a medical transfer, choose air ambulance on our home page. In an emergency, call 112 or your local emergency services first.",
    },
    {
      id: "consultancy",
      topic: "CONSULTANCY",
      title: "Aviation consultancy",
      tagline: "Expert advisory for an evolving aviation landscape",
      paragraphs: [
        "Aviation demands precision in operations, compliance, safety, and strategic planning. FlyViman provides professional advisory services for operators, corporates, investors, and aviation startups seeking structured, implementation-ready guidance.",
        "From regulatory documentation to operational processes and organizational planning, our consultancy approach is built on clarity, compliance, and practical industry experience. We help clients make informed decisions, avoid costly missteps, and build aviation capabilities that stand the test of time.",
        "Whether you’re setting up a new operation or strengthening an existing one, FlyViman brings deep insight and disciplined methodology to every project.",
      ],
      quote:
        "In aviation, expertise isn’t optional — it is the compass that turns complex requirements into confident decisions.",
      listTitle: "Our consultancy expertise includes",
      points: [
        "Regulatory guidance & documentation support",
        "Operational planning and SOP development",
        "Training, compliance, and safety advisory",
        "Startup and operator setup planning",
        "Commercial, technical, and organizational insights",
      ],
      detailTitle: "Clarity, compliance & operational excellence",
      detail: [
        "Aviation projects often involve multiple layers — regulations, aircraft suitability, operational workflows, staffing, safety protocols, and financial structuring. FlyViman simplifies this complexity by breaking down each requirement into actionable steps.",
        "We work closely with clients to assess needs, identify gaps, and design strategies that align with industry standards and regulatory expectations. Our guidance is not theoretical — it is shaped by experience across real-world aviation operations, transactions, and compliance environments.",
        "With FlyViman, you gain a consultancy partner who understands the industry, respects its risks, and helps you build with confidence.",
      ],
    },
    {
      id: "investment",
      topic: "CONSULTANCY",
      title: "Aviation investment",
      tagline: "A refined approach to investing in aviation",
      paragraphs: [
        "Aviation assets offer unique value — but they also require disciplined evaluation, clarity, and responsible planning. FlyViman supports individuals, corporates, and investment groups looking to explore aviation opportunities through structured, transparent, and insight-driven models.",
        "Our investment pathways, including fractional ownership and shared aircraft programs, are designed to reduce complexity while maximizing practical advantages. From understanding usage needs to evaluating cost distribution, FlyViman provides clear guidance that helps you make informed decisions with confidence.",
        "We bridge the gap between financial expectations and operational realities, giving investors a smart, sustainable entry into the world of aviation.",
      ],
      quote:
        "Aviation isn’t just an investment — it’s an experience shaped by insight, responsibility, and the freedom to fly on your own terms.",
      listTitle: "Our aviation investment support includes",
      // Held back: "Investor-exclusive access to aircraft availability".
      points: [
        "Fractional ownership programs",
        "Shared aircraft investment models",
        "Advisory on selecting the right aviation asset",
        "Usage planning & cost-distribution insights",
      ],
      detailTitle: "Invest with confidence, supported by real aviation insight",
      detail: [
        "Aviation investment works best when guided by clear expertise and honest evaluation. FlyViman ensures that every proposal is supported by operational, regulatory, and financial understanding — not just theoretical benefits.",
        "We help you assess aircraft types, mission suitability, operational requirements, and long-term cost expectations. Our advisory services ensure that your entry into aviation is strategic, safe, and aligned with your objectives.",
        "Whether you aim to reduce charter costs, gain flexible mobility, or explore aviation as an investment asset, FlyViman offers a transparent, structured path forward.",
      ],
    },
  ] satisfies readonly Service[],
} as const;
