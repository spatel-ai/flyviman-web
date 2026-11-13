import { BadgeCheck, FileText, Headset } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SEARCH_LANDING } from "@/content/search";

const WHY_ICONS = [BadgeCheck, FileText, Headset];

/** How it works, why Flyviman and questions: static, below the fold. */
export function SearchInfoSections() {
  const { steps, why, faq } = SEARCH_LANDING;
  return (
    <div className="mx-auto flex w-full max-w-wide flex-col gap-20 px-4 py-20 md:px-6">
      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-h2">
          {steps.title}
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {steps.items.map((step, index) => (
            <li key={step.title}>
              <Reveal index={index} className="flex flex-col gap-2">
                <span className="flex size-9 items-center justify-center rounded-pill bg-accent/10 text-body-sm font-semibold text-accent tabular-nums">
                  {index + 1}
                </span>
                <span className="text-title">{step.title}</span>
                <span className="text-body-sm text-muted">{step.text}</span>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="why-flyviman"
        className="rounded-xl bg-surface p-6 md:p-10"
      >
        <h2 id="why-flyviman" className="text-h2">
          {why.title}
        </h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {why.items.map((item, index) => {
            const Icon = WHY_ICONS[index];
            return (
              <li key={item.title} className="flex flex-col gap-2">
                <Icon aria-hidden="true" className="size-6 text-accent" />
                <span className="text-title">{item.title}</span>
                <span className="text-body-sm text-muted">{item.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="search-questions">
        <h2 id="search-questions" className="text-h2">
          {faq.title}
        </h2>
        <div className="mt-6 flex flex-col divide-y divide-border">
          {faq.items.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="cursor-pointer list-none text-title marker:hidden">
                {item.question}
              </summary>
              <p className="mt-2 max-w-reading text-body text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
