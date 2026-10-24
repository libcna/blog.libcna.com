---
title: Asynchronous Content Loading Without Frame Stalls
date: 2028-01-20T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Split CNA loading into bounded I/O, decoding and device-finalization stages with cancellation and measurable frame budgets.
author: Robert Vokac
categories: [Development]
tags: [CNA, Async Loading, Content, Multithreading, Performance]
draft: false
---

“Run `ContentManager.Load` on a thread” is not a loading architecture. File access and decoding may be parallel, but graphics/audio creation can be thread-affine, caches need synchronization and a cancelled screen must not receive late results.

Split work into stages:

```text
request -> read -> decompress/decode -> prepared CPU asset
        -> main/device queue -> runtime resource -> owner handoff
```

Each stage owns its input/output until a successful handoff. Use bounded queues so fast decoding cannot accumulate unlimited prepared textures while the render thread uploads slowly.

```cpp
while (uploadBudget.Remaining() && prepared.TryPop(asset)) {
    if (asset.cancelled) continue;
    auto resource = FinalizeOnDevice(asset);
    completions.Push({asset.requestId, std::move(resource)});
}
```

Budget by time and bytes, not just item count: one 4K texture differs from one JSON file.

## Cancellation and errors

Every request has an ID, destination lifetime/cancellation token and required/optional status. Cancellation stops future stages and safely discards owned intermediates. It does not free memory currently used by another thread.

Propagate the original asset name, stage and exception. Required failure moves the loading state to a recoverable error; optional failure selects a documented fallback. Do not mark progress 100% before device finalization succeeds.

## Avoid hidden stalls

Measure read, decode, queue wait, upload and finalization separately. Shader compilation, first pipeline creation or driver upload can still stall even after background decoding. Pre-create only what the next scene needs and spread device work across frames while showing honest progress.

Test cancellation at every stage, duplicate requests, cache hit, corrupt data, full queues, device failure and leaving the loading screen just before completion. Record peak CPU prepared bytes and GPU upload bytes. Async loading is successful when normal frames stay within budget and failure/cancellation leave no orphan resources—not merely when a worker thread exists.

## A concrete request model

Keep priority, owner generation and expected type in each request. Deduplicate by normalized logical asset key so two screens can await one in-flight decode without sharing ownership accidentally.

```cpp
struct LoadRequest {
    AssetKey key;
    AssetType type;
    LoadPriority priority;
    OwnerGeneration owner;
    CancellationToken cancellation;
};

struct PreparedTexture {
    LoadRequest request;
    int width, height;
    SurfaceFormat format;
    std::vector<std::byte> pixels;
};
```

The worker validates dimensions/byte size before allocating and retains no reference to graphics objects. The main thread verifies owner generation again before upload. Cache publication happens only after full resource construction succeeds.

## Progress without lying

File count is misleading when one file is 500 MiB. Assign estimated work to read, decode and device stages based on manifest metadata or past measurement. Keep progress monotonic but reserve final percentage for validation and finalization. When estimates change, report phase text rather than jumping backward.

Loading screens still render/input at normal frame cadence. Limit finalization to a time/byte budget and stop before a frame deadline. High-priority assets required for the first playable scene come before optional cosmetics, but starvation needs aging/fairness.

## Shader/pipeline warm-up

Decoded data may upload quickly while first use compiles a shader or creates pipelines. Where supported, prepare required effects/pipeline variants during the finalization budget and record their cost. Do not warm every theoretical state combination.

## Failure matrix

Inject short read, invalid header, decompression error, unsupported format, out-of-memory simulation, cancellation at every transition and device recreation during finalization. Assert one terminal completion per request, no callbacks after owner destruction and queues/bytes return to baseline.

Profile cold/warm loads separately. Record filesystem/read, decode CPU, queue wait, upload, pipeline preparation, peak prepared bytes and slowest frame. This shows whether “async” actually protects frames or merely hides I/O behind a later upload spike.

## Shipping checklist

Run loading on slow storage and constrained CPU/memory, not only a development SSD. Limit worker count so it does not starve update/audio. Verify application shutdown while workers block in I/O and define interrupt/deadline behavior.

Manifest dependencies allow progress and priority: level cannot publish until required mesh/material/collision/audio complete, while optional decoration can stream later. Publish one immutable `LoadedScene` candidate rather than dozens of callbacks mutating live world.

Keep an emergency synchronous path only for small tests/tools if useful, but production code should use the same validators/ownership. CI replays load/cancel/reload loops and asserts thread/resource/queue counts return to baseline. A diagnostic report lists active request stage/age/owner and queue bytes, making a “loading stuck” report actionable.
