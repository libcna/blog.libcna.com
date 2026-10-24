---
title: Transparency, Alpha Testing and Draw Order in CNA
date: 2028-08-24T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Make CNA transparency predictable with correct alpha conventions, depth policy, sorting, cutouts, particles and cross-renderer fixtures.
author: Robert Vokac
categories: [Development]
tags: [CNA, Transparency, Blending, Alpha Test, Rendering]
draft: false
---

Transparent rendering fails in recognizable ways: dark fringes around sprites, trees disappearing behind their own leaves, smoke cutting holes in effects behind it, or glass changing with camera direction. These are not one bug. They come from alpha representation, blend equations, depth rules and unavoidable ordering limits.

Classify materials before choosing a solution:

- opaque surfaces write color and depth;
- cutouts are either fully visible or discarded and can usually write depth;
- blended surfaces combine with existing color and normally do not write depth;
- additive effects accumulate light-like color and are less order-sensitive;
- coverage techniques approximate cutouts when multisampling permits.

One “transparent” queue for all of them loses useful guarantees.

## Straight versus premultiplied alpha

With straight alpha, stored RGB remains the unattenuated color and blending multiplies source color by alpha. With premultiplied alpha, RGB is already multiplied by alpha and the blend state must match. CNA inherits XNA's strong SpriteBatch convention around premultiplied content, but a project's actual asset pipeline and selected blend state must agree.

For premultiplied source-over compositing:

```text
out.rgb = src.rgb + dst.rgb * (1 - src.a)
out.a   = src.a   + dst.a   * (1 - src.a)
```

Filtering transparent texels exposes their RGB. A fully transparent white border around a red sprite can create a pale halo under straight processing; a black border can create a dark one. Extrude edge colors and premultiply in the correct color space during content processing. Do not “fix” every fringe in the shader with an unexplained multiplier.

## Color space is part of blending

Physically meaningful blending occurs in linear color, not directly in gamma-encoded values. If the project uses sRGB textures and targets, verify which conversions each CNA renderer performs for sampling and writes. A mismatch can make particles too dark or UI edges too bright even with correct factors.

Create one fixture with overlapping red, green and blue translucent quads and known expected pixels. Run it through every supported renderer and target format. This catches transfer-function and blend-state differences earlier than a complex scene.

## Alpha test and cutouts

Fences, leaves and pixel-art holes often work better as cutouts: sample alpha and discard below a threshold. Remaining pixels write depth, so their ordering behaves like opaque geometry. Draw them after opaque surfaces, often front-to-back for early depth rejection, then draw truly blended surfaces.

A hard threshold aliases at distance and under animation. Mipmaps require alpha-aware generation or coverage changes as the texture shrinks. Alpha-to-coverage can smooth edges under multisampling where supported, but it is a capability-dependent quality path and can behave differently with temporal effects.

Shadows need the same cutout rule. A leafy object that casts a solid rectangular shadow breaks the material contract. Share threshold and relevant texture inputs between main and shadow variants.

## Why blended geometry is sorted back-to-front

Source-over blending is order-dependent. With depth writes disabled, sorting objects from far to near is a practical approximation. Sorting by object center fails when large or intersecting objects overlap. Per-triangle sorting is expensive and still cannot solve cyclic intersections.

Make sort keys explicit:

```cpp
struct TransparentItem {
    MaterialId material;
    MeshHandle mesh;
    Matrix world;
    float cameraDepth;
    StableDrawId tieBreaker;
};
```

Sort primarily back-to-front and use a stable tie-breaker to prevent flicker. Batching by material conflicts with strict depth order; correctness chooses order, then optimization reduces state changes within safe groups. Additive and other commutative-enough effects can use separate batching rules.

Depth testing should remain enabled so opaque geometry occludes transparent pixels. Depth writing is normally disabled for blended passes because the front surface would prevent later transparent layers from contributing. Some materials use a depth-only prepass, but that represents only the nearest layer and may make back faces disappear.

## Special cases

Hair and foliage may split into an alpha-tested core plus a blended fringe. Glass may need scene-color refraction and should not be treated as a normal translucent decal. Particles need blend families—premultiplied, additive, distortion—with deterministic order inside emitters where visible.

Two-dimensional UI relies on explicit submission/layer order rather than camera depth. `SpriteBatch` sort mode must match the intended semantics. Switching textures or scissor state can flush batches, but an optimization must never reorder content across a required compositing boundary.

Weighted blended order-independent transparency can improve intersecting particles and glass without full sorting, but needs extra render targets and compositing. Treat it as an optional renderer capability with a conventional sorted fallback.

## Debugging and release tests

Add debug views for alpha, premultiplied RGB, overdraw, depth and material classification. Print blend/depth state and sort key for a selected draw. A checkerboard background helps reveal fringe and coverage errors.

The fixture set should include texture edges at several scales, stacked quads, intersecting meshes, cutout foliage with mipmaps, particles before/behind opaque geometry, UI clipping and render-target compositing. Test HDR/LDR targets and capture exact pixels with stated tolerances.

Transparency becomes manageable once content encoding, shader output, blend state, depth policy and draw order are treated as one material contract. Changing only one part is usually what created the artifact.
