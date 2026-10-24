---
title: Procedural Generation with Reproducible Seeds
date: 2028-11-09T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build deterministic procedural worlds above CNA with named random streams, staged constraints, versioned recipes, validation and compact saves.
author: Robert Vokac
categories: [Development]
tags: [CNA, Procedural Generation, Determinism, Random, Testing]
draft: false
---

Procedural generation is valuable when it creates meaningful variation that remains debuggable. “It used random numbers” is not enough. A useful generator can reproduce a world from an explicit recipe, explain failed constraints and preserve old saves when algorithms evolve.

CNA supplies the game runtime, math and content services; generation is application logic. Keep its output as ordinary validated world data so rendering and simulation do not need a separate “procedural” path.

## Seed is not the whole recipe

Record algorithm version, world settings, content-set identity and one root seed. Two builds with the same integer seed are not equivalent if room rules or asset catalogs changed.

```cpp
struct GenerationRecipe {
    std::uint32_t generatorVersion;
    std::uint64_t rootSeed;
    WorldSize size;
    DifficultyProfile difficulty;
    ContentSetId content;
};
```

Use a specified PRNG algorithm with defined integer operations; do not rely on an implementation-defined engine if cross-build reproduction matters. Serialize state or seed derivation in a stable endianness/format.

## Named random streams

One global stream makes unrelated changes cascade. Adding a cosmetic flower consumes a value and moves every later enemy spawn. Derive independent streams from root seed plus stable domain keys such as `terrain`, `loot`, chunk coordinate and entity ID.

```cpp
RandomStream terrain = streams.For("terrain", chunkCoord);
RandomStream loot = streams.For("loot", roomStableId);
```

Use a stable hash defined by the project, not process-randomized string hashing. Document draw order within each stream. Named streams limit—not eliminate—change: modifying the terrain algorithm still changes terrain, but it need not alter loot.

Never consume authoritative random values from rendering. Cosmetic particles and camera shake have separate presentation streams. Multiplayer authority generates results or shares the exact command/seed/version contract.

## Generate in stages with invariants

A robust world pipeline might create topology, assign roles, place critical path, add optional branches, place encounters/rewards, build geometry, then validate. Each stage consumes and produces a typed intermediate representation.

Critical invariants are explicit: start reaches exit, required key precedes lock, boss room fits, minimum resources exist, no spawn overlaps solid geometry and streaming cells remain within budgets.

Constraint solving needs bounded failure. Do not retry forever with new random draws. Limit attempts per local decision and whole-world regeneration, log rejected reasons and return a structured failure containing recipe and stage. Some games repair a candidate deterministically by carving a connection or moving an item.

Weighted choices define behavior for empty sets and zero weights. Shuffle algorithms and inclusive/exclusive integer ranges must be tested; off-by-one mistakes bias content while still looking random.

## Chunked and order-independent generation

Open worlds may generate chunks in camera-dependent order. A chunk's deterministic base data should derive from root seed and coordinate, not the order requested. Features crossing boundaries need a canonical owner or larger region generation.

For example, a road segment can be decided by a region cell that owns both endpoints, then each terrain chunk queries the same feature record. Neighbor border samples derive from global coordinates so seams match.

Order-independent does not mean stateless. Maintain a versioned world feature index for settlements, quests or unique placements that require global uniqueness. Generate/persist that index before arbitrary chunk requests.

## Persistence strategy

Saving only the recipe is compact but replays every generator bug/behavior change and cannot represent player modifications alone without a delta system. Saving the full generated world is larger but stable. A hybrid stores recipe plus generator version, global feature data and player/world deltas.

If old generator versions remain supported, keep their code/data or provide one-time migration to baked world data. Never regenerate an existing save with a new algorithm and silently call it the same world.

Content mods are part of identity. Record ordered mod/content manifests and handle missing entries explicitly. Bounds-check counts and recursion when reading shared seeds or generated content from other users.

## Testing beyond snapshots

Golden seeds are useful for known layouts, but property tests explore thousands of seeds and assert invariants. Minimize a failure to recipe, stage and relevant stream. Store that seed as a permanent regression fixture.

Distribution tests measure room counts, path lengths, reward spacing and failure rates over large populations. They detect bias or difficulty drift that one attractive screenshot misses. Fix thresholds and report generator/content versions.

Run generation headlessly and separately measure generation time, peak memory, retries and output complexity. Test cancellation during each stage and resume only if checkpoint semantics are defined.

## Visualization and provenance

Provide overlays for stage results, connectivity, constraints, stream keys and rejected candidates. Selecting a generated object should reveal recipe, generating stage, source rule and stable random decision key. This is far more actionable than printing the last PRNG value.

Capture maps and CNA-rendered scenes for curated seeds across releases. Procedural generation becomes a reliable production system when a bug report contains a complete recipe, rerunning it produces the same candidate, and every algorithm change has an explicit compatibility decision.
