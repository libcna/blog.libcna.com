---
title: Client Prediction, Interpolation and Server Reconciliation
date: 2028-12-07T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Extend a CNA multiplayer game with ticked commands, local prediction, authoritative reconciliation, remote interpolation and hostile-network tests.
author: Robert Vokac
categories: [Development]
tags: [CNA, Multiplayer, Networking, Prediction, Reconciliation]
draft: false
---

The basic multiplayer article establishes sessions, authority and messages. A real-time game then faces latency: waiting for the server before moving the local player feels slow, while trusting clients lets them invent outcomes. Client prediction and reconciliation solve different halves of that problem.

The server remains authoritative. A client immediately simulates its own validated input using the same movement rules, sends ticked commands, and later corrects its predicted state from a server snapshot. Other players are normally rendered from a short interpolation buffer rather than predicted with unknown input.

## A ticked protocol

Input messages carry client/player identity established by the session, a monotonically ordered simulation tick or command sequence, and semantic command data. Never send raw keyboard state or a claimed final position as authority.

```cpp
struct PlayerCommand {
    std::uint32_t sequence;
    std::uint64_t clientTick;
    QuantizedAxis moveX, moveY;
    QuantizedAngle aim;
    CommandBits buttons;
};

struct PlayerSnapshot {
    std::uint64_t serverTick;
    std::uint32_t lastProcessedSequence;
    CharacterState authoritative;
};
```

Quantization is part of the protocol and simulation boundary. The predicting client simulates exactly the command representation the server receives—not higher-precision local values that later round differently.

Bundle recent unacknowledged commands to tolerate packet loss, with strict count/rate limits. Sequence comparison must handle wrap according to a defined modular rule. Authentication/session routing is outside the payload and cannot be trusted from a self-declared player ID.

## Predict the local player

At each fixed tick, the client produces one command, stores it in bounded history, applies it to predicted state and transmits it. Presentation can smooth from the previous predicted transform, but the history retains authoritative simulation states or enough data to replay.

The shared movement function should consume state, command, fixed step and immutable collision snapshot. Remove camera shake, particles and audio from that function. Nondeterministic queries and unordered contacts will turn every snapshot into a correction.

Prediction is selective. The local character and immediately controlled objects benefit most. Doors, pickups and damage may show tentative feedback but wait for server confirmation. Label speculative events so rejection can cancel or compensate them without granting durable rewards twice.

## Reconciliation

When snapshot `lastProcessedSequence = N` arrives:

1. find predicted history at command N;
2. compare against authoritative state;
3. replace with authoritative state;
4. replay commands N+1 through current;
5. publish corrected current predicted state.

If the authoritative result already matches within the protocol's exact/tolerant contract, no visible correction is needed. Never discard command history by snapshot receive time; networks reorder packets.

```cpp
predicted = snapshot.authoritative;
history.DropThrough(snapshot.lastProcessedSequence);
for (const PlayerCommand& command : history.Unacknowledged())
    SimulateCharacter(predicted, command, fixedStep, collisionSnapshot);
```

The collision snapshot question is important. Dynamic world changes between original prediction and replay can produce different results. Retain required historical collision state, include authoritative environment interactions in snapshots, or accept bounded correction under a documented model.

## Hide correction without hiding authority

Simulation state snaps to reconciled truth immediately. Rendering may preserve a visual error offset that decays over presentation time. Large corrections, teleports and respawns snap visually too. Never feed smoothed presentation back into collision or command generation.

Show local projectiles or muzzle flashes promptly, but correlate predicted effects with command/event IDs. On server confirmation, promote them; on rejection, remove/fade and record why. Audio that cannot be undone should be chosen carefully.

## Interpolate remote entities

Snapshots arrive irregularly. Keep a short time-ordered buffer and render remote entities at `estimatedServerTime - interpolationDelay`. Find bracketing snapshots and interpolate position/rotation plus animation parameters. The delay should cover typical jitter, not grow without bound.

When packets are late, extrapolate only for a short maximum using known velocity, then hold or choose a game-specific fallback. Correct toward new snapshots smoothly unless an event indicates teleport. Do not interpolate discrete states such as alive/dead as floats.

Clock synchronization estimates offset and drift from round-trip samples while rejecting outliers. It supports buffer selection; it does not need wall-clock equality. Expose buffer age and under/overrun counts.

## Server validation

The server checks command rate, sequence window, numeric ranges and which actions are legal in current state. It simulates from its own world and ignores claimed client time beyond bounded ordering hints. Missing commands use a defined neutral/last-input policy for a small window; clients cannot stall the server indefinitely.

Snapshots include only authorized/interest-managed data and use bounded deltas against an acknowledged baseline. A missing baseline falls back to a full snapshot. Compression is applied after validation-friendly serialization, never by struct memory dumps.

## Test with a network simulator

Inject latency, jitter, loss, duplication, reordering, bandwidth limits and temporary disconnect. Run recorded command streams and compare authoritative server state, client predicted state and displayed remote state under frame-rate variation.

Diagnostics graph command sequence, ack age, prediction error before reconciliation, replayed commands, correction magnitude, snapshot buffer occupancy and extrapolation time. A visual trail of predicted versus authoritative positions makes problems obvious.

Release gates include stable LAN, 50–150 ms latency, burst jitter, loss, reconnect and malicious out-of-window commands. Prediction is successful when local control responds immediately, authority remains on the server, and every correction can be tied to a specific tick and cause.
