---
title: Building a Deferred Renderer with CNA
date: 2029-02-08T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Assemble a CNA deferred-rendering demo with a documented G-buffer, light volumes, shadows, transparency, capability fallbacks and cross-renderer tests.
author: Robert Vokac
categories: [Development]
tags: [CNA, Deferred Rendering, MRT, Lighting, Tutorial]
draft: false
---

The multiple-render-target and lighting articles explain deferred rendering in pieces. This case study connects them into one small renderer: opaque geometry fills a G-buffer, lighting reads it into an HDR scene target, forward passes handle transparency and post-processing presents the final image.

Deferred rendering is not automatically better than forward rendering. It trades material/output bandwidth and transparency complexity for efficient many-light shading. Start by defining the target scene and capability floor rather than building the largest possible G-buffer.

## Choose a precise G-buffer contract

For each attachment, document format, color space, encoded range, clear value and reader. A compact example might contain:

- base color plus material/coverage field;
- encoded world/view normal plus roughness;
- optional material parameters/emissive;
- depth in the depth-stencil surface, sampled or reconstructed through a supported path.

```cpp
struct GBufferLayout {
    SurfaceFormat baseColor;
    SurfaceFormat normalMaterial;
    std::optional<SurfaceFormat> emissive;
    DepthFormat depth;
    NormalEncoding normalEncoding;
};
```

Do not assume every renderer supports the preferred MRT count/format combination or samples the attached depth surface. Probe creation/capabilities and select an ordered layout. A fallback can pack fewer channels or switch the scene to forward rendering. Log the active choice.

Normal encoding must be identical in geometry and light shaders. Depth reconstruction uses the same projection convention and viewport mapping as the camera. Build a fixture that reconstructs known points and visualizes error.

## Geometry pass

Allocate size-dependent targets through a pool and recreate them transactionally on resize/device generation. Clear every attachment and depth to documented values. Draw opaque and alpha-tested materials with depth test/write enabled; blended geometry waits.

Every material variant writes all semantic outputs. A missing normal map uses a flat normal; unlit/emissive data follows an explicit flag. Skinning, instancing and terrain share the G-buffer schema even if their vertex paths differ.

Use render-state objects cached outside the frame. Sort opaque geometry for state/material efficiency and front-to-back where useful. Debug mode displays each attachment directly with decoding labels.

## Lighting pass

Begin with a full-screen directional light reading G-buffer and depth. Reconstruct position or view ray carefully. Add ambient/environment term, shadow factor and BRDF consistent with material encoding. The output target uses a format/range suitable for accumulated lighting.

Point and spot lights can draw proxy volumes. Outside a light volume, render front faces with normal depth/cull rules; when the camera enters, adjust culling/depth policy. Stencil can restrict pixels, but adds passes/state and should be measured.

```cpp
for (const VisibleLight& light : lights) {
    LightVolumePolicy policy = ClassifyCameraAgainst(light, camera);
    BindLightState(policy);
    BindLightParameters(light, camera, gbuffer);
    DrawLightVolume(light);
}
```

Additive accumulation requires a blend state and target format that preserve the expected range. Many small lights can become CPU/draw bound; tiled/clustered approaches are separate advanced systems, not a free consequence of deferred shading.

## Shadows and ambient

Render shadow maps before lighting using the existing shadow policy. Directional cascades and local-light shadows have strict budgets/update rates. G-buffer material cutouts must match shadow cutouts. A shadow failure falls back to unshadowed lighting, not a missing light.

Ambient can be constant, hemispheric or environment-probe based. Screen-space ambient effects are optional post/lighting inputs with depth/normal conventions and temporal noise considerations. Keep a no-SSAO baseline so correctness is visible.

## Forward integration

After deferred opaque lighting, draw sky at the correct depth/background point, then transparent water, glass, particles and UI through forward shaders that use the same light/environment vocabulary. Refraction reads a stable scene-color copy; it must not read and write the same target unsafely.

Some materials—hair, special subsurface, MSAA-dependent surfaces—may be forward-only. Classify them explicitly. Their depth relationship with deferred opaque geometry must remain correct.

Apply tone mapping/bloom/color grading once after HDR composition. UI normally renders after tone mapping unless intentionally HDR-aware.

## Capability ladder and resize

Define paths before runtime:

1. preferred MRT deferred layout;
2. reduced packed deferred layout;
3. forward lighting fallback;
4. minimal unlit/error-safe path.

Selection checks target count, formats, independent blend/depth sampling and shader capabilities. Never use backend name as the feature test. If target allocation fails at selected resolution, reduce optional targets/scale or fall back transactionally while preserving the last valid renderer state.

## Evidence and profiling

Create a scene with matte/metallic/rough materials, normal mapping, skinned object, terrain, cutout foliage, transparent object, overlapping point/spot lights, shadows and emissive detail. Capture final frame plus every G-buffer and light-only output across CNA renderers.

Assert target formats/sizes, pass order, resource non-aliasing and state reset. Test resize, quality switch, device recovery, camera inside light volume and zero/maximum lights. Measure geometry bandwidth, light draw count, target bytes and GPU time by pass.

A deferred CNA renderer is complete when its buffer contract is documented, its fallback still draws the same scene meaningfully and every wrong pixel can be narrowed to geometry data, reconstruction, lighting or forward composition.
