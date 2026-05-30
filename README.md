# effect-at-opencode

A Slidev deck — spliced over the speaker video — that showcases how
[opencode](https://github.com/sst/opencode) uses [Effect](https://effect.website)
(v4 / `effect-smol`), built directly from the real opencode codebase and from
Dax Raad's talk **"Effect at OpenCode" (Effect Miami 2026)**.

The idea (per [the original tweet](https://x.com/bjacobso)):

> `opencode run "take the transcript and make a slidev based on the opencode repo
> to showcase the usage of effect then splice that slideshow over the speaker video"`

## What's here

| Path | What it is |
| --- | --- |
| [`slides/`](./slides) | The Slidev deck (`slides.md`, 17 slides) + `timings.json` sync map |
| [`scripts/`](./scripts) | Render + splice pipeline (PNG export → slide track → composite) |
| [`PLAN.md`](./PLAN.md) | The build plan — phases, deliverables, slide-to-code mapping |
| [`overview.md`](./overview.md) | Distilled technical summary of the talk (the five Effect patterns) |
| [`transcript.md`](./transcript.md) | Full timestamped transcript of the talk |
| [`.context/opencode`](./.context/opencode) | Git submodule — opencode source, the ground truth for every code slide |
| [`.context/effect-v4`](./.context/effect-v4) | Git submodule — `effect-smol` (Effect v4), the library opencode targets |

## Building the deck

```bash
cd slides && npm install        # one-time (also pulls playwright-chromium)
npm run dev                      # live-preview the deck at localhost:3030
npm run build                    # static site → slides/dist/
```

## Rendering the video

The deck is spliced over the speaker video in two steps (both need `ffmpeg` on PATH):

```bash
# Phase 3 — export slides to PNG and build a timed, silent slide track.
node scripts/render-slide-track.mjs        # → build/slide-track.mp4

# Phase 4 — composite the speaker video as picture-in-picture over the slides.
node scripts/splice.mjs <speaker-video.mp4>   # → build/final.mp4
```

`scripts/render-slide-track.mjs` reads [`slides/timings.json`](./slides/timings.json)
(slide index → talk timestamp) to hold each slide for the right interval, so the
two tracks line up when both start at `00:00`. The PNG export and concat-file
generation run without ffmpeg; only the final mux/splice require it.

## Getting started

This repo uses git submodules for the reference code. Clone with:

```bash
git clone --recurse-submodules https://github.com/bjacobso/effect-at-opencode.git
```

Or, if you already cloned it:

```bash
git submodule update --init --recursive
```

The submodules are pinned to specific commits so the slide line-references stay
stable:

- `opencode` → `sst/opencode`
- `effect-v4` → `Effect-TS/effect-smol`

## The five patterns

The talk walks through five concrete places opencode leans on Effect. Each maps
to real files in the submodule (see [`overview.md`](./overview.md) and
[`PLAN.md`](./PLAN.md) for the full mapping):

1. **Schema & branded types** — `provider/schema.ts` (`ProviderID`, `ModelID`)
2. **Services & layers (DDD)** — `git/index.ts` (`GitService`, swappable impls)
3. **PubSub & Streams** — `bus/index.ts` (event bus over Effect `PubSub` → `Stream`)
4. **OpenTelemetry tracing** — auto-instrumented spans, fed back into the agent loop
5. **Strictly-typed HTTP server** — `server/routes/.../httpapi/` (`HttpApi`, additive OpenAPI)

## Why

opencode hit ~8M monthly active users; at that scale the edge cases everyone
skips (cancellation, interrupts, clean shutdown, abort signals) became
thousands of daily bugs. Effect's explicit, codified patterns both enforce
correctness and give LLMs strong guardrails — verbose code is fine when the AI
is the one typing it.
