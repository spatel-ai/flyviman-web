import { Reveal } from "@/components/motion/reveal";
import { HOME, type FaqItem } from "@/content/home";
import { SectionHeading } from "./section-heading";

/**
 * Questions and answers. Native disclosure elements, so the answers are in
 * the page for search engines and open without JavaScript; one is open at
 * a time (the shared `name`).
 */
export function Faq() {
  const { overline, heading } = HOME.faq;
  const items: readonly FaqItem[] = HOME.faq.items;
  return (
    <section aria-labelledby="faq-heading" className="bg-surface">
      <div className="mx-auto grid max-w-wide gap-8 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="lg:col-span-4">
          <SectionHeading id="faq-heading" overline={overline}>
            {heading}
          </SectionHeading>
        </div>
        <Reveal className="lg:col-span-8">
          <div className="divide-y divide-border/60 border-y border-border/60">
            {items.map((item) => (
              <details
                key={item.question}
                name="home-faq"
                className="faq group"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-title">{item.question}</h3>
                  <span
                    aria-hidden="true"
                    className="faq__mark relative size-4 shrink-0 text-muted"
                  />
                </summary>
                <div className="faq__answer max-w-reading pb-6 text-body text-muted">
                  <p>{item.answer}</p>
                  {item.points ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5">
                      {item.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                  {item.closing ? <p className="mt-3">{item.closing}</p> : null}
                </div>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
