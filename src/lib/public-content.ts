import { apiFetch } from "@/lib/api/client";
import type { Schemas } from "@/lib/api/types";

export type PublicContentItem = Schemas["PublicContentItemResponseDto"];

/**
 * Published banners or questions from the content module. Never cached by
 * the page: an unpublished banner must leave at once. A slow or failed
 * answer is an empty list, so a page that shows these never breaks without
 * them.
 */
export async function getPublicContent(
  kind: "banners" | "faqs",
): Promise<PublicContentItem[]> {
  try {
    return (
      await apiFetch<PublicContentItem[]>(`content/${kind}`, {
        signal: AbortSignal.timeout(3000),
      })
    ).data;
  } catch {
    return [];
  }
}
