---
title: Building a Multiplayer Game with CNA
date: 2027-06-17T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Turn CNA's XNA-style networking and gamer services into a bounded, testable multiplayer game protocol.
author: Robert Vokac
categories: [Development]
tags: [CNA, Multiplayer, Networking, ENet]
draft: false
---

The earlier overview of CNA networking explains the ecosystem. This article focuses on building a game with it. Enable `CNA_ENABLE_NET` and Gamer Services, create or join a session, and keep protocol decisions in application code rather than treating transport packets as world objects.

Start with a small message vocabulary: hello/version, player input, authoritative snapshot, reliable event, ping and disconnect reason. Give every message a type and maximum length. Validate counts, strings and indices before they reach simulation state.

Use unreliable sequenced delivery for replaceable movement snapshots and reliable delivery for events that must happen exactly once, such as joining or inventory changes. Making every packet reliable increases delay when one packet is lost; making everything unreliable loses essential transitions.

## Own time and authority

Choose an authority model explicitly. A dedicated server should validate player requests and publish the canonical world. Clients send inputs, predict only what they can reconcile, and interpolate remote snapshots behind real time. Peer-to-peer games need equally clear ownership and conflict rules.

Network ticks need not equal render frames. Sample local input each update, send at a bounded rate and attach sequence numbers or simulation ticks. Reject stale messages and cap catch-up work. Record enough information to replay desynchronization reports.

Handle joining, timeout, voluntary leave, transport loss and host shutdown as separate states. Release session objects before platform teardown and make reconnection create a fresh identity unless the game protocol deliberately supports resume tokens.

Test serialization without a socket, then run two clients against a headless server with injected delay, loss, duplication and reordering. Monitor bytes, packet counts, queue depth and tick time through diagnostics. Encryption, authentication, matchmaking and abuse prevention are product requirements beyond merely establishing an ENet connection.

A multiplayer prototype succeeds when two windows move. A multiplayer architecture succeeds when malformed input, a slow peer and a dropped connection cannot corrupt or stall the session.

## Replication and compatibility

Separate simulation state from its wire representation. Quantize positions only where the error is acceptable, delta-compress against an acknowledged baseline and periodically send a full snapshot so one lost dependency cannot poison the session forever. Put a protocol version in the handshake and reject incompatible peers before creating game objects.

Bandwidth tests should use the busiest credible scene, not an empty lobby. Record bytes by message type, peak queue depth and correction frequency. Fuzz every decoder and rate-limit commands before authentication. ENet can deliver packets; the game still owns authority, compatibility and abuse resistance.

## Prediction, interpolation and correction

Remote objects usually render from a short snapshot buffer rather than the newest packet. Interpolate between two known states so network jitter does not become visible movement. Locally controlled objects can predict immediately, but the client must retain input sequence numbers. When an authoritative state arrives, restore it, discard acknowledged commands and replay the remainder. Smooth only the visible correction; simulation state must converge exactly.

Choose which facts need reliability. A chat message, inventory change or match result must arrive and be ordered. Frequent position snapshots can replace older snapshots and should not create a backlog. Keep channels and message limits explicit so a reliable flood cannot delay time-sensitive state.

## Security and reproducible tests

Never trust client positions, damage, cooldowns or ownership. Validate the command against server state, rate limits and permissions. Bound every decoded count and string before allocating, reject non-finite numbers, and authenticate before accepting expensive requests. Logs should identify session and reason without recording secrets.

Build a network simulator into tests: latency, jitter, loss, duplication and reordering should be parameters, not manual tricks. Record commands and periodic authoritative hashes so a failed match can be replayed offline. Test reconnect, late join, host shutdown and version rejection. Only then move from localhost to an internet test, where NAT, MTU and real scheduling expose assumptions a fast loopback hides.

## Before opening the server

Document maximum players, packet sizes, command rates and timeout behavior. Verify that a client cannot select another player's entity, replay an old command or force unlimited allocations. Monitor bytes, corrections and rejected messages per session, then load-test the busiest map with simulated real inputs. Have a protocol-version rejection message and an operational way to drain a server for deployment. Multiplayer reliability is the combined behavior of simulation, protocol, operations and recovery—not a successful exchange of two packets.

## Worked example: validate intent

Send input, not a trusted final position:

```cpp
struct MoveCommand {
    std::uint32_t sequence;
    std::int16_t moveX, moveY;
    std::uint16_t buttons;
};

bool Server::ApplyMove(Session& s, const MoveCommand& c)
{
    if (c.sequence <= s.lastMoveSequence) return false;
    if (!s.rateLimit.Consume(1)) return false;
    if (!IsNormalized(c.moveX, c.moveY)) return false;
    s.lastMoveSequence = c.sequence;
    world_.SetInput(s.playerId, DecodeDirection(c), c.buttons);
    return true;
}
```

Decode fields explicitly with bounds checks and fixed endianness. Never cast packet bytes to a C++ struct: padding and compiler layout are not protocols.

For prediction, retain unacknowledged commands. On a server snapshot, restore authoritative local state, discard inputs through the acknowledged sequence and replay the rest:

```cpp
predicted = snapshot.localPlayer;
pending.erase_through(snapshot.acknowledgedInput);
for (const MoveCommand& input : pending)
    Simulate(predicted, input, FixedStep);
```

Smooth only the visible correction; simulation converges to authority. Remote entities render between buffered snapshots. Test through a network shim with latency, jitter, loss, duplication and reordering. Assert convergence, once-only reliable events, bounded queues and safe reconnect. Fuzz every decoder and report bytes by message type.

## Snapshot design and late join

Give network entities stable IDs independent of local pointers. A snapshot contains a server tick, acknowledged client sequence and component data selected for that receiver. Quantize values only after choosing an acceptable error: for example, a small arena may encode position relative to known bounds, while an open world may require region plus local coordinate.

Delta compression needs an acknowledged baseline. Do not delta against the last snapshot sent, because it may have been lost. Periodically send a complete state or enough independent state that loss cannot poison the stream indefinitely. A late joiner first receives match rules, stable content/protocol identifiers and a full snapshot, then enters the normal delta stream after acknowledging it.

Separate reliable ordered events from replaceable state. Inventory grants, match transitions and chat belong to reliable delivery. Movement snapshots can supersede older ones. A huge reliable queue should trigger flow control or disconnect rather than delay current state for seconds.

## Security and operations

Authenticate before expensive world allocation. Bound message size, string length, collection count and decompressed size. Reject non-finite floats. Rate-limit by operation cost as well as packet count. Keep server authority over cooldowns, line of sight, inventory and damage.

Operational tests include incompatible build handshake, rolling deployment, server drain, reconnect to a new instance and graceful match termination. Monitor correction magnitude and command rejection by reason. An increase may indicate cheating, but it can also reveal a client/server simulation regression—investigate evidence before enforcing punishment.
