#!/usr/bin/env node
// Phase 4 — splice the slide track over the speaker video.
//
// Composites build/slide-track.mp4 (full-frame) with the speaker as a
// picture-in-picture in a corner, keeping the talk's original audio. The slide
// cues in timings.json are already aligned to the talk timeline, so the two
// tracks line up when both start at 00:00.
//
// Usage:
//   node scripts/splice.mjs <speaker-video.(mp4|mkv|webm)> [--pip-scale 0.26]
//        [--corner br|bl|tr|tl] [--margin 36] [--out build/final.mp4]
//
// Prereqs: build/slide-track.mp4 (run render-slide-track.mjs first) and ffmpeg.

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const buildDir = join(root, "build")

const args = process.argv.slice(2)
const speaker = args.find((a) => !a.startsWith("--"))
if (!speaker) {
  console.error("usage: node scripts/splice.mjs <speaker-video> [--corner br] [--pip-scale 0.26] [--out build/final.mp4]")
  process.exit(1)
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const slideTrack = join(buildDir, "slide-track.mp4")
const pipScale = parseFloat(opt("pip-scale", "0.26"))
const corner = opt("corner", "br")
const margin = parseInt(opt("margin", "36"), 10)
const out = resolve(opt("out", join(buildDir, "final.mp4")))

const has = (cmd) => {
  try {
    execFileSync(cmd, ["-version"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

for (const [label, p] of [["speaker video", speaker], ["slide track", slideTrack]]) {
  if (!existsSync(p)) {
    console.error(`✗ missing ${label}: ${p}`)
    if (p === slideTrack) console.error("  run: node scripts/render-slide-track.mjs")
    process.exit(1)
  }
}

// PiP position per corner.
const pos = {
  br: `main_w-overlay_w-${margin}:main_h-overlay_h-${margin}`,
  bl: `${margin}:main_h-overlay_h-${margin}`,
  tr: `main_w-overlay_w-${margin}:${margin}`,
  tl: `${margin}:${margin}`,
}[corner]
if (!pos) throw new Error(`bad --corner ${corner} (use br|bl|tr|tl)`)

// [0] = slides (base, full frame), [1] = speaker (scaled to PiP, overlaid).
// Audio is taken from the speaker track.
const filter =
  `[1:v]scale=iw*${pipScale}:-1[pip];` +
  `[0:v][pip]overlay=${pos}:shortest=1[v]`

mkdirSync(buildDir, { recursive: true })

const ffArgs = [
  "-y",
  "-i", slideTrack,
  "-i", speaker,
  "-filter_complex", filter,
  "-map", "[v]",
  "-map", "1:a?",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac",
  "-shortest",
  out,
]

if (!has("ffmpeg")) {
  console.log("ffmpeg not found — install it and run:\n  ffmpeg " + ffArgs.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" "))
  process.exit(0)
}

console.log(`→ splicing (speaker PiP ${corner}, scale ${pipScale}) …`)
execFileSync("ffmpeg", ffArgs, { stdio: "inherit" })
console.log(`\n✓ ${out}`)
