---
title: Scripting CNA Games Safely
date: 2028-06-08T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Embed a bounded scripting layer above CNA with capability-based APIs, deterministic scheduling and versioned save integration.
author: Robert Vokac
categories: [Development]
tags: [CNA, Scripting, Security, Modding, Architecture]
draft: false
---

Scripting should expose game concepts—spawn approved entity, play cue, query quest state—not raw `GraphicsDevice`, filesystem pointers or native handles. The host owns every object and gives scripts validated IDs/handles whose expiry is detectable.

```text
World.Spawn("npc.fisher", position)
Audio.PlayCue("dialogue.accept")
Quest.SetFlag("island.bridge_open", true)
```

Choose interpreter/runtime according to target support, licensing, memory and sandbox needs. Treat “sandbox” skeptically: remove filesystem/network/native module access unless explicitly required and enforce path/capability policy outside script code.

Budget instructions/time, allocations, recursion and events per tick. A runaway script should fail its mod/scene, not freeze rendering. Schedule scripts at deterministic frame boundaries; never let callbacks mutate collections mid-iteration.

Version the exposed scripting API and provide deprecation diagnostics. Saves store durable script state as validated data, not VM heap snapshots. Reload clears old callbacks and references before publishing the new instance.

Test infinite loops, allocation floods, invalid/stale handles, exceptions, reload during events, malicious paths and deterministic replay. Scripting is safe enough to ship when authority, budgets, lifecycle and failure containment are explicit—even for scripts supplied with the game itself.

## Host APIs and tooling

Expose validated command/query DTOs, not mutable native objects. Opaque handles include generation and report expiry. Script exceptions become source-located script errors and never unwind across the game loop.

Queue events in deterministic bounded order; unload removes all subscriptions. Be honest about trust: if VM native modules/memory cannot be sandboxed, scripts are trusted code.

Validate scripts during content build, generate API docs and retain stack traces. Hot reload constructs/validates a new instance, swaps at a safe boundary and leaves the old instance active on failure. Replay fixtures compare emitted commands/state while diagnostics report instructions, allocations and event depth per script.

## VM lifecycle

Create environment per trust/domain or controlled shared VM with isolated modules. Load/compile, validate entry points, initialize with host context, then publish. Shutdown stops events/timers/coroutines, runs bounded cleanup if allowed and releases handles before VM.

Coroutines/timers resume at simulation ticks and carry owner generation. Wall-clock sleep breaks replay; use simulation time unless presentation-only.

## Capability host surface

Expose only granted services. A quest script can query/set quest state and request dialogue, not filesystem/network/renderer. Manifest may request capabilities; product/server policy grants.

Validate handles/generation/ownership, stable IDs, finite/ranged numbers, collection/string sizes and legal phase. Batch calls retain same validation. Never expose borrowed native pointers.

## Determinism and saves

Provide named seeded RNG and ordered results. Exclude OS time/filesystem order/uncontrolled concurrency from authority. Persist declared primitive versioned tables under size/depth limits; create fresh VM on load and pass state/migration. Never serialize VM heap/functions.

## Budgets and failure

Instruction/time hooks stop long ticks; allocator caps memory; events/timers/coroutine depth bounded. Failure policy disables script/mod, rolls back command transaction or fails level/match—never continues partial critical mutation.

Tooling compiles/lints at content build, generates stubs/docs and protects release console while retaining source-located errors. Fuzz bindings, test API compatibility and soak repeated load/unload. Call it sandboxed only when native escape/resource abuse boundaries are actually proven.

## Transactions, API versions and qualification

Authoritative mutations collect commands, validate/apply only after script returns; budget/error discards transaction, preventing half rewards. Events deliver documented bounded order and queue recursive emissions to safe phase.

Manifest declares API range. Deprecated calls warn with source/migration; incompatible semantics follow major policy. Persisted script state has schema version and migrates temporary under budgets before publication.

Run normal/hostile scripts across client/headless/server/release; verify CPU/memory cleanup and claimed filesystem/network/native isolation. Error report includes package/source/stack/budget without private data. Documentation trust statement must exactly match proven boundary.

## Server and multiplayer scripting

Authoritative scripts execute only on server/world authority. Clients receive resulting replicated state/events, not permission to run arbitrary mutation. If both run deterministic prediction, exact script/content/API hash is part of handshake and server still validates outcomes.

Separate presentation scripts may run client-only and cannot access authoritative APIs. Mark host functions by domain so a script validated for UI cannot be loaded as server rule accidentally.

Hot update in live match is risky: version each script generation, checkpoint compatible state and switch at a synchronized boundary, or require match restart. Never let two peers silently use different rule scripts.

Audit API calls and budget violations without logging private script data each tick. Maintain reference scripts covering every host API plus hostile suite. Release qualification runs them under all supported VM/platform configurations and packaged mod loading route.
