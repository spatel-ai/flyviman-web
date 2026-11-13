/**
 * Pilots page copy, from three flyviman.com pages imported on 2026-11-14:
 * Job for pilots (WordPress 9087), Pilot courses (9133) and Pilot
 * regulatory trainings (9157). Wording as on the live site, with sentence
 * case and small fixes only. Course fees are shown as estimates (rule 1:
 * every price says what kind it is), in paise.
 */
export const PILOTS = {
  hero: {
    overline: "FlyViman aviation",
    title: "For pilots",
    lead: "Job assistance, pilot courses and regulatory trainings, for pilots starting out and those already flying.",
    image: "cockpitNight",
  },
  jobs: {
    overline: "Job for pilots",
    heading: "Exciting opportunities for fresher & experienced pilots",
    text: "Embark on a rewarding career in the aviation industry with our job openings for fresher pilots in chartered airlines and scheduled airlines. Join our team and gain valuable experience, receive comprehensive training, and enjoy the thrill of flying in a dynamic and supportive environment. Take the first step towards your aviation dreams and seize the opportunity to soar to new heights with us.",
    action: "Apply now for the pilot jobs",
  },
  courses: {
    overline: "Pilot courses",
    heading: "Our pilot courses",
    feeNote: "Indicative fee. Confirmed when you enrol.",
    action: "Apply now",
    items: [
      { name: "Private pilot course", feeMinor: 21_00_000_00 },
      { name: "Commercial pilot course", feeMinor: 52_00_000_00 },
      { name: "Commercial multi engine", feeMinor: 60_00_000_00 },
      { name: "Simulator training", feeMinor: 1_00_000_00 },
    ],
  },
  trainings: {
    overline: "Pilot regulatory trainings",
    heading: "Regulatory trainings",
    schedule: [
      { label: "Initial", value: "06 days" },
      { label: "Recurrent", value: "02 days" },
      { label: "Duration", value: "8 hours (each day)" },
    ],
    action: "Ask about a training",
    items: [
      { code: "CRM", name: "Crew resource management" },
      { code: "DGR", name: "Dangerous goods regulations" },
      { code: "SMS", name: "Safety management system" },
      { code: "SEP", name: "Safety emergency procedure" },
      { code: "HF", name: "Human factor" },
      { code: "SGT", name: "Specific ground training" },
      { code: "AVSEC", name: "Aviation security" },
      { code: "First aid", name: "First aid training" },
    ],
  },
} as const;
