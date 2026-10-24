---
title: Cubemaps, Reflections and Environment Mapping in CNA
date: 2027-12-16T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Load, render and validate CNA cube textures for skyboxes, reflections and environment lighting across renderer conventions.
author: Robert Vokac
categories: [Graphics]
tags: [CNA, Cubemaps, Reflections, Environment Map, TextureCube]
draft: false
---

A cube texture stores six square faces sampled by a 3D direction. It supports skyboxes, reflections, probes and environment lighting, but face order and orientation mistakes can remain hidden in abstract scenery.

Start with a diagnostic cube: each face has a distinct color, large `+X/-X/+Y/-Y/+Z/-Z` label and arrows toward its top and right. Load or upload it through `TextureCube`, then sample known axis directions. Never qualify orientation with a symmetric cloudy sky.

```cpp
Vector3 reflection = Vector3::Reflect(-viewDirection, worldNormal);
environmentEffect.setEnvironmentMapProperty(&cube);
environmentEffect.setEnvironmentMapAmountProperty(0.65f);
environmentEffect.setFresnelFactorProperty(1.0f);
```

Use exact property signatures of current CNA. Stock `EnvironmentMapEffect` provides a portable baseline before introducing a custom PBR probe path.

## Skybox pass

Render a cube centered on the camera or reconstruct direction in a full-screen shader. Remove camera translation but retain rotation, use depth rules that keep the sky behind scene geometry, and avoid writing depth that blocks later objects. State must be explicit and restored.

Cube seams arise from orientation, filtering, missing edge fixup or unrelated face mip generation. Generate mips consistently across faces and inspect every level. Renderer diagnostics should state whether a cube is uploaded content or a `RenderTargetCube`, because render-target row/orientation correction can differ from uploaded data.

## Dynamic reflection probes

A dynamic probe renders the scene six times from one point with 90-degree projections and canonical face directions/up vectors. Exclude the reflecting object where appropriate and bound updates: one face per frame, low resolution or only after meaningful scene change.

```cpp
for (CubeMapFace face : facesToUpdate) {
    device.SetRenderTarget(&probe, face);
    DrawScene(probeCamera.View(face), probeCamera.Projection());
}
device.SetRenderTarget(nullptr);
```

Do not sample a face while writing the same cube unless explicitly supported. Invalidate temporal consumers while a partially updated probe is unacceptable.

## Environment lighting

PBR commonly uses a diffuse irradiance cube and prefiltered specular cube across roughness mip levels. These are derived assets with color-space, orientation and compiler-version contracts. Validate a chrome sphere, rough sphere and matte sphere under a recognizable environment.

Test uploaded and rendered cubes, point/linear filtering, all face axes, seams, mips, device recreation and fallback when cube support/format is absent. Record face size, format, mip count and memory. A reflection feature is portable only after its direction conventions—not just its API calls—match across renderers.

## Probe placement and blending

One global environment works outdoors, but interiors need local probes. Store probe position, influence volume and priority. Choose the nearest valid probe or blend a small bounded set; never iterate every probe per object. Box-projected correction can reduce the “environment infinitely far away” error in rooms, but it needs a documented shader variant/fallback.

Dynamic probes should not include screen-space UI or post-processing. Decide whether particles, transparent objects and other probes render. Use a capture mask instead of scattered object-type checks. When updating one face per frame, expose probe age and avoid using partially initialized faces after creation.

Offline prefiltering records source hash, face convention, output format, mip/roughness mapping and tool version. Runtime-generated irradiance/prefiltering is expensive and capability-dependent; cache it only with a validated key.

Common failures have recognizable shapes: swapped `+Z/-Z` mirrors front/back; one upside-down face breaks seams; incorrect reflection sign makes the environment move with the viewer; sRGB numeric filtering changes energy. The labeled cube, chrome/rough spheres and camera-rotation capture distinguish these quickly.

Release evidence includes skybox orientation, stock environment effect, custom cube sampling, uploaded versus rendered cube, mip seams and selected fallback on every claimed renderer. Keep captures with fixed camera and exposure.

## Cube face camera table

Keep one canonical table of face direction/up vectors used by importer, dynamic capture and tests. Duplicated tables tend to disagree especially on ±Y. Test center plus edges/corners where major-axis ties expose selection/seam behavior.

Depth for capture needs suitable near/far around probe; clipping distant scenery or including objects behind probe changes reflection. Clear each face and complete all required faces before generating mips/prefilter. A failed face invalidates candidate cube rather than retaining mixed generations silently.

## Resource lifetime and fallbacks

Probe targets belong to scene/device and retire before device. Prefiltered derivatives depend on source generation and must invalidate together. Bound number/resolution/update faces per frame and report memory/work.

Fallback order could choose nearest static global environment, stock effect without local correction, then material base lighting. A missing cube must not bind a 2D white texture to cube sampler. Renderer should refuse wrong dimension; application selects compatible technique.

Test reflection vector under non-uniform world scale using correct normal transform, mirrored object, inside cube/box projection and sRGB/HDR environment. These catch material/math errors beyond face upload.
