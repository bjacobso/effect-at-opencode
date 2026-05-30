# PLAN — Slidev deck "Effect at OpenCode", spliced over the speaker video

**Goal:** Produce a [Slidev](https://sli.dev) presentation that showcases how
opencode uses Effect — built from the real opencode codebase — and composite it
over Dax Raad's speaker video so the slides track the talk.

**Source material:** [`transcript.md`](./transcript.md) (timestamped talk) and
[`overview.md`](./overview.md) (distilled five patterns), grounded against the
[`.context/opencode`](./.context/opencode) and
[`.context/effect-v4`](./.context/effect-v4) submodules.

---

## Phase 0 — Reference scaffolding ✅

- [x] `git submodule add https://github.com/sst/opencode .context/opencode`
- [x] `git submodule add https://github.com/Effect-TS/effect-smol .context/effect-v4`
- [x] `transcript.md` — full timestamped transcript
- [x] `overview.md` — distilled five-pattern summary with code mappings
- [x] `README.md`, `PLAN.md`
- [x] Initial commit pinning submodule SHAs (`f1e8811`)

Submodules are pinned so every slide's `file:line` reference stays stable:
- opencode → `ac8e686` (latest-3028)
- effect-smol → `1fdd9ae` (@effect/ai-anthropic@4.0.0-beta.74)

## Phase 1 — Pin slides to ground-truth code ✅

Verified and froze the exact files/lines each slide cites:

| # | Pattern | File (under `.context/opencode/packages/opencode/src/`) | Anchor |
| --- | --- | --- | --- |
| 1 | Schema & branded types | `provider/schema.ts` | `Schema.brand("ProviderID")` (L5), `Schema.brand("ModelID")` (L26) |
| 2 | Services & layers (DDD) | `git/index.ts` | `Context.Service(...)("@opencode/Git")` (L100), `Layer.effect` (L102), `defaultLayer` (L345) |
| 3 | PubSub & Streams | `bus/index.ts` | `PubSub` wildcard + typed map, `subscribe → Stream` in `Scope` |
| 4 | OpenTelemetry tracing | `cli/cmd/run/otel.ts` + `withSpan` call sites | run-span tracer; auto-instrumentation + agent OTel feedback loop |
| 5 | Strictly-typed HTTP server | `server/routes/instance/httpapi/api.ts` + `groups/*.ts` | `HttpApi.make(...).addHttpApi(...)`, additive `openapi.json` in CI |

- [x] Re-read each anchor, copy the exact snippet to embed, record final line numbers.
- [x] Note the matching Effect v4 API for each (`effect/unstable/httpapi`, `effect/unstable/process`, `Schema.brand`, `PubSub`, `Stream`) — confirmed opencode targets v4 idioms.

Bonus found while freezing: the OTel "annotate with a string" pattern is literally
`Effect.fn("Git.run")` / `Effect.fn("Bus.state")` — used as the tracing-slide snippet.

## Phase 2 — Author the Slidev deck ✅

- [x] Scaffold Slidev → `slides/` (`slides.md`, `package.json`, seriph theme).
- [x] Deck authored — 17 slides, one section per transcript chapter:
  1. Title — "Effect at OpenCode" / Dax Raad / Effect Miami 2026
  2. Why the rewrite — 8M MAU, correctness, abort signals (`[01:08]`–`[02:38]`)
  3. The AI flip — verbosity as guardrail, 3× files, token spend (`[03:06]`–`[07:08]`)
  4. Schema & branded types — `provider/{schema,provider}.ts` (`[08:00]`–`[11:03]`)
  5. Services & layers — `git/index.ts`, swappable libgit2 + test layers (`[11:45]`–`[14:40]`)
  6. PubSub & Streams — `bus/index.ts` (`[15:07]`–`[17:14]`)
  7. OpenTelemetry — `Effect.fn(...)` auto-spans + agent feedback loop (`[17:48]`–`[21:40]`)
  8. Typed HTTP server — `httpapi/groups/provider.ts` + `api.ts`, additive OpenAPI (`[21:49]`–`[24:30]`)
  9. Close — risky migration, but going well (`[24:45]`)
- [x] Shiki code blocks with line highlighting + magic-move; each cites `path:line`.
- [x] Per-slide presenter notes carry the transcript excerpt for sync timing.
- [x] `slides/timings.json` maps slide index → transcript timestamp.
- [x] `npm run build` passes; `npm run dev` serves the deck.

## Phase 3 — Render slides to frames/video ✅ (mux needs ffmpeg)

- [x] `slidev export --format png` → `build/slides/*.png` (17 slides, verified).
- [x] `scripts/render-slide-track.mjs` — reads `timings.json`, computes per-slide
      durations (splitting shared-timestamp spans), writes `build/slides.concat.txt`,
      and renders `build/slide-track.mp4` via ffmpeg concat.
- [ ] Run the ffmpeg mux — **blocked: ffmpeg not installed in this env**
      (`brew install ffmpeg`, then re-run the script; the concat file is already written).

## Phase 4 — Splice over the speaker video (scripted; needs ffmpeg + video)

- [x] `scripts/splice.mjs` — ffmpeg composite: slide track full-frame + speaker PiP
      (configurable corner/scale/margin), speaker audio preserved, aligned via shared 00:00.
- [ ] Obtain the speaker video (YouTube `hY279-A2fC4`) — confirm rights/usage.
- [ ] Run `node scripts/splice.mjs <speaker-video.mp4>` → `build/final.mp4`.
- [ ] Spot-check sync at each section boundary.

## Phase 5 — Polish & ship

- [ ] Review transitions and any spots where the speaker references the screen.
- [ ] Publish deck (`slidev build` static site) + final video; link both from README.
- [ ] (Per the tweet) optionally assign follow-ups to @kitlangton in Jira. 😄

---

## Open questions

- **Layout:** slides full-frame with speaker PiP, or true side-by-side split?
- **Speaker video source:** download permitted, or screen-capture / re-record?
- **Tooling for splice:** ffmpeg-only, or an editor (DaVinci/Premiere) for finer
  cuts around screen-reference moments?
- **Effect v4 callouts:** how much to lean on `.context/effect-v4` to show the
  exact `unstable/*` APIs opencode targets vs. keeping slides opencode-only.

## Conventions

- Every code slide cites a real `path:line` in the pinned submodule.
- Bump submodule pins deliberately (and re-verify line refs) — never silently.
- Keep `transcript.md` timestamps as the single source of truth for A/V sync.
