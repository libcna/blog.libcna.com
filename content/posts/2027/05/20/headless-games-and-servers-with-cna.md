---
title: Headless Games and Servers with CNA
date: 2027-05-20T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Run CNA simulation, tests and dedicated server logic without a window, GPU, sound device or SDL dependency.
author: Robert Vokac
categories: [Development]
tags: [CNA, Headless, Server, Testing, CI]
draft: false
---

CNA can run without a desktop session. A fully headless configuration combines the Headless platform, Headless renderer and Null audio backend:

```bash
cmake -S . -B build-headless \
  -DCNA_PLATFORM=HEADLESS \
  -DCNA_GRAPHICS_RENDERER=HEADLESS \
  -DCNA_AUDIO_PLATFORM=NULL \
  -DCNA_ENABLE_SDL=OFF
cmake --build build-headless
```

This is useful for dedicated servers, simulation tests, content validation and CI. The platform supplies lifecycle and timing without a native window. Unsupported services report false capabilities. Null audio preserves safe API behavior without opening speakers.

## Headless is not software rendering

The Headless renderer validates resource and draw contracts but does not produce pixels. It supports different runtime modes, debug labels and trace-log export, allowing tests to verify command sequences and compare traces. Choose Software instead when the test must inspect an image.

Keep server code independent of `GraphicsDevice` resources. Share simulation messages, world rules and serialization with the client, but place rendering, local input and presentation behind separate application services. A dedicated process should never need to construct textures merely to advance gameplay.

Use a fixed timestep and an explicit clock policy. Servers often need catch-up limits, pause behavior and clean shutdown signals rather than desktop focus handling. Randomness should be seeded and recorded so a failed session can be replayed.

Networking does not become correct merely because the process is headless. Validate incoming data, bound queues and payload sizes, time out silent peers and make shutdown release sessions before platform teardown. Diagnostics in `STATS` mode can still expose tick duration, entity counts and packet rates without a visual UI; Inspector can observe a desktop headless process when explicitly enabled.

The strongest test is to build the same gameplay library into a graphical client and a headless executable. If that requires preprocessor branches throughout the simulation, the boundary is too weak. CNA provides the silent platform pieces; the project must still design a server-shaped application.

## A practical server layout

Put protocol handling at the edge, validated commands in a bounded queue and deterministic world updates in the center. Produce immutable snapshots or events after each network tick. Administrative commands should follow the same validation rules as remote input instead of mutating the world from another thread.

Shutdown is still a lifecycle: stop accepting sessions, finish or cancel persistence, disconnect peers, stop workers and only then tear down CNA services. Give every phase a deadline so one broken client cannot prevent exit.

Expose tick rate, worst tick, player count, queue depth, memory estimates and last successful save without rendering. CI should launch on an ephemeral port, connect scripted clients and assert final state, then repeat with malformed messages and disconnects. Longer soak tests verify that sessions and queues return to baseline after clients leave.

## Designing the simulation boundary

Do not scatter `if (server)` around rendering code. Let simulation consume commands and produce state independently of presentation. A graphical client translates input into commands and renders snapshots; a server receives commands from the network and publishes snapshots without constructing textures, audio devices or windows.

Make time explicit. Use a fixed simulation step and accumulate host time, with a limit on catch-up work. That limit prevents an overloaded process from spending every tick trying to recover. Record overruns and decide whether to shed optional work, reduce match density or terminate an unhealthy instance.

Determinism also needs a precise promise. Stable iteration order and seeded random streams make replays useful, but do not automatically guarantee identical floating-point results on all architectures. Compare canonical state checksums and keep the authoritative server as the final judge.

## Deployment and failure handling

Treat signals as lifecycle events: stop accepting clients, finish or checkpoint matches, flush essential persistence, stop workers, and release sockets. Put deadlines around each phase. Package without graphical assets that the server cannot use and test startup in a clean container or VM.

CI should boot the packaged binary, connect a client, advance a known number of ticks, verify state and request graceful shutdown. Add load and soak jobs separately. Version messages and persisted state as well: rolling deployment temporarily puts different builds in one fleet, so incompatible peers must reject each other clearly instead of corrupting a match.

## Worked example: one authoritative tick

Keep network input and world update separate. This shape drains a bounded number of validated commands, advances exactly one fixed step and publishes a snapshot:

```cpp
constexpr auto Tick = std::chrono::microseconds(16'667);
constexpr std::size_t MaxCommandsPerTick = 4096;

void Server::RunOneTick()
{
    const auto started = Clock::now();
    PlayerCommand command;
    std::size_t processed = 0;

    while (processed < MaxCommandsPerTick && inbound_.TryPop(command))
    {
        if (sessions_.MayApply(command)) world_.Apply(command);
        else ++metrics_.rejectedCommands;
        ++processed;
    }

    world_.Update(Tick);
    snapshots_.Publish(WorldSnapshot::From(world_));
    metrics_.ObserveTick(Clock::now() - started, inbound_.Size());
}
```

The command cap prevents a network burst from taking unlimited simulation time. A full queue needs an explicit policy: disconnect abuse, coalesce replaceable input or apply backpressure. Drive ticks with a monotonic clock and a maximum number of catch-up steps. If that limit is reached, record overload and stay responsive rather than falling farther behind forever.

## Replay as the first debugger

Store initial seed, protocol version and ordered validated commands—not pointer values or raw socket timing. A runner can reproduce state and compare a canonical hash:

```cpp
for (const ReplayTick& tick : replay.ticks)
{
    for (const auto& command : tick.commands) world.Apply(command);
    world.Update(FixedStep);
    Require(world.CanonicalHash() == tick.expectedHash);
}
```

Canonical hashing sorts unordered collections and omits padding and caches. On mismatch, report the first differing entity and component. In production, expose liveness separately from readiness. During shutdown set readiness false, drain or checkpoint matches, stop workers, flush essential state and exit before the orchestrator deadline. Test the real signal path in CI.

## Persistence, observability and capacity

Never write database state from arbitrary gameplay objects. After a tick, produce durable events or a versioned checkpoint and hand them to a bounded persistence worker. Decide whether a match may advance when persistence is unavailable. If yes, keep a bounded retry log and define what happens when it fills; if no, fail the match clearly instead of appearing healthy while losing progress.

Logs need stable match, session and player identifiers, build/protocol version and tick number. Avoid logging authentication material or complete packets. Metrics should include current and high-water session counts, tick percentiles, command queue depth, rejected commands, snapshot bytes, persistence latency and graceful-shutdown duration. Alert on sustained conditions, not a single noisy tick.

Capacity testing should model the busiest credible match. Script connect, authentication, normal commands, chat or inventory events, disconnect and reconnect. Increase simulated clients until a defined budget fails, then choose an operational limit below that edge. Repeat after hours to expose retained sessions, growing replay buffers and fragmentation.

Use three CI tiers: a seconds-long packaged smoke test, a deterministic replay suite, and a scheduled soak/load job. The smoke test catches missing modules. Replays catch behavioral changes. Soak tests catch lifetime and capacity defects. A headless build is ready to operate only when all three produce artifacts that identify the exact build and configuration.
