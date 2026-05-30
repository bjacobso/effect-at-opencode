#!/usr/bin/env node
// Phase 3 — render the deck to a slide-video track timed to the transcript.
//
// 1. Exports each slide to a PNG (via `slidev export --format png`).
// 2. Reads slides/timings.json and computes each slide's on-screen duration
//    from consecutive transcript timestamps.
// 3. Emits an ffmpeg concat-demuxer file and (if ffmpeg is present) renders
//    build/slide-track.mp4 — a silent video that holds each slide for its cue.
//
// Usage:
//   node scripts/render-slide-track.mjs [--talk-end HH:MM:SS] [--fps 30] [--res 1920x1080]
//
// Prereqs: `npm install` in slides/ (brings playwright-chromium for export),
//          ffmpeg on PATH for the final mux (the concat file is written either way).

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const slidesDir = join(root, "slides")
const buildDir = join(root, "build")
const pngDir = join(buildDir, "slides")

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const TALK_END = opt("talk-end", "00:25:40") // where the last slide stops
const FPS = opt("fps", "30")
const RES = opt("res", "1920x1080")

const toSeconds = (hhmmss) => {
  const parts = hhmmss.split(":").map(Number)
  if (parts.some(Number.isNaN)) throw new Error(`bad timestamp: ${hhmmss}`)
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

const has = (cmd) => {
  try {
    execFileSync(cmd, ["-version"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

mkdirSync(pngDir, { recursive: true })

// 1. Export slides to PNG (one per slide).
console.log("→ exporting slides to PNG …")
execFileSync(
  "npx",
  ["slidev", "export", "slides.md", "--format", "png", "--output", pngDir, "--timeout", "60000"],
  { cwd: slidesDir, stdio: "inherit" },
)

const pngs = readdirSync(pngDir)
  .filter((f) => f.endsWith(".png"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
if (pngs.length === 0) throw new Error("no PNGs produced — check the slidev export output")
console.log(`  ${pngs.length} slides exported`)

// 2. Compute per-slide durations from the transcript cues.
const timings = JSON.parse(readFileSync(join(slidesDir, "timings.json"), "utf8"))
const cues = timings.slides.map((s) => ({ ...s, sec: toSeconds(s.start) }))
const endSec = toSeconds(TALK_END)

if (cues.length !== pngs.length) {
  console.warn(
    `⚠ timings.json has ${cues.length} cues but ${pngs.length} PNGs were exported — ` +
      `pairing by index up to the shorter of the two.`,
  )
}
const n = Math.min(cues.length, pngs.length)
// Several slides can share one transcript cue (e.g. a section divider that
// immediately precedes its content slide). Group consecutive same-timestamp
// cues and split the span up to the next *distinct* timestamp evenly between
// them, so the section card still gets screen time without drifting alignment.
const durations = new Array(n)
for (let i = 0; i < n; ) {
  let j = i + 1
  while (j < n && cues[j].sec === cues[i].sec) j++
  const next = j < n ? cues[j].sec : endSec
  const span = next - cues[i].sec
  if (span <= 0) throw new Error(`non-positive span at slide ${i} (${cues[i].title})`)
  const each = span / (j - i)
  for (let k = i; k < j; k++) durations[k] = each
  i = j
}

// 3. Write the ffmpeg concat-demuxer file.
const concatPath = join(buildDir, "slides.concat.txt")
const lines = []
for (let i = 0; i < n; i++) {
  lines.push(`file '${join(pngDir, pngs[i]).replace(/'/g, "'\\''")}'`)
  lines.push(`duration ${durations[i]}`)
}
// concat demuxer needs the last file repeated (its trailing duration is ignored).
lines.push(`file '${join(pngDir, pngs[n - 1]).replace(/'/g, "'\\''")}'`)
writeFileSync(concatPath, lines.join("\n") + "\n")
console.log(`→ wrote ${concatPath}`)
console.log(
  "  durations (s): " + durations.map((d, i) => `${i}:${d}`).join("  "),
)

// 4. Render the silent slide track if ffmpeg is available.
const out = join(buildDir, "slide-track.mp4")
if (!has("ffmpeg")) {
  console.log(
    "\nffmpeg not found — skipping render. Install it (`brew install ffmpeg`) and run:\n" +
      `  ffmpeg -y -f concat -safe 0 -i "${concatPath}" \\\n` +
      `    -vf "scale=${RES.replace("x", ":")}:force_original_aspect_ratio=decrease,` +
      `pad=${RES.replace("x", ":")}:(ow-iw)/2:(oh-ih)/2,fps=${FPS}" \\\n` +
      `    -c:v libx264 -pix_fmt yuv420p "${out}"`,
  )
  process.exit(0)
}

console.log("→ rendering slide track with ffmpeg …")
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatPath,
    "-vf",
    `scale=${RES.replace("x", ":")}:force_original_aspect_ratio=decrease,` +
      `pad=${RES.replace("x", ":")}:(ow-iw)/2:(oh-ih)/2,fps=${FPS}`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    out,
  ],
  { stdio: "inherit" },
)
console.log(`\n✓ ${out}`)
console.log("Next: node scripts/splice.mjs <speaker-video.mp4>")
