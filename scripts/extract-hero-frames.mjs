#!/usr/bin/env node
/**
 * Turns the hero clip into the numbered WebP frames the home page hero
 * plays with the scroll (src/features/home/hero.tsx), plus the first and
 * last frame as posters (the phone still's band and the still hero).
 *
 *   node scripts/extract-hero-frames.mjs
 *
 * Makes three sets (CR-2d, docs/frontend/motion-design.md):
 * - `desktop`: the whole frame, for landscape tablets, laptops and desktops;
 * - `phone`: a portrait slice about 0.53 as wide as it is tall, for phones;
 * - `tablet-portrait`: a slice about 0.72 as wide, for upright tablets.
 * The portrait slices keep the clip's full height and follow the focal
 * path (src/features/home/focal-path.ts): the wing first, then the window,
 * then the cabin centred. Change the path there and re-run this script.
 *
 * Needs Node 22.18 or later (it reads focal-path.ts directly), and ffmpeg,
 * ffprobe and cwebp on the PATH. Frames are encoded once, at high quality,
 * from lossless PNGs; the desktop set is scaled with lanczos and never made
 * wider than the clip (that adds bytes, not detail). The script writes each
 * set's count and pixel size to src/features/home/hero-frames.json, which
 * hero-config.ts reads, so a re-run needs no code change;
 * hero-frames.spec.ts checks the files against it.
 *
 * A sharper master. The current clip is 1280 x 720 (H.264, about 3.75 Mbps),
 * shown about 2.25 times enlarged on a Retina laptop: that, not the WebP
 * encoding, is what limits sharpness. When a better master arrives (aim for
 * 2560 x 1440, at least 1920 x 1080; high bitrate H.264/HEVC or ProRes, no
 * burnt-in grain, the same cut and timing), put it at `source` below and
 * re-run the script. Nothing else changes: the slices are fractions of the
 * frame and the focal path is in seconds and fractions of its width. Expect
 * bytes and decoded memory to grow with the area (about four times at
 * 2560 x 1440: the phone slice becomes 760 x 1440). Keep each set within
 * its budget (`budgetMB`, docs/frontend/motion-design.md) by lowering
 * `frames`, the desktop `width` (for example 1920) or a portrait set's
 * `height` (for example 1080) rather than `quality`.
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

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(
    `Node ${process.versions.node} cannot read focal-path.ts: use Node 22.18 or later.`,
  );
  process.exit(1);
}
const { FOCAL_PATH, cropLeft, focalXAt } = await import(
  new URL("../src/features/home/focal-path.ts", import.meta.url).href
);

const CONFIG = {
  source: "media-src/hero/hero-desktop.mp4",
  out: "public/hero",
  manifest: "src/features/home/hero-frames.json",
  posterQuality: 92,
  sets: [
    // The whole frame. `width: null` keeps the clip's own width.
    {
      name: "desktop",
      frames: 96,
      width: null,
      quality: 90,
      posters: true,
      budgetMB: 6,
    },
    // Portrait slices along the focal path: `aspect` is the slice's width
    // over its height; `height: null` keeps the clip's own height.
    {
      name: "phone",
      frames: 60,
      aspect: 0.528,
      height: null,
      quality: 85,
      budgetMB: 3,
    },
    {
      name: "tablet-portrait",
      frames: 60,
      aspect: 0.722,
      height: null,
      quality: 85,
      budgetMB: 4,
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

const probe = JSON.parse(
  run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-count_frames",
    "-show_entries",
    "stream=width,height,nb_read_frames,r_frame_rate",
    "-of",
    "json",
    CONFIG.source,
  ]),
).streams[0];
const total = Number(probe.nb_read_frames);
const [num, den] = probe.r_frame_rate.split("/").map(Number);
const fps = num / (den || 1);
console.log(
  `source: ${probe.width}x${probe.height}, ${total} frames at ${fps} fps`,
);

// Every frame as a lossless PNG, `width` wide, made once per width; cwebp
// encodes the picked ones (many ffmpeg builds have no WebP encoder).
const extracted = new Map();
function framesAt(width) {
  if (extracted.has(width)) return extracted.get(width);
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
  extracted.set(width, tmp);
  return tmp;
}

const manifest = {};

for (const set of CONFIG.sets) {
  const dir = join(CONFIG.out, set.name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const count = Math.min(set.frames, total);
  const portrait = set.aspect !== undefined;
  const scaled = portrait
    ? probe.width
    : Math.min(set.width ?? probe.width, probe.width);
  const tmp = framesAt(scaled);
  const sourceHeight =
    Math.round((probe.height * scaled) / probe.width / 2) * 2;
  // A portrait slice: the full height, an even width.
  const slice = portrait
    ? Math.round((sourceHeight * set.aspect) / 2) * 2
    : scaled;
  const height = portrait
    ? Math.min(set.height ?? sourceHeight, sourceHeight)
    : sourceHeight;
  const width = portrait
    ? Math.round((slice * height) / sourceHeight / 2) * 2
    : scaled;
  // Evenly spaced across the whole clip, first and last frame included.
  const picks = Array.from({ length: count }, (_, i) =>
    Math.round((i * (total - 1)) / (count - 1)),
  );
  const png = (n) => join(tmp, `${String(n).padStart(4, "0")}.png`);
  const webp = (n, quality, out) => {
    const shape = portrait
      ? [
          "-crop",
          String(cropLeft(focalXAt(FOCAL_PATH, n / fps), slice, scaled)),
          "0",
          String(slice),
          String(sourceHeight),
          ...(height < sourceHeight ? ["-resize", "0", String(height)] : []),
        ]
      : [];
    run("cwebp", [
      "-quiet",
      "-q",
      String(quality),
      "-m",
      "6",
      "-sharp_yuv",
      ...shape,
      png(n),
      "-o",
      out,
    ]);
  };
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
  manifest[set.name] = { count, width, height };
  const frames = readdirSync(dir).filter((f) => f.startsWith("frame-"));
  const bytes = frames.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
  const mb = bytes / 1048576;
  console.log(
    `${set.name}: ${frames.length} frames, ${width}x${height}, quality ${set.quality}, ` +
      `${bytes} bytes, ${mb.toFixed(2)} MB (budget ${set.budgetMB} MB)`,
  );
  if (mb > set.budgetMB) {
    console.warn(
      `${set.name} is over its budget: lower its frames, width or height.`,
    );
  }
}

for (const tmp of extracted.values())
  rmSync(tmp, { recursive: true, force: true });
writeFileSync(CONFIG.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${CONFIG.manifest}`);
