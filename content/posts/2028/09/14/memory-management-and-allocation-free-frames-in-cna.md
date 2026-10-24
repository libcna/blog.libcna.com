---
title: Memory Management and Allocation-free Frames in CNA
date: 2028-09-14T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Control frame-time variance in CNA games with ownership, reusable storage, frame arenas, pools, budgets and evidence-driven allocation diagnostics.
author: Robert Vokac
categories: [Development]
tags: [CNA, Memory, Performance, Native C++, Profiling]
draft: false
---

“No allocations during a frame” is not a universal virtue. Loading a level should allocate the resources that level needs. A menu opening once can build its widget tree. The useful rule is narrower: steady-state update and rendering should not perform surprising unbounded allocation work that creates frame-time spikes or obscures ownership.

CNA is C++, so a game controls object and container lifetime directly. That power does not remove allocation cost, fragmentation or use-after-free risk. Begin with measurements and ownership before introducing custom allocators.

## Establish memory categories

Track at least these categories separately:

- permanent/application services;
- current world and screen content;
- streaming cache;
- graphics/audio resources;
- per-frame transient data;
- background jobs and queued results;
- diagnostics/tools.

An allocation tag carries subsystem, owner generation and optional asset ID. Budget dashboards should report current, peak and allocation count. OS resident memory alone cannot tell which level or cache is responsible.

Use RAII for CNA and game resources. One owner releases a resource; other systems hold non-owning or generation-checked handles. Cycles of shared ownership can keep entire worlds alive, especially through callbacks and queued jobs.

## Reserve stable containers

The first optimization is often `reserve`, not a custom allocator. If the renderer normally emits 5,000 items, retain vector capacity across frames. Clear logical contents without returning memory. Track peak and cap hostile content so “retain capacity” cannot preserve an accidental million-item spike forever.

```cpp
class RenderList {
public:
    void BeginFrame() { items_.clear(); }
    void Reserve(std::size_t expected) { items_.reserve(expected); }
    void Add(RenderItem item) { items_.push_back(std::move(item)); }
private:
    std::vector<RenderItem> items_;
};
```

Prefer values and stable IDs for small commands. A heap object per particle, collision pair or UI glyph is rarely necessary. Structure-of-arrays can improve iteration for dense systems, but use it where profiles show cache pressure rather than rewriting every domain type.

## Frame arenas for truly transient data

A frame arena serves data that dies together: temporary draw items, sort keys, debug primitives and formatted diagnostic scratch. Allocate linearly, then reset only after all consumers of that frame have finished.

With multithreaded render preparation or frames in flight, one arena is unsafe. Use an arena per frame slot and retire it through the same completion/fence policy as its command data. Destructors for arena objects either must be trivial or explicitly invoked before reset.

```cpp
FrameArena& arena = frameArenas.Acquire(frameSlot);
auto items = arena.MakeSpan<RenderItem>(estimatedCount);
// arena.Reset() only after the slot is no longer consumed
```

Set a budget and visible overflow policy. Falling back to the general heap can keep development running but must increment a diagnostic counter. Production may grow to a bounded high-water mark between scenes or reject excessive debug output.

## Pools are for reuse, not hiding leaks

Object pools suit objects with high churn and similar lifetime, such as projectile presentation, particle emitters or network packet buffers. A pool handle needs a generation counter so a stale reference cannot address a reused slot. Reset every field on release/acquire and stop callbacks, audio and haptics owned by the old generation.

Pooling large heterogeneous objects wastes memory and complicates destruction. Resource caches need byte budgets, LRU/priority policy and pinning—not merely a vector of old objects. Graphics resources additionally belong to a device generation and owning thread.

## Strings, callbacks and logging

Formatting logs every frame can allocate even when the message is filtered later. Test the level/category before building text, use structured fields and cap repeated events. UI labels that do not change should cache layout; dynamic counters can use reusable buffers.

`std::function` captures, event subscriptions and lambdas retained by jobs can extend ownership unexpectedly. Record subscription tokens and disconnect them during owner shutdown. Capture stable IDs and immutable inputs rather than `this` when work can outlive the caller.

## Asset and device lifetime

Content scopes make memory changes explainable. Shared assets live at application scope; screen/level assets live with that owner; streaming assets live in a bounded cache. Unloading a scope cancels producers before releasing consumers.

CPU and GPU memory are different budgets. A texture may retain decoded staging pixels after upload by accident. Conversely, discarding all CPU copies may prevent device recovery. Document the recovery source—content blob, reloadable file or retained data—and account for it.

Deferred GPU release can temporarily raise memory. Report active and retired-but-in-flight bytes separately. After device recovery, stale handles from the previous generation must fail cleanly rather than alias new resources.

## Measure allocations without distorting the game

Count allocation calls and bytes by tag around representative frame phases. Capture call stacks selectively, because full tracing changes timing. Compare median and tail frame times with allocation bursts. One 4 MB vector growth during camera motion matters more than many tiny startup allocations.

Create steady-state scenarios: idle gameplay, combat, split-screen, particle peak, streaming boundary and developer overlays. Warm known caches first when measuring warm behavior, and run a separate cold-start scenario.

Tests assert capacity limits, generation safety, arena retirement, pool reset, cancellation and memory returning near baseline after repeated load/unload. Sanitizers catch invalid lifetime; long soak tests catch gradual retention.

An allocation-free steady frame is a useful consequence of clear ownership and reusable data flow. It is not a reason to replace understandable code with an allocator maze before the profiler identifies a problem.
