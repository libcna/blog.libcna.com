---
title: Threading and Main-thread Boundaries in CNA
date: 2028-07-06T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Add worker threads to a CNA game without racing framework state, leaking jobs across scenes or hiding unsafe graphics and platform calls.
author: Robert Vokac
categories: [Development]
tags: [CNA, Threading, Jobs, Graphics, Architecture]
draft: false
---

Threads do not make a game faster by themselves. They make it possible to overlap independent work, while adding ownership, cancellation and shutdown problems. The safest CNA design begins with one rule: framework objects are not assumed thread-safe unless their contract explicitly says so.

Graphics-device access, window operations, input polling and most platform callbacks belong on the owning game thread. CPU-only work—decompression, pathfinding, procedural generation, parsing or preparing vertex data—can often run elsewhere. Split operations into preparation and publication so that the uncertain part is obvious.

## Classify work before scheduling it

Create a small table for each job type:

| Work | Worker thread | Game thread |
| --- | --- | --- |
| Decode image bytes | pixels and metadata | create/update texture |
| Generate terrain | positions, normals, indices | allocate GPU buffers |
| Load level document | read, parse, validate | publish world and handles |
| Pathfinding | immutable navigation snapshot | apply result if still current |
| Save game | serialize stable DTO, compress | request snapshot, report result |

This boundary prevents an innocent helper from calling a content manager or graphics device deep inside a job. Pass plain input data into workers and return plain result data.

```cpp
struct TerrainCpuData {
    std::vector<VertexPositionNormalTexture> vertices;
    std::vector<std::uint32_t> indices;
    Bounds bounds;
};

Task<TerrainCpuData> BuildTerrainAsync(HeightField field,
                                       CancellationToken cancellation);
void UploadTerrain(GraphicsDevice& device, TerrainCpuData&& data);
```

The second function runs at a known point on the game thread. If upload fails, the old resource stays active or a defined placeholder is used.

## Immutable snapshots beat shared mutable worlds

Giving workers references to the live world invites races with update, scene unload and entity destruction. Instead, capture the minimum immutable snapshot required by the job. A pathfinding request can contain a navigation revision, start, goal and read-only graph snapshot. Its result carries the same revision and requester generation.

```cpp
struct PathResult {
    EntityId entity;
    Generation entityGeneration;
    std::uint64_t navigationRevision;
    std::vector<Vector3> points;
};
```

When the result returns, validate all identities. A technically successful path for a destroyed entity or replaced level is stale and must be discarded. Generation checks are cheaper and clearer than hoping cancellation always wins the race.

For rendering, build an immutable render snapshot or command list after simulation. The renderer reads it without locking the live world. Double or triple buffering can separate production and consumption, but document when a slot becomes writable again.

## A deliberately small job system

Start with a bounded worker pool, priority classes and a main-thread completion queue. Unbounded `async` work can create too many threads or retain an entire level after it should have unloaded. Every submitted job needs an owner, cancellation token and diagnostic name.

```cpp
JobHandle h = jobs.Submit(JobDesc{
    .name = "terrain.chunk.42",
    .owner = levelGeneration,
    .priority = JobPriority::Normal,
    .work = BuildChunk
});
```

Back-pressure matters. If terrain generation produces uploads faster than the GPU budget can accept, bound the ready queue and prioritize visible chunks. Cancellation should be cooperative and checked inside long loops. It does not replace generation validation at publication.

Avoid waiting for worker completion from the game thread during normal frames. That turns asynchronous work into a stall and can deadlock if completion itself needs the game thread. Model prerequisites as continuations or state transitions. Reserve blocking joins for controlled shutdown after new work has been stopped.

## Graphics and content lifetime

A CPU result does not own the graphics device. The scene that requests an asset owns a content scope or generation. Main-thread finalization first verifies that scope, creates the resource, then publishes it atomically. Late results release their CPU buffers without touching dead state.

Resource destruction follows the same ownership thread as creation unless the backend contract states otherwise. Use deferred-release queues if an object may still be referenced by an in-flight render snapshot. Never let a worker destructor unexpectedly call into a renderer.

## Exceptions, progress and shutdown

Capture exceptions inside the job and return structured failure. Include job name, owner and safe context, but not secrets. A failed optional thumbnail should not crash the level loader; a failed required collision map must prevent publication of the candidate world.

Progress is a model, not a percentage guessed from threads. Define weighted stages and permit indeterminate work. Publish progress at a bounded rate. Workers should not directly mutate loading-screen UI.

Shutdown order is critical: stop accepting jobs, cancel owners, keep pumping required main-thread completions, wait for workers, discard remaining results, release game resources, then destroy platform and graphics services. Add timeouts only with a defined fallback; detaching a worker that still references game memory is not shutdown.

## Test hostile schedules

Use a controllable executor in tests. Hold a result until after scene replacement, complete jobs in reverse order, cancel at every stage, inject parser failure and request shutdown while completions are queued. ThreadSanitizer builds help find data races, but architecture and deterministic schedule tests find lifetime bugs that sanitizers may never exercise.

Expose queued/running/completed job counts, oldest wait, owner, cancellation state, upload budget and main-thread completion time in diagnostics. A multithreaded CNA game is healthy when performance improves without making object lifetime or renderer ownership ambiguous.
