# Overview — Effect at OpenCode

A distilled technical summary of Dax Raad's talk **"Effect at OpenCode"**
(Effect Miami 2026). The full timestamped transcript is in
[`transcript.md`](./transcript.md). Where possible, each pattern is mapped to the
real file in the [`.context/opencode`](./.context/opencode) submodule so slides
can cite ground-truth line numbers.

> Paths below are relative to `.context/opencode/packages/opencode/src/`.

## 0. Context — why the rewrite

- opencode (by Anomaly) is an open-source, any-model coding agent, on track for
  **~8M monthly active users**. At that scale, a 1%-of-sessions bug hits
  thousands of people daily.
- Writing *correct* JavaScript is hard: most code skips cancellation, interrupt
  handling, clean shutdown, and abort signals. Effect makes those first-class.
- **The AI flip:** verbose, boilerplate-heavy frameworks used to be a cost.
  When an LLM does the typing, verbosity becomes a *guardrail*. Effect files are
  ~3× larger, but LLMs generate them with high precision because the patterns
  are strict and codified. Token spend went *up* after "effectifying" because
  results improved (~$30k/mo across a team of 20).
- The migration is progressive, approaching a hard cutover. They're betting the
  company on it.

## 1. Schema & branded types

- Effect's `Schema` replaces Zod and ships in-stdlib; the team models all data
  shapes with it and often collaborates purely in terms of schemas/types.
- **Branded types** prevent string-mixing bugs: an ID isn't `string`, it's a
  `ModelID` brand. A function taking a `ModelID` rejects a `ProviderID` or any
  raw string.
- Used heavily for **absolute vs. relative paths** — a classic edge-case bug
  class made unrepresentable.
- Magic-string IDs (`"openai"`, `"anthropic"`) become typed constants.

**Code:** `provider/schema.ts`
- `Schema.String.pipe(Schema.brand("ProviderID"))` → `ProviderID`
- `Schema.String.pipe(Schema.brand("ModelID"))` → `ModelID`

## 2. Services & layers (Domain-Driven Design)

- The app decomposes into domains; Effect models this natively with
  **Services** (abstract interface) and **Layers** (implementation).
- `GitService` exposes an interface: find a repo from an absolute path, find a
  remote, find roots. The current implementation just **spawns `git`**.
- Because callers depend only on the interface, the backend can be swapped —
  e.g. to **libgit2** (native C, no process spawn) — without touching
  downstream features. Same trick enables **test mock layers** to avoid slow /
  destructive side effects.

**Code:** `git/index.ts`
- `export class Service extends Context.Service<Service, Interface>()("@opencode/Git") {}` (~line 100)
- `export const layer = Layer.effect(...)` (~line 102)
- `export const defaultLayer = layer.pipe(Layer.provide(AppProcess.defaultLayer))` (~line 345)
- Imports `effect/unstable/process` `ChildProcess` — the spawn-`git` impl.

## 3. PubSub & Streams

- Effect's stdlib is deep (compared to Go's IO interfaces) — rarely need to
  reach outside it.
- opencode's internal **event system** is built on Effect's native `PubSub`:
  publish infinite events; late subscribers can replay the last N missed
  events; backpressure handled out of the box.
- A `PubSub` is consumed as a **`Stream`** — the same Stream API powers LLM
  token streaming and internal async pushes.

**Code:** `bus/index.ts`
- Imports `PubSub`, `Stream`, `Scope`, `Schema` from `effect`.
- A `wildcard: PubSub.PubSub<Payload>` plus a `typed: Map<string, PubSub>`.
- `subscribe` returns `Effect.Effect<Stream.Stream<Payload<D>>, never, Scope.Scope>`;
  the subscription is acquired eagerly in the caller's `Scope` to avoid a
  publish-after-subscribe race (documented inline).

## 4. OpenTelemetry tracing

- Effect wraps every defined unit of work, so the runtime can inject global
  capabilities — including **automatic OTel spans**. Functions are annotated
  with a span name and emit telemetry on every call.
- The npm service was a startup-perf hotspot (many ways to resolve deps, most
  slow or incorrect); moving it into Effect made it instrumentable, and the
  traces (viewed in Sentry) surfaced the optimizations.
- **Feedback loop:** opencode can *query its own OTel traces*. Prompted with an
  issue, it adds hypothesis logging, runs the app, reads the fresh traces, and
  diagnoses the regression autonomously. They built a custom tool for exploring
  OTel internally.

**Code:** `cli/cmd/run/otel.ts` (run-span tracer over `@opentelemetry/api`),
plus `withSpan` usages across `agent/agent.ts`, `config/config.ts`, etc.

## 5. Strictly-typed HTTP server

- opencode runs as a headless HTTP server. The **API definition is separated
  from the implementation**: endpoints are pure schema types declaring query
  params, bodies, and return shapes (reusing the same `Schema` models).
- Handlers are type-checked against the contract — the compiler blocks
  returning anything that breaches it; params/bodies are validated + typed.
- A full **`openapi.json`** is derived from the definitions. CI regenerates it
  on every change and enforces that diffs are **additive only**, preventing
  accidental breaking changes from reaching clients.

**Code:** `server/routes/instance/httpapi/`
- `api.ts` — `import { HttpApi } from "effect/unstable/httpapi"`;
  `HttpApi.make("opencode-instance").addHttpApi(ConfigApi)...`
- `groups/*.ts` — per-domain endpoint definitions (config, session, provider,
  file, mcp, pty, …); implementations live alongside.

## Closing

It's weird at first — especially without an FP background — but you "turn off
your opinions," do it the way the framework wants, and after a couple months it
clicks. A risky migration, but going well.
