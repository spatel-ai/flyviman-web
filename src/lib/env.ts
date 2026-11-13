import { z } from "zod";
import { proxyTarget } from "./proxy-target";

const schema = z.object({
  /** Base URL of flyviman-api including the version prefix, no trailing slash. */
  NEXT_PUBLIC_API_URL: z
    .url()
    .default("http://localhost:4000/api/v1")
    .transform((value) => value.replace(/\/+$/, "")),
});

/**
 * Validated environment. Only `NEXT_PUBLIC_` values belong here: they are
 * compiled into the browser bundle and must be safe to publish.
 */
export const env = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
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
