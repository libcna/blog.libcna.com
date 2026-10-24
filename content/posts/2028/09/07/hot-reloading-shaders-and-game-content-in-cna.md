---
title: Hot-reloading Shaders and Game Content in CNA
date: 2028-09-07T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Add transactional hot reload above CNA content with dependency tracking, thread-safe preparation, graphics-thread publication and failure-safe rollback.
author: Robert Vokac
categories: [Development]
tags: [CNA, Hot Reload, Content Pipeline, Shaders, Tools]
draft: false
---

Hot reload shortens the edit–observe loop, but a naïve file watcher can make a running game less stable than restarting it. Editors frequently save through temporary files, generate several events, or leave a file briefly incomplete. Shaders and materials have dependencies, and GPU resources must respect graphics-thread lifetime.

Build hot reload as a transactional development service above CNA's normal content path. Production builds can disable the watcher while keeping the same validated load and publication machinery.

## Stable asset identities and dependencies

Runtime systems reference a logical asset ID such as `materials/vehicle-paint`, not an absolute source filename or a pointer to the current resource. An asset record tracks source inputs, compiled output, dependencies, reverse dependencies, generation and last valid result.

```cpp
struct AssetRecord {
    AssetId id;
    std::vector<SourcePath> sources;
    std::vector<AssetId> dependencies;
    std::uint64_t activeGeneration;
    AssetState state;
    DiagnosticList lastDiagnostics;
};
```

If an included shader file changes, reverse edges identify every affected effect/material. Texture metadata changes may invalidate atlases or material validation. Detect dependency cycles and report the chain rather than recursing forever.

Paths from the watcher are untrusted platform inputs. Normalize separators and case according to the content-root policy, reject escape outside allowed roots and debounce events by logical asset. A quiet period followed by stable size/mtime is still not proof of validity; parsing the complete candidate is.

## Prepare, validate, publish

Treat reload as three stages:

1. prepare a candidate from source/compiled content;
2. validate it and create required runtime resources;
3. publish the new generation atomically at a frame boundary.

CPU-heavy reading, preprocessing, compilation and decoding can run on workers. CNA graphics objects are created on the graphics-owning thread unless a specific backend contract guarantees otherwise. The candidate is invisible until every required dependency and resource succeeds.

```cpp
ReloadTicket ticket = reloader.Prepare(assetId, observedRevision);
// worker produces CandidateAsset
mainThreadQueue.Enqueue([candidate = std::move(candidate)]() mutable {
    if (!candidate.IsCurrent()) return;
    auto finalized = FinalizeGpuResources(candidate);
    if (finalized.Valid()) PublishAtFrameBoundary(std::move(finalized));
});
```

If compilation fails, keep the previous generation active and show diagnostics. Replacing a good shader with an error texture because of a half-written source defeats the purpose of live iteration.

## Resource lifetime and generations

Consumers hold generation-aware handles or resolve stable IDs when building a frame snapshot. Publishing swaps the active record; it does not immediately destroy the old object. Retire old resources after all snapshots and queued GPU work that reference them have completed under the renderer's lifetime model.

Scene unload cancels owned reload work. Every ticket carries project/session generation, asset revision and device generation. A result from before device recovery or from an old level cannot publish into the new state.

Avoid patching live resource internals from workers. Even when a texture update API exists, transactional replacement gives clearer rollback. In-place updates may be an optimized path only after dimensions/format and synchronization are proven safe.

## Shader-specific validation

A shader candidate must pass more than compilation. Validate expected techniques/passes, vertex inputs, parameter names/types, render-target requirements and capability variants. Material definitions depending on the shader rebuild their binding tables before publication.

Changing a parameter schema needs policy. Compatible additions can receive defaults. Renames or type changes require material migration or an explicit error. Never leave cached parameter handles pointing into the discarded effect.

For portable CNA projects, compile/validate every shipped renderer variant in the authoring pipeline where possible. Live reload may activate only the current variant, but failure in another target should remain visible before commit.

## Textures, models and world data

Texture reload can change pixels safely while dimensions, format or mip count may require dependent render-target/material assumptions to rebuild. Atlas changes can move UV rectangles and therefore invalidate sprites or tile definitions; publish the atlas and metadata as one group.

Model reload must preserve or deliberately migrate skeleton/bone and material bindings. A changed collision mesh or world chunk is authoritative gameplay content: publish only at a simulation boundary and consider resetting or relocating affected entities. Not every asset should be hot-swappable in a running session.

Classify assets as presentation-safe, boundary-reloadable or restart-required. Show that status in tools rather than promising magic.

## User experience and diagnostics

Display asset ID, event time, stage, duration, generation and success/failure. Compiler diagnostics retain source file and line mapping while paths shown to users remain project-relative. Coalesce repeated errors but do not hide the newest complete message.

Provide manual Reload Selected and Reload All Valid commands. A pause option helps inspect changes. Keep a short generation history and allow switching back during development if resource budgets permit. Do not write generated output into watched source directories without suppressing self-trigger loops.

## Test adversarial saves

Simulate truncate-then-write, atomic rename, duplicate events, dependency bursts, invalid shader, missing texture, rapid successive valid versions, scene unload during preparation and device recovery before publication. Assert the last complete current candidate wins and the last valid active asset survives every failure.

Track reload queue length, stage timings, bytes, GPU finalize budget and retired-resource bytes. A leak test repeatedly reloads one asset and waits for retirement to return to baseline. Hot reload is finished when it is safe to leave enabled all day, not merely when one texture changes once.
