---
title: Multiple Render Targets and Deferred Rendering in CNA
date: 2027-12-09T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Design a CNA G-buffer, light pass and transparent fallback around explicit MRT and format capabilities.
author: Robert Vokac
categories: [Graphics]
tags: [CNA, MRT, Deferred Rendering, Lighting, Render Targets]
draft: false
---

Deferred rendering writes material geometry into several targets, then evaluates lights in screen space. It can handle many lights efficiently, but consumes bandwidth, target memory and a more demanding backend contract.

A modest G-buffer might contain:

| Target | Meaning | Example format |
|---|---|---|
| A | base color and material flag | normalized color |
| B | encoded normal and roughness | higher-precision color |
| C | emissive/metalness/occlusion | normalized color |
| Depth | depth for reconstruction | supported depth format |

Choose formats from CNA capabilities and precision tests. Do not silently store normals in a format that visibly bands or IDs in normalized color when exact integers are required.

## Geometry and light passes

Bind all G-buffer targets together, set a matching viewport, clear every channel to a defined neutral value, and draw opaque geometry with one effect whose fragment outputs match target locations. Unbind before sampling.

```cpp
device.SetRenderTargets({&gAlbedo, &gNormal, &gMaterial});
device.Clear(ClearOptions::Target | ClearOptions::DepthBuffer,
             Color::Transparent, 1.0f, 0);
DrawOpaqueGeometry(gBufferEffect);

device.SetRenderTarget(&lightTarget);
DrawDirectionalLight(gAlbedo, gNormal, gMaterial, depth);
for (const Light& light : visibleLocalLights)
    DrawLightVolume(light);
```

Adapt APIs to current CNA. Restore backbuffer/scene target and viewport explicitly.

Reconstruct positions from depth using the exact projection and depth convention used to write it. Test near, middle and far known points. A transpose or depth-range mismatch can look like incorrect light radius.

## Transparency and MSAA

Ordinary alpha blending does not fit a simple opaque G-buffer. Draw transparent objects later with forward lighting, using opaque depth for occlusion. Alpha-tested cutouts can participate in geometry pass when discard/coverage semantics are supported.

Multisampled MRT consumes substantial memory and resolve behavior differs by capability. Qualify the complete format/sample combination. A practical fallback can reduce samples or use forward rendering; publish the active route in diagnostics.

## Debug and validation

Display each G-buffer attachment separately: color as color, normals decoded to RGB, scalar channels as grayscale and reconstructed position/depth. Label format, dimensions and bytes. Use reference spheres with known materials plus overlapping light volumes.

Compare forward and deferred results under fixed exposure for a small scene. They need not be bit-identical, but light direction, attenuation, material classification and silhouettes should match within documented tolerance.

Measure geometry bandwidth, light volume draws, overdraw, target switches and peak target memory. Deferred rendering wins only under relevant light/scene density. Retain a forward path for transparent materials, weak devices and backends without the required MRT profile.

## Define the encoded contract

Write a table for every channel: coordinate space, numeric range, color space, neutral clear and producer/consumer shader names. For example, world-space and view-space normals are both valid, but mixing a world-space geometry pass with view-space light math creates camera-dependent lighting. Decide how roughness/metalness are packed and whether alpha carries material flags.

Reconstructing position from depth saves a target but depends on projection/depth precision. Test reversed or ordinary depth only if the backend contract supports it. At large far planes, position precision may be worse than storing an additional value. Measure artifacts before choosing purely by attachment count.

Local light volumes need correct inside/outside culling and depth/stencil policy. Test the camera inside a sphere, light intersecting near plane and overlapping hundreds of lights. Directional light is normally a fullscreen pass. Keep blend accumulation format/range sufficient for HDR, then tone-map once.

Resize recreates the whole compatible attachment set atomically. If one target fails, discard the partial set and select a documented fallback. A debug view should show channel values and reconstructed normals/positions under fixed exposure. Automated fixtures include one known surface/light pair with numerically predicted output.

Deferred rendering is complete only after opaque, transparent, particles, sky, UI, post-processing and fallback paths form one documented frame graph. A G-buffer demo alone is not a shippable renderer.

## Resource and bandwidth budget

Calculate every attachment including samples/mips and peak overlap during resize/recreation. Four full-resolution 16-byte targets at 4K can consume hundreds of MiB before depth/history. Reduced resolution or compact encoding must be validated by image/precision fixtures, not assumed safe.

Avoid clearing/writing channels never consumed, but preserve defined values for partial geometry. Tile-based mobile GPUs can behave very differently from desktop; measure target bandwidth and resolves on real devices. A forward/clustered alternative may be superior.

## State and shader debugging

Name passes/resources and log target set formats, viewport, selected effect language and light counts. On black frame, verify geometry attachments first, then depth reconstruction, one white directional light, accumulation blend, final composite/tone map. Adding all lights/post-processing at once hides the first broken stage.

Use a material ID/debug channel only in development if production packing cannot afford it. Pixel inspector can print G-buffer/depth/reconstructed position/light contributions at cursor.

Release tests include resize/minimize, format/MSAA fallback, camera inside light, thousands of lights, transparent/cutout/sky/UI and device recreation. Compare performance against forward on low/typical/high light scenes before making deferred default.
