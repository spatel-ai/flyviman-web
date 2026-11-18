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
import { HERO, type HeroSequence, type HeroSet } from "./hero-config";
import {
  coverRect,
  drawFrame,
  smoothingAfter,
  SMOOTHING,
  frameAt,
  loadFrames,
  tooSlow,
  type FrameStore,
} from "./hero-frames";
import { segment, useScrollProgress } from "./use-scroll-progress";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** Where the film plays: a screen it fits (HERO.film), motion allowed. */
const FILM_SCREEN = HERO.film.phones
  ? `not all and ${HERO.film.turnedPhone}`
  : HERO.film.media;

/**
 * Set when the film could not keep up on this device (HERO.giveUp): the
 * still hero for the rest of the visit.
 */
let tooSlowHere = false;
const TOO_SLOW = "hero-too-slow";

/**
 * Reduced motion, a data-saver connection, a device too slow for the film,
 * a page whose scripts came so late that the inline script gave the film
 * up, a turned phone, or (without HERO.film.phones) any phone: the still
 * hero, no film.
 */
function wantsFilm() {
  const connection = (navigator as { connection?: { saveData?: boolean } })
    .connection;
  return (
    window.matchMedia(FILM_SCREEN).matches &&
    !window.matchMedia(REDUCED_MOTION).matches &&
    !connection?.saveData &&
    !tooSlowHere &&
    !document.documentElement.hasAttribute("data-hero-gave-up")
  );
}

/** The frame set for this screen (HERO.film.screens), or null for a still. */
function filmSet(): HeroSet | null {
  if (!wantsFilm()) return null;
  if (!HERO.film.phones) return "desktop";
  const { screens } = HERO.film;
  if (window.matchMedia(screens.phone).matches) return "phone";
  if (window.matchMedia(screens["tablet-portrait"]).matches)
    return "tablet-portrait";
  return "desktop";
}

/** Turning a phone or tablet, or resizing a window across the sets' limits. */
function onFilmConditions(changed: () => void) {
  const queries = [
    FILM_SCREEN,
    REDUCED_MOTION,
    ...Object.values(HERO.film.screens),
  ].map((q) => window.matchMedia(q));
  for (const query of queries) query.addEventListener("change", changed);
  window.addEventListener(TOO_SLOW, changed);
  return () => {
    for (const query of queries) query.removeEventListener("change", changed);
    window.removeEventListener(TOO_SLOW, changed);
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
 * Upright phones and tablets play portrait frame sets cropped along the
 * focal path (CR-2d; HERO.film.screens); on a phone the headline gives way
 * as the card rises. A turned phone gets the still. Under reduced motion, on a data-saver connection, on a
 * device too slow for the film, without JavaScript and in print it is a
 * still with the card in place: on a phone the first frame as a photo band
 * under the headline, the card overlapping its foot; elsewhere the last
 * frame. The headline and the card are in the document and the tab order
 * throughout.
 */
export function Hero() {
  const { timeline } = HERO;
  const track = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);

  const set = useSyncExternalStore(onFilmConditions, filmSet, () => null);
  const film = set !== null;
  const [posterFailed, setPosterFailed] = useState(false);

  // What the canvas is showing, kept outside React: it changes every frame.
  const view = useRef<View>({
    current: null,
    previous: null,
    progress: 0,
    shown: -1,
    smoothing: 0,
    drawTimes: [],
    lowTimes: [],
    drawn: -1,
    drawnFrom: null,
    cleared: true,
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
    root.toggleAttribute("data-hero-too-slow", tooSlowHere);
    return () => {
      // Leaving the home page leaves no trace on the others.
      for (const name of ["live", "film", "gave-up", "too-slow"]) {
        root.removeAttribute(`data-hero-${name}`);
      }
    };
  }, [film]);

  const draw = () =>
    paint(view.current, canvas.current?.getContext("2d"), track.current);

  const { snap, end } = useScrollProgress(track, {
    settleMs: film ? HERO.settleMs : 0,
    hold: stage,
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
      state.progress = progress;
      draw();
    },
  });

  // Back to the still hero when the film stops: no frames kept, and the
  // style sheet decides the card again.
  useEffect(() => {
    if (!film) return;
    const state = view.current;
    const box = stage.current;
    const cardElement = card.current;
    return () => {
      state.current?.frames.destroy();
      state.previous?.frames.destroy();
      state.current = null;
      state.previous = null;
      state.drawn = -1;
      state.drawnFrom = null;
      state.shown = -1;
      cardElement?.removeAttribute("style");
      box?.style.removeProperty("--hero-card");
    };
  }, [film]);

  // The canvas and the frames for this screen, only while the film plays.
  // A turned phone or tablet that changes set loads the new one and draws
  // from the old one until it has a frame.
  useEffect(() => {
    if (!set) return;
    const surface = canvas.current;
    const box = stage.current;
    if (!surface || !box) return;
    const state = view.current;
    const sequence = HERO.sequences[set];

    const fit = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, HERO.maxPixelRatio);
      const width = Math.round(box.clientWidth * ratio);
      const height = Math.round(box.clientHeight * ratio);
      if (!width || !height) return;
      const same = surface.width === width && surface.height === height;
      if (same && state.current?.sequence === sequence) return;
      // Setting a canvas's size clears it, so only when it has changed.
      if (!same) {
        surface.width = width;
        surface.height = height;
        state.cleared = true;
      }
      const rect = coverRect(
        sequence.width,
        sequence.height,
        width,
        height,
        sequence.focalX,
      );
      // Frames are decoded only as wide as the screen can show, with room
      // to spare; a much wider window, or another set, starts again.
      const kept =
        state.current?.sequence === sequence ? state.current.frames.keep : null;
      if (
        !kept ||
        rect.sx < kept.x ||
        rect.sx + rect.sw > kept.x + kept.width
      ) {
        state.previous?.frames.destroy();
        state.previous = state.current;
        const spare = rect.sw / 2;
        const x = Math.max(0, rect.sx - spare);
        const next: Film = {
          sequence,
          frames: loadFrames({
            ...HERO.loading,
            decodeAhead: sequence.decodeAhead,
            decodeBehind: sequence.decodeBehind,
            count: sequence.count,
            path: sequence.path,
            height: sequence.height,
            keep: {
              x,
              width: Math.min(sequence.width, rect.sx + rect.sw + spare) - x,
            },
            onLoad(index) {
              if (state.current !== next) return;
              const wanted = wantedFrom(state, next);
              const now = Math.abs(state.drawn - wanted);
              if (state.drawnFrom !== next || Math.abs(index - wanted) < now)
                paint(state, surface.getContext("2d"), track.current);
            },
          }),
        };
        state.current = next;
      }
      paint(state, surface.getContext("2d"), track.current);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    fit();
    return () => observer.disconnect();
  }, [set]);

  /** A keyboard reaches the card before the film has shown it. */
  function showCard() {
    if (!film) return;
    const top = end();
    if (window.scrollY >= top - 1) return;
    snap();
    window.scrollTo({ top, behavior: "instant" });
  }

  const { desktop, phone } = HERO.sequences;
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
          "--hero-focal": `${desktop.posterFocalX * 100}%`,
          "--hero-focal-phone": `${phone.posterFocalX * 100}%`,
          "--hero-focal-tablet": `${HERO.sequences["tablet-portrait"].posterFocalX * 100}%`,
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

/** A frame set and its frames, as loaded for the screen. */
interface Film {
  sequence: HeroSequence;
  frames: FrameStore;
}

/** What the canvas is showing. */
interface View {
  /** The frames for the screen as it is. */
  current: Film | null;
  /** Those being replaced, drawn from until the new ones have a frame. */
  previous: Film | null;
  progress: number;
  /** How far the card has risen, as last set (0 to 1). */
  shown: number;
  /** The SMOOTHING level drawn with, and the last draws' times (ms). */
  smoothing: number;
  drawTimes: number[];
  /** The last draws' times once the cheapest filter is in use. */
  lowTimes: number[];
  /** Which frame of which film the canvas shows. */
  drawn: number;
  drawnFrom: Film | null;
  /** The canvas was cleared (resized) and needs drawing again. */
  cleared: boolean;
}

/** The frame `film` shows at the current progress. */
function wantedFrom(view: View, film: Film) {
  return frameAt(view.progress, HERO.timeline.frames, film.sequence.count);
}

/** Draws the frame the film wants now, if it has changed. */
function paint(
  view: View,
  context: CanvasRenderingContext2D | null | undefined,
  track: HTMLElement | null,
) {
  if (!context || !view.current) return;
  view.current.frames.focus(wantedFrom(view, view.current));
  let source = view.current;
  let hit = source.frames.nearest(wantedFrom(view, source));
  if (hit && view.previous) {
    view.previous.frames.destroy();
    view.previous = null;
  } else if (!hit && view.previous) {
    // The screen changed and the new frames are not decoded yet: the old
    // ones are a better picture than the poster beneath.
    source = view.previous;
    hit = source.frames.nearest(wantedFrom(view, source));
  }
  if (!hit) return;
  if (hit.index === view.drawn && source === view.drawnFrom && !view.cleared)
    return;
  const { sequence } = source;
  const start = performance.now();
  drawFrame(
    context,
    hit.image,
    coverRect(
      sequence.width,
      sequence.height,
      context.canvas.width,
      context.canvas.height,
      sequence.focalX,
    ),
    source.frames.keep.x,
    SMOOTHING[view.smoothing],
  );
  // Timed to the next frame's start, not around drawImage: the browser
  // paints the canvas later, so the cost of a slow filter shows as a late
  // frame, not a slow call.
  requestAnimationFrame((next) => {
    const ms = next - start;
    // A hidden tab pauses frames: that is not the film running slow.
    if (ms > 1000) return;
    const cheapest = view.smoothing === SMOOTHING.length - 1;
    view.smoothing = smoothingAfter(
      view.smoothing,
      view.drawTimes,
      ms,
      HERO.slowDraws,
    );
    if (cheapest && tooSlow(view.lowTimes, ms, HERO.giveUp)) giveUp(track);
  });
  view.drawn = hit.index;
  view.drawnFrom = source;
  view.cleared = false;
  context.canvas.dataset.frame = String(hit.index);
  context.canvas.dataset.set = sequence.name;
}

/**
 * The film cannot keep up here: the still hero with the card, for the rest
 * of the visit. The track shrinks to the still's height, so a visitor
 * part-way down it is taken to the top, where the card is.
 */
function giveUp(track: HTMLElement | null) {
  if (tooSlowHere) return;
  tooSlowHere = true;
  const top = track?.getBoundingClientRect().top ?? 0;
  document.documentElement.removeAttribute("data-hero-film");
  if (top < 0) window.scrollTo({ top: 0, behavior: "instant" });
  window.dispatchEvent(new Event(TOO_SLOW));
}
