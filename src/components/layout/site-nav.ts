import {
  BriefcaseBusiness,
  Building2,
  Compass,
  Info,
  Mail,
  Plane,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "./nav-links";

/**
 * The customer site's navigation. Each destination is linked from one place:
 * the header (Search, the charter button, the More menu) or the footer (legal
 * pages). nav-links.spec.ts keeps the two lists apart.
 */

/** The header's primary button. */
export const CHARTER_HREF = "/search?service=charter";

/** The header's own link. */
export const SEARCH_NAV: NavItem = { href: "/search", label: "Search" };

export interface MoreItem extends NavItem {
  icon: LucideIcon;
}

/** The "More" menu (a menu on desktop, a bottom sheet on phones). */
export const MORE_NAV: MoreItem[] = [
  { href: "/about", label: "About", icon: Info },
  { href: "/services", label: "Services", icon: Sparkles },
  { href: "/aircraft-sales", label: "Aircraft sales", icon: Plane },
  { href: "/pilots", label: "Pilots", icon: Compass },
  {
    href: "/aviation-solutions",
    label: "Aviation solutions",
    icon: BriefcaseBusiness,
  },
  { href: "/charter/fleet", label: "Charter fleet", icon: Building2 },
  { href: "/contact", label: "Contact", icon: Mail },
];

/** The footer's links. */
export const LEGAL_NAV: NavItem[] = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/image-credits", label: "Image credits" },
];
