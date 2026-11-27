import { Skeleton } from "@/components/ui/skeleton";

/**
 * The landing's footprint while it streams: the hero, the search card, and
 * the popular-routes and aircraft sections at the sizes the real ones take
 * (see search-landing.tsx and the `.search-hero` rules in globals.css), so
 * the sections below do not jump when the landing arrives (W1-011). The
 * landing reads ?service= to hide the routes for Scheduled, which the
 * fallback cannot know, so it always reserves them.
 */
export function SearchLandingSkeleton() {
  return (
    <>
      <section aria-hidden="true" className="relative">
        {/* On a phone the hero takes its height from its text, about this. */}
        <Skeleton className="h-72 rounded-none sm:h-112 md:h-136" />
        <div className="search-hero-card relative mx-auto -mt-28 w-full max-w-wide px-4 md:px-6">
          <Skeleton className="h-102 rounded-xl sm:h-91.5 lg:h-68.5" />
        </div>
      </section>
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-wide px-4 pt-20 md:px-6"
      >
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-2 h-6.5 w-80 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-4/3 rounded-xl" />
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-wide px-4 pt-20 md:px-6"
      >
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-2 h-6.5 w-80 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex flex-col">
              <Skeleton className="aspect-4/3 rounded-b-none rounded-t-xl" />
              <Skeleton className="h-37.5 rounded-b-xl rounded-t-none lg:h-54" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
