"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { blindScale, clamp01, filmState } from "./film-math";
import { whenGsapReady } from "./load-gsap";

/** Strips in a scene change (`--film-blinds` in design-system.md). */
export const FILM_BLINDS = 14;

/** Where the film plays: wide and tall screens, motion allowed (D-081). */
const FILM_MEDIA =
  "(min-width: 64rem) and (min-height: 45rem) and (prefers-reduced-motion: no-preference)";

/**
 * The page's one showpiece (motion level 5, D-081). The server renders the
 * scenes as a plain stacked section. Where the film can play, and once
 * GSAP's ScrollTrigger has loaded, the section grows tall and its stage is
 * held below the header with CSS `position: sticky` while the scenes play
 * in turn: each photograph settles, each title resolves through slits, and
 * vertical blinds close and reopen between scenes. One ScrollTrigger reads
 * the native scroll; nothing smooths or takes it over.
 *
 * Children: a `.scroll-film__scenes` list of `.scroll-film__scene` items,
 * each with `.scroll-film__media`, `.scroll-film__title` and
 * `.scroll-film__text` (features/home/charter-scenes.tsx).
 */
export function ScrollFilm({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia(FILM_MEDIA).matches) return;

    return whenGsapReady(({ gsap, ScrollTrigger }) => {
      const media = gsap.matchMedia();
      media.add(FILM_MEDIA, () => {
        // Turning the film on makes the section taller. Only while the
        // section is still below the screen, checked at every activation
        // (GSAP may arrive late; the window may be resized back), so the
        // page never grows under the visitor. Otherwise it stays plain.
        if (root.getBoundingClientRect().top < window.innerHeight) return;
        setOn(true);
        const scenes = Array.from(
          root.querySelectorAll<HTMLElement>(".scroll-film__scene"),
        );
        const blinds = Array.from(
          root.querySelectorAll<HTMLElement>(".scroll-film__blind"),
        );
        const markers = Array.from(
          root.querySelectorAll<HTMLElement>(".scroll-film__marker"),
        );
        let last = "";
        // Measured on every refresh, not on every frame.
        let pinStart = 0;
        let pinEnd = 1;
        const measure = () => {
          const header =
            document.querySelector(".site-header")?.getBoundingClientRect()
              .height ?? 0;
          const top = root.getBoundingClientRect().top + window.scrollY;
          pinStart = top - header;
          pinEnd = top + root.offsetHeight - window.innerHeight;
        };

        const render = (scrollY: number) => {
          const leadIn = clamp01(
            (scrollY - (pinStart - window.innerHeight * 0.6)) /
              (window.innerHeight * 0.6),
          );
          const position =
            clamp01((scrollY - pinStart) / Math.max(pinEnd - pinStart, 1)) *
            count;
          const { active, local, closure } = filmState(position, count);

          const key = `${active}:${local.toFixed(3)}:${closure.toFixed(3)}:${leadIn.toFixed(3)}`;
          if (key === last) return;
          last = key;

          scenes.forEach((scene, index) => {
            const shown = index === active;
            scene.dataset.filmActive = shown ? "true" : "false";
            if (!shown) return;
            // The first scene settles as the section arrives; later ones
            // as soon as their blinds open.
            const settle = index === 0 ? leadIn * 0.5 + local * 0.5 : local;
            const reveal = index === 0 ? leadIn : clamp01(local / 0.3);
            const photo = scene.querySelector<HTMLElement>(
              ".scroll-film__media",
            );
            const title = scene.querySelector<HTMLElement>(
              ".scroll-film__title",
            );
            const text = scene.querySelector<HTMLElement>(".scroll-film__text");
            if (photo) {
              photo.style.transform = `scale(${(1.08 - 0.08 * settle).toFixed(4)})`;
            }
            if (title) {
              title.style.setProperty(
                "--slit",
                `${(reveal * 100).toFixed(1)}%`,
              );
              title.style.transform = `translateY(${((1 - reveal) * 14).toFixed(1)}px)`;
            }
            if (text) {
              const rise = clamp01(reveal * 1.4 - 0.4);
              text.style.opacity = rise.toFixed(3);
              text.style.transform = `translateY(${((1 - rise) * 16).toFixed(1)}px)`;
            }
          });
          blinds.forEach((blind, index) => {
            blind.style.transform = `scaleX(${blindScale(closure, index, blinds.length).toFixed(3)})`;
          });
          markers.forEach((marker, index) => {
            if (index === active) marker.setAttribute("aria-current", "step");
            else marker.removeAttribute("aria-current");
          });
        };

        // A keyboard or screen-reader visitor moving into a scene that is
        // not on show: scroll to the middle of that scene, where it is
        // fully revealed, so focus is never on something invisible.
        const onFocus = (event: FocusEvent) => {
          const scene = (event.target as HTMLElement).closest<HTMLElement>(
            ".scroll-film__scene",
          );
          const index = scene ? scenes.indexOf(scene) : -1;
          if (index < 0 || scene?.dataset.filmActive === "true") return;
          // Measured now: the section may have grown since the last refresh.
          measure();
          const middle = (index + 0.6) / count;
          // On the next frame, after the browser's own scroll to the
          // focused element, which would otherwise undo this one.
          requestAnimationFrame(() =>
            window.scrollTo({
              top: pinStart + (pinEnd - pinStart) * middle,
              behavior: "instant",
            }),
          );
        };
        root.addEventListener("focusin", onFocus);

        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          onUpdate: () => render(window.scrollY),
          onRefresh: () => {
            measure();
            last = "";
            render(window.scrollY);
          },
        });
        measure();
        render(window.scrollY);

        return () => {
          root.removeEventListener("focusin", onFocus);
          trigger.kill();
          setOn(false);
          for (const element of root.querySelectorAll<HTMLElement>(
            ".scroll-film__media, .scroll-film__title, .scroll-film__text, .scroll-film__blind",
          )) {
            element.removeAttribute("style");
          }
          for (const scene of scenes) delete scene.dataset.filmActive;
          for (const marker of markers) marker.removeAttribute("aria-current");
        };
      });
      return () => media.revert();
    });
  }, [count]);

  return (
    <div
      ref={ref}
      data-film={on ? "on" : undefined}
      style={{ "--film-count": count } as React.CSSProperties}
      className="scroll-film group"
    >
      <div className="scroll-film__stage">
        {children}
        <div aria-hidden="true" className="scroll-film__blinds">
          {Array.from({ length: FILM_BLINDS }, (_, index) => (
            <div key={index} className="scroll-film__blind" />
          ))}
        </div>
        {/* Which scene is on show; for the eye only, since every scene
            stays in the page for assistive technology. */}
        <ol aria-hidden="true" className="scroll-film__markers">
          {Array.from({ length: count }, (_, index) => (
            <li key={index} className="scroll-film__marker" />
          ))}
        </ol>
      </div>
    </div>
  );
}
