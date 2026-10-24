---
title: Performance Checklist for CNA Games
date: 2027-10-14T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Measure and improve CNA frame time, rendering, assets, allocation, audio and loading without optimizing from intuition alone.
author: Robert Vokac
categories: [Development]
tags: [CNA, Performance, Profiling, Optimization]
draft: false
---

Performance work starts with a reproducible workload and a frame budget. Record build type, renderer, platform, resolution, scene, camera path and diagnostics mode. Discard warm-up and compare distributions, not one convenient FPS number.

## CPU and simulation

- Profile coarse update phases before instrumenting small helpers.
- Bound fixed-step catch-up and background queues.
- Remove per-frame allocations from hot loops.
- Use spatial structures for visibility and collision.
- Move independent heavy work off the game thread without touching graphics resources there.

## Graphics

- Cull invisible objects and choose LOD before submission.
- Reduce state, texture and render-target changes without breaking order.
- Batch sprites and atlas related textures.
- Reuse buffers and targets; do not create resources per frame.
- Measure overdraw, transparent sorting, shadow casters and post-process resolution.
- Query capabilities instead of triggering expensive compatibility fallbacks accidentally.

## Content and audio

Choose texture formats and mip levels appropriate to the target, stream optional content, and keep loading outside the critical frame where possible. Pool sound instances, cap voices and avoid decoding the same asset repeatedly.

Use CNA `STATS` for long runs and `FULL` zones for a focused capture. Inspector helps discover spikes; a deterministic benchmark proves improvement. Profile release-like optimized builds, but retain symbols and diagnostics needed to identify work.

Check several targets. A change that helps a discrete GPU may hurt WebAssembly or Software; a threaded optimization may not be available on the deployment host. Monitor memory and load time alongside frame time.

After every optimization, verify screenshots, simulation results and input latency. The fastest wrong frame is a regression. Keep the benchmark and its baseline in the repository so performance remains a tested property rather than a memory of how the game once felt.

## Interpreting results

Separate CPU time, GPU work, presentation wait and loading stalls. Lower average time with worse high percentiles may feel less smooth. Record latency and memory peaks during transitions, not only steady state.

Change one variable and keep raw samples. Revert complexity whose gain is inside noise. Assign budgets to subsystems and quality tiers so each new feature has an explicit cost.

## Diagnose the limiting resource

Start with frame-time percentiles, not average frames per second. Record update, submission, GPU or presentation time where available, plus spikes caused by loading or collection. If reducing render resolution improves time, investigate pixel cost; if hiding geometry helps, inspect vertex and draw cost; if neither changes the result, profile CPU work and synchronization.

For 2D, count sprites, batch breaks, texture switches and overdraw. For 3D, count visible objects, draws, triangles, material changes, shadow casters and render-target transitions. Track uploads and allocations separately. A high-level counter connects a profiler hotspot to a game decision and remains useful on platforms without deep GPU tools.

## Budgets and regression gates

Set budgets for CPU update, rendering, memory, content loading and package size on representative low and high targets. Measure warm steady play and cold transitions. Long mobile or handheld runs are essential because heat can change performance after the initial benchmark. Servers need worst tick and queue depth rather than display frame rate.

Automate stable micro-scenes and one real gameplay capture. Store median and slow percentiles with build, renderer, resolution and hardware metadata. Alert on meaningful regressions but rerun noisy results before blocking a change. Visual correctness tests must remain alongside performance tests; a renderer that skips work is fast but wrong.

Prefer structural wins: culling work never submitted, batching compatible draws, reusing resources, loading outside critical frames and selecting sensible target sizes. After every change compare identical input and preserve raw results. Optimization is complete when the title meets a documented budget on shipping hardware, not when one development machine reports a larger FPS number.

## Ship diagnostics with restraint

A release build can retain inexpensive counters and a protected diagnostic overlay: frame percentiles, update and draw time, memory estimates, draw calls, target switches and active quality tier. These values make field reports far more useful without requiring a profiler. Avoid logging every frame or exposing private data. Provide a way to copy a compact report containing version, platform, renderer and display configuration so real-world performance problems arrive with enough context to reproduce them.

## Worked example: measure distributions

Collect frame duration into a fixed-size ring and report percentiles periodically:

```cpp
void FrameMetrics::EndFrame(Clock::time_point started)
{
    const float ms = DurationMs(Clock::now() - started);
    samples_[write_++ % samples_.size()] = ms;
}

FrameReport FrameMetrics::Report() const
{
    auto sorted = samples_;
    std::sort(sorted.begin(), sorted.end());
    return {.median = Percentile(sorted, 0.50f),
            .p95 = Percentile(sorted, 0.95f),
            .p99 = Percentile(sorted, 0.99f),
            .worst = sorted.back()};
}
```

Discard startup or label it separately; loading spikes are still important but answer a different question from steady play. Record build, scene, renderer, resolution, quality, hardware and power state with every report.

## Diagnose before optimizing

Reduce resolution: a large improvement suggests pixel, post-process or bandwidth cost. Freeze or hide geometry: improvement suggests draw, vertex or overdraw cost. Disable simulation systems individually: improvement identifies CPU owners. Inspect waits; CPU and GPU both appearing idle can mean synchronization or frame pacing.

Maintain counters beside timings: sprites, batches, draws, triangles, visible objects, shadow casters, target switches, uploaded bytes and allocations. Change one variable, replay identical input and keep raw samples. A result inside run-to-run noise is not a win.

Create budgets for median and slow frames, transient memory, steady memory, load time and package size on the weakest target. Run sustained mobile tests for thermal behavior and headless tests for worst tick/queue depth. Put stable scenes in CI with a tolerance chosen from measured variance. Never loosen correctness to pass a performance gate without a documented quality policy.

## Memory and loading checklist

Measure peak as well as steady memory. Scene transitions can temporarily retain old assets, decoded new assets, upload staging and final GPU resources together. Log assets loaded/unloaded and bytes by owner. A leak test repeatedly enters and leaves the same scene and verifies the baseline returns after expected caches settle.

Move file access, decompression and CPU parsing out of critical frames, but keep device-resource creation on the allowed thread. Bound background queues and upload work per frame so “asynchronous” loading does not create a 50 ms submission spike. Prewarm only resources actually needed soon; uncontrolled prewarming merely moves the stall and raises memory.

Track allocations in update/draw hot paths. Reuse vectors and command buffers with bounded capacity, cache immutable layout and avoid building strings for disabled diagnostics. However, do not replace clear ownership with a global pool until a profile shows allocation cost matters; pools can retain peak memory and hide use-after-free.

## Choosing a quality tier

A tier is a coherent budget: render scale, shadow resolution/cascades, post-process targets, light count, animation update distance and texture selection. Expose the active tier and each automatic downgrade. Change quality at controlled boundaries and invalidate temporal history.

Verify the lowest tier for correctness and readability rather than assuming fewer effects always work. Performance work is complete when every supported target has a tier meeting its frame and memory budget through a sustained representative session, with raw evidence retained for comparison.
