import type { CSSProperties } from "react";
import Image from "next/image";
import { buttonClasses } from "@/components/ui/button";
import { Intro } from "@/components/motion/intro";
import { Magnetic } from "@/components/motion/magnetic";
import { ScrollScrub } from "@/components/motion/scroll-scrub";
import { HOME } from "@/content/home";
import { IMAGES } from "@/content/image-credits";

/**
 * Headline, one action, one large photograph. On a visitor's first view the
 * intro opens the page and the headline's words rise into place; the
 * photograph drifts slowly with a passing glint (globals.css, `.hero-*`).
 */
export function Hero() {
  const image = IMAGES.hero;
  const { headline, action } = HOME.hero;
  // Each word's position in the whole headline, for the stagger.
  const lines = headline.map((line, index) => ({
    words: line.split(" "),
    offset: headline.slice(0, index).join(" ").split(" ").filter(Boolean)
      .length,
  }));
  return (
    <section className="mx-auto max-w-wide px-4 pt-16 md:px-6 md:pt-24 lg:px-8">
      <Intro />
      <ScrollScrub
        trigger="section"
        start="top top"
        end="bottom top"
        from={{ yPercent: 0, opacity: 1 }}
        to={{ yPercent: -12, opacity: 0.6 }}
        className="mx-auto max-w-content text-center"
      >
        <h1 className="text-h1 md:text-display">
          {/* Read as one sentence; the animated words are for the eye. */}
          <span className="sr-only">{headline.join(" ")}</span>
          <span aria-hidden="true">
            {lines.map(({ words, offset }) => (
              <span key={offset} className="block">
                {words.map((text, index) => (
                  // Each word sits in a clipped box and rises into it. The
                  // space stays outside, so the line wraps normally.
                  <span key={index}>
                    <span className="intro-word">
                      <span
                        style={
                          { "--word-index": offset + index } as CSSProperties
                        }
                      >
                        {text}
                      </span>
                    </span>{" "}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </h1>
        <Magnetic className="intro-after mt-8">
          <a href={action.href} className={buttonClasses({ size: "lg" })}>
            {action.label}
          </a>
        </Magnetic>
      </ScrollScrub>
      <div className="relative mt-12 aspect-4/3 overflow-hidden rounded-xl bg-surface md:mt-16 md:aspect-21/9">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          preload
          placeholder="blur"
          sizes="(min-width: 1200px) 1136px, 100vw"
          className="hero-drift object-cover"
        />
        <div aria-hidden="true" className="hero-glint" />
      </div>
    </section>
  );
}
