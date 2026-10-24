---
title: 3D Rendering in CNA
date: 2027-07-01T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Assemble a CNA 3D frame from vertex buffers, camera matrices, depth state, effects and explicit draw calls.
author: Robert Vokac
categories: [Development]
tags: [CNA, 3D, BasicEffect, Graphics]
draft: false
---

CNA follows XNA's explicit 3D model. Create vertex and index buffers, describe their layout, select rasterizer, depth and blend state, apply an effect pass, then issue a draw. There is no hidden scene graph between the game and `GraphicsDevice`.

Every object combines three matrices. `World` places local geometry, `View` represents the camera, and `Projection` maps the view to the viewport. Keep one multiplication convention throughout the project and test with an asymmetric transform before building a larger scene.

`BasicEffect` supplies textured, vertex-colored and lit paths. Lighting requires normals in a supported vertex layout; textures require coordinates; missing data should not be guessed. Start with culling disabled when diagnosing blank geometry, then restore the intended winding and rasterizer state rather than shipping double-sided everything.

## A reliable frame

Clear color and depth, draw opaque objects front-to-back, then alpha-tested and transparent work in an order appropriate to the material. Enable depth writes for opaque geometry; transparent objects usually test depth but do not write it. Restore state between specialized passes.

Use indexed geometry when vertices are shared. Choose 16- or 32-bit indices according to mesh size and renderer capability. Validate buffer bounds before drawing; a driver crash is not an acceptable way to discover a bad index.

Frustum culling and LOD belong above the renderer. Keep bounding volumes with scene objects, submit only visible work and record counts so a performance change can be explained. Instancing can reduce draw calls when the selected renderer supports it, but a correct non-instanced path remains valuable.

Test the same small scene on Software and at least one GPU renderer. Include depth overlap, clockwise and counter-clockwise triangles, textured and lit objects, resize and readback. Once those foundations agree, models, shadows and PBR become additions to a known-correct frame rather than simultaneous mysteries.

## Resource and state ownership

Create immutable geometry during loading and dynamic buffers only for changing data. Updates must respect declared size and stride. Dispose resources before their device and rebuild reset-sensitive objects through a known path.

Treat every pass as a state boundary: specify blend, depth, rasterizer, viewport, targets, buffers, indices and effect. This is cheaper than diagnosing a mirror that works only after one particular model. Diagnostics can then separate submission count, geometry cost and unnecessary state churn.

## Coordinate and material contracts

Write down handedness, world up, forward direction, matrix order, field-of-view units and depth convention. Convert imported data once at the content boundary. Repeated ad hoc axis swaps eventually invert winding, animation or normal maps. A diagnostic model with labeled axes, asymmetric geometry and a known camera reveals these mistakes faster than a symmetric cube.

Materials should be data, not draw-time guesses. Store texture roles, colors, alpha mode, double-sided intent and required vertex attributes. Before drawing, select an effect compatible with both material and mesh. Missing tangents should disable or replace normal mapping explicitly; silently reading an absent vertex channel produces renderer-dependent artifacts.

## Visibility and frame organization

Compute conservative world bounds and frustum-cull before expensive material setup. Sort opaque work to reduce state changes while preserving correctness; draw transparent surfaces after opaque ones, usually back-to-front, with depth testing but controlled depth writing. Complex transparency may need a specialized technique rather than endless sort tweaks.

Split frame construction from submission. First build a visible list containing mesh, material, transform and depth key, then execute named passes such as shadow, opaque, transparent and overlay. This design supports diagnostics and lets a future renderer consume the same intent differently.

Validate with wireframe or normal visualization, overdraw views and GPU/CPU timing where available. Test near and far clipping, non-uniform scale, mirrored transforms, large coordinates and device recreation. The goal is not simply to display a model, but to make every transformation and state transition explainable.

## Minimum qualification scene

Use an asymmetric textured mesh, a skinned model, transparent geometry, mirrored and non-uniform transforms, a moving near plane and objects crossing the frustum. Add enough repeated materials to expose sorting and enough lights to exercise the selected effect. Run the scene after resize and device recreation, then compare captures across renderers. Record draw, triangle, material-switch and upload counts. A stable qualification scene turns future optimization and backend work into a measurable comparison instead of subjective inspection.

## Worked example: indexed geometry

Create immutable vertex and index buffers during loading. Then make every draw dependency explicit:

```cpp
BasicEffect effect(device);
effect.setWorldProperty(world);
effect.setViewProperty(view);
effect.setProjectionProperty(projection);
effect.setTextureEnabledProperty(true);
effect.setTextureProperty(&albedo);

device.SetVertexBuffer(&vertexBuffer);
device.setIndicesProperty(&indexBuffer);
device.setBlendStateProperty(BlendState::Opaque);
device.setDepthStencilStateProperty(DepthStencilState::Default);
device.setRasterizerStateProperty(RasterizerState::CullCounterClockwise);

for (auto& pass : effect.getCurrentTechniqueProperty()->getPassesProperty()) {
    pass.Apply();
    device.DrawIndexedPrimitives(PrimitiveType::TriangleList,
        0, 0, vertexCount, 0, indexCount / 3);
}
```

Check exact signatures in the CNA revision you build. The rule is stable: buffers, matrices, state and every pass are explicit. A mesh that inherits the previous object's rasterizer or sampler is a bug even when it looks correct.

Build a render queue before submission. Each item carries mesh, material, transform, bounds and keys. Frustum-cull, split opaque from transparent, sort opaque by pipeline/material and transparent by depth. Record visible items, draws, state switches, triangles and upload bytes.

When geometry vanishes, draw bounds and frustum planes. When lighting fails, visualize normals. Mirrored transforms require deliberate winding/cull handling, and non-uniform scale requires correct normal transformation. These fixtures separate scene math from renderer behavior.

## Coordinate contracts and transparent objects

Document handedness, up/forward axes, matrix multiplication order, field-of-view units and depth range beside the importer. Convert foreign assets once during import. Axis swaps distributed across camera, model and shader code eventually disagree about winding, animation or tangent space.

Opaque objects normally write depth and can be sorted for state efficiency. Transparent objects usually test depth but do not write it and are sorted back-to-front by an appropriate bound or surface approximation. Intersecting transparent geometry cannot always be solved by object sorting; split geometry, use alpha testing for cutouts, or choose a specialized technique. Do not disable depth globally to make one pane of glass appear.

Bounds must be conservative after world transformation. A sphere can scale by the largest axis; an oriented or transformed box may yield tighter culling. Animated meshes need bounds that encompass the evaluated pose or deliberately updated dynamic bounds. A false-negative cull is a missing object, so correctness precedes tightness.

## Resource update rules

Static geometry uses immutable or infrequently updated buffers. Dynamic streaming uses a bounded ring or discard/no-overwrite strategy supported by the backend. Validate byte count, stride and index range before submission. Retire replaced buffers only after in-flight GPU work is complete.

Qualify near/far clipping, very small and large coordinates, 16/32-bit indices, multiple vertex declarations, empty meshes, lost/recreated targets and repeated scene unload. Run both debug validation and optimized builds. A correct 3D layer makes every state dependency explicit enough that the same render queue can be reasoned about on all CNA backends.
