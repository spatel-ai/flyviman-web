import { z } from "zod";
import { proxyTarget } from "./proxy-target";

const schema = z.object({
  /** Base URL of flyviman-api including the version prefix, no trailing slash. */
  NEXT_PUBLIC_API_URL: z
    .url()
    .default("http://localhost:4000/api/v1")
    .transform((value) => value.replace(/\/+$/, "")),
  /**
   * Business details the client supplies later (see `site-settings.ts`).
   * Raw strings here; unset means "not shown", and a malformed value is
   * ignored with a warning there, so none of these can fail the build.
   */
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  NEXT_PUBLIC_SOCIAL_INSTAGRAM: z.string().optional(),
  NEXT_PUBLIC_SOCIAL_FACEBOOK: z.string().optional(),
  NEXT_PUBLIC_SOCIAL_YOUTUBE: z.string().optional(),
  NEXT_PUBLIC_SOCIAL_X: z.string().optional(),
  NEXT_PUBLIC_SOCIAL_LINKEDIN: z.string().optional(),
  NEXT_PUBLIC_LOGO_PATH: z.string().optional(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().optional(),
  NEXT_PUBLIC_CONTACT_PHONES: z.string().optional(),
});

/**
 * Validated environment. Only `NEXT_PUBLIC_` values belong here: they are
 * compiled into the browser bundle and must be safe to publish.
 */
export const env = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_SOCIAL_INSTAGRAM: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
  NEXT_PUBLIC_SOCIAL_FACEBOOK: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
  NEXT_PUBLIC_SOCIAL_YOUTUBE: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
  NEXT_PUBLIC_SOCIAL_X: process.env.NEXT_PUBLIC_SOCIAL_X,
  NEXT_PUBLIC_SOCIAL_LINKEDIN: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
  NEXT_PUBLIC_LOGO_PATH: process.env.NEXT_PUBLIC_LOGO_PATH,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  NEXT_PUBLIC_CONTACT_PHONES: process.env.NEXT_PUBLIC_CONTACT_PHONES,
});

/**
 * The API base URL for calls made by this server (route protection, server
 * reads). When the browser reaches the API through this site's `/api/v1`
 * proxy (API_PROXY_TARGET, D-065), the server calls the API directly rather
 * than looping through its own public address. Not a secret, but server
 * only: in the browser bundle it is always NEXT_PUBLIC_API_URL.
 */
const target =
  typeof window === "undefined"
    ? proxyTarget(
        process.env.API_PROXY_TARGET,
        process.env.NODE_ENV === "production",
      )
    : undefined;
export const serverApiUrl = target
  ? `${target}/api/v1`
  : env.NEXT_PUBLIC_API_URL;
