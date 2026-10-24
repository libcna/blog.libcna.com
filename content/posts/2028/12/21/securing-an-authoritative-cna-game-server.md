---
title: Securing an Authoritative CNA Game Server
date: 2028-12-21T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Harden a headless CNA game service with strict protocol parsing, authenticated sessions, server-side validation, resource limits and privacy-aware operations.
author: Robert Vokac
categories: [Development]
tags: [CNA, Server, Security, Networking, Multiplayer]
draft: false
---

An authoritative server decides game truth, but authority alone is not security. It still parses hostile packets, manages identities, loads content and allocates resources under attacker-controlled timing. This article extends the headless/server and multiplayer articles with a defensive design. It is engineering guidance, not a substitute for a professional security review of a public service.

CNA can run shared gameplay code headlessly; the service around it owns transport, authentication, persistence and operations. Keep that boundary visible so renderer/input assumptions cannot enter authority.

## Start with a threat model

List assets and attackers. Protect account/session identity, match integrity, availability, private player data and service credentials. Consider modified clients, replayed packets, malformed payloads, bots, abusive authenticated users, compromised mods and accidental operator error.

Define trust boundaries: public network to gateway, gateway to match process, match to database, build pipeline to deployed content. A process inside the cluster is not automatically trustworthy. Document which credentials each component receives and rotate them independently.

## Parse every packet as hostile

Use a versioned protocol with fixed endianness, explicit lengths and bounded counts. Validate the complete envelope before allocation: magic/version, message type, declared size, session, sequence and authentication/integrity result. Then parse fields with overflow-safe arithmetic.

```cpp
ParseResult ParseCommands(ByteSpan bytes, ProtocolLimits limits) {
    Reader r(bytes);
    auto count = r.ReadBoundedCount(limits.maxCommandsPerPacket);
    if (!count) return ParseError::InvalidCount;
    // Read exact fields; never reinterpret_cast a network struct.
}
```

Reject NaN/infinity and out-of-range numeric input. Unknown optional fields need a forward-compatibility rule; unknown required messages fail cleanly. Decompression occurs only after compressed and maximum expanded sizes are bounded, protecting against bombs.

Fuzz parsers and run them under sanitizers. Seed the corpus with valid messages, truncations, maximum values and earlier bugs. One malformed client must not terminate the match process.

## Authenticate sessions, not payload claims

Establish player identity through a trusted authentication flow, then issue short-lived scoped session credentials. Bind connection/session to the player and match; ignore self-declared owner IDs in gameplay messages. Protect transport against eavesdropping/tampering where the deployment requires it.

Sequence numbers and nonce/window rules reject replay and stale messages. Reconnect rotates or explicitly resumes session state after proof. Logout/ban/revocation semantics are defined even if cached gateways are temporarily disconnected.

Secrets never enter client builds, source logs or crash reports. Match workers receive only credentials they need, preferably short lived. Administrative interfaces use stronger separate identity and audit.

## Validate intent on the server

Clients send commands, not outcomes. The server checks rate, ordering, ownership, cooldown, resources, position preconditions and state transitions before applying them. It calculates movement, hit tests, inventory and rewards from authoritative state.

“Impossible movement” heuristics alone are fragile under latency. Use the same ticked command simulation as the game and bound accepted command age/lead. A command outside the window is rejected or triggers resync; it never rewrites arbitrary history.

Design transactions for valuable operations. A purchase/trade/reward has an idempotency ID, validated preconditions and one durable commit. Retried messages cannot duplicate value. Cross-service operations require explicit consistency, not hope that both writes succeed.

## Resource limits and isolation

Set per-connection and global budgets: packets/bytes per second, message counts, command lead/backlog, concurrent requests, chat length, decompressed bytes and authentication attempts. Rate limiting has burst and sustained components and produces metrics. Disconnecting every spike can punish legitimate jitter; silently accepting unlimited bursts invites denial of service.

Bound simulation work per player and content complexity. A path request, user-generated script or avatar asset cannot consume unbounded CPU/memory. Separate matches/processes or use strong worker isolation so one failure has a limited blast radius.

Timeout every external call and use circuit breakers/back-pressure. If persistence is unavailable, decide whether new matches stop, results queue durably or the service degrades. Never spin retry in the simulation thread.

## Content, mods and updates

Servers and clients handshake protocol, game rules, content and allowed mod manifests. Validate signatures/hashes according to distribution policy. The server loads content only from configured roots and never accepts an arbitrary client path.

User-generated content needs schema validation, size/entity/script budgets and sandboxed capabilities. Scan/approval workflows may be required. Treat thumbnails, archives and text as untrusted inputs too.

Rollouts pin a match to one compatible rule/content version. Do not replace authoritative data halfway through a running match unless the protocol explicitly coordinates it.

## Logs, privacy and incident evidence

Structured logs include request/match/session pseudonymous IDs, message category, rejection reason, rate-limit decision and build/content version. Do not log credentials, private chat by default, raw personal identifiers or full packets indiscriminately. Define retention and access.

Metrics detect parse failures, authentication failures, command rejection, disconnects, tick overruns and resource saturation. Alerts use rates/baselines rather than paging on one bad packet. Preserve bounded replay/audit evidence for disputed matches under a published privacy policy.

## Verification and response

Test protocol fuzzing, replay, duplicates, reordering, oversized fields, NaNs, auth expiry, reconnect races, database timeout and controlled overload. Conduct load tests with realistic and malicious distributions. Dependency and container scans complement application tests but do not replace them.

Maintain an incident runbook: isolate version, revoke credentials, disable vulnerable message/feature, preserve evidence, notify, patch and rotate. A secure CNA server is not one that has never been attacked; it is one with narrow authority, bounded inputs and enough evidence to understand and contain failure.
