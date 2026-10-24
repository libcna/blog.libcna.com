---
title: Building a Terrain Demo with CNA
date: 2029-02-01T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Turn CNA terrain concepts into a shippable demo with generated geometry, fly camera, LOD, material layers, collision queries and renderer captures.
author: Robert Vokac
categories: [Development]
tags: [CNA, Terrain, Demo, 3D Rendering, Tutorial]
draft: false
---

The terrain rendering article explains the underlying system. This case study turns it into a focused demo that can qualify content, cameras, renderer portability and performance without becoming a whole open-world game.

![Generated terrain and a skydome produced by a CNA sample content pipeline](/media/2027/91-xna-samples-ported-to-cpp-with-cna/generated-geometry.png)

The deliverable is one deterministic landscape with fly/walk cameras, chunk boundaries, three LOD levels, layered material, fog/sky, ground picking and diagnostic overlays. A demo is successful when another developer can build it, understand selected paths and reproduce captures.

## Define reproducible input content

Use a checked-in height field or a versioned procedural recipe with fixed seed. Metadata records dimensions, sample format, horizontal cell size, height scale, origin and coordinate convention. Include material weight maps or derive them with a deterministic documented rule.

The content build validates dimensions and finite ranges, imports/compiles textures and emits chunk-friendly runtime data. Preserve source attribution/licenses. Avoid network downloads during normal build; CI and users need the same inputs.

```cpp
struct TerrainDemoConfig {
    AssetId terrain;
    Vector3 initialCameraPosition;
    float initialYaw, initialPitch;
    TerrainQuality quality;
    std::uint64_t captureSeed;
};
```

Command-line or config selects scene, renderer through CNA's supported mechanism, resolution and capture mode. Log active platform/renderer/capabilities/content hash at startup.

## Build chunks in two phases

Workers decode/generate CPU arrays for chunk vertices, normals, bounds and collision samples. The game thread creates CNA vertex/index buffers and publishes complete chunks. For a compact demo all chunks may preload, but retaining the two-phase boundary proves the path later used for streaming.

Generate three LOD grids sharing the same world extent. Use stitch index variants or skirts and color each LOD in debug mode. Hysteresis stops threshold flicker. Neighbor rules are visible in the inspector.

Reuse index buffers among chunks of the same resolution where practical. Record vertex/index count, buffer bytes and generation/upload time. Device recovery rebuilds resources from retained/ reloadable CPU content under the project's policy.

## Terrain material and fallbacks

Blend grass, rock and sand/snow using authored weights or slope/height. Apply world-space UV scales and macro color variation. The primary path can use texture arrays if supported; fallback uses an atlas or fewer layers. A final unlit/vertex-color mode ensures the geometry remains inspectable on minimal capability paths.

List requirements per tier: texture units/array support, shader profile, formats, shadow/fog features. Selection is capability-based and logged. The demo UI can cycle supported tiers to compare visual and performance costs.

Use one directional light, ambient term and distance/height fog. A sky dome/cubemap gives the horizon context but should not dominate the terrain test. Keep time/weather fixed during golden captures.

## Cameras and ground interaction

Fly camera uses semantic move/look actions and real presentation time under a speed scale. Walk camera samples terrain height/normal and maintains eye height, max slope and gravity-like descent. Switching mode resets velocity and camera history.

Mouse/controller cursor picking constructs a world ray, intersects terrain chunks, then traverses height cells/triangles. Mark the hit with a debug decal/primitive and display world coordinate, height, normal, material weights, chunk and LOD.

This single tool validates agreement among render mesh, collision/query data and coordinate transforms. Exact sample points and chunk seams belong in automated tests.

## Render pipeline

Per frame, select visible chunks from the camera frustum, choose LOD, sort/group compatible material work and draw opaque terrain before transparent debug overlays. Shadows, if included, use the same LOD/material cutout rules under a separate pass budget.

Debug modes include wireframe, bounds, chunk/LOD color, normals, weight channels, overdraw approximation and culling freeze. Culling freeze holds the previous camera frustum while the camera moves, revealing exactly what was selected.

Avoid allocating state objects or chunk buffers each frame. Resize rebuilds only size-dependent targets. Render state is completely bound per pass so switching debug modes cannot leak wireframe/cull settings.

## Automated tour and captures

Create a fixed camera path with named stops: overview, grazing horizon, chunk seam, steep slope, shoreline/low area and close texture detail. In capture mode, advance fixed time, disable nondeterministic noise and save frames with metadata.

Run the tour across CNA renderers and quality tiers. Golden comparison uses tolerances appropriate to raster differences while separately asserting structural features. Store failure diffs and active capability path.

Performance mode warms resources, follows the same tour and reports CPU update/culling/submission, GPU pass timings where available, visible chunks/triangles/draws and peak memory. Do not combine screenshot readback into timed frames.

## Release checklist

Test missing/corrupt asset, unsupported high tier, resize/fullscreen, device recovery, negative/world-edge queries and every LOD neighbor combination. Package only used assets plus licenses and configuration help.

The finished demo is small but deep: it demonstrates generated content, CNA resource lifetime, portable material fallback, camera/input, spatial math and repeatable evidence. That makes it more valuable than an impressive flyover whose build and rendering choices are undocumented.
