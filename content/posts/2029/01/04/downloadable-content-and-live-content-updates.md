---
title: Downloadable Content and Live Content Updates
date: 2029-01-04T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Deliver CNA content packs safely with signed manifests, resumable downloads, atomic activation, dependency resolution, rollback and save compatibility.
author: Robert Vokac
categories: [Development]
tags: [CNA, DLC, Content Pipeline, Updates, Security]
draft: false
---

Downloadable content is more than placing new files beside an executable. A production system must identify packs, verify downloads, resolve dependencies, activate atomically, respect platform storage and keep saves understandable when content disappears or changes.

CNA's content manager and CNB/XNB/loose-asset strategies provide runtime loading options. Distribution, entitlement and update policy live above them. Package compiled target-specific artifacts; do not expect a player device to run an authoring pipeline.

## A signed versioned manifest

Each release publishes a canonical manifest containing application/content format compatibility, pack IDs/versions, target platform/architecture, files, sizes and cryptographic hashes. Dependencies and conflicts are explicit.

```cpp
struct ContentPackManifest {
    PackId id;
    SemanticVersion version;
    ContentFormatVersion format;
    TargetId target;
    std::vector<FileEntry> files;
    std::vector<PackRequirement> requires;
    Signature signature;
};
```

The client trusts a configured public key or platform store verification, not a checksum delivered through the same unauthenticated channel. Sign canonical bytes and protect rollback/downgrade according to product policy. Key rotation and revocation need a documented path.

A hash proves content matches the manifest, not that the pack is safe. Official authoring/build systems validate asset complexity, scripts and legal provenance before signing. User-generated packs remain untrusted and go through stricter sandbox/budgets.

## Download into staging

Never write directly over active content. Download chunks/files into a staging directory owned by the updater. Bound declared and actual sizes, verify available storage, and use resumable range/chunk hashes where supported.

The updater records state atomically so a crash or power loss resumes or discards staging without confusing it with an installed pack. Limit concurrency and bandwidth; expose pause/cancel. Mobile/background networking follows platform policy.

After download, verify every hash, manifest signature, target and path. Normalize paths and reject absolute paths, traversal, reserved names and case collisions. Archives have entry-count, expanded-size and nesting limits. Do not create symlinks from an untrusted package.

## Resolve a complete candidate set

Activation operates on a set of packs. Resolve required version ranges, optional dependencies, conflicts and load order before changing anything. Deterministic resolution is essential; if several versions fit, use a published choice rule or lockfile.

Asset override rules must be explicit. A pack cannot replace core shaders or scripts merely because its filename sorts later unless that capability is intentionally granted. Namespaces reduce accidental collision. Record the final ordered content manifest as part of save/network/replay identity.

Compile/load a candidate catalog and validate required root assets. On devices with tight memory, validation may be staged, but it still cannot leave half the catalog active.

## Atomic activation and rollback

Publish activation through a small pointer/index file or atomic directory rename after all validation succeeds. Keep the previous manifest and pack files until the new set passes startup/health checks. A crash during activation should boot either old or new complete set.

Running games switch only at safe boundaries—usually title screen or restart. Presentation-only packs may support live content reload, but world rules, scripts and collision need a coordinated session transition. Multiplayer pins a session to one manifest and refuses incompatible peers.

If the new catalog fails, roll back to the last known-good set and preserve diagnostics. Do not delete rollback data until storage policy and successful launches permit it.

## Entitlement and offline behavior

Entitlement says whether an account may use a pack; installation says bytes are present. Cache entitlement according to platform/service rules and define offline grace. A transient service outage should not corrupt content or erase ownership.

Encrypting assets may discourage casual extraction but does not replace authorization; clients must eventually access decryption keys. Keep service credentials out of packages. Account switching on a shared device recalculates the active authorized set without deleting unrelated users' data unexpectedly.

## Save compatibility

A save records the ordered pack IDs/versions or semantic content hash that created it. Loading with missing content offers a clear outcome: install required pack, load in a documented degraded mode, migrate replacements, or refuse. Silently deleting unknown items can permanently damage a save.

Pack removal checks saves/active profiles and explains consequences. Content updates include migrations for durable IDs; asset paths alone are not save identity. Old pack versions may need retention until saves migrate.

## Operations and testing

Rollouts use channels and percentages with kill/rollback controls. Telemetry reports manifest version, download/verification/activation result and failure category without private file inventories. CDN cache headers and immutable versioned URLs prevent mixed files.

Test interruption after every state transition, corrupt chunks, insufficient storage, wrong target, expired/revoked manifest, dependency cycles, downgrade, account change, missing DLC save and offline startup. Fuzz manifests/archives and enforce all bounds before allocation/extraction.

A reliable CNA content update is a transaction: authenticated description, verified staged bytes, complete candidate catalog, atomic activation and recoverable previous state. Anything less eventually turns a network or power failure into a broken installation.
