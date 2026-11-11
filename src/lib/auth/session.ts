import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Me, Role } from "@/lib/api/types";
import { homeFor } from "./roles";

/**
 * The signed-in user, or `null`. Asks the API on every request (it is never
 * cached, so a suspension or role change shows at once) and is shared by
 * everything rendering in the same request. Reads cookies, so callers must
 * sit inside a `<Suspense>` boundary.
 */
export const getSession = cache(async (): Promise<Me | null> => {
  const jar = await cookies();
  if (!jar.has("access_token")) return null;
  try {
    const { data } = await apiFetch<Me>("me", {
      headers: { Cookie: jar.toString() },
      cache: "no-store",
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/**
 * For protected layouts: returns the user, or redirects. A visitor with no
 * session goes to sign-in and comes back afterwards; a user whose role does
 * not belong here goes to their own home, so they never see this surface.
 */
export async function requireRole(
  allowed: readonly Role[],
  returnTo: string,
): Promise<Me> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!allowed.includes(session.role)) redirect(homeFor(session.role));
  return session;
}
