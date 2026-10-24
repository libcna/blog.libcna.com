---
title: Stencil Buffer Techniques in CNA
date: 2028-08-17T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Use CNA depth-stencil state deliberately for outlines, mirrors, portals, masks and bounded multi-pass effects across renderers.
author: Robert Vokac
categories: [Development]
tags: [CNA, Stencil Buffer, Rendering, Portals, Outlines]
draft: false
---

The stencil buffer is a small integer label stored beside depth. A draw can compare that label, keep or replace it, and choose whether color and depth are written. With a few explicit passes it can mask mirrors, draw selected-object outlines, bound lights or open portals without adding mask textures.

Stencil is stateful. Most bugs come from leaving an old reference value, write mask or comparison active for a later pass. Treat every technique as a closed render-pass recipe with declared inputs, depth-stencil state, blend/rasterizer state and cleanup—not a few flags changed in the middle of general scene drawing.

## The state vocabulary

A stencil operation has a comparison function, reference value, read/write masks and actions for stencil fail, depth fail and pass. Front and back faces may have distinct rules. CNA exposes XNA-compatible depth-stencil concepts; exact accessor spelling should follow the version used by the project.

```cpp
struct StencilPass {
    CompareFunction compare;
    StencilOperation onFail;
    StencilOperation onDepthFail;
    StencilOperation onPass;
    int reference;
    std::uint8_t readMask;
    std::uint8_t writeMask;
    bool depthTest;
    bool depthWrite;
    ColorWriteChannels colorWrite;
};
```

This game-owned description makes review and diagnostics easier even if it is translated into cached CNA state objects. Create immutable named states during initialization rather than allocating them in the draw loop.

Stencil contents are meaningful only after a defined clear or full overwrite. Clear at the start of the owning pass unless render-graph lifetime proves a safe reuse. Scissored/partial rendering and shared depth surfaces make assumptions about old bits especially dangerous.

## Selected-object outlines

A classic outline uses two passes:

1. draw the selected object's normal shape while writing a stencil reference;
2. draw an expanded version only where stencil is not equal to that reference.

Disable color writes during a dedicated mask pass if the normal object draw cannot write stencil. The expanded mesh can use a vertex-normal offset or scaled transform, but non-uniform scaling and hard normals may produce uneven thickness. A screen-space edge technique may be better for complex geometry.

Depth policy determines whether the outline appears through walls. Testing depth produces visible-only outlines. Ignoring depth produces an X-ray selection. A hybrid can draw different colors for occluded and visible segments. State that UX rule explicitly.

## Planar mirrors

First draw the mirror shape into stencil with color writes disabled. Then render the reflected scene only where stencil matches. Reflect camera/view data across the mirror plane, adjust culling for mirrored handedness and use an oblique clip plane or equivalent to prevent geometry behind the mirror from appearing.

Finally draw the mirror surface for tint, roughness or frame. Avoid reflecting the mirror recursively unless bounded recursion is a deliberate feature. A render-to-texture mirror is often simpler for post-processing and rough reflections; direct stencil rendering can save a target but constrains pass ordering.

## Portals

A portal begins like a mirror mask but renders a transformed camera into the marked region. The destination view must use the portal region's effective aspect/scissor, a near clip plane that rejects geometry behind the destination portal and a recursion budget.

For recursive portals, reserve stencil values or increment/decrement around nested regions. Stop by depth, projected area and total pass budget. Stable camera transforms and oblique clipping matter more than high recursion count. When the budget ends, draw a defined fallback surface rather than stale framebuffer contents.

Input, audio and physics do not automatically follow a visual portal. The article's technique concerns rendering; traversal and spatial acoustics remain game systems.

## Bit allocation and multiple effects

If several systems share an eight-bit stencil, publish a bit allocation. For example, lower bits may represent portal depth while one bit marks UI masks and another marks selection. Every pass uses read/write masks so it cannot destroy unrelated bits.

```text
bits 0..3  portal recursion level
bit 4      selected-object mask
bit 5      special light volume
bits 6..7  reserved
```

Treat this as a scarce frame-local resource. A central allocator or render-graph declaration is safer than independent subsystems choosing magic values. If two effects require incompatible interpretations at the same time, clear between lifetimes or use separate depth-stencil targets.

## Volume and UI masking

Deferred renderers can use stencil to restrict lighting to geometry classes or volumes, reducing shader work. Shadow volumes use increment/decrement operations on front/back faces, but demand watertight geometry and careful depth rules.

UI can use stencil for non-rectangular masks, though scissor rectangles are cheaper for rectangular clips. Nested rounded panels consume values or depth and add batch breaks, so reserve stencil UI for shapes that actually need it.

## Portability and validation

Choose a depth-stencil format that really contains the bits required and verify render-target compatibility. Capability checks and creation failure must lead to a documented fallback—screen-space outline, texture mask or simpler portal—not a renderer-name special case.

Build tiny golden fixtures: one triangle for every comparison/action combination actually used, overlapping front/back faces, depth pass/fail, masks with unrelated bits and a resize/recreation path. Visual debug can map stencil values to colors in a separate inspection pass where supported.

Log pass name, reference, masks, depth state and target. After each technique, bind the next pass's complete state rather than relying on “restore defaults.” Stencil becomes dependable when its lifetime and bit ownership are as explicit as a texture's.
