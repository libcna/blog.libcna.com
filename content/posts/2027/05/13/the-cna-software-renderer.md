---
title: The CNA Software Renderer
date: 2027-05-13T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: CNA's CPU rasterizer renders real pixels without a GPU and serves as a deterministic graphics oracle, CI backend and terminal presentation source.
author: Robert Vokac
categories: [Development]
tags: [CNA, Software Rendering, Testing, Graphics]
draft: false
---

`CNA_GRAPHICS_RENDERER=SOFTWARE` is a real CPU rasterizer, not a no-op device. It produces an RGBA framebuffer, implements a substantial XNA/Core graphics subset and can present through a normal window or CNA's Terminal platform.

```bash
cmake -S . -B build-software \
  -DCNA_GRAPHICS_RENDERER=SOFTWARE
cmake --build build-software
```

The renderer is valuable when GPU availability is uncertain, but its most important role is verification. A software frame is reproducible enough for pixel oracles, screenshot tests and comparisons against EasyGL and other renderers. CNA's differential tools dump matching scenes and compare them with an explicit tolerance.

## What it renders

The implementation covers ordinary textures, `SpriteBatch`, render targets, depth behavior, buffers, primitives, stock-effect paths and the states needed by CNA's shared fixtures. It intentionally does not pretend to be a universal GPU emulator. Custom GPU shaders and backend-specific features need a fallback or another renderer.

A useful software test creates a small target, clears to a distinctive color, draws asymmetric geometry and reads the pixels back. Assert representative interior, edge and background pixels. Tiny fixtures make a failure explainable; a full game screenshot is better as a later integration gate.

## Performance expectations

CPU rendering trades portability and determinism for throughput. Reduce resolution, overdraw and expensive blending when using it interactively. It is not fair to compare its frame rate with a hardware renderer and conclude that the API is slow—the selected execution hardware is fundamentally different.

The renderer also catches assumptions that a GPU driver might tolerate: uninitialized state, incorrect winding, invalid bounds and dependence on implicit presentation behavior. When Software and a GPU backend disagree, compare the smallest shared fixture first and consult the feature matrix before declaring either image correct.

Software rendering lets CNA test graphics on machines with no display server, feed completed frames to a terminal and retain a readable reference implementation. That makes it an engineering tool as much as a deployment option.

## Building trustworthy pixel tests

Fix every input that influences the image: target size, clear color, viewport, matrices, texture bytes, sampler, blend mode and draw order. Read the backbuffer only after drawing finishes and compare exact bytes or a tolerance justified by the operation. Store the expected image beside a description of what each region proves.

Prefer several tiny fixtures to one enormous golden screenshot. Separate alpha blending, depth, scissor and render-target sampling. When a fixture fails, its name already identifies the subsystem; a full game capture can remain the final integration gate.

Software also serves tools: build machines can render thumbnails, servers can generate maps, and documentation can create images without a GPU. Those uses still obey the feature matrix. Profile triangle setup, sampling, overdraw and blending before increasing resolution; coarse culling and smaller targets usually matter more than micro-optimizing arithmetic.

## What the rasterizer must preserve

A software backend still implements a graphics contract. It transforms and clips vertices, maps them into the viewport, evaluates depth and culling, interpolates attributes, samples textures, blends fragments and writes the selected target. Differences in half-pixel rules, winding, interpolation or float-to-byte conversion can move an edge or change a blended pixel. Reference tests therefore need triangles touching viewport boundaries, reversed winding, sub-pixel geometry, transparent overlap and nearly equal depth values.

Texture tests should separate addressing from filtering. A tiny image with a unique color in every texel can verify point and linear sampling under clamp and wrap modes. Similar fixtures cover source rectangles, scissor tests, color write masks and sampling a completed render target. Each failed image should identify one rule rather than combine ten effects into an ambiguous scene.

## Integrating it into development

Name captures with the scene, dimensions and format. Use exact byte comparison for integer-like fixtures and a documented tolerance only where interpolation makes exact agreement unreasonable. Always emit a difference image on failure; it turns a mysterious checksum into a visible one-pixel edge or channel error.

Expose submitted primitives, clipped primitives, shaded pixels, depth rejects, texture samples and target switches. These counters show whether a slow frame comes from geometry, overdraw or state churn and make optimizations measurable. Unsupported operations must fail clearly or advertise a missing capability. A precise subset with excellent diagnostics is more useful than broad but unpredictable emulation.

## Worked example: a pixel oracle

The best software-renderer test draws a tiny scene and checks pixels that can be calculated by hand:

```cpp
RenderTarget2D target(device, 8, 8, false,
                      SurfaceFormat::Color, DepthFormat::None);
device.SetRenderTarget(&target);
device.Clear(Color::Magenta);

SpriteBatch batch(device);
batch.Begin(SpriteSortMode::Deferred,
            BlendState::AlphaBlend,
            SamplerState::PointClamp);
batch.Draw(checkerTexture, Rectangle(2, 2, 4, 4),
           Color(128, 255, 255, 255));
batch.End();

device.SetRenderTarget(nullptr);
std::vector<Color> pixels(64);
target.GetData(pixels);
Require(pixels[0] == Color::Magenta);
Require(pixels[2 + 2 * 8] == expectedTopLeft);
Require(pixels[5 + 5 * 8] == expectedBottomRight);
```

Use the constructor and `GetData` overload in your CNA revision, but preserve explicit format, state, known texture bytes, unbinding before readback and coordinate-specific assertions. A PNG is a debugging artifact; test data should determine pass or failure.

Build a fixture ladder: clear, opaque rectangle, alpha, scissor, rotation, depth and target sampling. For triangles, test two primitives sharing an edge so no pixel is doubled or left as a crack. For filtering, use a 2×2 texture with unrelated colors and sample at texel centers and half positions.

## Reading a failure

Print `(x, y)`, expected RGBA and actual RGBA. A uniform channel error suggests packing or color conversion. A mirrored image suggests origin convention. Shared-edge failures indicate coverage rules. Correct RGB with wrong alpha points to blending or write masks.

Run the fixture on software and at least one GPU backend, but only compare capabilities both claim. Keep exact cases exact and place justified tolerances in fixture metadata. For thumbnail or map-generation tools, also bound input dimensions, output pixels and execution time: deterministic CPU rendering still needs resource limits.

## Common mistakes and a qualification plan

Do not assume CPU output is automatically deterministic. Parallel tile scheduling can change floating-point accumulation order; uninitialized padding can enter hashes; a system image decoder may produce different channel conversions. Fix thread count for reference tests, initialize every byte, and feed already-decoded canonical texture data into low-level fixtures.

Clipping belongs before perspective division, and interpolants need the correct perspective rule. A triangle crossing the near plane is therefore an essential fixture. So are negative viewport origins, empty scissors, clockwise/counter-clockwise culling, 16- and 32-bit indices, NaN rejection and zero-area primitives. Refuse invalid buffer ranges before accessing memory.

For alpha, calculate one pixel on paper. With premultiplied source `S` over destination `D`, the expected RGB is `S.rgb + D.rgb * (1 - S.a)`. Store that numeric expectation. If a test obtains the right visual color only after changing both asset and blend state, it has not established which contract is correct.

Qualify in three layers:

1. arithmetic tests for packing, interpolation, depth and blend;
2. tiny rendering fixtures for one feature at a time;
3. representative CNA scenes shared with GPU renderers.

Record unsupported capabilities in the same matrix. Passing the scene by ignoring a shader or substituting a white texture is not compatibility. A production use such as server map rendering should additionally have a maximum wall time, memory budget and cancellation path.
