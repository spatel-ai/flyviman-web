import { z } from "zod";

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
