#!/usr/bin/env node
/**
 * Turns the hero clip into the numbered WebP frames the home page hero
 * plays with the scroll (src/features/home/hero.tsx), plus the first and
 * last frame as posters for the desktop set (the hero uses those only).
 *
 *   node scripts/extract-hero-frames.mjs
 *
 * Needs ffmpeg, ffprobe and cwebp on the PATH. After changing a frame count
 * or width, or using a clip of another size, update `sequences` (count,
 * width, height) in src/features/home/hero-config.ts; hero-frames.spec.ts
 * fails until they match the files.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CONFIG = {
  source: "media-src/hero/hero-desktop.mp4",
  out: "public/hero",
  /** Frames are never made wider than the clip: that adds bytes, not detail. */
  allowUpscale: false,
  posterQuality: 88,
  sets: [
    { name: "desktop", frames: 118, width: 1920, quality: 80, posters: true },
    { name: "mobile", frames: 80, width: 1080, quality: 76, posters: false },
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

for (const set of CONFIG.sets) {
  const dir = join(CONFIG.out, set.name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const count = Math.min(set.frames, total);
  const width = CONFIG.allowUpscale
    ? set.width
    : Math.min(set.width, probe.width);
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
    `scale=${width}:-2:flags=lanczos`,
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
  rmSync(tmp, { recursive: true, force: true });
  const frames = readdirSync(dir).filter((f) => f.startsWith("frame-"));
  const bytes = frames.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
  console.log(
    `${set.name}: ${frames.length} frames, ${width}px wide, quality ${set.quality}, ` +
      `${(bytes / 1048576).toFixed(2)} MB`,
  );
}
