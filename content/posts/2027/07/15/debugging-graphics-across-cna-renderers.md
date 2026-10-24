---
title: Debugging Graphics Across CNA Renderers
date: 2027-07-15T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Reduce a cross-renderer CNA graphics difference to a shared fixture, capability decision or documented backend limitation.
author: Robert Vokac
categories: [Development]
tags: [CNA, Debugging, Renderers, Graphics Testing]
draft: false
---

A scene that works on one CNA renderer and fails on another is not solved by adding a backend-specific flip until the symptom disappears. First determine whether the application relied on undefined state, requested an unsupported feature, or exposed a real parity bug.

Record the renderer identity and capabilities, output size, surface formats and active states. Capture before and after post-processing. If possible, reproduce with a fixed camera and deterministic timestep.

Reduce the frame in stages: remove UI, transparency, lighting, textures and indices until the smallest failing draw remains. Replace artwork with an asymmetric test texture and geometry with one triangle. Symmetry hides vertical flips, channel swaps and winding errors.

## Compare evidence

CNA's shared fixtures use Software or measured reference pixels as an oracle and run matching scenes on GPU backends. Compare images with the fixture's stated tolerance and inspect a difference image. A one-byte rounding difference is not the same failure as an inverted target.

Check the feature matrix before filing a defect. Unsupported formats and shader routes should be gated by capabilities. Conversely, a renderer that advertises a capability owns its contract; silent fallback is not an excuse for a wrong image.

Graphics diagnostics reveal draw counts, primitive counts and binding changes. Debug labels and Headless trace exports can show command order even without pixels. External GPU debuggers are useful only after the CNA-level reproduction is stable.

When fixing shared code, rerun every renderer fixture, not only the backend that showed the bug. Coordinate normalization, render-target sampling and resource lifetime changes often affect several paths in opposite ways. Document the original image, root cause, test and verified backends so the next apparent difference is not rediscovered from scratch.

## A triage checklist

Confirm identical content and camera, then compare clear, viewport, target orientation, vertex stride, index type, winding, depth range, blend, sampler and shader dialect. Read one intermediate resource back rather than inferring everything from the final frame.

Classify the result as application misuse, capability mismatch, shared defect or backend defect and fix the owning layer. Never add a renderer-name branch for a convention CNA promises to normalize. A regression fixture must fail on the parent revision and pass with the fix.

## Reduce before guessing

Freeze time, random seeds and camera state, then replace the scene with the smallest failing draw. Use a constant-color shader and identity texture. If geometry is still wrong, inspect buffers, declarations, indices, transforms, viewport and culling. If geometry becomes correct, restore sampling, lighting and blending one stage at a time. This binary-search approach produces evidence instead of a pile of speculative state changes.

Render diagnostic values directly: red/green UV coordinates, encoded normals, linear depth, vertex color and texture mip level. Clear each intermediate target to an impossible color so untouched pixels are obvious. When supported, label resources and passes for the graphics debugger and capture exactly one representative frame.

## Compare data, not only screenshots

Log resource formats, dimensions, strides, binding slots and selected technique. Read back a tiny target or buffer at a defined synchronization point. Image differences should include absolute-error output and statistics; a flipped image, uniform channel swap and edge-only mismatch each point to different contracts.

Maintain a renderer matrix showing the first failing stage. Reproduce on debug validation layers where possible, but also test optimized builds because lifetime and synchronization errors can disappear under validation. After fixing the owner, run the fixture on every backend—including software or headless where relevant—and store enough metadata to reproduce hardware- or driver-specific failures later.

## The bug report should be executable

Record CNA revision, backend, adapter, driver, operating system, shader artifact and content hash. Include the smallest scene, expected image, actual image and difference image plus validation output. State whether failure survives resize, capture tools and an optimized build. If a workaround exists, describe which contract it bypasses. This package lets another developer reproduce the defect without the original game and prevents a driver-specific observation from becoming an unsupported global rule.

## Worked example: replace lighting with evidence

If a model is black on one backend, change the fragment output in steps:

```glsl
outputColor = vec4(1.0, 0.0, 1.0, 1.0);              // draw reached pixel stage
outputColor = vec4(uv, 0.0, 1.0);                    // UV and interpolation
outputColor = vec4(normalize(normal) * 0.5 + 0.5, 1); // normal/layout
outputColor = texture(albedoTexture, uv);             // texture binding
```

If constant color fails, inspect submission, target, viewport, culling and depth. If UV fails, inspect attribute locations and stride. If normals fail, inspect format and matrices. If only sampling fails, inspect binding, lifetime, sampler and color space. Restore one stage at a time.

Log a structured draw record: target size/format, viewport, scissor, vertex stride, index type/count, effect language, blend/depth/cull state and every texture's dimensions and color space. Compare records before comparing screenshots.

Then capture intermediate targets and generate an absolute-difference image plus per-channel statistics. A flip, channel swap and edge-only mismatch point to distinct contracts. After the fix, preserve the minimized scene as a cross-renderer regression test and remove renderer-name workarounds for behavior CNA promises to normalize.

## Synchronization and lifetime bugs

Not every visual defect is shader math. Flickering after several frames, corruption that disappears under a capture tool, or a texture that shows content from another object often indicates resource lifetime or missing synchronization. Give resources stable debug names, log creation/submission/retirement IDs, and delay native destruction until the backend confirms all referencing work completed.

Readback must occur after the producing pass and with the format's row pitch and channel layout understood. A CPU comparison of mapped bytes before completion diagnoses the test harness, not the renderer. Conversely, an unconditional device-idle wait can hide real ownership bugs and make performance meaningless; use it only to isolate the problem, then implement correct fences.

Validation layers and debug contexts provide evidence but are not proof. Run them first and treat warnings as defects. Then reproduce in optimized builds without tools, on at least one other driver, and after repeated resize or scene reload. Record whether a capture changes the outcome.

## Closing a graphics defect

The report closes only when the first incorrect contract is identified, the owning layer is fixed, a minimized regression fails before and passes after, and the whole renderer matrix remains green. Include accepted numeric tolerance with a reason. “Looks correct on my GPU” is an observation; the fixture, state record and cross-backend result are the evidence.
