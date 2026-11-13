"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { buttonClasses } from "@/components/ui/button-classes";
import { IMAGES } from "@/content/image-credits";
import { HERO, type HeroRange } from "./hero-config";
import {
  coverRect,
  drawFrame,
  frameAt,
  loadFrames,
  type FrameStore,
  type SourceRect,
} from "./hero-frames";
import { segment, useScrollProgress } from "./use-scroll-progress";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Reduced motion, a data-saver connection, or a page whose scripts came so
 * late that the inline script gave the film up: the still hero, no film.
 */
function wantsFilm() {
  const connection = (navigator as { connection?: { saveData?: boolean } })
    .connection;
  return (
    !window.matchMedia(REDUCED_MOTION).matches &&
    !connection?.saveData &&
    !document.documentElement.hasAttribute("data-hero-gave-up")
  );
}

function headerHeight() {
  return document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
}

function onMotionPreference(changed: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
}

// Runs before the hero paints on a full page load, so the film's first
// frame and the clear header are there from the start (globals.css,
// `data-hero-film` and `data-over-hero`). Without JavaScript neither is
// set and the page shows the still hero. If the page's scripts never
// arrive, the film is given up after a while rather than left stuck, and
// stays given up for this view of the page: starting it later would push
// everything below down by two or three screens.
const SCRIPT = `(function(){try{var r=document.documentElement,c=navigator.connection;r.setAttribute("data-over-hero","");if(matchMedia(${JSON.stringify(REDUCED_MOTION)}).matches||(c&&c.saveData))return;r.setAttribute("data-hero-film","");setTimeout(function(){if(!r.hasAttribute("data-hero-live")){r.removeAttribute("data-hero-film");r.setAttribute("data-hero-gave-up","")}},8000)}catch(e){}})()`;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Fades and lifts one part of the text as `range` of the scroll passes. */
function enter(
  element: HTMLElement | null,
  progress: number,
  range: HeroRange,
) {
  if (!element) return 0;
  const t = easeOut(segment(progress, range));
  element.style.opacity = t.toFixed(3);
  element.style.transform = `translate3d(0, ${((1 - t) * HERO.timeline.enterRise).toFixed(2)}px, 0)`;
  return t;
}

/**
 * The home page hero: a film played by the scroll. The visitor starts at a
 * jet window filled with cloud; scrolling draws the camera back into the
 * cabin, where the headline and the page's one action appear. The stage is
 * held by CSS `position: sticky` and the scroll stays native (rules and
 * timeline: docs/frontend/motion-design.md; values: hero-config.ts).
 *
 * Under reduced motion, on a data-saver connection, without JavaScript and
 * in print it is a still: the cabin, with the headline and action in place.
 * The headline and action are in the document throughout.
 */
export function Hero() {
  const { text, timeline } = HERO;
  const track = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const opening = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const closing = useRef<HTMLDivElement>(null);
  const eyebrow = useRef<HTMLParagraphElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const action = useRef<HTMLDivElement>(null);

  const film = useSyncExternalStore(onMotionPreference, wantsFilm, () => false);
  const [posterFailed, setPosterFailed] = useState(false);

  // What the canvas is showing, kept outside React: it changes every frame.
  const view = useRef({
    store: null as FrameStore | null,
    /** The store being replaced, drawn from until the new one has a frame. */
    previous: null as FrameStore | null,
    rect: null as SourceRect | null,
    wanted: 0,
    drawn: -1,
    stale: false,
    headerHeight: 0,
    drifting: true,
  });

  // Before paint, so arriving by a link shows the right hero and a clear
  // header at once (the inline script does not run on a client navigation).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-hero-live", "");
    // Asked afresh, not taken from `film`: while the page hydrates `film`
    // is still the server's "no", and dropping the attribute for that one
    // render would collapse the track and put it back.
    root.toggleAttribute("data-hero-film", wantsFilm());
    view.current.headerHeight = headerHeight();
    const bottom = track.current?.getBoundingClientRect().bottom ?? 0;
    root.toggleAttribute("data-over-hero", bottom > view.current.headerHeight);
  }, [film]);

  // Leaving the home page gives every other page its usual header.
  useLayoutEffect(() => {
    const root = document.documentElement;
    return () => {
      for (const name of ["live", "film", "scrolled", "gave-up"]) {
        root.removeAttribute(`data-hero-${name}`);
      }
      root.removeAttribute("data-over-hero");
    };
  }, []);

  function draw() {
    const state = view.current;
    const context = canvas.current?.getContext("2d");
    if (!context || !state.rect) return;
    state.store?.focus(state.wanted);
    let source = state.store;
    let hit = source?.nearest(state.wanted) ?? null;
    if (hit && state.previous) {
      state.previous.destroy();
      state.previous = null;
    } else if (!hit && state.previous) {
      // A resize cleared the canvas and the new frames are not decoded
      // yet: the old ones are a better picture than the poster beneath.
      source = state.previous;
      hit = source.nearest(state.wanted);
      state.stale = true;
    }
    if (!source || !hit) return;
    if (hit.index === state.drawn && !state.stale) return;
    drawFrame(context, hit.image, state.rect, source.keep.x);
    state.drawn = hit.index;
    state.stale = source !== state.store;
    context.canvas.dataset.frame = String(hit.index);
  }

  /** The sky drifts only while the page rests at the top. */
  function setDrift(on: boolean) {
    const state = view.current;
    const layer = media.current;
    if (!layer || state.drifting === on) return;
    state.drifting = on;
    const root = document.documentElement;
    if (on) {
      layer.style.transition = "";
      layer.style.transform = "";
      root.removeAttribute("data-hero-scrolled");
      return;
    }
    // Hold the drift where it is, then let it ease back: no jump.
    layer.style.transform = getComputedStyle(layer).transform;
    root.setAttribute("data-hero-scrolled", "");
    requestAnimationFrame(() => {
      layer.style.transition = "transform 600ms var(--ease-standard)";
      layer.style.transform = "none";
    });
  }

  const { snap } = useScrollProgress(track, {
    lerp: film ? HERO.lerp : 1,
    onFrame(progress, { target, bottom }) {
      const state = view.current;
      // The header is clear over the hero and itself again below it.
      document.documentElement.toggleAttribute(
        "data-over-hero",
        bottom > state.headerHeight,
      );
      if (!film) return;

      setDrift(target === 0 && progress === 0);
      if (opening.current) {
        const gone = segment(progress, timeline.openingOut);
        opening.current.style.opacity = (1 - gone).toFixed(3);
        opening.current.style.transform = `translate3d(0, ${(-gone * timeline.openingRise).toFixed(2)}px, 0)`;
      }
      if (scrim.current) {
        scrim.current.style.opacity = segment(progress, timeline.scrim).toFixed(
          3,
        );
      }
      enter(eyebrow.current, progress, timeline.eyebrow);
      enter(headline.current, progress, timeline.headline);
      const shown = enter(action.current, progress, timeline.action);
      // An unseen button takes no clicks; it stays in the tab order.
      if (closing.current) {
        closing.current.style.pointerEvents = shown > 0.5 ? "" : "none";
      }
      state.wanted = frameAt(progress, timeline.frames, sequenceFor().count);
      draw();
    },
  });

  // The canvas and its frames, only while the film plays.
  useEffect(() => {
    if (!film) return;
    const surface = canvas.current;
    const box = stage.current;
    if (!surface || !box) return;
    const state = view.current;
    const sequence = sequenceFor();
    const styled = [opening, scrim, closing, eyebrow, headline, action, media];

    const fit = () => {
      state.headerHeight = headerHeight();
      const ratio = Math.min(window.devicePixelRatio || 1, HERO.maxPixelRatio);
      const width = Math.round(box.clientWidth * ratio);
      const height = Math.round(box.clientHeight * ratio);
      if (!width || !height) return;
      const same = surface.width === width && surface.height === height;
      if (same && state.store) return;
      // Setting a canvas's size clears it, so only when it has changed.
      if (!same) {
        surface.width = width;
        surface.height = height;
      }
      const rect = coverRect(
        sequence.width,
        sequence.height,
        width,
        height,
        sequence.focalX,
      );
      state.rect = rect;
      state.stale = true;
      // Frames are decoded only as wide as the screen can show, with room
      // to spare; a much wider window (a turned phone) starts again.
      const kept = state.store?.keep;
      if (
        !kept ||
        rect.sx < kept.x ||
        rect.sx + rect.sw > kept.x + kept.width
      ) {
        state.previous?.destroy();
        state.previous = state.store;
        state.drawn = -1;
        const spare = rect.sw / 2;
        const x = Math.max(0, rect.sx - spare);
        state.store = loadFrames({
          ...HERO.loading,
          count: sequence.count,
          path: sequence.path,
          height: sequence.height,
          keep: {
            x,
            width: Math.min(sequence.width, rect.sx + rect.sw + spare) - x,
          },
          onLoad(index) {
            const now = Math.abs(state.drawn - state.wanted);
            if (state.drawn < 0 || Math.abs(index - state.wanted) < now) draw();
          },
        });
      }
      draw();
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    fit();
    return () => {
      observer.disconnect();
      state.store?.destroy();
      state.previous?.destroy();
      state.store = null;
      state.previous = null;
      state.drawn = -1;
      state.drifting = true;
      // Back to the still hero: the style sheet decides again.
      for (const ref of styled) ref.current?.removeAttribute("style");
    };
  }, [film]);

  /** A keyboard reaches the button before the film has shown it. */
  function showAction() {
    const element = track.current;
    if (!film || !element) return;
    const rect = element.getBoundingClientRect();
    const end = window.scrollY + rect.bottom - window.innerHeight;
    if (window.scrollY >= end - 1) return;
    snap();
    window.scrollTo({ top: end, behavior: "instant" });
  }

  const { desktop, mobile } = HERO.sequences;
  const { posters } = HERO;
  const poster = (src: string) => (posterFailed ? IMAGES.hero.src : src);
  return (
    <section
      ref={track}
      className="hero-track"
      style={
        {
          "--hero-track": HERO.track.desktop,
          "--hero-track-mobile": HERO.track.mobile,
          "--hero-focal": `${desktop.focalX * 100}%`,
          "--hero-focal-mobile": `${mobile.focalX * 100}%`,
          "--hero-drift-scale": HERO.drift.scale,
          "--hero-drift-seconds": `${HERO.drift.seconds}s`,
        } as CSSProperties
      }
    >
      <script
        // Inert when React creates it in the browser: a script inserted on
        // a client navigation never runs, and React warns about it.
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SCRIPT }}
      />
      <div ref={stage} className="hero-stage">
        <p className="sr-only">{text.scene}</p>
        <div ref={media} className="hero-media">
          {/* The film's first frame: on screen before any script runs. */}
          <Image
            src={poster(posters.first)}
            alt=""
            fill
            // The film's first view, so the page's largest paint. Fetched
            // for still visitors too: the server cannot know who they are.
            preload
            sizes="(max-width: 767px) 300vw, 100vw"
            className="hero-poster hero-poster--first"
            onError={() => setPosterFailed(true)}
          />
          {/* Its last frame: the still hero. */}
          <Image
            src={poster(posters.last)}
            alt=""
            fill
            // The still hero, on screen at once for those who see it.
            loading="eager"
            sizes="(max-width: 767px) 300vw, 100vw"
            className="hero-poster hero-poster--last"
            onError={() => setPosterFailed(true)}
          />
          <canvas ref={canvas} aria-hidden="true" className="hero-canvas" />
        </div>
        <div aria-hidden="true" className="hero-shade" />
        <div ref={scrim} aria-hidden="true" className="hero-scrim" />
        <div ref={opening} className="hero-opening">
          <p className="hero-opening__line text-overline">{text.opening}</p>
          <span aria-hidden="true" className="hero-cue" />
        </div>
        <div ref={closing} className="hero-closing">
          <div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8">
            <p ref={eyebrow} className="hero-part hero-eyebrow text-overline">
              {text.eyebrow}
            </p>
            <h1
              ref={headline}
              className="hero-part mt-4 text-h1 lg:mt-5 lg:text-hero"
            >
              {text.headline.map((line) => (
                <span key={line} className="lg:block">
                  {line}{" "}
                </span>
              ))}
            </h1>
            <div ref={action} className="hero-part mt-8 lg:mt-10">
              <Magnetic>
                <a
                  href={text.action.href}
                  className={buttonClasses({ size: "lg" })}
                  onFocus={showAction}
                >
                  {text.action.label}
                </a>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Chosen once, by the width of the window when the film starts. */
let chosen: (typeof HERO.sequences)[keyof typeof HERO.sequences] | null = null;
function sequenceFor() {
  chosen ??=
    window.innerWidth < HERO.mobileBelow
      ? HERO.sequences.mobile
      : HERO.sequences.desktop;
  return chosen;
}
