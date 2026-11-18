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
import { SearchWidget } from "@/components/booking-v1/search-widget";
import { IMAGES } from "@/content/image-credits";
import { HERO } from "./hero-config";
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
    !document.documentElement.hasAttribute("data-hero-v1-gave-up")
  );
}

function onMotionPreference(changed: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
}

// Runs before the hero paints on a full page load, so the film's first
// frame and its tall track are there from the start (home-v1.css,
// `data-hero-v1-film`). Without JavaScript it is not set and the page shows
// the still hero. If the page's scripts never
// arrive, the film is given up after a while rather than left stuck, and
// stays given up for this view of the page: starting it later would push
// everything below down by two or three screens.
const SCRIPT = `(function(){try{var r=document.documentElement,c=navigator.connection;if(matchMedia(${JSON.stringify(REDUCED_MOTION)}).matches||(c&&c.saveData))return;r.setAttribute("data-hero-v1-film","");setTimeout(function(){if(!r.hasAttribute("data-hero-v1-live")){r.removeAttribute("data-hero-v1-film");r.setAttribute("data-hero-v1-gave-up","")}},8000)}catch(e){}})()`;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * The home page hero: a film played by the scroll, then the charter booking
 * card. The visitor starts at a wing over sunset clouds; scrolling carries
 * the camera through the window into an empty cabin, and over the last
 * frame the card (From, To, Date, Travellers, Search) rises in place. The
 * stage is held by CSS `position: sticky` and the scroll stays native
 * (rules and timeline: docs/frontend/motion-design.md; values:
 * hero-config.ts).
 *
 * Under reduced motion, on a data-saver connection, without JavaScript and
 * in print it is a still: the last frame with the card in place. The
 * headline and the card are in the document and the tab order throughout.
 */
export function Hero() {
  const { timeline } = HERO;
  const track = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);

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
  });

  // Before paint, so arriving by a link shows the right hero at once (the
  // inline script does not run on a client navigation).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-hero-v1-live", "");
    // Asked afresh, not taken from `film`: while the page hydrates `film`
    // is still the server's "no", and dropping the attribute for that one
    // render would collapse the track and put it back.
    root.toggleAttribute("data-hero-v1-film", wantsFilm());
    return () => {
      // Leaving the home page leaves no trace on the others.
      for (const name of ["live", "film", "gave-up"]) {
        root.removeAttribute(`data-hero-v1-${name}`);
      }
    };
  }, [film]);

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

  const { snap } = useScrollProgress(track, {
    lerp: film ? HERO.lerp : 1,
    onFrame(progress) {
      if (!film) return;
      const state = view.current;
      const shown = easeOut(segment(progress, timeline.card));
      stage.current?.style.setProperty("--hero-v1-card", shown.toFixed(3));
      if (card.current) {
        card.current.style.opacity = shown.toFixed(3);
        card.current.style.transform = `translate3d(0, ${((1 - shown) * timeline.cardRise).toFixed(2)}px, 0)`;
        // An unseen card takes no clicks; it stays in the tab order.
        card.current.style.pointerEvents = shown > 0.5 ? "auto" : "none";
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
    const cardElement = card.current;
    if (!surface || !box) return;
    const state = view.current;
    const sequence = sequenceFor();

    const fit = () => {
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
      // Back to the still hero: the style sheet decides again.
      cardElement?.removeAttribute("style");
      box.style.removeProperty("--hero-v1-card");
    };
  }, [film]);

  /** A keyboard reaches the card before the film has shown it. */
  function showCard() {
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
      aria-labelledby="home-hero"
      className="hero-v1-track"
      style={
        {
          "--hero-v1-track": HERO.track.desktop,
          "--hero-v1-track-mobile": HERO.track.mobile,
          "--hero-v1-focal": `${desktop.focalX * 100}%`,
          "--hero-v1-focal-mobile": `${mobile.focalX * 100}%`,
          "--hero-v1-card-rise": `${timeline.cardRise}px`,
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
      <div ref={stage} className="hero-v1-stage">
        <div aria-hidden="true" className="hero-v1-media">
          {/* The film's first frame: on screen before any script runs. */}
          <Image
            src={poster(posters.first)}
            alt=""
            fill
            // The film's first view, so the page's largest paint. Fetched
            // for still visitors too: the server cannot know who they are.
            preload
            sizes="(max-width: 767px) 300vw, 100vw"
            className="hero-v1-poster hero-v1-poster--first"
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
            className="hero-v1-poster hero-v1-poster--last"
            onError={() => setPosterFailed(true)}
          />
          <canvas ref={canvas} className="hero-v1-canvas" />
        </div>
        <div aria-hidden="true" className="hero-v1-shade" />
        <div className="hero-v1-content">
          <h1
            id="home-hero"
            className="hero-v1-headline max-w-xl text-title text-on-photo sm:text-h2 md:text-h1"
          >
            {HERO.text.headline.join(" ")}
          </h1>
          <div ref={card} className="hero-v1-card" onFocusCapture={showCard}>
            <SearchWidget initial={{ service: "charter" }} />
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
