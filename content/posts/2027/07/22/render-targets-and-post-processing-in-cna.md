---
title: Render Targets and Post-processing in CNA
date: 2027-07-22T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Use CNA render targets safely for offscreen scenes, scaling, multiple passes, MSAA, mipmaps and full-screen effects.
author: Robert Vokac
categories: [Development]
tags: [CNA, Render Targets, Post-processing, Graphics]
draft: false
---

`RenderTarget2D` turns a texture into a drawing destination. It enables scene composition, minimaps, mirrors, dynamic resolution and post-processing, but it also introduces resource lifetime, orientation and state transitions that the backbuffer usually hides.

```cpp
device.SetRenderTarget(&scene);
device.Clear(Color::CornflowerBlue);
DrawWorld();

device.SetRenderTarget(nullptr);
spriteBatch.Begin();
spriteBatch.Draw(scene, device.getViewportProperty().getBoundsProperty(), Color::White);
spriteBatch.End();
```

Unbind before sampling. `SetRenderTarget(nullptr)` returns to the backbuffer; do not assume an earlier viewport or depth buffer remains appropriate after a target change. Clear color and depth intentionally at the start of every pass.

## Choose the target deliberately

Format, depth format, multisample count, mipmap setting and usage affect support and cost. Query limits before creating multiple render targets, especially when attachments have mixed formats. MSAA resolves are backend operations, and mip generation has explicit timing; neither should be inferred from how a desktop driver happened to behave.

Build post-processing as a visible chain of targets. Ping-pong between two compatible textures for several full-screen effects, then present once. Avoid allocating targets per frame—recreate them only when size or quality changes and dispose old resources at a safe point.

Dynamic resolution renders the expensive scene smaller while keeping the UI at native resolution. Decide which effects operate in scene pixels and which require final display pixels. CRT masks, sharp outlines and text usually belong late; blur and lighting may benefit from reduced resolution.

Cross-renderer tests should exercise sampling after unbind, depth occlusion, resize, MSAA resolve, mip levels and an asymmetric orientation image. CNA normalizes target sampling for applications, so backend-specific flips in game code are a warning sign.

Render targets are easiest to reason about when each pass declares its inputs, output, viewport and states. That small render graph can remain ordinary C++—the important part is that dependencies are explicit.

## Lifetime and fallback

Cache targets by dimensions, format, depth and samples; two free textures are not interchangeable merely because their sizes match. Invalidate them on teardown and retire in-flight native resources through renderer lifetime rules.

If optional target creation fails, reduce quality in a documented order: samples, resolution, expensive format, then the effect. Never silently replace a required data format. Publish the active fallback in diagnostics so captures remain explainable.

## Building a pass graph

Describe each pass by its inputs, output, viewport, clear policy and render state. A typical chain renders HDR scene color and depth, extracts bloom, blurs at reduced resolution, combines it with the scene, tone-maps, and finally draws UI. The description makes dependencies visible and prevents sampling a target that is still bound for writing.

Ping-pong effects need two compatible targets. Never read and write the same texture unless the API explicitly supports that operation. After switching targets, restore the viewport to the new dimensions; a half-resolution blur using the old full-size viewport is a common source of clipped or undefined output.

## Resolution, color and debugging

Choose formats according to stored meaning. Normals and HDR light accumulation may need more range than final display color, while masks often need less. Decide where sRGB conversion and tone mapping occur so gamma is applied once. Alpha also needs a stated purpose—transparency, luminance or unused—because later passes otherwise interpret it inconsistently.

Expose a debug view that displays every intermediate target with its name, size and format. Add controls to disable individual effects and freeze exposure. For automated tests, use small deterministic scenes that prove target orientation, sampling after unbind, viewport restoration and resource recreation after resize.

Pool only after correctness. Track logical lifetime from last producer to last consumer and never recycle while the GPU may still use a resource. Record allocated bytes and peak simultaneous targets. Dynamic resolution should change at controlled boundaries and invalidate dependent history buffers so temporal effects do not blend incompatible frames.

## Post-processing checklist

For each pass, write down source and destination size, format, color space, clear value, sampling mode and alpha meaning. Test odd dimensions as well as powers of two. Resize repeatedly, disable the effect at runtime and recreate the device. Confirm UI placement before and after the chain and capture every intermediate output. Finally, force each quality fallback and verify diagnostics report it. These checks catch more real failures than judging one attractive screenshot at the default resolution.

## Worked example: render, unbind, composite

Create targets when display size or quality changes, not every frame:

```cpp
sceneTarget = std::make_unique<RenderTarget2D>(
    device, width, height, false,
    SurfaceFormat::Color, DepthFormat::Depth24);

device.SetRenderTarget(sceneTarget.get());
device.Clear(Color::CornflowerBlue);
DrawWorld();

device.SetRenderTarget(nullptr); // finish writing before sampling
device.Clear(Color::Black);
spriteBatch.Begin(SpriteSortMode::Immediate,
                  BlendState::Opaque,
                  SamplerState::LinearClamp,
                  nullptr, nullptr, &toneMapEffect);
spriteBatch.Draw(*sceneTarget, destination, Color::White);
spriteBatch.End();
```

Match this sketch to current CNA constructors and overloads. The ordering is non-negotiable: bind destination, set its viewport, clear, draw, unbind, then sample. Never sample the same subresource currently used as output.

## Two-pass blur

Downsample bright pixels into `blurA`, blur horizontally into `blurB`, then vertically back into `blurA`. Pass inverse target size to the shader, not inverse window size:

```cpp
blurEffect.SetDirection(1.0f / blurWidth, 0.0f);
DrawFullscreen(brightTarget, blurB, blurEffect);
blurEffect.SetDirection(0.0f, 1.0f / blurHeight);
DrawFullscreen(blurB, blurA, blurEffect);
```

If dimensions are odd, define rounding once and use the actual allocated dimensions for sampling. Restore backbuffer viewport before compositing. Track the last consumer of each target so pooling cannot recycle it early.

Add a debug gallery that labels every intermediate texture with pass, size, format and color space. Force half resolution, no multisampling and the least expensive supported format to verify fallbacks. Record target bytes and peak simultaneously live resources; post-processing bugs and memory regressions become far easier to explain when the pass graph is visible.

## Multisampling, history and resize

A multisampled target is not necessarily directly sampleable. Resolve it according to CNA/backend capability before using it as shader input. Treat resolve as an explicit graph edge and test color plus depth behavior separately. If a desired format/sample combination is unsupported, lower samples before silently changing data meaning.

Temporal effects retain history across frames. The history becomes invalid after resize, camera cut, field-of-view jump, dynamic-resolution change, renderer reset or a long pause. Clear or reseed it and record the invalidation reason. Blending old 1920×1080 history with a new 1280×720 frame is not a subtle quality issue; it is incompatible data.

During continuous window resize, debounce expensive allocation but keep presentation safe. One strategy renders through the last valid targets and stretches temporarily; another suspends complex effects until resize settles. Whichever policy is selected, the viewport and input mapping must follow the visible output consistently.

## Failure handling

Classify each pass as required or optional. A required picking/ID target cannot fall back from integer IDs to normalized color without changing correctness. Optional bloom may reduce resolution, format, iterations, then disable. Publish the active fallback and reason in diagnostics.

Test target allocation failure deliberately, along with zero drawable size, odd dimensions, device recreation and disabling an effect mid-frame. The post-process chain should either produce a valid documented fallback or fail at a controlled boundary—never leave the next pass sampling an uninitialized texture.
