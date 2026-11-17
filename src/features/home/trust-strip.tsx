import { Globe, Plane, ShieldCheck, type LucideIcon } from "lucide-react";
import { HOME } from "@/content/home";
import { Reveal } from "@/components/motion/reveal";

// Three of the four claims in HOME.services.points, as the live site words them.
const ICONS: Record<string, LucideIcon> = {
  "One-stop aviation hub": Plane,
  "Strong global network": Globe,
  "Regulatory & operational expertise": ShieldCheck,
};

/** Three short reasons to trust Flyviman, in the site's own words. */
export function TrustStrip() {
  const points = HOME.services.points.filter((point) => point.title in ICONS);
  return (
    <section
      aria-label="Why Flyviman"
      className="mx-auto max-w-wide px-4 pb-16 md:px-6 md:pb-24 lg:px-8"
    >
      <ul className="grid gap-6 border-t border-border/60 pt-8 md:grid-cols-3 md:gap-8">
        {points.map((point, index) => {
          const Icon = ICONS[point.title];
          return (
            <li key={point.title}>
              <Reveal index={index} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-accent/10 text-accent"
                >
                  <Icon className="size-6" strokeWidth={1.5} />
                </span>
                <div>
                  <h2 className="text-body font-semibold">{point.title}</h2>
                  <p className="mt-1 text-body-sm text-muted">
                    {point.description}
                  </p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
