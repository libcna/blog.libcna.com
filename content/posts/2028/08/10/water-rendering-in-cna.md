---
title: Water Rendering in CNA
date: 2028-08-10T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build portable CNA water from a simple transparent surface through reflection, refraction, depth color, Fresnel response and scalable fallbacks.
author: Robert Vokac
categories: [Development]
tags: [CNA, Water, Shaders, Render Targets, Reflections]
draft: false
---

Convincing water is not one effect. It is a coordinated set of approximations: surface shape, normal motion, reflection, transmission, depth-dependent color, shoreline treatment and a compositing order. CNA supplies render targets, textures, effects, blend/depth states and cameras; the game assembles them into a portable pipeline.

Start with the cheapest valid product. A distant ocean may be a mesh with two scrolling normal maps, sky reflection and fog. A clear pool may need scene refraction and depth. A mobile fallback may use one animated texture. Write these quality tiers before writing the most expensive shader.

## Define the water surface

A finite lake can use a plane mesh clipped to its shoreline. An ocean can follow the camera in horizontal coordinates while sampling waves in stable world space, preventing visible precision loss and texture swimming. The authoritative water height belongs to gameplay; visual displacement must not secretly change buoyancy.

```cpp
struct WaterBody {
    Plane surface;
    BoundingBox bounds;
    WaterMaterial material;
    WaterQuality quality;
};
```

If waves affect boats or swimming, use a shared analytic or sampled wave model available to both simulation and rendering. Cosmetic high-frequency normals can remain shader-only.

## Reflection pass

Planar reflection renders selected scene objects from a mirrored camera into a texture. Reflect camera position and forward/up vectors across the water plane, then use a clipping plane to reject geometry below the surface. Cull orientation may need adjustment because mirroring changes handedness.

Render only what contributes: sky, terrain, major opaque objects and perhaps simplified vegetation. Water itself must not recurse into its reflection. Shadows and post-processing can use reduced quality. Size the target by projected importance and pool it rather than allocating every frame.

Reflection content is temporally coherent. Distant or calm water can refresh at a lower rate, but camera movement and rapidly changing objects may expose lag. Make update rate a measured quality policy and preserve the previous valid target when a pass fails.

## Refraction and scene depth

For refraction, capture the opaque scene behind water—often color plus depth—before drawing the surface. Distort lookup coordinates with normal-map motion, clamped so strong distortion does not sample outside the water body. Reconstruct or linearize depth according to the renderer's projection/depth convention; do not assume raw depth is linear distance.

The difference between water-surface depth and scene depth estimates the optical path through water. Use it to transition from shallow clear color to deeper absorption, increase distortion gently and create a shoreline fade. Verify reversed or alternate depth conventions through CNA capability/configuration rather than renderer-name branches.

If depth sampling or a compatible scene target is unavailable, use vertex/terrain depth metadata or a simpler constant-color fallback. Missing capability should reduce quality, not produce invisible water.

## Fresnel and surface normals

At grazing angles water reflects more; viewed straight down it transmits more. Schlick's approximation gives a useful Fresnel term:

```text
F = F0 + (1 - F0) * pow(1 - saturate(dot(N, V)), 5)
```

Blend reflection and refraction from that term, then add specular response under the project's lighting model. Two normal maps scrolling in different directions create motion without moving geometry. Re-normalize combined normals and keep texture scale in world units.

Do color work in the project's chosen linear/gamma pipeline. Mixing render targets with different transfer assumptions produces milky reflections or overly dark water. The water article is therefore also a useful renderer-conformance fixture.

## Shorelines, foam and transparency

Depth difference can drive shoreline foam, but it reacts to every submerged object. Combine it with authored masks, wave crest information or material classification when needed. Foam is usually emissive/opaque-looking detail on the surface, not simply more alpha.

Draw order depends on the chosen composition. A common order is opaque scene, reflection/refraction preparation, water, then regular transparent objects and UI. Water normally tests depth but does not write it, although multiple overlapping water volumes require a stricter policy. Premultiplied alpha and blend state must match shader output.

Underwater rendering is a separate camera state: fog/absorption, surface viewed from below, caustics approximation and audio change. Use hysteresis around the surface so tiny wave/camera changes do not toggle the entire mode every frame.

## Capability-based quality ladder

A practical ladder might be:

1. solid tinted surface with animated UVs;
2. normal-mapped sky/environment reflection;
3. planar reflection target;
4. scene-color refraction plus depth absorption;
5. higher-resolution passes, foam and advanced waves.

Select from required formats, target count, depth sampling and performance budget. Log the selected tier and reason. Do not equate one CNA renderer with one quality tier; the capability set is the contract.

## Debugging and tests

Expose the reflection texture, refraction texture, linearized depth, Fresnel value, normals and foam mask. Draw the mirrored camera frustum and clipping plane. A water bug becomes tractable when each input can be inspected before final compositing.

Golden scenes should include sky, vertical objects crossing the plane, shallow and deep bottom, shoreline, moving camera, underwater transition and transparent objects behind water. Compare multiple renderers at fixed camera/time. Test target resize, device recovery, quality fallback and reflection resource lifetime.

Measure each pass separately: target pixels, visible reflection objects, GPU time, refresh interval and bandwidth-heavy formats. Beautiful water is successful only when the simpler paths remain correct and the effect fits the total frame budget.
