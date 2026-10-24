---
title: Creating a New CNA Graphics Renderer
date: 2027-09-23T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Add a CNA renderer through the registry, capability profiles, resource contracts and shared parity fixtures instead of scattering backend branches.
author: Robert Vokac
categories: [Development]
tags: [CNA, Renderer API, Graphics, Architecture]
draft: false
---

A CNA graphics renderer implements the internal renderer contract beneath `GraphicsDevice`. Game code continues to use XNA types; the backend translates resources, state and draws to a graphics API or CPU implementation.

Add a canonical public identity to the renderer registry and CMake selection. Declare capability classes accurately. A backend must not advertise render targets, instancing or a surface format before the corresponding contract works and has evidence.

Implement device creation and presentation first, then resources and state in dependency order: textures and buffers, blend/depth/rasterizer/sampler state, primitive draws, render targets, readback and effects. Validate sizes and enum mappings at the boundary. Native objects need deterministic retirement even when the public wrapper is disposed during an in-flight frame.

## Prove parity incrementally

Run shared fixtures as each feature arrives. Begin with clear and one triangle, then asymmetric textured sprites, blending, scissor, depth, indexed geometry, targets and stock effects. Compare against the established oracle with the documented tolerance.

Normalize coordinate and render-target conventions inside the backend. Application code should not flip textures or reverse winding based on renderer name. If the API cannot implement a feature, report the limitation through capabilities and the feature matrix.

Support diagnostics from the beginning: renderer identity, draw and primitive counts, resource metadata and debug labels make later failures tractable. Add a minimal standalone diagnostic dump so a broken full game is not the only reproduction.

Finally test loss, resize, failed allocation and teardown, not only successful drawing. A renderer is a resource-lifetime system attached to a presentation surface. Correct pixels in one frame are necessary, but parity, recovery and honest limits are what make it a CNA backend.

## Effects and pipeline caches

Stock effects need identical semantics, not merely shaders that compile. Validate defaults, fog, lighting and vertex variants. Cache native pipelines by every affecting state; an incomplete key can reuse the wrong blend, topology or target format.

Bound cache growth and expose hit/miss diagnostics. Qualify ordinary games and hostile state-transition fixtures before marking the renderer production-ready.

## Bring up one invariant at a time

Start with device creation, clear and presentation. Add a hard-coded triangle, then vertex declarations, indexed drawing, textures, samplers, blending, depth and render targets. At every step keep a fixture that proves the new contract. Introducing models, effects and post-processing together makes the first incorrect assumption impossible to locate.

Translate CNA state into immutable native pipeline descriptions where required. The cache key must include every value affecting native behavior—shader program, vertex layout, blend, depth, rasterizer and target formats—while excluding irrelevant object addresses. Log key creation and cache size in diagnostics. A wrong key can reuse an incompatible pipeline and produce failures that depend on draw order.

## Synchronization and resource lifetime

Uploads, draws, readbacks and destruction must obey the backend's queue model. Track when staging memory may be reused and retire native resources only after submitted work no longer references them. Device teardown should drain or abandon work according to a documented policy and tolerate partially created resources.

Render-target transitions, texture layout changes and CPU readback need explicit tests. Include resize, device recreation, empty draws, zero work frames and resource destruction immediately after submission. Validation-layer output belongs in CI logs and should be treated as a defect even when pixels appear correct.

Finish with parity scenes and real applications across several drivers. Publish unsupported formats and limits through capabilities, not hidden renderer-name checks. Performance qualification should separately measure submission overhead, upload bandwidth, pipeline-cache behavior and representative scenes so correctness work is not confused with premature tuning.

## Evidence for production status

Archive feature-matrix results, validation logs, reference captures and performance data with exact driver and hardware identity. Run resource-lifetime stress for hours, not seconds, and confirm memory returns to baseline after repeated scene changes. Qualify both debug and optimized binaries because synchronization timing differs. Finally, package the renderer as users receive it and test selection, fallback and a missing-module error. Production-ready describes the complete delivery path, not only the native draw implementation.

## Worked example: translate state into a pipeline key

Modern APIs often require an immutable pipeline. CNA state must become a complete value key, never an object address:

```cpp
struct PipelineKey
{
    ShaderId vertexShader;
    ShaderId fragmentShader;
    VertexLayoutKey vertexLayout;
    BlendKey blend;
    DepthStencilKey depthStencil;
    RasterizerKey rasterizer;
    std::array<SurfaceFormat, 4> colorFormats;
    DepthFormat depthFormat;
    std::uint8_t sampleCount;

    bool operator==(const PipelineKey&) const = default;
};

NativePipeline& Renderer::ResolvePipeline(const DrawState& state)
{
    PipelineKey key = BuildKey(state);
    if (auto found = pipelines_.find(key); found != pipelines_.end())
        return found->second;
    return pipelines_.emplace(key, CreateNativePipeline(key)).first->second;
}
```

Hash every field participating in equality. A missing target format or vertex layout can reuse an incompatible native pipeline and make output depend on draw order. Bound cache growth, record hits/misses and clear it at the correct device lifetime.

## Submission and retirement

Uploads use staging memory whose lifetime extends until the queue has consumed it. Destruction likewise becomes retirement: mark the resource unavailable to new CNA draws immediately, but free native storage only after the last submission fence. Readback needs an explicit synchronization point and row-pitch conversion.

Bring up clear/present, one triangle, indexed drawing, vertex formats, texture upload, samplers, blend, depth, targets, readback and effects in that order. Preserve a fixture after every step. Run validation layers as errors, then repeat optimized without them. Resize and device-loss paths, empty frames, destroy-after-submit and target-to-texture transitions belong in qualification before real games.

Publish unsupported formats and limits in capabilities. Never replace an unsupported operation silently with stock output. A precise refusal lets games choose a fallback; a plausible wrong image corrupts both application and parity testing.

## Shader and effect integration

Stock effects, source `ShaderEffect` and compiled XNA effects are separate contracts. Implement only routes the backend can execute faithfully, and enable each capability after its complete parity suite passes. Parsing an effect or accepting source while drawing a fixed substitute is not support.

For source packages, report accepted languages and resource layouts. Preserve source labels and native compiler diagnostics. Validate vertex input locations against CNA declarations, uniform offsets, texture dimensions and sampler slots. For compiled effects, reflection, techniques, passes, pass state and sampler connections must all execute; pass zero alone is not enough.

## Presentation and failure recovery

Presentation sits at the platform-renderer boundary. Acquire only the native surface/window handles required, choose a supported swap format and handle zero-sized windows without creating invalid resources. Resize/recreate at a safe boundary and keep offscreen resource ownership independent of the swap chain.

Define renderer initialization failure clearly. If selection supports fallback, tear down every partially created object before trying another backend and publish the reason. During device loss or fatal queue failure, either recreate all affected resources through a tested route or fail the application cleanly—never continue with stale native handles.

## Qualification matrix

Run primitives, vertex declarations, index types, textures and mips, samplers, blend/depth/rasterizer state, targets, readback, stock effects, supported custom effects, SpriteBatch, models and lifetime stress. Include odd sizes, empty work, invalid ranges and rapid creation/destruction. Cross-renderer captures prove shared semantics; backend validation logs prove native correctness. Finally measure CPU submission, uploads, target changes and pipeline cache behavior with exact hardware/driver metadata.
