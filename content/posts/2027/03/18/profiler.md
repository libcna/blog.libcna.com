---
title: Profiler
date: 2027-03-18T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  CNA's diagnostics profiler provides counters, frame histories, hierarchical CPU zones, events, resource tracking and trace export without tying a game to one renderer or user interface.
author: Robert Vokac
categories:
  - Development
tags:
  - CNA
  - C++23
  - Profiling
  - Diagnostics
  - Performance
draft: false
---

Performance work becomes much easier when an engine can answer concrete questions: how long did `Update` and `Draw` take, how many draw calls did this frame submit, which zone created a spike, and did the profiler itself lose records? CNA now provides those answers through a renderer-independent diagnostics layer.

The profiler is part of `modules/diagnostics`. Engine code writes inexpensive statistics and bounded events, while tools consume snapshots through `CNA::Diagnostics::IDiagnosticsProvider`. No renderer, GUI, browser or third-party tracing library is required in the game process.

**Source and complete contract:** [docs/diagnostics.md](https://github.com/libcna/cna/blob/next/docs/diagnostics.md)

## Choose the cost at build time

Diagnostics are selected with one CMake cache option:

```bash
cmake -S . -B build -DCNA_DIAGNOSTICS=FULL
cmake --build build
```

Three modes are available:

| Mode | What is compiled |
| --- | --- |
| `OFF` | Instrumentation macros disappear, including argument evaluation |
| `STATS` | Counters, gauges, frame timing, history and resource metadata |
| `FULL` | Everything in `STATS`, plus zones, markers, event streams and recordings |

`OFF` is the default. The public `CNA_DIAGNOSTICS_LEVEL` definition is `0`, `1` or `2`, so application code can conditionally compile its own diagnostic facilities. At runtime a build may lower its active mode, but it cannot enable information that was not compiled in.

That distinction is important for releases. A shipping game can use `STATS` for a small operational dashboard, a profiling build can use `FULL`, and a constrained build can make the same source compile to no instrumentation at all.

## Instrument game code

The macro API keeps call sites small:

```cpp
void World::Update()
{
    CNA_PROFILE_SCOPE("World::Update");

    CNA_DIAGNOSTICS_GAUGE("World.VisibleActors", visibleActors.size());
    CNA_DIAGNOSTICS_FRAME_COUNTER("World.CollisionTests", collisionTests);

    UpdatePhysics();
    UpdateCharacters();
}
```

`CNA_PROFILE_SCOPE` creates a hierarchical CPU zone in `FULL` builds. Category variants let a viewer group work such as runtime, graphics, audio or game systems. Marker macros record noteworthy instants, while counter, gauge and frame-counter macros represent different kinds of numeric data.

Names are registered once. After a hot path has seen a name, recording does not repeatedly allocate or copy its string. Each thread writes to its own single-producer stream, avoiding a global profiling lock around every zone.

CNA instruments its own important boundaries. Built-in metrics include runtime update and draw time, FPS, draw and primitive counts, indexed versus non-indexed calls, texture, effect and render-target binding changes, sprite counts, and audio voice statistics. Applications can add domain-specific values beside them without creating a second metrics system.

## A useful profiling workflow

Instrumentation is most valuable when it answers a question. Start with a coarse frame view: compare update time, draw time and total frame duration, then correlate a slow frame with draw calls, visible objects, streaming work or active audio voices. Only add nested zones around the subsystem that remains unexplained.

For example, a streaming world might record the number of loaded regions as a gauge, newly queued regions as a frame counter, and separate zones for visibility, generation and upload. A single capture can then distinguish “more work was requested” from “the same work became slower.” Stable names also make recordings comparable between revisions.

Avoid creating a zone around every tiny helper. Even a low-overhead profiler changes the program when millions of events are produced, and an unreadable trace is not useful. Prefer boundaries that correspond to decisions: simulation phases, asset jobs, render passes and batches. Use counters for frequency and zones for duration.

Automated tests can consume the same provider. A performance scenario may run a deterministic number of frames, discard warm-up samples and record medians or percentiles for selected metrics. Absolute thresholds should allow for machine variation; regression ratios against a local baseline are often more robust.

## Frames, zones and honest gaps

Frame history is bounded to 240 entries. `FULL` mode records nested begin/end zones and markers into per-thread buffers, then exposes a merged event view to consumers. The implementation places explicit limits on this data: a thread stream contains 1,024 records, the process event ring 32,768 records, and nesting depth is limited to 64.

These limits are deliberate. A profiler must not turn a temporary event storm into unlimited memory growth. If a producer outruns the buffers, records are dropped and that loss is reported. A discontinuity is therefore visible instead of being presented as an apparently complete trace.

The same honesty applies to memory figures. CNA knows exact logical byte counts for buffers and can estimate texture payloads from dimensions and format. Those values are useful resource statistics, but they are not total GPU allocation or process memory. Driver overhead, staging resources and allocator behavior remain outside that estimate.

## Resources and recordings

Graphics and audio objects receive stable diagnostic identifiers. A consumer can enumerate metadata and correlate create, update and destroy events without depending on C++ object addresses. This is useful for spotting resource churn, checking dimensions and formats, or following a suspicious object across a recording.

`FULL` mode can write CNA's compact binary `CNATRACE` format or stream Chrome Trace JSON. The latter opens in established trace viewers, making it possible to inspect CNA zones alongside other timestamped work. Streaming avoids building one enormous JSON document in memory.

The provider is a pull interface. A local overlay, automated benchmark, test harness or the separate CNA Inspector can all ask for the same data. The producer does not know how the snapshot will be displayed.

A custom consumer should preserve that separation. Poll at a modest frequency, copy only the information it needs and perform expensive formatting or file output away from the game thread. The diagnostics layer is designed to make recording cheap; a consumer that serializes a large report every frame can still become the bottleneck it is trying to observe.

## Measured overhead

CNA includes a reproducible diagnostics microbenchmark rather than claiming that profiling is free. On the documented AMD Ryzen 7 PRO 7840U with GCC 14.2, the `OFF` build remained within measurement noise, a `STATS` counter update measured about 1.6 ns, and a complete `FULL` zone added about 63.9 ns in that particular setup.

Those numbers are a baseline, not a promise for every processor and compiler. The useful conclusions are structural: disabled macros compile away, statistics use a much cheaper path than full event capture, and buffers are bounded. Measure the application on its target hardware before choosing the mode for a release.

## Current boundaries

The first profiler concentrates on CPU timing, engine statistics and resource metadata. It does not yet report authoritative total memory use or GPU timestamp queries. GPU timing is intentionally left behind an extension seam because every graphics backend needs a correct implementation and synchronization policy; presenting CPU submission time as GPU time would be misleading.

That scope makes the profiler useful today without pretending to solve every performance question. Enable `STATS` when continuous counters are enough, switch to `FULL` when a spike needs a timeline, and consume the result through the provider that best fits the workflow.

One practical release strategy is to keep a reproducible `FULL` profiling preset beside the ordinary build rather than changing flags by hand. That ensures the same compiler, renderer and game configuration can be rebuilt when a report arrives. A lighter `STATS` preset can then remain available for long-running tests where trends matter more than individual zones.
