---
title: Deterministic Replays and Automated Gameplay Testing
date: 2028-06-15T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Record CNA game commands and canonical state so bugs, networking divergence and performance scenes replay automatically.
author: Robert Vokac
categories: [Development]
tags: [CNA, Replays, Testing, Determinism, Automation]
draft: false
---

A replay records initial configuration plus gameplay commands at simulation ticks—not keyboard polling times, pointers or rendered frames.

```cpp
struct ReplayHeader { std::uint32_t version; std::uint64_t seed; String build; };
struct ReplayTick { std::uint64_t tick; std::vector<GameCommand> commands; Hash expected; };
```

Use fixed simulation steps, seeded named random streams and stable iteration order. Define the promise carefully: reproducible gameplay on qualified builds may be practical even when bit-identical floating point across every architecture is not.

Canonical hashing serializes meaningful state in stable order, excluding addresses, caches and padding. On mismatch, diff entities/components and report the first divergent tick. Periodic checkpoints speed seeking but carry their own versioned schema.

Keep replay protocol and save/network formats distinct. Migrate or clearly reject old versions. Record content/mod identity so playback cannot unknowingly use a different world.

CI runs short scenario replays for menus, combat, saving and lifecycle, asserts final state and optionally captures golden frames at named ticks. Longer replays provide stable performance workloads and multiplayer server/client divergence tests.

Test pause, dropped rendering frames, large command batches, corrupt/truncated replay and version mismatch. A useful replay turns “it happened once after twenty minutes” into one file and one exact tick, making it among the highest-leverage tools a CNA game can build.

## Recording and divergence

Record validated actions after device mapping so files do not depend on keyboard layout/controller ID. Capture external nondeterminism or replace it with test fixtures. Chunk with length/checksum and bounded counts so a crash leaves readable prefix and hostile files cannot allocate indefinitely.

Binary-search checkpoints to find first divergent tick, then diff canonical state by subsystem/entity. Render both states optionally, but simulation tests must pass under different render schedules to prove presentation does not affect authority.

Keep small regression replays in source and larger scheduled workloads. Migrate deliberately or retain an older runner; silently rerecording after every behavior change erases evidence. Use the same command stream for networking divergence and stable performance workloads.

## Canonical state

Serialize diagnostic hash independently of addresses/unordered containers. Sort stable entity IDs and fields. Include authoritative component state, RNG states, queues and timers affecting future; exclude render interpolation/caches. Define float promise: exact within qualified build or quantized/tolerant across architectures.

```cpp
Hasher h;
for (EntityId id : world.SortedEntityIds()) {
    h.Add(id);
    world.HashDurableComponents(id, h);
}
```

## Replay format

Header contains magic/version, build/protocol/content/mod IDs, fixed step and seeds. Chunks carry type, tick range, length/checksum and bounded payload. Commands encode fields/endianness, not struct dumps. Checkpoints accelerate seeking; markers name scenario phases.

Reader validates monotonic ticks/counts/identity before allocation. A truncated file may replay complete prefix but reports incomplete.

## Runner modes

Headless-fast asserts hashes/end state. Real-time reproduces presentation. Network mode injects latency/loss and verifies convergence. Capture mode renders named ticks. Performance mode records fixed configuration without altering simulation.

CI covers boot/menu, new game, mechanics, save/load, pause/resume, death/retry and transitions. Every fixed simulation bug adds minimized replay. Long/fuzz workloads run scheduled.

When intentional design changes expected state, review first divergent tick and update with rationale. Pair hashes with event assertions: wrong reward may diverge then reconverge. Replays are behavioral artifacts and deserve save/protocol-level review.

## Random streams and reproduction packages

Use named RNG streams per subsystem so cosmetic random calls cannot shift combat generation. Record seeds/states that affect future. Avoid unordered iteration when order changes outcomes; sort stable IDs or use deterministic storage. Parallel simulation needs deterministic partition/reduction or a narrower documented same-build promise.

Failed replay artifact includes replay/hash, build/content/mod identity, runner config, first divergent tick, subsystem hashes, structured state diff and optional captures/logs without secrets.

Performance replay warms/cold-starts explicitly, records tick/frame distributions/counters under fixed hardware/settings and never skips simulation to keep real time. Measure variance before gates.

When schema changes, migrate or retain older runner; execute historical fixtures against supported releases. Replays then validate project promises over time, not only today's executable.

## Capture and minimize field failures

Optional rolling recorder keeps last bounded commands/checkpoints in memory and writes on explicit user report/crash-safe opportunity. It never records chat/secrets and documents consent. A reproduction tool verifies/sanitizes metadata before sharing.

When long replay fails, binary-search time then minimize command stream while preserving divergence: remove ranges/commands, rerun, keep reduction that still fails. Result becomes small permanent regression fixture. Preserve original hash privately until minimization validated.

## Release gate

Run committed replays on every relevant platform/build configuration plus full headless population. Assert final/intermediate hashes, expected events and no unconsumed commands. Network cases verify authority convergence; save cases replay across save/load; lifecycle cases pause/suspend/resume.

Publish replay schema/runner version and failure artifacts. A replay system is finished when another developer can take one file, run one command and reach same first divergence with enough state context to fix it.
