---
title: Golden Images and Cross-renderer Pixel Testing
date: 2028-01-27T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Turn CNA renderer parity into deterministic fixtures, pixel oracles, difference images and actionable CI artifacts.
author: Robert Vokac
categories: [Development]
tags: [CNA, Golden Images, Pixel Tests, CI, Renderer Testing]
draft: false
---

A full-game screenshot is useful but ambiguous. A good pixel fixture proves one contract with fixed content, dimensions, camera, state and expected output.

```cpp
device.SetRenderTarget(&target);
device.Clear(Color::Magenta);
DrawFixture();
device.SetRenderTarget(nullptr);

std::vector<Color> pixels(width * height);
target.GetData(pixels);
CompareWithGolden(pixels, "alpha-premultiplied", tolerance);
```

Read only after production completes and account for row pitch/orientation in the backend path. Save actual and difference images on failure.

## Exact versus tolerant comparisons

Use exact bytes for clears, point-sampled sprites and integer-like operations. Interpolation, transcendental shader math or different legal precision can require tolerance. Define per-channel absolute/relative limits and maximum failing-pixel fraction per fixture—never one generous global threshold.

Also assert known probe pixels and image statistics. A tolerance should not allow an entire one-pixel-shifted edge.

## Fixture design

Use asymmetric textures, odd target sizes, noncentral origins and deliberately different channels. Separate blend, depth, scissor, sampler, target orientation, vertex layout and shader binding fixtures. A failure name should identify the first suspected subsystem.

Record CNA revision, renderer, adapter/driver, OS, format, selected shader language and capability profile. Compare only contracts both renderers claim. Unsupported features should skip/refuse explicitly, not generate a golden of a fallback nobody requested.

## CI artifacts and review

CI publishes expected, actual, absolute-difference, logs and metadata. Updating a golden requires human review of why pixels changed and should be isolated from functional changes. Preserve historical fixture inputs so a backend regression can be bisected.

Run software/headless where meaningful plus real GPU jobs. Include optimized builds and periodic driver/hardware qualification. Golden tests do not replace validation layers or numeric unit tests; they connect API behavior to final pixels and make cross-renderer parity visible.

## Building a comparator

Normalize readback into canonical top-left RGBA8 or a documented floating representation before comparison. Format conversion belongs to test infrastructure and has its own unit tests. Preserve raw readback when conversion itself is suspected.

```cpp
struct PixelTolerance {
    int maxChannelDelta = 0;
    std::size_t maxDifferentPixels = 0;
    double maxMeanAbsoluteError = 0.0;
};

Comparison Compare(std::span<const Color> expected,
                   std::span<const Color> actual,
                   PixelTolerance tolerance);
```

Report first failing coordinate, worst delta, differing pixel count and mean/max error. Difference PNG maps zero error to black and amplifies nonzero channels visibly. Include an overlay or blink pair for human review.

## Avoid fragile goldens

Fix target size, clear, viewport, camera, seed, animation time, content bytes, shader variant, blend/sampler/depth/rasterizer and draw order. Disable timestamps and nondeterministic labels. Do not create a golden from a frame that depends on system font rendering or driver-specific antialiasing unless that variability is the feature being tested.

Prefer 8×8 or 32×32 fixtures to enormous screenshots. Add probe assertions explaining regions. A fixture named `linear-clamp-half-texel` with four source colors is easier to repair than `whole-game-menu`.

## Baseline workflow

Goldens are reviewed source artifacts. A change request includes before, after, difference and explanation tied to a contract. Never auto-accept on CI. When the intended result changes, update all qualified backends together or document why capability-specific baselines differ.

Store metadata beside the image: fixture schema, dimensions, color space and tolerance. Do not include one GPU driver as part of the semantic filename unless the test intentionally tracks driver behavior.

## CI tiers

Run CPU/headless exact fixtures on every change, one available GPU family in ordinary CI, and the full renderer/hardware matrix periodically or before release. A skipped capability is visible and bounded. Retain artifacts for flaky failures long enough to compare history.

Before closing a renderer defect, prove the new fixture fails at the parent commit and passes after the fix. That rule prevents tests that merely record current behavior without guarding the regression.

## Color and alpha correctness

State whether canonical bytes are linear or sRGB-encoded and whether alpha premultiplied. Do not compare screenshots after an image library silently applies profiles/gamma differently. Test comparator with known synthetic pixels and preserve alpha in PNG/diffs.

HDR/float targets need numeric readback fixtures before display tone mapping. Compare finite values/ranges and small arrays; a tone-mapped golden can hide NaN/negative/energy errors. Depth, normals and IDs use semantic numeric assertions rather than pretending they are colors.

## Flake prevention

Wait through correct fence/readback contract, not arbitrary sleeps. Fix seeds/time and remove asynchronous asset races. If failure varies by driver, retain metadata/artifacts and investigate; do not widen tolerance until it passes. Track per-fixture runtime and keep suite bounded so developers run it locally.

A useful test README explains how to reproduce one fixture/renderer, view diffs and intentionally approve baseline. Ease of diagnosis determines whether golden tests remain trusted or are habitually bypassed.
