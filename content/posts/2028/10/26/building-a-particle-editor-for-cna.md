---
title: Building a Particle Editor for CNA
date: 2028-10-26T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Turn CNA particle code into an authoring workflow with versioned emitter assets, deterministic preview, curves, gradients, budgets and safe live reload.
author: Robert Vokac
categories: [Development]
tags: [CNA, Particles, Editor, Tools, Content Pipeline]
draft: false
---

The earlier *Particles in CNA* article describes CPU/GPU-friendly simulation and rendering. An effect becomes practical only when artists can author, preview, compare and validate it without rebuilding gameplay for every number. A particle editor is therefore an asset tool, not a second unrelated particle runtime.

Use exactly one emitter schema and one evaluator in editor and game. The editor can add cameras, gizmos and undo history, but preview must consume the same versioned asset that ships.

## Design a serializable emitter

Separate durable authoring data from runtime caches. An emitter definition contains emission shape/rate, lifetime, initial distributions, forces, curves, render material, local/world space and limits. Runtime arrays, random state, GPU buffers and texture pointers are not serialized.

```cpp
struct ParticleEmitterAsset {
    std::uint32_t schemaVersion;
    StringId material;
    EmissionShape shape;
    ScalarDistribution rate;
    ScalarDistribution lifetime;
    VectorDistribution initialVelocity;
    Curve sizeOverLife;
    Gradient colorOverLife;
    std::uint32_t maxParticles;
    SimulationSpace space;
};
```

Every distribution declares its meaning: constant, uniform range, curve or discrete weighted choice. Store units in field names/metadata—seconds, particles per second, world units. Validate finite numbers, ordered curve keys, non-negative lifetimes and a bounded maximum before allocating.

Version the schema. Migrations operate on data, for example converting an old single `speed` into `[minSpeed,maxSpeed]`. Keep migrations deterministic and tested; do not silently reinterpret old assets based on editor version.

## Deterministic preview

The same seed, asset revision and simulation steps should produce the same preview under the project's determinism boundary. Give the editor Play, Pause, Single Step, Restart and seed controls. Fixed-step preview prevents effect shape from changing with editor frame rate.

Scrubbing is harder because particle state is history-dependent. Either resimulate from zero, use periodic checkpoints, or clearly label approximate seeking. A “restart on edit” mode is predictable. A live-retarget mode can preserve existing particles only for fields whose semantics allow it.

Show simulation time, alive/spawned/killed counts and seed. A looping preview needs a defined pre-roll so long-lived effects reach steady state. One-shot effects should automatically frame their full lifetime plus a bounded tail.

## Curves and gradients

Curve editors need stable key IDs, time/value fields, tangent mode, snapping and numeric editing. Normalize time to particle lifetime for size/color unless a property explicitly uses seconds. Display sampled curve and out-of-range behavior.

Gradient keys include color and alpha under the project's color-space policy. Preview against light, dark and checkerboard backgrounds. Premultiplied-alpha assets must be previewed with the same blend path as the game, otherwise fringes appear only after export.

Undo/redo stores semantic commands—move key, change value, add module—not whole GPU state. Dragging can coalesce many pointer events into one history entry. Dirty state follows durable asset changes, not camera orbit.

## Scene and camera context

Particle appearance depends on scale, lighting, depth and motion. Provide reference grid, unit object, selectable HDR/LDR background, directional light and several camera rigs. Allow attaching the emitter to a moving/rotating test transform to reveal local/world-space mistakes.

Collision and depth-softening need a representative scene. Keep fixtures small and versioned. An effect that only looks correct against the editor's empty black background is not qualified.

Draw emitter shapes, velocity cones, bounds and simulation-space axes. Auto bounds are useful, but shipping culling bounds should be conservative and inspectable; a rare high-velocity particle must not disappear outside the average box.

## Runtime budgets in the authoring UI

Show maximum theoretical emission, current live count, vertex/index count, upload bytes, draw calls, texture memory and CPU/GPU time where measurable. Warn when rate × maximum lifetime exceeds `maxParticles`, explaining whether the runtime drops new or oldest particles.

Define platform quality tiers inside the asset or accompanying profile: rate scaling, maximum particles, collision off, cheaper material, lower-resolution texture. Preview each tier. Do not key tiers directly to renderer names; use product profile and capabilities.

Burst stress tests reveal hidden costs. A button can spawn the maximum burst repeatedly while graphs display frame time and pool overflow. The editor must itself avoid skewing results with unlimited debug drawing.

## Content pipeline and live publication

Save source atomically through a temporary file and rename, then let the normal content compiler validate and produce the runtime artifact. The editor loads that artifact for final preview, catching differences between editable JSON/YAML-like data and shipped binary representation.

Hot reload builds a candidate emitter/material first. If invalid, the active preview remains and errors point to fields. Publishing increments an asset generation. Existing runtime emitters either keep the old definition until restart or migrate under an explicit compatibility rule.

External texture/material changes travel through dependency tracking. Missing resources use deliberate placeholders but make the asset invalid for release. Export includes dependency IDs, not absolute workstation paths.

## Tests and release output

Round-trip every schema field, migration and undo command. Compare fixed-seed snapshots: counts, aggregate bounds and selected particle values at named ticks. Visual golden captures cover blend modes, orientation modes, local/world simulation and each quality tier across CNA renderers.

The release validator reports invalid curves, unknown modules, missing materials, unbounded counts and unsupported required capabilities. A particle editor succeeds when the asset seen in the tool is the asset run by the game, its cost is visible before commit and every old effect has an intentional migration path.
