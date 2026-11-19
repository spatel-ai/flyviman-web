import { CONTACT } from "@/content/contact";
import { env } from "./env";

/**
 * Business details the client supplies later, read from NEXT_PUBLIC_*
 * variables (`env.ts`, `.env.example`). Unset means "not shown"; an invalid
 * value is ignored with a server-side warning and never breaks a page.
 */

export const SOCIAL_NETWORKS = [
  "instagram",
  "facebook",
  "youtube",
  "x",
  "linkedin",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export interface SiteSettings {
  /** Digits with country code, no plus: the form `wa.me` wants. */
  whatsappNumber?: string;
  whatsappHref?: string;
  social: { network: SocialNetwork; label: string; href: string }[];
  /** A path under `/` in `public/`. */
  logoPath?: string;
  email: string;
  phones: { label: string; href: string }[];
}

export interface RawSiteSettings {
  whatsappNumber?: string;
  social?: Partial<Record<SocialNetwork, string>>;
  logoPath?: string;
  email?: string;
  phones?: string;
}

const LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  x: "X",
  linkedin: "LinkedIn",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads a number as written ("+91 97799 20011") into 8 to 15 digits. */
function digitsOf(value: string): string | undefined {
  if (!/^\+?[\d\s().-]+$/.test(value)) return undefined;
  const digits = value.replace(/\D/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : undefined;
}

function httpsUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".")
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** A path under `/`: not protocol-relative, no traversal, no scheme. */
function logoPathOf(value: string): string | undefined {
  return /^\/(?!\/)[\w\-./]+$/.test(value) && !value.includes("..")
    ? value
    : undefined;
}

/** Validates raw values. `warn` receives one message per ignored value. */
export function parseSiteSettings(
  raw: RawSiteSettings,
  warn: (message: string) => void = () => {},
): SiteSettings {
  const given = (value: string | undefined) => value?.trim() || undefined;
  const ignore = (name: string) =>
    warn(`site settings: ${name} is invalid and was ignored`);

  const settings: SiteSettings = {
    social: [],
    email: CONTACT.email,
    phones: [...CONTACT.phones],
  };

  const whatsapp = given(raw.whatsappNumber);
  if (whatsapp) {
    const digits = digitsOf(whatsapp);
    if (digits) {
      settings.whatsappNumber = digits;
      settings.whatsappHref = `https://wa.me/${digits}`;
    } else ignore("NEXT_PUBLIC_WHATSAPP_NUMBER");
  }

  for (const network of SOCIAL_NETWORKS) {
    const value = given(raw.social?.[network]);
    if (!value) continue;
    const href = httpsUrl(value);
    if (href) settings.social.push({ network, label: LABELS[network], href });
    else ignore(`NEXT_PUBLIC_SOCIAL_${network.toUpperCase()}`);
  }

  const logo = given(raw.logoPath);
  if (logo) {
    const path = logoPathOf(logo);
    if (path) settings.logoPath = path;
    else ignore("NEXT_PUBLIC_LOGO_PATH");
  }

  const email = given(raw.email);
  if (email) {
    if (EMAIL.test(email)) settings.email = email;
    else ignore("NEXT_PUBLIC_CONTACT_EMAIL");
  }

  const phones = given(raw.phones);
  if (phones) {
    const parsed = phones.split(",").map((part) => {
      const label = part.trim();
      const digits = digitsOf(label);
      return digits ? { label, href: `tel:+${digits}` } : undefined;
    });
    if (parsed.length > 0 && parsed.every(Boolean)) {
      settings.phones = parsed as SiteSettings["phones"];
    } else ignore("NEXT_PUBLIC_CONTACT_PHONES");
  }

  return settings;
}

/** The settings in force. Warnings are written on the server only. */
export const siteSettings = parseSiteSettings(
  {
    whatsappNumber: env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    social: {
      instagram: env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
      facebook: env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
      youtube: env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
      x: env.NEXT_PUBLIC_SOCIAL_X,
      linkedin: env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
    },
    logoPath: env.NEXT_PUBLIC_LOGO_PATH,
    email: env.NEXT_PUBLIC_CONTACT_EMAIL,
    phones: env.NEXT_PUBLIC_CONTACT_PHONES,
  },
  (message) => {
    if (typeof window === "undefined") console.warn(message);
  },
);
