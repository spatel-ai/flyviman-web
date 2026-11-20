import { getPublicContent } from "@/lib/public-content";

/**
 * The first published banner, above the hero. Plain text only: React
 * escapes it, so a banner can never carry markup. Nothing is shown when
 * there is none or the content service does not answer.
 */
export async function HomeBanner() {
  const [banner] = await getPublicContent("banners");
  if (!banner) return null;
  return (
    <aside
      aria-label="Announcement"
      data-testid="home-banner"
      className="bg-accent-fill px-4 py-3 text-center text-body-sm text-accent-foreground md:px-6"
    >
      <p className="mx-auto max-w-wide whitespace-pre-line">
        <strong className="font-semibold">{banner.title}</strong>
        <span className="ml-2">{banner.body}</span>
      </p>
    </aside>
  );
}
