---
title: Graphics Resource Lifetime, Device Loss and Recovery
date: 2028-01-13T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Own CNA textures, buffers, effects and targets safely across asynchronous GPU work, resize, teardown and recoverable device events.
author: Robert Vokac
categories: [Graphics]
tags: [CNA, Graphics Resources, Device Loss, Lifetime, Recovery]
draft: false
---

Every graphics resource belongs to a `GraphicsDevice` and must die before the native device it references. C++ destruction timing alone is not enough when shared owners, deferred submissions and backend queues are involved.

Classify resources:

- content-owned immutable textures, models and effects;
- scene-owned buffers and materials;
- window-size-dependent targets;
- transient staging/readback resources;
- renderer-native caches hidden behind CNA.

Make one owner responsible for release. Borrowers use non-owning references with a lifetime contract.

```cpp
class SceneResources {
public:
    void Create(GraphicsDevice& device, const SceneCpuData& data);
    void Release() {
        postTarget.reset();
        indexBuffer.reset();
        vertexBuffer.reset();
    }
};
```

Release dependents before the device. Stop workers/callbacks that could create or touch resources first.

## In-flight work

Destroying the C++ wrapper must prevent new use, but the backend may need to retire native memory after submitted work completes. Renderer implementations track fences/serials and deferred deletion. Applications should not reuse upload/readback memory until its contract says it is safe.

A device-idle wait can diagnose a lifetime race but is not a production ownership strategy. It hides missing synchronization and adds stalls.

## Resize versus device loss

Window resize normally recreates only swap-chain and size-dependent targets. Immutable textures should survive. Device loss/recreation, where supported, may require rebuilding every native object from CPU/source data. Document which CNA platform-renderer pairs support recovery and which fail cleanly.

Retain reconstruction descriptors or CPU data only where policy requires it; keeping duplicates of all texture bytes has a memory cost. Content can often reload from its source manager, while procedural buffers rerun a generator.

## Failure tests

Repeatedly load/unload scenes, resize, minimize, recreate targets and dispose effects immediately after submission. Inject failure after each resource acquisition and assert earlier resources release in reverse ownership order. Track live counts and bytes by type/name.

Validation logs must remain clean, optimized builds must also pass, and memory should return to baseline. A stable resource layer makes teardown boring: no callback can reach a dead device, no screen disposes shared content and no backend frees native data still referenced by the GPU.

## Describe reconstruction instead of hiding it

For each runtime resource keep either a source asset reference or a small creation descriptor. A size-dependent target descriptor contains scale, format, depth and samples—not a stale native pointer.

```cpp
struct TargetDescriptor {
    float resolutionScale;
    SurfaceFormat color;
    DepthFormat depth;
    int samples;
};

void SceneTargets::Recreate(GraphicsDevice& device, Point drawable)
{
    Release();
    const int w = std::max(1, int(drawable.X * desc_.resolutionScale));
    const int h = std::max(1, int(drawable.Y * desc_.resolutionScale));
    color_ = std::make_unique<RenderTarget2D>(device, w, h, false,
                                              desc_.color, desc_.depth,
                                              desc_.samples, 0);
}
```

Adapt the constructor overload to CNA. Recreate the complete target set before publishing it. If any allocation fails, discard the candidate set and apply a documented quality fallback.

## Async work and weak ownership

A decoder job may finish after the requesting screen unloads. Give results a request/generation ID and deliver through an owner-checked queue. Cancellation stops future stages, but the job still owns data until it exits. Never capture a raw `Texture2D*` or screen reference in a worker callback.

Similarly, queries/readbacks are resources with pending native work. Their C++ object cannot vanish until the renderer has transferred or cancelled the operation according to contract. Bound pending operations so resize or screenshot spam cannot retain entire generations of targets.

## Device-loss state machine

Use explicit states such as Ready, Lost, Recreating and Failed. Stop submission when lost. Quiesce callbacks/work, recreate platform presentation/device if supported, rebuild resources in dependency order, then publish Ready. Reset temporal history and query results. A second failure during recovery must clean up the partial attempt.

Not every backend promises device recovery. In that case, emit one actionable fatal error and shut down safely. Pretending recovery while handles are invalid is worse than an honest boundary.

## Lifetime stress harness

Automate hundreds of cycles: create device/resources, submit draws, dispose some immediately after submission, resize, read back, unload scene and destroy device. Record resource names, generations, native bytes and retirement queue depth. Inject creation failure at allocation N and assert counts return to zero.

Run validation-enabled and optimized builds. Validation can alter timing; optimized stress finds races it masks. Archive the first warning as a test failure even when output pixels look correct.
