import "server-only";
import { cookies } from "next/headers";
import { apiFetch, type ApiResult } from "@/lib/api/client";

/**
 * Reads from the API on behalf of the signed-in user while rendering on the
 * server: forwards the request's cookies and never caches. Reads cookies, so
 * callers must sit inside a `<Suspense>` boundary.
 */
export async function serverGet<T>(path: string): Promise<ApiResult<T>> {
  const jar = await cookies();
  return apiFetch<T>(path, {
    headers: { Cookie: jar.toString() },
    cache: "no-store",
  });
}
