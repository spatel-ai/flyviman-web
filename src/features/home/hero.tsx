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
import { SearchWidget } from "@/components/booking/search-widget";
import { IMAGES } from "@/content/image-credits";
import { HERO, type HeroSequence } from "./hero-config";
import {
  coverRect,
  drawFrame,
  smoothingAfter,
  SMOOTHING,
  frameAt,
  loadFrames,
  type FrameStore,
  type SourceRect,
} from "./hero-frames";
import { segment, useScrollProgress } from "./use-scroll-progress";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** Where the film plays: a screen it fits (HERO.film), motion allowed. */
const FILM_SCREEN = HERO.film.phones ? "all" : HERO.film.media;

/**
 * A phone, reduced motion, a data-saver connection, or a page whose
 * scripts came so late that the inline script gave the film up: the still
 * hero, no film.
 */
function wantsFilm() {
  const connection = (navigator as { connection?: { saveData?: boolean } })
    .connection;
  return (
    window.matchMedia(FILM_SCREEN).matches &&
    !window.matchMedia(REDUCED_MOTION).matches &&
    !connection?.saveData &&
    !document.documentElement.hasAttribute("data-hero-gave-up")
  );
}

/** Turning a tablet or resizing a window across the film's limits. */
function onFilmConditions(changed: () => void) {
  const queries = [FILM_SCREEN, REDUCED_MOTION].map((q) =>
    window.matchMedia(q),
  );
  for (const query of queries) query.addEventListener("change", changed);
  return () => {
    for (const query of queries) query.removeEventListener("change", changed);
  };
}

// Runs before the hero paints on a full page load, so the film's first
// frame and its tall track are there from the start (globals.css,
// `data-hero-film`). Without JavaScript it is not set and the page shows
// the still hero. If the page's scripts never
// arrive, the film is given up after a while rather than left stuck, and
// stays given up for this view of the page: starting it later would push
// everything below down by two or three screens.
const SCRIPT = `(function(){try{var r=document.documentElement,c=navigator.connection;if(!matchMedia(${JSON.stringify(FILM_SCREEN)}).matches||matchMedia(${JSON.stringify(REDUCED_MOTION)}).matches||(c&&c.saveData))return;r.setAttribute("data-hero-film","");setTimeout(function(){if(!r.hasAttribute("data-hero-live")){r.removeAttribute("data-hero-film");r.setAttribute("data-hero-gave-up","")}},8000)}catch(e){}})()`;

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
 * On a phone (HERO.film) it is a still: the first frame as a photo band
 * under the headline, the card overlapping its foot. Under reduced motion,
 * on a data-saver connection, without JavaScript and in print it is the
 * last frame with the card in place. The headline and the card are in the
 * document and the tab order throughout.
 */
export function Hero() {
  const { timeline } = HERO;
  const track = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);

  const film = useSyncExternalStore(onFilmConditions, wantsFilm, () => false);
  const [posterFailed, setPosterFailed] = useState(false);

  // What the canvas is showing, kept outside React: it changes every frame.
  const view = useRef({
    store: null as FrameStore | null,
    /** The store being replaced, drawn from until the new one has a frame. */
    previous: null as FrameStore | null,
    rect: null as SourceRect | null,
    wanted: 0,
    /** How far the card has risen, as last set (0 to 1). */
    shown: -1,
    /** The SMOOTHING level drawn with, and the last draws' times (ms). */
    smoothing: 0,
    drawTimes: [] as number[],
    drawn: -1,
    stale: false,
  });

  // Before paint, so arriving by a link shows the right hero at once (the
  // inline script does not run on a client navigation).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-hero-live", "");
    // Asked afresh, not taken from `film`: while the page hydrates `film`
    // is still the server's "no", and dropping the attribute for that one
    // render would collapse the track and put it back.
    root.toggleAttribute("data-hero-film", wantsFilm());
    return () => {
      // Leaving the home page leaves no trace on the others.
      for (const name of ["live", "film", "gave-up"]) {
        root.removeAttribute(`data-hero-${name}`);
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
    const start = performance.now();
    drawFrame(
      context,
      hit.image,
      state.rect,
      source.keep.x,
      SMOOTHING[state.smoothing],
    );
    // Timed to the next frame's start, not around drawImage: the browser
    // paints the canvas later, so the cost of a slow filter shows as a
    // late frame, not a slow call.
    requestAnimationFrame((next) => {
      state.smoothing = smoothingAfter(
        state.smoothing,
        state.drawTimes,
        next - start,
        HERO.slowDraws,
      );
    });
    state.drawn = hit.index;
    state.stale = source !== state.store;
    context.canvas.dataset.frame = String(hit.index);
  }

  const { snap } = useScrollProgress(track, {
    settleMs: film ? HERO.settleMs : 0,
    onFrame(progress) {
      if (!film) return;
      const state = view.current;
      const shown = Number(
        easeOut(segment(progress, timeline.card)).toFixed(3),
      );
      if (shown !== state.shown && card.current) {
        state.shown = shown;
        stage.current?.style.setProperty("--hero-card", String(shown));
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
      state.shown = -1;
      // Back to the still hero: the style sheet decides again.
      cardElement?.removeAttribute("style");
      box.style.removeProperty("--hero-card");
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

  const { desktop } = HERO.sequences;
  const { posters } = HERO;
  const poster = (src: string) => (posterFailed ? IMAGES.hero.src : src);
  return (
    <section
      ref={track}
      aria-labelledby="home-hero"
      className="hero-track"
      style={
        {
          "--hero-track": HERO.track.desktop,
          "--hero-track-phone": HERO.track.phone,
          "--hero-focal": `${desktop.focalX * 100}%`,
          "--hero-band-focal": `${HERO.bandFocalX * 100}%`,
          "--hero-card-rise": `${timeline.cardRise}px`,
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
        <div aria-hidden="true" className="hero-media">
          {/* The film's first frame: on screen before any script runs, and
              a phone's still. Served as made (quality 92, the clip's own
              width): the optimiser would only encode it again at 75. */}
          <Image
            src={poster(posters.first)}
            alt=""
            fill
            unoptimized
            // The film's first view or the phone's band, so the page's
            // largest paint. Fetched for still visitors too: the server
            // cannot know who they are.
            preload
            className="hero-poster hero-poster--first"
            onError={() => setPosterFailed(true)}
          />
          {/* Its last frame: the still hero. */}
          <Image
            src={poster(posters.last)}
            alt=""
            fill
            unoptimized
            // The still hero, on screen at once for those who see it.
            loading="eager"
            className="hero-poster hero-poster--last"
            onError={() => setPosterFailed(true)}
          />
          <canvas ref={canvas} className="hero-canvas" />
        </div>
        <div aria-hidden="true" className="hero-shade" />
        <div className="hero-content">
          <h1
            id="home-hero"
            className="hero-headline max-w-xl text-title text-on-photo sm:text-h2 md:text-h1"
          >
            {HERO.text.headline.join(" ")}
          </h1>
          <div ref={card} className="hero-card" onFocusCapture={showCard}>
            <SearchWidget initial={{ service: "charter" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Chosen once, by the window when the film starts: the phone set only
 * where phones have the film (HERO.film.phones) and one was made.
 */
let chosen: HeroSequence | null = null;
function sequenceFor() {
  const { desktop, phone } = HERO.sequences;
  chosen ??=
    phone && !window.matchMedia(HERO.film.media).matches ? phone : desktop;
  return chosen;
}
