---
title: CPU–GPU Synchronization and Hidden Rendering Stalls
date: 2028-09-28T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Find CNA rendering stalls caused by readback, dynamic resource reuse, queries, screenshots and queue saturation without relying on misleading CPU timings.
author: Robert Vokac
categories: [Development]
tags: [CNA, GPU, Synchronization, Profiling, Performance]
draft: false
---

The CPU normally records work while the GPU executes earlier work. This overlap is essential for throughput, but it makes profiling deceptive. A call that appears slow may merely be the place where queued GPU debt is collected. A call that returns quickly may enqueue expensive work that blocks later at present or resource reuse.

CNA deliberately spans renderers with different native synchronization models. Application code should identify semantic hazards—reading GPU results now, overwriting in-use data, exhausting transient storage—rather than depending on one backend's call timing.

## Recognize forced synchronization

Common stall sources include:

- reading a texture or render target back to the CPU;
- synchronous screenshots or picking buffers;
- waiting immediately for an occlusion/timing query;
- updating a dynamic buffer region still used by an earlier draw;
- destroying/recreating resources while they are in flight;
- mapping with a mode that requires old contents;
- present blocking because the allowed frame queue is full;
- allocating/uploading enough transient data to exhaust internal pools.

The fix is usually to change data flow or latency, not to move the same blocking call to another function.

## Measure complete workloads

CPU timers around draw calls measure submission cost, not GPU execution. Use renderer/platform GPU timestamps where exposed and validated, with frame IDs and delayed result collection. Never wait in the same frame merely to make the profiler look current.

```cpp
GpuQueryHandle q = profiler.BeginGpuRegion("water.reflection");
DrawReflection();
profiler.EndGpuRegion(q);
// Collect only when the renderer reports the older query ready.
```

When GPU queries are unavailable, controlled A/B captures and present behavior still locate expensive passes. CNA Profiler should label timing provenance: CPU submit estimate, GPU timestamp or unsupported. Do not compare unlike clocks as if they form one exact timeline without calibration.

Add queue-depth and resource-pressure counters where backend extensions expose them. A sudden CPU wait after several fast frames often indicates the CPU reached the maximum frames in flight.

## Readback is a pipeline decision

Screenshots, color picking, visibility feedback and gameplay code that asks for rendered pixels all require readback. Make them asynchronous: render/copy into a staging resource, attach a request ID, continue frames and collect when ready. The UI can show “capturing” rather than freezing.

```cpp
CaptureId id = captures.Request(CaptureDesc{target, region, format});
// Later:
if (auto image = captures.TryTake(id)) SaveOnWorker(std::move(*image));
```

Bound outstanding requests and bytes. Scene unload/device loss cancels or fails them with a clear status. For mouse picking, CPU ray/bounds tests may be cheaper and lower latency than a GPU ID-buffer readback. If exact GPU picking is required, accept one or more frames of latency and correlate the result with camera/object generations.

## Stream dynamic geometry safely

Particles, debug lines, UI and procedural meshes update buffers frequently. Overwriting the same bytes before the GPU finishes causes a wait or corruption. Use a ring buffer or multiple frame slots. Allocate a new non-overlapping region, record its retirement frame/fence and wrap only when safe.

Discard/no-overwrite style semantics, where supported through CNA, must match actual access. “No overwrite” is a promise from the application, not a performance hint the driver can fix. If capability paths differ, keep one conservative fallback with bounded buffers.

Batch uploads and use appropriately sized resources. Thousands of tiny updates increase submission overhead; one enormous per-frame copy wastes bandwidth. Track bytes and update counts by subsystem.

## Queries and conditional behavior

Occlusion queries are useful only when their result arrives later. Issuing a query then waiting before drawing the next object serializes the GPU. Consume older results, apply visibility hysteresis and fall back to visible when a result is unavailable. Never let delayed visibility remove gameplay-authoritative objects.

GPU timing queries also have limited pools and wrap/disjoint conditions. Sample representative frames or bounded named regions. Validate that enabling profiling does not change pass structure or exceed query capacity.

## Resource creation and destruction

Creating textures, effects and buffers during gameplay may compile, upload or allocate driver memory. Prepare assets ahead of critical moments and budget main-thread finalization. Shader/material variants should warm before their first combat frame when the renderer performs lazy work.

Destroying a resource does not necessarily free GPU memory immediately. Maintain a retirement queue tied to safe completion. Report active and retired bytes separately. A device reset or resize should stop new submissions, drain/cancel according to backend policy, build candidate resources and publish coherently.

## A practical investigation

When a hitch appears, capture CPU phase times, GPU pass times, upload/readback events, resource allocation, frames in flight and presentation wait under the same frame IDs. Disable one pass at a time without altering unrelated work. Repeat several times; shader caches and thermal state change results.

Create stress fixtures: repeated screenshots, maximum debug geometry, rapidly changing dynamic buffers, delayed query results, resize during uploads and capture cancellation. Run across CNA renderers because one may hide a hazard until resource pressure grows.

The release rule is simple: no required gameplay path performs an unbounded synchronous GPU readback; transient resources have explicit retirement; and every unavoidable wait is named, measured and attached to a product decision.
