import "server-only";
import { cookies, headers } from "next/headers";
import { apiFetch, type ApiResult } from "@/lib/api/client";
import { visitorAddressHeaders } from "@/lib/client-address";

/**
 * Reads from the API on behalf of the signed-in user while rendering on the
 * server: forwards the request's cookies and the visitor's signed address,
 * and never caches. Reads cookies and headers, so callers must sit inside a
 * `<Suspense>` boundary.
 */
export async function serverGet<T>(path: string): Promise<ApiResult<T>> {
  const jar = await cookies();
  return apiFetch<T>(path, {
    headers: {
      Cookie: jar.toString(),
      ...(await visitorAddressHeaders(await headers())),
    },
    cache: "no-store",
  });
}
