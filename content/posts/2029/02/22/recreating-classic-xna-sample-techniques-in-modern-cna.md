---
title: Recreating Classic XNA Sample Techniques in Modern CNA
date: 2029-02-22T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Rebuild useful techniques from publicly available XNA sample projects in CNA with clearer ownership, portable shaders, tests and modern build discipline.
author: Robert Vokac
categories: [Development]
tags: [CNA, XNA Samples, Porting, Graphics, Testing]
draft: false
---

Classic XNA samples remain valuable because each isolates one teachable technique: picking, particles, skinning, post-processing, generated geometry or a small game loop. Recreating a technique in CNA should preserve that clarity while adopting explicit C++ ownership, current build targets, renderer portability and automated evidence.

This is source-level educational work based on publicly available sample code, documentation and redistributable assets. It does not require decompiling or promoting analysis of the original XNA runtime. CNA compatibility work has its own documented public-source and test methodology.

![A non-photorealistic hatching technique running in a CNA-ported sample](/media/2027/91-xna-samples-ported-to-cpp-with-cna/non-photorealistic.png)

## Choose the lesson before the sample

Write one sentence describing the technique and its observable acceptance criteria. For example:

- picking: a screen point selects the nearest visible mesh and reports hit data;
- generated geometry: a content processor/runtime path produces a terrain and normals;
- sprite effect: normal-mapped 2D surface responds to a movable light;
- skinning: clips animate the expected skeleton with stable bone transforms;
- post-processing: scene renders to a target and one effect composes to the back buffer.

Do not begin by mechanically renaming syntax in every source file. Identify application lifecycle, content assets, shader/effect inputs, renderer states and unsupported platform-specific dependencies. Record license/provenance for source and assets.

## Establish a minimal CNA shell

Create one CNA `Game` subclass, graphics manager, content root and clear/update/draw loop. Add the sample through the repository's normal CMake helper and target conventions. Verify an empty colored frame on required platforms/renderers before importing technique code.

Port in vertical slices. For picking: camera/matrices, one model, bounds query, then exact hit. For post-processing: scene target, known copy pass, then effect. Each step produces a capture or test, making failures local.

Use RAII/value ownership rather than translating managed lifetime literally. Content-owned assets remain under a clear content scope. CNA device resources are recreated/released through the established lifecycle. Event subscriptions and background work stop before owners die.

## Map concepts, not accidental spelling

XNA and CNA intentionally share framework concepts, but C++ uses namespaces, includes, value/reference semantics and accessor conventions. Consult current CNA headers and converted samples for exact API. Do not invent convenience wrappers merely to make C++ visually identical to C#.

Keep math convention checks explicit: multiplication order, coordinate handedness, winding/cull mode, texture origin and depth range. A one-triangle/axis fixture finds convention mistakes sooner than a complex sample scene.

```cpp
struct TechniqueInputs {
    Matrix world;
    Matrix view;
    Matrix projection;
    Vector3 lightDirection;
    Texture2D* texture;
};
```

This game-owned structure can validate required effect parameters once at load and bind them by typed slots during draw.

## Rebuild shaders portably

Treat the shader's semantics as the source of truth: vertex inputs, coordinate spaces, sampled textures, constants, outputs and blend/depth assumptions. Use CNA's current FX/shader pipeline and renderer variants described in the portable-shader article.

Avoid silent renderer-name branches. Declare required capabilities and a fallback. Validate effect parameter names/types, vertex declarations and render-target formats. Compile/test every shipped variant through the content/CI pipeline.

![The Sprite Effects technique applies lighting and normal mapping to 2D artwork](/media/2027/91-xna-samples-ported-to-cpp-with-cna/sprite-effects.png)

When output differs, inspect intermediate values and render targets. Do not tune constants until the matrix, color-space, sampler, alpha and state contracts match.

## Separate tutorial code from production extensions

The core sample should remain small. Put optional improvements behind clearly named sections or modes:

- resize/device recovery;
- action-based remappable input;
- capability fallback;
- debug overlay;
- deterministic capture camera/time;
- content validation;
- headless logic tests.

Do not bury the lesson under an engine layer. Conversely, do not preserve obsolete assumptions—absolute paths, per-frame state allocation, unchecked asset casts or a single fixed resolution—only because the old tutorial was brief.

## Create evidence

For graphics techniques, store a small golden scene with fixed content, camera, time, seed and renderer metadata. Capture final output and important intermediate buffers. Tolerances distinguish expected raster differences from missing features.

For math/gameplay techniques, add unit tests with known rays, transforms, animation times or particle counts. For content techniques, build fixtures from clean input and compare semantic output hashes/fields. Run the sample through every supported CNA configuration appropriate to its requirements.

The public screenshot is useful documentation, but not the only test. Preserve logs reporting active platform, renderer, capability/fallback and content identity so a future mismatch is reproducible.

## Improve without rewriting history

Document what was preserved, what changed for CNA/C++, and why. Keep attribution/license files near the port. If an asset cannot be redistributed, replace it with an owned asset and say so. Do not claim pixel identity when the goal is the same technique under modern renderers.

The existing collection of 91 CNA ports shows the breadth possible—from complete games to focused rendering examples. A strong new recreation adds depth: a readable implementation, defined lifecycle, portable paths, tests and evidence that teach the technique independently of one historical machine.
