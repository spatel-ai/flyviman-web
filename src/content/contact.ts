import type { Schemas } from "@/lib/api/types";

/**
 * Flyviman's contact details, from https://flyviman.com/contact-us/
 * (WordPress page 8940, modified 2026-02-07) and the site's footer,
 * imported 2026-11-13. Shown in the footer of every customer page and on
 * the contact page.
 */
const ADDRESS = "329/2, Dwarka Expressway, Sector 112, Gurugram 122017";

export const CONTACT = {
  officeLabel: "Head corporate office",
  address: ADDRESS,
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`,
  phones: [
    { label: "+91 97799 20011", href: "tel:+919779920011" },
    { label: "+91 84471 73787", href: "tel:+918447173787" },
  ],
  email: "info@flyviman.com",
  hours: [
    { days: "Monday — Saturday", time: "10 AM – 6 PM" },
    { days: "Sunday", time: "Closed" },
  ],
} as const;

export const CONTACT_PAGE = {
  hero: {
    overline: "Contact us",
    title: "Get in touch",
    lead: "Tell us what you need. Our team replies during business hours.",
    image: "runwayCockpit",
  },
  form: {
    heading: "Send an enquiry",
    medicalNotice:
      "Please do not include medical details here; our operations team will ask for what they need. In an emergency, call 112 or your local emergency services first.",
    sent: {
      title: "We have received your enquiry",
      text: "Our team will reply during business hours. Your reference is",
    },
  },
} as const;

/** The API's enquiry topics (flyviman-api `EnquiryTopic`). */
export type EnquiryTopic = Schemas["EnquiryTopic"];

/** Every enquiry topic, with its label. */
export const ENQUIRY_TOPICS = [
  { value: "GENERAL", label: "General enquiry" },
  { value: "PRIVATE_CHARTER", label: "Private charter" },
  { value: "CELEBRITY_CHARTER", label: "Celebrity charter" },
  { value: "ELECTION_CHARTER", label: "Election charter" },
  { value: "MARRIAGE_CHARTER", label: "Marriage charter" },
  { value: "PILGRIMAGE_CHARTER", label: "Pilgrimage charter" },
  { value: "MEDICAL_CHARTER", label: "Medical charter" },
  { value: "GROUP_CHARTER", label: "Group charter" },
  { value: "FLOWER_DROP_CHARTER", label: "Flower drop charter" },
  { value: "AIRCRAFT_SALES", label: "Aircraft sale, purchase or leasing" },
  { value: "CONSULTANCY", label: "Consultancy or investment" },
] as const satisfies readonly { value: EnquiryTopic; label: string }[];
