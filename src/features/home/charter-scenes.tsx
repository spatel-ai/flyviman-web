import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ScrollFilm } from "@/components/motion/scroll-film";
import { buttonClasses } from "@/components/ui/button-classes";
import { HOME } from "@/content/home";
import { IMAGES } from "@/content/image-credits";

/**
 * The home page's showpiece (D-081): the three charter kinds the company
 * leads with, as full-screen scenes on wide screens and as photographed
 * cards everywhere else.
 */
export function CharterScenes() {
  const { overline, heading, lead, scenes, action } = HOME.charter;
  return (
    <section aria-labelledby="charter-heading" className="py-16 md:py-24">
      <div className="mx-auto max-w-wide px-4 md:px-6 lg:px-8">
        <div className="max-w-content">
          <SectionHeading id="charter-heading" overline={overline}>
            {heading}
          </SectionHeading>
          <p className="mt-5 max-w-reading text-body-lg text-muted">{lead}</p>
        </div>
      </div>
      <div className="mt-10">
        <ScrollFilm count={scenes.length}>
          <ul className="scroll-film__scenes">
            {scenes.map((scene) => {
              const image = IMAGES[scene.image];
              return (
                <li key={scene.name} className="scroll-film__scene">
                  <div className="scroll-film__frame">
                    <div className="scroll-film__media">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        placeholder="blur"
                        sizes="(min-width: 1024px) and (min-height: 720px) 100vw, (min-width: 768px) 33vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="scroll-film__copy">
                      <h3 className="scroll-film__title text-h3 group-data-[film=on]:text-display">
                        {scene.name}
                      </h3>
                      <div className="scroll-film__text group-data-[film=on]:text-body-lg">
                        <Link
                          href={`/contact?topic=${scene.topic}#enquiry`}
                          className="scroll-film__link"
                        >
                          Send an enquiry
                          <span className="sr-only">
                            {" "}
                            about {scene.name.toLowerCase()}
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollFilm>
      </div>
      <div className="mx-auto mt-10 max-w-wide px-4 md:px-6 lg:px-8">
        <Link
          href="/charter"
          aria-label="View more charter services"
          className={buttonClasses({ variant: "secondary" })}
        >
          {action}
        </Link>
      </div>
    </section>
  );
}
