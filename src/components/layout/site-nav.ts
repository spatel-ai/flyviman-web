import type { NavItem } from "./nav-links";

/** The customer site's main pages, in the header and the footer. */
export const SITE_NAV: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/charter", label: "Charter" },
  { href: "/aircraft-sales", label: "Aircraft sales" },
  { href: "/pilots", label: "Pilots" },
  { href: "/contact", label: "Contact" },
];

/** Further pages, in the footer only (and linked from their parent page). */
export const MORE_NAV: NavItem[] = [
  { href: "/aviation-solutions", label: "Aviation solutions" },
  { href: "/charter/fleet", label: "Charter fleet" },
];
