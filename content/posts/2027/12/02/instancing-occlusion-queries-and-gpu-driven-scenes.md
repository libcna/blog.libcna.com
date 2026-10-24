---
title: Instancing, Occlusion Queries and GPU-driven Scenes
date: 2027-12-02T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Reduce CNA submission cost with instancing and measured visibility while preserving portable fallbacks and correctness.
author: Robert Vokac
categories: [Graphics]
tags: [CNA, Instancing, Occlusion Query, Performance, 3D]
draft: false
---

Large scenes often become CPU-bound before exhausting the GPU. Drawing one tree at a time repeats pipeline, buffer and material work. Instancing submits shared geometry once with a stream of per-instance transforms and attributes.

```cpp
struct InstanceData {
    Vector4 worldRow0, worldRow1, worldRow2;
    Color color;
};

std::vector<InstanceData> visible;
for (const Tree& tree : trees)
    if (frustum.Intersects(tree.bounds))
        visible.push_back(EncodeInstance(tree));
```

Upload visible instances to a reusable dynamic buffer, bind mesh and instance streams with correct frequencies, then issue the instanced draw supported by the selected CNA renderer. Validate `InstanceFrequency`, vertex declarations, strides and maximum instance count from capabilities; do not choose the route by renderer name.

## Batch by shared state

An instance batch shares mesh, material, shader variant and render state. A different texture or alpha mode normally starts another batch. Texture arrays or atlases can widen a batch only when supported and when sampling semantics remain correct.

Keep instance data compact. Three affine matrix rows often suffice; color, animation phase or material index can follow. Measure upload bytes. Rebuilding megabytes because one object moved can erase submission savings. Partition static and dynamic populations or update bounded chunks.

Provide a portable fallback that loops over visible objects with ordinary draws. Use the same visibility and material list so screenshots can be compared. Instancing is an optimization, not a different scene definition.

## Occlusion queries without stalls

Occlusion queries ask whether proxy geometry produced visible samples. Results arrive later. Waiting synchronously in the same frame serializes CPU and GPU and is often slower than drawing the object.

Use last known results with conservative rules: newly visible objects render; recently visible objects remain visible; only stable occluded results suppress expensive work. Issue queries for bounds, not full materials, and cap queries per frame.

```cpp
if (node.queryResultReady)
    node.visible = node.samplesPassed > 0;
if (node.visible)
    Submit(node.renderItems);
ScheduleQuery(node.bounds);
```

Camera cuts invalidate history. Small objects and already cheap draws should skip queries. Hierarchical queries can test a region before children, but false occlusion must never persist after movement.

## GPU-driven boundaries

Indirect or GPU-generated draw lists are backend-dependent extensions, not assumptions for portable CNA gameplay. Keep the renderer-neutral input as objects, bounds and materials. If a capability enables a GPU path, compare it with the CPU-built reference list and retain a fallback.

Test zero/one/max instances, non-uniform transforms, mirrored winding, mixed materials, query delay, camera teleport and resize. Report visible objects, instance batches, upload bytes, query count, result latency and CPU/GPU time. The feature is successful only when representative crowded scenes improve without flicker or backend-specific scene logic.

## A staged implementation

First render the population with ordinary draws and capture output/counters. Second, build the same visible list and batch it without changing shaders. Third, introduce the instance declaration and compare transforms/colors object by object. Only then add occlusion history. This order preserves a known reference at every step.

Use a tiny asymmetric mesh and four instances with translation, rotation, non-uniform scale and distinct colors. Read pixels or capture a golden image. A transpose error otherwise looks like random misplaced vegetation in a large forest.

Instance buffer capacity should grow in bounded steps and remain reusable. If visible count exceeds policy, split into several draws rather than writing past allocation. Report capacity/high-water mark. When device resources are recreated, rebuild declaration, buffer and cached pipelines from retained descriptors.

Occlusion queries need a state machine: never issued, pending, visible/occluded result and invalidated. Movement of object/camera or unavailable query result selects conservative visibility. Limit consecutive occluded frames before retesting so a stale result cannot hide an object forever.

In profiling, separate culling, list construction, upload, submission and GPU render time. Fewer draws are not automatically faster if per-instance upload or shader complexity grows. Test on the weakest supported backend and retain the non-instanced path as both fallback and correctness oracle.

## Animation, materials and picking

Rigid instancing is simplest. Skinned/morph instances need palette/animation data indexing and can exceed portable attribute/uniform budgets; group compatible animation state or use another path. Never assume one skinning technique scales because transforms do.

Material variation can use per-instance color/scalars or texture array index only when declared capability/content layout supports it. Large arbitrary material records defeat shared pipeline/binding. Split batches by real material contract.

Picking/debugging requires mapping `instanceId` back to stable object ID. Maintain parallel table or explicit ID attribute where supported. An integer picking target must retain exact identity; color approximation needs proven bounds or CPU fallback.

## Release gate

Force instancing on/off and compare deterministic captures plus selected object transforms. Test missing capability and small count crossover—ordinary draws may win below threshold. Query path runs with queries disabled, delayed and unsupported.

Report instance/batch counts, capacity, bytes, query pending/results and chosen path in captures/crash diagnostics. A user-visible disappearing forest needs enough evidence to tell culling, query history, buffer upload and shader indexing apart.
