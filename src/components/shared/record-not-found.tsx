import Link from "next/link";

/**
 * Shown by a detail page when the record in its address does not exist
 * (`isNotFoundError`). The title is the page's heading, so the page still
 * says what it is. Signed-in pages load their record in the browser and so
 * cannot answer with status 404; this is their not-found page (D-093).
 */
export function RecordNotFound({
  title,
  description,
  backHref,
  backLabel,
}: {
  /** For example "Aircraft not found". */
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <h1 className="text-title text-foreground">{title}</h1>
      <p className="max-w-reading text-body-sm text-muted">{description}</p>
      <Link
        href={backHref}
        className="mt-4 text-body-sm text-accent hover:underline"
      >
        {backLabel}
      </Link>
    </div>
  );
}
