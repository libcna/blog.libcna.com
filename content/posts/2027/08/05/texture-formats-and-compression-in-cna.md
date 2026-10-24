---
title: Texture Formats and Compression in CNA
date: 2027-08-05T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Select CNA texture formats by data meaning, renderer support and memory cost instead of assuming every backend accepts every SurfaceFormat.
author: Robert Vokac
categories: [Development]
tags: [CNA, Textures, Compression, SurfaceFormat]
draft: false
---

A texture format describes more than bytes per pixel. It determines channel layout, numeric interpretation, color space, compression blocks and which renderer can upload or render into the resource. CNA preserves XNA's `SurfaceFormat` values and adds documented extensions, but support remains backend-specific.

Use ordinary `Color` RGBA8 for the broadest path. Treat sRGB color textures differently from linear data such as normals, roughness or masks. Half and floating formats are useful for HDR and calculations only where the renderer advertises them.

Block-compressed DXT/BC formats reduce memory and bandwidth when natively supported. Dimensions, mip levels and upload size must follow the block rules. Some CNA paths can decode a compressed stream to RGBA8 as a compatibility fallback; that makes the image work but loses the VRAM advantage and must not be reported as native compression.

## Files are not surface formats

PNG, JPEG and GIF are encoded file containers accepted by `Texture2D::FromStream` through signature detection. They decode into a runtime surface. DDS can carry compressed mip levels through its explicit extension path. Do not choose runtime upload behavior from a filename suffix alone.

Calculate every mip level and validate data length before `SetData`. A mipmapped sampler on a single-level resource must still leave the texture complete. Readback and render-target support can differ from sampling support.

Consult CNA's surface-format matrix for the active renderer and fail early when a required format is absent. For optional assets, package a broadly supported fallback. Tests should verify channel order, alpha, sRGB intent, odd compressed dimensions, mip selection and round-trip stream decoding.

The right format is the smallest supported representation that preserves the data's meaning—not simply the most advanced enumerator available on the development GPU.

## Memory and pipeline choices

Calculate full mip chains, row pitch and block-rounded dimensions when estimating memory. File size is not VRAM size: PNG expands to a surface, while DDS stays compressed only on a native route. Record when a fallback decoded it.

Prefer build-time conversion. Runtime transcoding delays first use and raises peak memory. Test opaque color, alpha edges, normals, sRGB, cube faces and 3D slices on every claimed renderer.

## Select formats by content role

Classify every texture before choosing compression. UI and albedo need stable color and clean alpha; normal maps need vector fidelity; masks need predictable individual channels; HDR environments need range. A format that looks excellent on an opaque photograph may destroy a two-channel normal or create halos around a sprite. Keep that semantic role in content metadata so the pipeline, not a filename guess, makes the decision.

Mipmaps are part of the asset, not an optional afterthought. Generate them with filters appropriate to the data. Color can be averaged in linear space, normal vectors must be renormalized, and alpha-tested foliage may need coverage preservation. Cube faces must share orientation and seam treatment. Inspect several mip levels rather than judging only the largest image.

## Distribution and runtime validation

Desktop and mobile GPUs do not necessarily share one native compressed family. Build platform packages from common sources and choose a supported output for each target. If a portable container is transcoded at install or load time, measure startup cost and peak memory, cache the result safely, and provide an uncompressed fallback with an explicit budget.

Validate dimensions, mip count, array layers, cube layout and byte length before resource creation. Report both requested and actual format in diagnostics. Include representative assets in renderer tests: transparent UI, a smooth gradient, detailed normal map, packed masks, cube map and non-power-of-two texture. Compare memory estimates as well as pixels; an accidental RGBA fallback may look correct while quadrupling the budget.

## Asset-review checklist

For every texture family, record source color space, alpha convention, channel meanings, mip policy, target formats and fallback. Inspect alpha edges over contrasting backgrounds and normal maps under a rotating light. Compare top mip and distant mips, then capture actual GPU allocation rather than estimating from the source file size. A tiny compressed download can still expand into a large runtime resource. Keep source masters lossless so future platforms can be built without transcoding already damaged data.

## A practical format policy

Write the decision down as pipeline data rather than relying on artists to remember it:

```yaml
textures:
  ui/*:       { role: color-alpha, srgb: true,  mips: false, compression: lossless }
  world/*_bc: { role: base-color,  srgb: true,  mips: true,  compression: color }
  world/*_n:  { role: normal-xy,   srgb: false, mips: true,  compression: normal }
  world/*_orm:{ role: data-rgb,    srgb: false, mips: true,  compression: masks }
```

The build maps semantic compression classes to formats available on each target. A desktop package might choose one block format while a mobile package chooses another. If no suitable compressed format exists, use a known uncompressed fallback and include its memory in the budget.

Estimate complete mip memory, not only level zero. For an uncompressed 4096×4096 RGBA8 texture, level zero alone is 64 MiB; the full mip chain is roughly one third more. File size on disk says nothing about this allocation. Record actual format and dimensions from the created resource in diagnostics.

## Generate mips according to meaning

Average color in linear space. Renormalize normal vectors after filtering. Preserve alpha-test coverage for foliage, otherwise distant leaves disappear. For packed masks, filter channels independently according to their semantics. Never run a normal map through an sRGB transform.

Create a qualification sheet containing transparency gradients, hard alpha edges, a smooth color ramp, a normal sphere, packed masks, cube seams and non-power-of-two dimensions. View every mip under point and linear sampling and read back representative pixels. This catches both pipeline damage and renderer upload mistakes.

## Upload, row pitch and partial updates

Validate the byte size implied by width, height, depth, format, mip and array layer before calling the renderer. Compressed formats operate in blocks, so a small mip still consumes at least one block and update rectangles must obey backend alignment rules. Do not compute bytes as `width * height * 4` for every surface.

Source row pitch may exceed tightly packed pixel width. Copy row by row when required and preserve the API's documented orientation. A successful upload with a wrong pitch often produces diagonal tearing that resembles decoder corruption. Use a numbered grid fixture to make both pitch and vertical orientation obvious.

Dynamic texture updates should be bounded and measured. Updating a whole 4K atlas for one changed icon wastes bandwidth; update a valid region or rebuild at a controlled boundary. Keep staging memory alive until submission consumes it. For frequently changing data, consider a dedicated dynamic resource instead of mutating long-lived immutable content.

## Runtime refusal and diagnostics

At resource creation, report asset name, requested format, dimensions, mip/layer count, estimated bytes and the renderer's refusal. If a fallback occurs, record actual format and resulting memory. Never reinterpret compressed bytes as another format merely because block sizes match.

Test corrupt/truncated payloads, unsupported formats, minimum mip dimensions, cube face order, 3D slice order and recreation after device loss. Preserve lossless masters and deterministic pipeline settings, including compressor version, so artifacts can be rebuilt and compared when a new target format is introduced.
