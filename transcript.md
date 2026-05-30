# Transcript — Effect at OpenCode

**Talk:** "Effect at OpenCode" — Dax Raad — Effect Miami 🇺🇸 2026
**Source:** <https://www.youtube.com/watch?v=hY279-A2fC4> (Effect | TypeScript at Scale)

> Raw spoken dialogue organized into technical sections with approximate
> `[HH:MM:SS]` timestamps. Transcribed via the Gemini conversation that seeded
> this project; lightly cleaned for readability. Treat timestamps as
> approximate.

## Introduction & context: why OpenCode chose Effect

**[00:00]** Hi everybody. Well, sounds like nobody has ever tried to use Effect,
or some of you have used Effect — some of you in production. I'm showing you
guys my Slack screen anyway. So yeah, I'm still somewhat new to Effect. I have
production experience because we have kind of carelessly deployed a beta version
of Effect into production to millions of users, but it's gone well so far.

**[00:33]** I'll tell you a little bit about how we got there, why we got there.
So again, my name is Dax, I work at a company called Anomaly. We make a coding
agent called OpenCode. And a couple of months ago, we made a crazy decision to
rewrite all of OpenCode using Effect. You know, rewrites are something you're
never supposed to do. Everyone tells you it's a bad idea. It definitely feels
like a bad idea every day that we're doing it, but we did decide to do this, and
I want to talk a little bit about what led us to that decision.

**[01:08]** For context, OpenCode is a coding agent like Cloud Code — it's like
that, but it's open source and works with any model. It got to a pretty big
scale; I think we'll probably hit 8 million monthly active users this month. And
at that scale — thank you — at that scale, any little thing, any little shortcut
that you've taken in the process to get there, you're like (and we all do this):
you go to implement something and you remember there's kind of an edge case, but
you're like, "I can deal with that edge case later."

**[01:42]** We hit that growth faster than anything I've ever worked on, so all
of our judgment around those corners that we cut really just reared their heads
in a very ugly way. So there's a lot of bugs in OpenCode that just impact a lot
of people, right? You know, something that affects 1% of sessions is now
affecting thousands, ten thousands of people every single day.

**[01:59]** So that was the first sense that it felt like, hey, you know, writing
correct JavaScript is actually pretty hard. Most of us get away with it because
it doesn't matter in a lot of cases, but almost none of us use things like abort
signals. You know, when we spawn an async task, we're never thinking about, "Oh,
how do we cancel it? How do we interrupt that? What happens if there's a case
where it needs to cleanly shut down? How do we clean up all the in-process
work?" Most of us just kind of skip those because we maybe work on stuff that is
short-lived or stateless like an HTTP server.

**[02:38]** But even in those cases, you know, you might have stateful things
that plug into that. I think a lot of us, even with years of JavaScript
experience or years of programming experience, were not actually writing correct
JavaScript code — like fully correct JavaScript code. So we just had a lot of
bugs at this scale, and it felt like our software wasn't stable, it wasn't really
high quality. That was the first thing where, okay, let's maybe try to look for
something. How can we improve this? Maybe we do need to rely on a framework that
kind of guarantees correctness a little bit more.

## The impact of AI-generated code & guardrails

**[03:06]** The next thing that happened was kind of the wave of AI code. We
obviously ship an AI... [pauses due to screen share issue]. Good, I thought you
were like, what I was saying? They told me to shut up, stop talking. Am I sharing
the screen? Oh, I thought I did this. I don't have anything on the screen yet,
so, or anything important on the screen yet.

**[03:43]** All the AI code we are shipping — so our team, I would say for a
company in the AI space, we're pretty conservative about our use of AI. We
obviously use it probably more than most companies because that's our product;
we need to push it to where it goes. But my sense of our culture was, you know,
we aren't a company that's like, "The code doesn't matter." We care about the
code. We try to foster that point of view.

**[04:04]** Despite that, just bad code gets out anyway. You know, you have a
button, it's like a lazy button. You can push it, you can get your work done.
It's like the genie's out of the bottle kind of situation where even a team like
ours, where we talk a lot about code quality and we kind of try to enforce that,
there was still just a lot of not-great code getting out there.

**[04:24]** And the reason for that is when AI — AI can be really powerful, the
models are getting better and better — but they're roughly just kind of
mirroring patterns they know about, mirroring patterns they see in your
codebase. So we had some patterns in our codebase that kind of grew over time,
we tried to codify ways to do things, and you know, every time we did that, AI
benefited from that. But the more of that you have, the better the AI code is.

**[04:52]** So it kind of goes from this — I think our judgment historically is
now inverted. Historically, we kind of see really heavy, boilerplatey frameworks
and we would hate it. It would make you be, like in the last talk, super explicit
about everything. To do something basic, it was like 100 lines of code, and we
kind of spent a lot of time trying to figure out how to make like beautiful APIs,
terse APIs. "How can you express something complex or something that's not as
verbose?" Because when you type it out, you don't want to type out all that
boilerplate over and over.

**[05:20]** But with AI, it's kind of the opposite. We're not doing the typing as
much, so I don't really care that much that the framework is boilerplate. Effect
produces a lot of code — like every file is three times bigger than you normally
expect — but if I'm not typing it out anymore, maybe I don't care about that as
much, and it provides a crazy amount of guardrails for the LLM.

**[05:43]** When I ask the LLM to do something in an Effect codebase, it almost
always does it correctly. We kind of saw a shift in our own usage of AI pre and
post us moving to Effect. The amount of tokens we're spending just went up as our
codebase got more "effectified" because we were seeing better results with
Effect. Unfortunately, that means we're now paying a lot of money to OpenAI — and
mostly OpenAI. I think our team of 20 is now spending probably like $30,000 a
month, which is like another engineer. In the scope from that point of view,
it's like one extra engineer's worth of spend; it's not that crazy. But it's not
even distributed across our team. If all of our team used it as much as the top
users, that spend goes up a lot.

**[06:33]** But point being, we're looking for something that would give AI more
guardrails, so Effect kind of is that. I joke it's like one of those enterprisey
frameworks that you historically hate to work in. It kind of looks like that up
front, I would say, kind of like how those crazy Java frameworks looked. But it
gives the AI such explicit ways of doing things. When the AI reads a file, it has
such explicitness in the file, such strict patterns, that when it goes to do
something new, it likely looks very much like what you'd expect.

**[07:08]** So given all those things, we decided to start doing this migration.
Thankfully, it was something we could do somewhat progressively, of course,
always to the point where we have to do a hard cutover — we're kind of
approaching that now. But yeah, so the past three months or so, we've been moving
more of our stuff to Effect, both OpenCode and also any supporting services that
we build.

**[07:31]** And just for fun, I was like, what can I talk about? I'm still like
technically an Effect beginner. I think I sent a message like last week to my
team being like, "Okay, I think I'm like good at Effect now." So it's very recent
that I feel somewhat confident. But I figured for people that are maybe less
familiar — even less familiar than I am — I was going to kind of walk through
some files and code that we have in OpenCode where we use different Effect
features so you can kind of see how it comes together.

## Technical deep dive: Effect Schema & branded types

**[08:00]** So in the last talk, you know, we talked about Schema. One of the
nice things about Effect is a lot of stuff that you need to glue together three
or four different libraries for tends to be out of the box in the Effect standard
library. So if we look at Schema — you know, I think all of us should be using a
data validation schema framework. Before this, we were all using Zod. Effect has
one that comes out of the box which works with everything else, and so we define
all shapes of data in our codebase using Schema.

**[08:36]** When we collaborate as a team, oftentimes we just talk in terms of
types, in terms of schemas to define — you know, we try to like model reality
using what you can do with Schema, and we kind of align on what makes sense, and
then the implementation kind of AI does. But yeah, so you know, Schema is nothing
crazy. If you're using a data validation library, you've probably seen this
before. You can define shapes of objects.

**[08:56]** You can say that — so this is the schema that represents a model, like
an LLM model. You know, it has fields. It's got some fields that can be objects,
some fields can be primitives. As you can see, this cost field where we model
cost, there's an inputCost which is a finite number, outputCost, etc. You know,
nothing too crazy — strings, you can make them optional, you can do things like
that.

**[09:28]** One of the things here that I really like is branded types. Effect
Schema has a concept of branded types. The idea behind a branded type is
typically you would say an ID is a string. So if you have this ID field here, you
would probably typically model this — and you can do this in Effect — just as a
string. But this is not just any string; it is a ModelId string specifically.

**[09:53]** So Effect has this concept of branded types where, you know, this is
just a string, but it also has a specific brand saying this is a ModelId. So any
function that's trying to receive a ModelId, it says, "I receive ModelId." You
can't accidentally send it another string that represents something else. You
can't send it a ProviderId, you can't send it any other ID that's in your system
or any other string. It'll kind of force you to enforce that what's going in
there is definitely the type of the specific instance of the string that you
want.

**[10:22]** A version of this that I really like, which saves our butt in a bunch
of places, is we use this for paths. So you have paths all over your codebase
probably, but is it an absolute path or a relative path? A bunch of bugs comes
from mixing this up: a function that expects an absolute path receives a relative
path. But we can be very explicit. We can say, hey, this function expects a
relative path, this function expects an absolute path, and when you look at the
function signature, you can kind of see that. So Schema branded types: super
useful. Again, the schema part is not that unique, you had it before, but the
branded types thing, I don't really think I've seen it implemented super well in
other libraries.

**[11:03]** One other thing that's fun here is if I go to Provider. Again, like
there's patterns here to help you deal with magic strings. We have an ID that
represents a ProviderId. There's some well-known provider IDs like Anthropic,
OpenAI, some of these others. You know, typically you would probably have some
code that's like `if (id === 'openai')`. In this case, we can do something like
`id.openai` so you don't have these magic strings all over the place. Again, this
isn't anything that crazy — it's just a constant — but it's a nice pattern to use
with a branded type.

## Architecture: services, layers, and Domain-Driven Design

**[11:45]** Okay, so that's Schema. Let's see if there is anything else I forgot.
Okay, next thing core to Effect is the concept of services and layers. Even prior
to Effect, we were roughly building things using Domain-Driven Design. The idea
behind Domain-Driven Design — you can implement it in a very explicit, crazy way,
or you can implement it in a light way. It's pretty simple: your application
decomposes into a bunch of different domains. A domain is an area or like a
feature, and it exposes a bunch of functions. Your application composes those
functions together to be your whole application.

**[12:24]** Effect has a first-class way of representing that in terms of services
and layers. So again, historically this would have been like annoyingly verbose,
but nowadays it's totally worth it. So we have this service called the
GitService, and the GitService does some useful Git operations. There's not a lot
here because this is something that's in progress, but we start by defining the
interface. The GitService can find a Git repo given an absolute path. So the job
of this service is to take an absolute path, traverse it upwards, and figure out
the repository for it, and the repository is the actual directory that it lives
at. It can find a remote for a given repo, it can find all the different roots for
the given repo. You can imagine, you know, that this could be like... no commit.
You represent all the functionality that you need in Git as a commit inside the
GitService in this interface.

**[13:15]** Then you have an implementation of the interface, and this is like our
default current implementation. And this is like a kind of shitty implementation
— this just spawns Git; it spawns a Git process and it does the work that it has
to. It basically implements each function like spawn the Git process to get the
remote, to get the roots, to find the repo.

**[13:43]** The rest of our application doesn't really know about this
implementation; it really only knows about this interface. The reason this is
nice is because we have plans in the future to make our code better — I'm sure we
all have plans to make our code better that we hope to eventually get to one day.
We want to switch this out from spawning Git to using libgit2, which is a native
implementation of Git in C. We can embed this into our application, that way
we're not spawning it every time; we're just kind of calling a native function.
We can then do like another implementation of this that's like NativeGit or
something, and this can have its own way of doing Git stuff, but it'll still
adhere to this interface.

**[14:24]** So the rest of our codebase, any other service that needs Git
functionality — which we use Git functionality in a lot of places — is not aware
of this. It's also super useful for testing. If you have some implementation that
is very side-effecty — it impacts the world too much where it makes testing hard
or slow — you can implement the test layer of this service and you can swap that
out. Again, these are all things you probably already do, or you do to some
degree. We were kind of already doing some of these things before, but this is
like a nice, codified setup. If someone sat down and thought through that for like
years and thought of the best way to do all these things, you probably eventually
arrived at something like this, which is kind of the classic thing with using a
framework versus rolling everything yourself.

## Native streams and PubSub systems

**[15:07]** Some other little goodies that are in the Effect standard library —
it's pretty big. There's a lot of stuff in there, like I said, it's very rare
that you need to reach outside of it. In our application, we have an internal
event system. So inside OpenCode, there's events that get emitted, they get
subscribed to by other services, and they do things; they go over WebSockets.
You know, classic, typical event system: you define your event, event shape, you
emit it.

**[15:42]** Effect natively has something called PubSub. So this implements a
PubSub service, right? So you can initialize that and then you can... yeah,
there's different versions of it, there's different implementations of it. This is
one where you can kind of publish infinite stuff into it. It's got other nice
functionality; you can see here where if someone subscribes late, maybe they get
the last 10 events that they missed if they had subscribed earlier. So it's like
any little thing that would be minimal otherwise — you could probably implement a
PubSub especially with AI very quickly — but this is, you know, like a
fully-featured one that has all the things that you probably will eventually need.
And this is the root system we use to publish events all over our codebase. So we
have publishEvent that just calls publish on the PubSub with the event.

**[16:41]** And you know, subscribing — Effect has these really nice stream APIs.
So a stream — again, if you sat really hard and thought about what a stream is, a
stream is just... well, I'm going to say a stream is a stream of data, but you
know, that's what it is. It's useful to have a stream of data that you can
consume, and all the stuff that relates to that like backpressure, again, like
catching up on missed events, it implements that once. And guess what? A PubSub
benefits from being consumed as a stream. So whether we're streaming our events,
whether we're streaming responses from LLM calls, we're just using this stream
API. So again, a very good standard library that has these well thought through
concepts. I would say it reminds me a little bit of — I don't like Go the
language really that much — but Go's standard library is really, really good. They
spent a lot of time thinking through like the IO interfaces, like the
reader/writer IO interfaces, which means you can now apply them to such a wide
range of things. Stream is very similar to that.

## Observability: OpenTelemetry & automated tracing loops

**[17:48]** Okay, oh this is one of my favorite ones, this is one of the biggest
reasons we moved over: tracing. So if you look here, again, it is verbose, and
you're probably looking at this and you're probably like, "This is scary." And it
is. You know, I'm sure we can kind of all remember when we first saw React, we
first saw JSX, we're probably like, "That doesn't look right." But sometimes it's
okay; I think it's one of those cases where it is okay.

**[18:08]** So again, if we go back to that, we have an npm service. So this is a
service that lets us run npm-related functionality: add a package, install
packages in a directory, get the binary that a package exposes. Again, this
implementation, we embed the same packages that npm uses underneath, but you
know, we can swap this out with like, I don't know, a Rust implementation or
something that's cool lately.

**[18:44]** So if you look at the functions that we've implemented, you can see
that we annotate them with a string. The nice thing about Effect is everything —
pretty much everything you define — is kind of wrapped in this wrapper. And given
that it's wrapped in a wrapper, it can start to inject functionality in there. The
reason we do this, where we add these like extra things, is because every time
this function is now called, it's going to emit an OpenTelemetry span so you can
observe this. So it becomes very easy to add instrumentation to your application.
If you don't use a framework that kind of natively encourages this, our
applications are pretty under-instrumented.

**[19:24]** And if we look at what this gets us — it is super expensive, it's like
a very heavy overhead that you would never turn it on for all of your traffic. But
we do turn it on for our team. So whenever our team says something like, "Hey, I
started OpenCode and it took like a really long time to start up," all of our
team's traces are going into — so we're using Sentry, it doesn't matter what we
use really — and we can go in there and go look at basically every single function
call that is in our entire codebase. So we can see that, "Oh, this thing took
eight seconds to boot up, that's weird." And we can kind of go in there and see
like, oh, which parts of it took super long. Like hey, this Git call maybe took
longer than we expected. I'm zoomed in so this looks horrible, but Sentry is not
this bad, trust me.

**[20:21]** So like this just comes out of the box — like the normal code that you
write kind of gets auto-instrumented, and occasionally here and there you might
want to augment it with some extra stuff, but you know, typically you don't have
to in most cases. The npm one — the reason I showed the npm one — is there's like
a million ways to resolve npm dependencies, and it ranges from being really not
performant to very performant but not correct, and this was impacting a lot of our
startup performance. So we very quickly moved our npm stuff into Effect so we can
instrument it properly, and then we got to seeing the traces and we figured out a
bunch of optimizations that we could make.

**[21:01]** And what's cool is that you don't have to do this work, actually. The
way we use it in OpenCode is OpenCode knows how to query the OTel stuff. So
oftentimes when we prompt it, we say like, "Hey, here is an issue we're facing. You
can add some extra logs to the codebase if you need with your hypothesis on why
you think it's happening, try to figure out what's going on." It'll add those into
the codebase, it'll run your application, then it can query the OTel traces
directly and kind of look into what happened, and it can on its own figure out
what's going on. So the feedback loop — you don't have to use coding agents with a
feedback loop, but adding a feedback loop makes them like really, really powerful.
So this OTel feedback loop has been super, super cool, and we even built like a
custom tool that we use to explore our OTel stuff internally.

## Strictly typed HTTP server architecture

**[21:49]** The last thing I'm going to show is the HTTP server. So I think most
of you probably are going to have some kind of HTTP server somewhere in your
codebase. OpenCode itself is a server, you can run it headlessly, and I want to
show you real quickly how we do HTTP stuff in Effect. So this is like the model
endpoint, kind of what I was showing you guys before. That schema we defined
earlier for the model, we can now reuse to define our endpoints.

**[22:28]** So we have all of our endpoints defined here, and so these are just
types — these are not implementations. So we actually put in the effort to sit
down together and think, hey, what's the best possible API design we can do? We
don't have to worry about implementation, we still have to think about the
endpoints, what query parameters they take, what they return. So in this case,
it's returning that same schema that I showed you earlier, and we just define all
of what our API should look like using this.

**[22:54]** Once our team aligns on this, once we all agree, you know — you can add
your OpenAPI annotations here, you don't need to, it'll automatically generate
whatever it can. This is basically a pure schema type representation of your API.
Then you can go actually implement it. So we have a matching implementation of the
model endpoint. You know, this group only has one endpoint; we say we're going to
handle this endpoint. Again, that's type-safe, and this handler — if you get the
query parameters, they'll be correctly validated, correctly typed at that point.
If you read the body, again, correctly validated, correctly typed at that point.
It won't let you return something that's invalid.

**[23:39]** So again, you probably have seen some of this like in Hono — you know,
Hono has versions of this too. A lot of frameworks support OpenAPI definitions. I
will say that I've tried a bunch of them, we deployed with a bunch of them, and
this one, even though it's more verbose — and you don't have to do the separation
where you do the types separately from implementation, but we really much like we
really benefit from that.

**[24:08]** And then you can derive a full OpenAPI specification from those
definitions. What's cool about this is now that we have that, whenever we push any
changes, we regenerate the OpenAPI specification. It's very easy to accidentally
change that by accident if you like add a field or move stuff around and you don't
realize you're breaking your API. We have a process that ensures that JSON that's
generated is only additive, or it's not like it doesn't have any unexpected
changes. So again, it gives more stability and more explicitness to something that
is kind of loose otherwise.

## Conclusion & final thoughts

**[24:45]** And yeah, so that's it. So those are like five places that we use it.
Again, so if you — you hear this a lot — it's definitely super weird to use at
first, especially if you're new to functional programming. Most of our team has
not been, so we've been able to kind of pick up on that pretty quickly, but it's
one of those things where you have to shut off your brain, like turn off all your
opinions and kind of do things the way it wants you to do it, and after a couple
of months it'll kind of click and you'll start to get some of the benefits. So
like I said, for us, you know, we are doing a fairly risky migration and kind of
betting our whole company around building on top of Effect, but it's been great so
far. So yeah, that's all I had. Thanks.
