import { Reveal } from "@/components/motion/reveal";
import { HOME } from "@/content/home";
import { SectionHeading } from "./section-heading";

/** Who Flyviman is, in the company's own words. */
export function About() {
  const { overline, heading, paragraphs } = HOME.about;
  return (
    <section
      aria-labelledby="about-heading"
      className="mt-16 bg-surface md:mt-24"
    >
      <div className="mx-auto grid max-w-wide gap-8 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="lg:col-span-5">
          <SectionHeading id="about-heading" overline={overline}>
            {heading}
          </SectionHeading>
        </div>
        <div className="space-y-5 lg:col-span-7">
          {paragraphs.map((paragraph, index) => (
            <Reveal key={paragraph} index={index}>
              <p className="max-w-reading text-body-lg text-muted">
                {paragraph}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
