---
theme: seriph
title: Effect at OpenCode
info: |
  How opencode uses Effect (v4 / effect-smol).
  Built from the real opencode codebase + Dax Raad's talk, Effect Miami 2026.
  Every code slide cites a real path:line in the pinned submodules.
class: text-center
highlighter: shiki
lineNumbers: true
drawings:
  persist: false
transition: slide-left
mdc: true
---

# Effect at OpenCode

How an 8M-MAU coding agent bet the company on Effect

<div class="pt-8 opacity-80">
Dax Raad · Anomaly · <span class="opacity-60">Effect Miami 2026</span>
</div>

<div class="abs-br m-6 text-sm opacity-50">
deck built from the real opencode codebase · code refs are <code>path:line</code>
</div>

<!--
[00:00] Dax, Anomaly. We make opencode — a coding agent like Claude Code, but
open source and works with any model. A couple of months ago we made the crazy
decision to rewrite all of opencode using Effect. Rewrites are something you're
never supposed to do — but here's why we did it.
-->

---
layout: section
---

# Why the rewrite?

<span class="opacity-60">Correct JavaScript is hard — and at scale, "later" arrives</span>

<!--
[01:08]–[02:38] Context for the decision.
-->

---

# At 8M MAU, every cut corner reappears

<v-clicks>

- opencode is on track for **~8 million monthly active users**
- Every shortcut you took to get there comes back ugly
- A bug in **1% of sessions** = **tens of thousands of users / day**

</v-clicks>

<v-click>

> "Writing correct JavaScript is actually pretty hard. Most of us get away with
> it because it doesn't matter in a lot of cases."

</v-click>

<v-clicks>

- Almost nobody reaches for **abort signals**
- Spawn an async task → how do we **cancel / interrupt / clean up**?
- Skipped because most work is short-lived or stateless... until it isn't

</v-clicks>

<!--
[01:08] At that scale any little shortcut rears its head in a very ugly way.
[01:59] Almost none of us use abort signals. When we spawn an async task we're
never thinking about how to cancel it, interrupt it, cleanly shut down, clean up
in-process work. Even with years of experience we weren't writing *fully*
correct JavaScript. Effect makes cancellation, interruption, scoped cleanup
first-class.
-->

---
layout: section
---

# The AI flip

<span class="opacity-60">Verbosity used to be a cost. When the LLM types, it's a guardrail.</span>

<!--
[03:06]–[07:08]
-->

---

# Boilerplate inverted

<div grid="~ cols-2 gap-8">

<div>

### Before AI
<v-clicks>

- Heavy, boilerplatey frameworks = pain
- Chase terse, beautiful APIs
- You hand-type every line

</v-clicks>

</div>

<div>

### With AI
<v-clicks>

- You're **not** doing the typing
- Effect files are **~3× larger** — fine
- Strict, codified patterns = huge **LLM guardrails**

</v-clicks>

</div>

</div>

<v-click>

<div class="mt-8 text-center opacity-90">

> "When I ask the LLM to do something in an Effect codebase, it almost always
> does it correctly."

Token spend went **up** post-Effect because results got better<br/>
<span class="opacity-60">~$30k/mo across a team of 20 — about one extra engineer</span>

</div>

</v-click>

<!--
[04:52] Our judgment is now inverted. We used to hate heavy boilerplate
frameworks. [05:20] But with AI we're not doing the typing, so I don't care that
the file is 3x bigger — and it gives the LLM a crazy amount of guardrails.
[05:43] The amount of tokens we spend went up as the codebase got more
"effectified" because we saw better results.
-->

---
layout: section
---

# The five patterns

<div class="text-left max-w-md mx-auto opacity-80 leading-relaxed">

1. Schema & branded types
2. Services & layers (DDD)
3. PubSub & Streams
4. OpenTelemetry tracing
5. Strictly-typed HTTP server

</div>

<!--
[07:31] I'll walk through five files where we use different Effect features.
-->

---

# 1 · Schema & branded types

<span class="opacity-60 text-sm">opencode models all data shapes with Effect <code>Schema</code> — Zod is gone</span>

````md magic-move {at:1}
```ts
// the LLM "model" — strings, finite numbers, nested structs
const ProviderCost = Schema.Struct({
  input: Schema.Finite,   // ← inputCost
  output: Schema.Finite,  // ← outputCost
  cache: ProviderCacheCost,
})
```
```ts {3-4}
// provider/provider.ts:930 — Model reuses two *branded* ids
export const Model = Schema.Struct({
  id: ModelID,            // not just a string
  providerID: ProviderID, // not just a string
  cost: ProviderCost,
  limit: ProviderLimit,
}).annotate({ identifier: "Model" })
```
````

<!--
[08:00] We talked about Schema. A lot of stuff you'd glue 3-4 libraries for is
out of the box. We define every data shape with Schema. [08:56] This is the
schema for an LLM model — cost.inputCost is a finite number, outputCost, etc.
[09:28] One thing I love: branded types.
-->

---

# Branded types: make bad states unrepresentable

```ts {all|1,5|3,7|all}
// provider/schema.ts:5
const providerIdSchema = Schema.String.pipe(Schema.brand("ProviderID"))
export type ProviderID = typeof providerIdSchema.Type

// provider/schema.ts:26
const modelIdSchema = Schema.String.pipe(Schema.brand("ModelID"))
export type ModelID = typeof modelIdSchema.Type
```

<v-clicks>

- A `ModelID` is a string — **but** a function taking `ModelID` rejects a
  `ProviderID`, or any raw string
- The big win in practice: **absolute vs. relative paths** — a whole class of
  bugs made impossible
- Well-known ids become typed constants — no magic strings:

</v-clicks>

<v-click>

```ts {2-4}
// provider/schema.ts:9 — withStatics attaches constants to the brand
export const ProviderID = providerIdSchema.pipe(withStatics((s) => ({
  anthropic: s.make("anthropic"),
  openai: s.make("openai"),
  // ...
})))
//  ProviderID.openai  instead of  id === "openai"
```

</v-click>

<!--
[09:53] Any function receiving a ModelId can't accidentally get a ProviderId or
another string. [10:22] We use this for paths — absolute vs relative — a bunch
of bugs come from mixing those up. [11:03] And for magic strings: id.openai
instead of id === "openai".
-->

---

# 2 · Services & layers (DDD)

<span class="opacity-60 text-sm">Domain interface ↔ swappable implementation</span>

```ts {1-6|8|10-13} 
// git/index.ts — define the interface (the "domain")
export interface Interface {
  readonly status: (cwd: string) => Effect.Effect<Item[]>
  readonly diff:   (cwd: string, ref: string) => Effect.Effect<Item[]>
  readonly patch:  (cwd: string, ref: string, file: string) => Effect.Effect<Patch>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Git") {}

// git/index.ts:102 — the current impl just spawns `git`
export const layer = Layer.effect(Service, Effect.gen(function* () {
  const appProcess = yield* AppProcess.Service
  /* run = ChildProcess.make("git", [...]) */
}))
```

<!--
[11:45] Services and layers. We already did Domain-Driven Design loosely — your
app decomposes into domains, each exposing functions. [12:24] GitService: find a
repo, find a remote, find roots. [13:15] The default impl is a bit shitty — it
just spawns a git process.
-->

---

# Swap the implementation, nobody downstream cares

<div grid="~ cols-2 gap-6 items-center">

<div>

```ts
// today
export const defaultLayer =
  layer.pipe(
    Layer.provide(
      AppProcess.defaultLayer
    )
  )
// git/index.ts:345
```

</div>

<div>

<v-clicks>

- Callers depend on the **interface**, never the impl
- Future: swap spawn-`git` → **libgit2** (native C) — zero downstream changes
- **Testing:** inject a mock `Layer` — no slow / destructive side effects

</v-clicks>

</div>

</div>

<v-click>

<div class="mt-6 text-center opacity-80">
"If someone sat down for years and designed the best way to do this, you'd
arrive at something like layers."
</div>

</v-click>

<!--
[13:43] The rest of the app only knows the interface. We want to switch from
spawning git to libgit2 — a NativeGit layer adhering to the same interface.
[14:24] Super useful for testing too: swap in a test layer.
-->

---

# 3 · PubSub & Streams

<span class="opacity-60 text-sm">The internal event bus, built on Effect's stdlib</span>

```ts {1|3-6|8-12}
import { PubSub, Stream, Scope } from "effect"     // bus/index.ts:1

type State = {                                       // bus/index.ts:30
  wildcard: PubSub.PubSub<Payload>
  typed: Map<string, PubSub.PubSub<Payload>>
}

// subscribe is *eager*: subscription acquired in caller's Scope at yield time,
// so publishes after yield are delivered (no lazy-pull race)
readonly subscribe: <D extends BusEvent.Definition>(
  def: D,
) => Effect.Effect<Stream.Stream<Payload<D>>, never, Scope.Scope>
```

<v-clicks>

- Publish infinite events; late subscribers can **replay missed events**;
  backpressure handled once
- A `PubSub` is consumed as a **`Stream`** — same API powers **LLM token
  streaming**

</v-clicks>

<!--
[15:07] Effect's stdlib is big — rarely reach outside it. We have an internal
event system over websockets. [15:42] Effect has PubSub natively — publish
infinite, late subscribers get the last N missed events, backpressure built in.
[16:41] And a PubSub is consumed as a Stream — same API as streaming LLM
responses. Reminds me of Go's IO interfaces.
-->

---

# 4 · OpenTelemetry tracing

<span class="opacity-60 text-sm">Annotate the wrapper → spans for free. The #1 reason we moved.</span>

```ts {2|2,4|all}
// git/index.ts:109 — the string is the span name
const run = Effect.fn("Git.run")(function* (args: string[], opts: Options) {
  const result = yield* appProcess.run(ChildProcess.make("git", [...cfg, ...args], { /* */ }))
  return { /* ... */ } satisfies Result
}, Effect.catch((err) => Effect.succeed(fail(err))))

// bus/index.ts:66 — same pattern, everywhere
const state = yield* InstanceState.make(Effect.fn("Bus.state")(function* (ctx) { /* */ }))
```

<v-clicks>

- Everything's wrapped → the runtime **injects OTel spans** on every call
- Turned on for the team → Sentry shows *every function call* — "why did boot
  take 8s?" → "this git call is slow"
- We moved the **npm** service into Effect just to instrument dependency
  resolution

</v-clicks>

<!--
[17:48] My favorite — tracing, one of the biggest reasons we moved. [18:44] We
annotate functions with a string; because everything's wrapped, each call emits
an OTel span. [19:24] Heavy, so we turn it on for our team — Sentry shows every
function call; we find the 8-second boot culprits. [20:21] The npm service had a
million ways to resolve deps; we moved it into Effect to instrument it.
-->

---

# The OTel feedback loop

<div class="text-center text-xl leading-relaxed mt-4">

<v-clicks>

opencode can **query its own OTel traces**

⬇

prompt: *"here's the issue — add hypothesis logging, find it"*

⬇

it edits the code → **runs the app** → reads the fresh traces

⬇

**diagnoses the regression autonomously**

</v-clicks>

</div>

<v-click>

<div class="mt-8 text-center opacity-70">
"Adding a feedback loop makes coding agents really, really powerful."
</div>

</v-click>

<!--
[21:01] You don't even have to do the work. opencode knows how to query the OTel
data. We prompt it with an issue; it adds logging with its hypothesis, runs the
app, queries the traces, and figures out what's going on. We built a custom tool
to explore OTel internally.
-->

---

# 5 · Strictly-typed HTTP server

<span class="opacity-60 text-sm">API definition separated from implementation — both share the Schema</span>

```ts {1|3-9|5,7} 
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"

export const ProviderApi = HttpApi.make("provider").add(   // groups/provider.ts:33
  HttpApiGroup.make("provider").add(
    HttpApiEndpoint.get("list", "/provider", {
      query: WorkspaceRoutingQuery,
      success: described(Provider.ListResult, "List of providers"), // ← reused Schema
    }).annotateMerge(OpenApi.annotations({ summary: "List providers" })),
  ),
)
```

<v-clicks>

- These are **types, not implementations** — design the API first
- Handlers are type-checked against the contract: params/body validated &
  typed, **can't return** anything invalid

</v-clicks>

<!--
[21:49] Last one — the HTTP server. opencode runs headlessly. [22:28] These are
just types, not implementations. We sit down and design the best API first —
query params, what it returns (that same Model schema). [22:54] Then implement
it; the handler gets validated, typed params and body, and can't return
something invalid.
-->

---

# Composed APIs → additive OpenAPI in CI

```ts {2-7} 
// api.ts:36 — groups compose into one API
export const InstanceHttpApi = HttpApi.make("opencode-instance")
  .addHttpApi(ConfigApi)
  .addHttpApi(FileApi)
  .addHttpApi(ProviderApi)
  .addHttpApi(SessionApi)
  // ...
  .middleware(SchemaErrorMiddleware)
```

<v-clicks>

- Derive a full **`openapi.json`** from the definitions
- CI regenerates on every push and enforces the diff is **additive only**
- → no accidental breaking changes reach clients

</v-clicks>

<!--
[24:08] Derive a full OpenAPI spec. On every push we regenerate it; a process
ensures the JSON is only additive — it's easy to break your API by adding a
field or moving things. Gives stability to something that's otherwise loose.
-->

---
layout: center
class: text-center
---

# It clicks after a couple months

<div class="max-w-2xl mx-auto opacity-90 leading-relaxed">

> "Turn off all your opinions and do things the way it wants. After a couple
> months it clicks and you start to get the benefits."

</div>

<div class="mt-10 grid grid-cols-5 gap-3 text-sm max-w-3xl mx-auto opacity-80">
<div>Schema +<br/>brands</div>
<div>Services +<br/>layers</div>
<div>PubSub +<br/>Streams</div>
<div>OTel<br/>tracing</div>
<div>Typed<br/>HTTP</div>
</div>

<div class="mt-10 opacity-60">
A risky migration — betting the company on Effect — but it's been great so far.
</div>

<!--
[24:45] Those are five places we use it. It's super weird at first, especially
if you're new to FP. You shut your brain off, do it the way it wants, and after
a couple months it clicks. We're doing a risky migration, betting the whole
company on Effect — but it's been great so far. Thanks.
-->

---
layout: center
class: text-center
---

# Thanks

<div class="opacity-70">

opencode → <code>github.com/sst/opencode</code><br/>
Effect (v4 / effect-smol) → <code>github.com/Effect-TS/effect-smol</code>

</div>

<div class="abs-br m-6 text-xs opacity-40">
every code slide cites a real path:line in the pinned submodules
</div>
