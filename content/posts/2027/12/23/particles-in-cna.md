---
title: "Particles in CNA: From SpriteBatch to GPU-friendly Systems"
date: 2027-12-23T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build bounded deterministic CNA particle emitters, batch their rendering and scale from simple 2D effects to renderer-assisted paths.
author: Robert Vokac
categories: [Development]
tags: [CNA, Particles, SpriteBatch, Performance, Effects]
draft: false
---

Particles are many short-lived visual records, not thousands of independently allocated game objects. A practical CPU particle contains position, velocity, age, lifetime, size, rotation, color and sprite selection in reusable storage.

```cpp
struct Particle {
    Vector2 position, velocity;
    float age, lifetime, rotation, angularVelocity;
    Color startColor, endColor;
    float startSize, endSize;
    bool alive;
};
```

Preallocate a pool or use a dense array with swap removal. Define exhaustion: refuse new cosmetic particles, replace oldest/least important, or reserve capacity for critical feedback. Never allocate without bound during an explosion chain.

## Deterministic emission and update

An emitter owns spawn rate, burst rules, ranges and a seeded random stream. Accumulate fractional emission so frame rate does not change average count. Update at simulation time, clamp or substep large elapsed values, and remove expired particles.

```cpp
spawnAccumulator += rate * dt;
while (spawnAccumulator >= 1.0f) {
    TrySpawn(rng);
    spawnAccumulator -= 1.0f;
}
for (Particle& p : particles) {
    p.velocity += gravity * dt;
    p.position += p.velocity * dt;
    p.age += dt;
}
```

Use normalized age to interpolate size/color. Curves can replace linear interpolation, but avoid per-particle heap work.

## Rendering

For 2D, group particles by atlas, blend and sampler, then draw in a coherent SpriteBatch pass. Additive particles often tolerate loose ordering; alpha particles may require back-to-front order. Separate those policies.

For 3D billboards, generate camera-facing quads or instance a quad with per-particle position/size/color. Query capabilities and retain the CPU/SpriteBatch path. Soft particles that sample scene depth require a render target/depth contract and should fall back cleanly.

## Budgets and tooling

Expose alive, spawned, rejected, update time, draw batches and overdraw estimate per emitter. A debug overlay can freeze simulation, draw bounds and color particles by age. Quality tiers reduce emission, lifetime, target resolution or expensive collision in a documented order.

Test seeded replay, pool exhaustion, pause/resume, huge frame delay, off-screen emitters, scene unload and transparent overlap. Visual fixtures use a fixed seed and time so cross-renderer screenshots are comparable. A good particle system remains bounded and repeatable even when its result looks chaotic.

## Collisions and event boundaries

Full physics per particle is usually too expensive. Use simple planes, height fields or a bounded collision query budget. Decide whether collision kills, bounces or spawns a secondary event. Secondary emitters also consume pools, so cap recursion/generation and record rejected spawns.

Separate simulation from renderer data. The update thread produces a compact snapshot or fills a buffer owned until submission completes. It must not resize a vector while rendering reads it. When emitters belong to a destroyed entity, they may stop immediately or continue under a world-owned effect manager; document that lifetime.

Animation frames derive from normalized age or explicit rate. Atlas rectangles need padding. Flipbook selection should clamp the final frame and behave deterministically under large time steps. Billboard basis comes from camera orientation, while world-locked effects such as ground dust may use a fixed plane.

Create stress presets: maximum rain, overlapping explosions and long smoke. Record pool capacity/high-water, spawn rejection, simulation/draw time, batches and target overdraw. Test reduced quality by forcing it, not only on slow hardware. Accessibility settings can reduce flashes, camera-linked particles and dense screen obstruction without changing gameplay authority.

Package emitter definitions as validated content with stable texture/cue references and bounded ranges. Invalid negative lifetime, NaN velocity or extreme rate should fail content validation rather than poison a runtime pool.

## Emitter content example

```yaml
id: fx.campfire
capacity: 256
rate: 18
lifetime: [0.8, 1.6]
velocity: {x: [-0.15, 0.15], y: [-1.3, -0.6]}
size: {start: [0.08, 0.15], end: [0.01, 0.04]}
blend: additive
atlas: Effects/fire
```

Processor checks ranges/order/capacity/reference and compiles into runtime DTO. Product quality tier multiplies rate/capacity under global minimum/maximum, not edits definitions destructively.

## Pause, ownership and save

Cosmetic particles usually do not belong in saves/replays; deterministic effects respawn from gameplay events. On pause, freeze simulation or allow explicitly UI/background effects. On scene unload, world-owned emitters/particles release together; persistent transition effects move under longer-lived effect service deliberately.

## Renderer validation

Compare CPU SpriteBatch and instanced billboard variants using fixed seed/timestamps. Test blend, atlas UVs, rotation, billboard at camera poles, depth/cull, soft-depth absence and target resize. Overdraw visualization matters more than triangle count for smoke.

Reject/quality metrics should be visible in stress capture. If critical feedback is dropped under capacity, reserve priorities/pools. If decorative load obscures gameplay or flashes excessively, accessibility policy reduces it without altering authoritative events.
