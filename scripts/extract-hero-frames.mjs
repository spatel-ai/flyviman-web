#!/usr/bin/env node
/**
 * Turns the hero clip into the numbered WebP frames the home page hero
 * plays with the scroll (src/features/home/hero.tsx), plus the first and
 * last frame as posters (the phone still and the still hero).
 *
 *   node scripts/extract-hero-frames.mjs            # the desktop set
 *   node scripts/extract-hero-frames.mjs --phone    # and the phone set
 *
 * Needs ffmpeg, ffprobe and cwebp on the PATH. Frames are scaled with
 * lanczos and encoded once, at high quality, from lossless PNGs; they are
 * never made wider than the clip (that adds bytes, not detail). The script
 * writes each set's count and pixel size to src/features/home/hero-frames.json,
 * which hero-config.ts reads, so a re-run needs no code change;
 * hero-frames.spec.ts checks the files against it.
 *
 * A sharper master. The current clip is 1280 x 720 (H.264, about 3.75 Mbps),
 * shown about 2.25 times enlarged on a Retina laptop: that, not the WebP
 * encoding, is what limits sharpness. When a better master arrives (aim for
 * 2560 x 1440, at least 1920 x 1080; high bitrate H.264/HEVC or ProRes, no
 * burnt-in grain), put it at `source` below and re-run the script. Nothing
 * else changes. Expect bytes and decoded memory to grow with the area: at
 * 2560 wide a frame decodes to about 15 MB rather than 3.7 MB and the
 * desktop set to about four times the bytes. Keep the desktop set within
 * its budget (`budgetMB`, docs/frontend/motion-design.md) by lowering
 * `frames` or `width` (for example 1920) rather than `quality`.
 *
 * The phone set (`--phone`) is not shipped: phones get the still hero
 * (HERO.film.phones in hero-config.ts says how to give them the film).
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CONFIG = {
  source: "media-src/hero/hero-desktop.mp4",
  out: "public/hero",
  manifest: "src/features/home/hero-frames.json",
  posterQuality: 92,
  sets: [
    // `width: null` keeps the clip's own width.
    {
      name: "desktop",
      frames: 96,
      width: null,
      quality: 90,
      posters: true,
      budgetMB: 6,
    },
    // Only with --phone: a narrower, lighter set for the phone film.
    {
      name: "phone",
      frames: 60,
      width: 960,
      quality: 80,
      posters: false,
      budgetMB: 2,
      optional: true,
    },
  ],
};

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();
  } catch (error) {
    console.error(
      `${cmd} failed: ${error.stderr?.toString().trim() || error.message}`,
    );
    process.exit(1);
  }
}

function size(file) {
  const [stream] = JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=width,height",
      "-of",
      "json",
      file,
    ]),
  ).streams;
  return { width: stream.width, height: stream.height };
}

const probe = JSON.parse(
  run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-count_frames",
    "-show_entries",
    "stream=width,height,nb_read_frames",
    "-of",
    "json",
    CONFIG.source,
  ]),
).streams[0];
const total = Number(probe.nb_read_frames);
console.log(`source: ${probe.width}x${probe.height}, ${total} frames`);

const withPhone = process.argv.includes("--phone");
const manifest = {};

for (const set of CONFIG.sets) {
  const dir = join(CONFIG.out, set.name);
  if (set.optional && !withPhone) {
    rmSync(dir, { recursive: true, force: true });
    continue;
  }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const count = Math.min(set.frames, total);
  const width = Math.min(set.width ?? probe.width, probe.width);
  // Evenly spaced across the whole clip, first and last frame included.
  const picks = Array.from({ length: count }, (_, i) =>
    Math.round((i * (total - 1)) / (count - 1)),
  );
  // ffmpeg writes every frame as a lossless PNG; cwebp encodes the picked
  // ones (many ffmpeg builds have no WebP encoder).
  const tmp = mkdtempSync(join(tmpdir(), "hero-frames-"));
  run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    CONFIG.source,
    "-an",
    "-vf",
    `scale=${width}:-2:flags=lanczos+accurate_rnd+full_chroma_int`,
    "-fps_mode",
    "passthrough",
    "-start_number",
    "0",
    join(tmp, "%04d.png"),
  ]);
  const png = (n) => join(tmp, `${String(n).padStart(4, "0")}.png`);
  const webp = (n, quality, out) =>
    run("cwebp", [
      "-quiet",
      "-q",
      String(quality),
      "-m",
      "6",
      "-sharp_yuv",
      png(n),
      "-o",
      out,
    ]);
  picks.forEach((n, i) =>
    webp(
      n,
      set.quality,
      join(dir, `frame-${String(i + 1).padStart(3, "0")}.webp`),
    ),
  );
  if (set.posters) {
    webp(picks[0], CONFIG.posterQuality, join(dir, "poster-first.webp"));
    webp(picks.at(-1), CONFIG.posterQuality, join(dir, "poster-last.webp"));
  }
  const { height } = size(png(picks[0]));
  rmSync(tmp, { recursive: true, force: true });
  manifest[set.name] = { count, width, height };
  const frames = readdirSync(dir).filter((f) => f.startsWith("frame-"));
  const bytes = frames.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
  const mb = bytes / 1048576;
  console.log(
    `${set.name}: ${frames.length} frames, ${width}x${height}, quality ${set.quality}, ` +
      `${mb.toFixed(2)} MB (budget ${set.budgetMB} MB)`,
  );
  if (mb > set.budgetMB) {
    console.warn(`${set.name} is over its budget: lower its frames or width.`);
  }
}

writeFileSync(CONFIG.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${CONFIG.manifest}`);
