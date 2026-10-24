---
title: Rollback Networking for CNA Games
date: 2028-12-14T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Design rollback above CNA with deterministic fixed ticks, compact snapshots, delayed remote input, resimulation, confirmed effects and desynchronization diagnostics.
author: Robert Vokac
categories: [Development]
tags: [CNA, Rollback, Networking, Determinism, Multiplayer]
draft: false
---

Rollback networking predicts missing remote input so simulation can advance, then restores an earlier state and resimulates when the real input differs. It is especially effective for games with small deterministic state and immediate controls. It is not a switch that can be added after gameplay has accumulated nondeterministic side effects.

CNA can host a rollback game because it provides the fixed game loop, input and presentation layer. The rollback engine is game-owned. It controls authoritative simulation state; CNA graphics and audio consume confirmed/predicted events without becoming part of snapshots.

## Define the rollback state boundary

Snapshot everything that affects future authoritative results: entity/component state, timers, RNG streams, pending gameplay events and stable allocation/free-list state where identity matters. Exclude textures, effects, audio voices, particles, camera smoothing, UI and caches that can be rebuilt.

```cpp
struct RollbackFrame {
    std::uint64_t tick;
    WorldSnapshot state;
    std::array<PlayerInput, MaxPlayers> inputs;
    InputMask confirmed;
    StateHash hash;
};
```

Pointers and unordered iteration are hazards. Use durable entity IDs and stable ordering. Define numeric promise—same build/platform, qualified architecture set, fixed point or quantized critical state—and test it continuously.

Snapshots can be full copies, deltas or custom packed state. Full copies are easiest to verify and may be fast enough. Measure maximum state × rollback window and copy time before optimizing. Compression that costs more CPU than resimulation is a poor trade.

## Input timeline and prediction

At tick T, local input is known. Remote input may not be. Predict a neutral value or repeat the last known input according to game behavior, mark it unconfirmed, and advance. Send local inputs redundantly with recent history to tolerate loss.

When actual input arrives, compare its canonical packed form with the predicted value. If equal, mark confirmed. If different, find the earliest affected tick within the retained window. Input older than the window requires a protocol decision: increase delay, disconnect/resync or accept an authoritative correction—never access discarded memory.

An adjustable input delay waits a few ticks before simulation, reducing rollback frequency at the cost of latency. Choose it from measured round-trip/jitter and player settings; changing delay during a match needs a synchronized protocol.

## Restore and resimulate

Restore the snapshot immediately before the first changed tick, substitute confirmed inputs, then run the same pure simulation steps through the current tick. During resimulation, suppress direct presentation side effects.

```cpp
world.Restore(history.StateBefore(firstChangedTick));
for (Tick t = firstChangedTick; t <= currentTick; ++t) {
    InputSet inputs = inputHistory.Resolve(t);
    EventBuffer events;
    world.Step(inputs, fixedStep, events);
    history.ReplaceState(t, world.Capture(), inputs, Hash(world));
}
```

Bound resimulation work per display frame only if the game can preserve correctness; otherwise a catastrophic rollback can hitch. Keep state small and simulation fast enough for the worst supported window. Rendering is skipped during intermediate resimulation states.

## Confirmed and speculative effects

A punch animation can display immediately. Awarding currency, playing a long unique voice or sending analytics twice cannot. Simulation emits deterministic events with stable IDs derived from tick/entity/sequence. Presentation tracks speculative effects, confirms surviving events and cancels/fades events removed by rollback.

Short sounds are often allowed speculatively because silence feels worse than a rare mismatch. Looping audio, camera sequences and persistent particles need reconciliation. Never let presentation callbacks mutate authoritative state.

Rendering receives the final current state plus correction metadata. It can smooth small positional changes without affecting hitboxes. Debug mode can disable smoothing to reveal true rollback behavior.

## Desynchronization detection

Hash canonical authoritative state at regular ticks and exchange/record hashes. On mismatch, capture the first divergent tick, inputs, build/content identity, RNG states and subsystem hashes. Final-state comparison is insufficient because simulations can diverge and reconverge.

Hash serialization must avoid padding, addresses and platform-dependent container order. Break the world hash into physics, players, projectiles and game rules so a report points somewhere useful. Retain enough history around the mismatch for offline replay.

Peer-to-peer rollback requires agreement on participants and input ownership; a client/server rollback design may let the server arbitrate state. Security remains necessary: validate rate/range and authenticate messages. Determinism does not make remote input trustworthy.

## Presentation time and CNA lifecycle

The framework update may perform several rollback simulation steps; draw happens once from the resolved current state. Pause, focus loss and suspend need session rules—online simulation usually cannot pause because one window lost focus.

Device loss or renderer switching rebuilds presentation resources without altering rollback history. Headless mode can execute the same match simulation for CI or authoritative services. Content/mod hashes are part of handshake because different collision or script data guarantees desync.

## Qualification

Run two or more instances from recorded input under injected latency, jitter, loss, duplication and reordering. Force late input at every possible age. Assert hashes, snapshot bounds, event deduplication and memory limits. Stress maximum entities and worst rollback depth while measuring restore/resimulation time.

Expose predicted/confirmed inputs, rollback count/depth, resimulated ticks, oldest retained tick, state bytes and hash status. A rollback implementation is ready when a mismatch produces a portable evidence package and the worst supported rollback fits the frame budget—not merely when two local players appear synchronized.
