import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LABEL = "Read more";

/**
 * Paragraphs that stay short on a phone: the first is shown and the rest sit
 * behind a native "Read more" disclosure. From `md` up everything is shown
 * open and the summary is hidden (CSS only, no script). Nothing is removed
 * from the page.
 */
export function ReadMore({
  paragraphs,
  className,
  textClassName = "text-body-lg text-muted",
}: {
  paragraphs: readonly string[];
  className?: string;
  textClassName?: string;
}) {
  const [lead, ...rest] = paragraphs;
  return (
    <div className={className}>
      <p className={cn("max-w-reading", textClassName)}>{lead}</p>
      {rest.length ? (
        <details className="group mt-3 md:mt-5 md:[&::details-content]:block md:[&::details-content]:[content-visibility:visible]">
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 text-body font-medium text-accent md:hidden [&::-webkit-details-marker]:hidden">
            {LABEL}
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-5 transition-transform duration-150 ease-standard group-open:rotate-180"
            />
          </summary>
          <div className="space-y-5">
            {rest.map((paragraph) => (
              <p key={paragraph} className={cn("max-w-reading", textClassName)}>
                {paragraph}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
