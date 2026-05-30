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
- [ ] Initial commit pinning submodule SHAs

Submodules are pinned so every slide's `file:line` reference stays stable:
- opencode → `ac8e686` (latest-3028)
- effect-smol → `1fdd9ae` (@effect/ai-anthropic@4.0.0-beta.74)

## Phase 1 — Pin slides to ground-truth code

Verify and freeze the exact files/lines each slide cites (already scouted):

| # | Pattern | File (under `.context/opencode/packages/opencode/src/`) | Anchor |
| --- | --- | --- | --- |
| 1 | Schema & branded types | `provider/schema.ts` | `Schema.brand("ProviderID")` (L5), `Schema.brand("ModelID")` (L26) |
| 2 | Services & layers (DDD) | `git/index.ts` | `Context.Service(...)("@opencode/Git")` (L100), `Layer.effect` (L102), `defaultLayer` (L345) |
| 3 | PubSub & Streams | `bus/index.ts` | `PubSub` wildcard + typed map, `subscribe → Stream` in `Scope` |
| 4 | OpenTelemetry tracing | `cli/cmd/run/otel.ts` + `withSpan` call sites | run-span tracer; auto-instrumentation + agent OTel feedback loop |
| 5 | Strictly-typed HTTP server | `server/routes/instance/httpapi/api.ts` + `groups/*.ts` | `HttpApi.make(...).addHttpApi(...)`, additive `openapi.json` in CI |

- [ ] Re-read each anchor, copy the exact snippet to embed, record final line numbers.
- [ ] Note the matching Effect v4 API in `.context/effect-v4` for each (e.g. `effect/unstable/httpapi`, `effect/unstable/process`, `Schema.brand`, `PubSub`, `Stream`).

## Phase 2 — Author the Slidev deck

- [ ] Scaffold Slidev: `slides/` with `npm create slidev` (or `slides.md` + theme).
- [ ] Deck outline (one section per transcript chapter):
  1. Title — "Effect at OpenCode" / Dax Raad / Effect Miami 2026
  2. Why the rewrite — 8M MAU, correctness, abort signals (`[01:08]`–`[02:38]`)
  3. The AI flip — verbosity as guardrail, 3× files, token spend (`[03:06]`–`[07:08]`)
  4. Schema & branded types — `provider/schema.ts` (`[08:00]`–`[11:03]`)
  5. Services & layers — `git/index.ts`, swappable libgit2 + test layers (`[11:45]`–`[14:40]`)
  6. PubSub & Streams — `bus/index.ts` (`[15:07]`–`[17:14]`)
  7. OpenTelemetry — auto-spans + agent feedback loop (`[17:48]`–`[21:40]`)
  8. Typed HTTP server — `httpapi/`, additive OpenAPI (`[21:49]`–`[24:30]`)
  9. Close — risky migration, but going well (`[24:45]`)
- [ ] Use Shiki code blocks with line highlighting; cite `repo path:line` on each.
- [ ] Add per-slide presenter notes from the transcript for sync timing.
- [ ] Record a `timings.json` mapping slide index → transcript timestamp.

## Phase 3 — Render slides to frames/video

- [ ] `slidev export` deck → PDF and/or PNG-per-slide.
- [ ] Build a slide-video track (slides advancing on the `timings.json` cues),
      e.g. ffmpeg concat of per-slide PNGs held for each timed interval.

## Phase 4 — Splice over the speaker video

- [ ] Obtain the speaker video (YouTube `hY279-A2fC4`) — confirm rights/usage.
- [ ] Composite layout: speaker as picture-in-picture corner, slides full-frame
      (or side-by-side). Decide layout (see open questions).
- [ ] ffmpeg overlay: slide track as base, speaker `scale`+`overlay` PiP, original
      audio from the talk preserved; align via `timings.json`.
- [ ] Export final MP4 (1080p), spot-check sync at each section boundary.

## Phase 5 — Polish & ship

- [ ] Review transitions and any spots where the speaker references the screen.
- [ ] Publish deck (Slidev static build) + final video; link both from README.
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
