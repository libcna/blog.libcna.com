---
title: ASCII and CRT Effects
date: 2027-04-08T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  CNA's optional graphics extensions can turn a completed scene into a colored glyph grid or emulate scanlines, RGB masks, curvature and vignette on a CRT display.
author: Robert Vokac
categories:
  - Development
tags:
  - CNA
  - C++23
  - ASCII Art
  - CRT
  - Post-processing
  - Graphics
draft: false
---

Retro presentation is most useful when it is independent of the scene that produced it. CNA's optional graphics extensions include two complementary post-processes: `AsciiPostProcessEffect` rebuilds an image as a grid of glyphs, while `CRTEffect` emulates characteristics of a period display.

Both operate after the game has drawn its scene. That means the same effect can be used with sprites, a 3D world or a mixture of both, without replacing the application's renderer.

Enable the extension module with `-DCNA_CNAEXT=ON` and link the graphics extension target used by the CNA package.

## ASCII is now an effect

An older CNA experiment exposed ASCII as a renderer decorator tied to SDL and a limited 2D path. The current `AsciiPostProcessEffect` replaces that design. It accepts any completed `Texture2D`, including a `RenderTarget2D` containing an entire 3D scene.

```cpp
CNA::Graphics::AsciiPostProcessEffect ascii(device);
ascii.setQuantizeMode(CNA::Graphics::AsciiQuantizeMode::Color);
ascii.setCellSize(8, 8);

device.SetRenderTarget(&sceneTarget);
DrawWorld(gameTime);

device.SetRenderTarget(nullptr);
ascii.Draw(sceneTarget);
```

The cell dimensions determine the glyph grid. `BlackWhite` mode maps brightness to characters; `Color` mode also preserves representative cell colors. The effect can fill the current viewport or a supplied destination rectangle.

Its first portable implementation is deliberately CPU-based. Each draw reads the source pixels, quantizes them into cells, and rebuilds the glyph quads through `SpriteBatch`. That lets the effect work with software and non-shader renderers, but makes it a stylization pass rather than a free conversion. Larger cells and a lower-resolution intermediate target reduce the readback and grid cost substantially.

## Tuning the glyph image

Cell size is both an artistic and performance control. Small cells retain outlines and facial detail but produce many glyph quads; large cells create a stronger text-mode identity and reduce work. Because terminal-style characters are usually taller than they are wide, numerically equal cell dimensions are not always visually square. Tune them against the actual font atlas and output resolution.

Contrast before quantization matters more than adding detail afterward. A scene with clear value separation produces a readable glyph silhouette, while differently colored objects of nearly equal brightness may merge in black-and-white mode. Color mode can preserve their identity, but it still benefits from simple lighting and uncluttered backgrounds.

HUD treatment is a design choice. Rendering the interface into `sceneTarget` makes it part of the ASCII world. Drawing the HUD after `ascii.Draw()` leaves text and icons crisp. Separate targets can apply the effect selectively while keeping accessibility prompts untouched.

Since the first version reads pixels back to the CPU, profile the complete pass on the target backend. Readback differs between a software framebuffer and a discrete GPU. Updating at a lower cadence or quantizing a smaller target can be more valuable than micro-optimizing the glyph draw itself.

The effect is not the same feature as CNA's Terminal platform. The Terminal backend presents an application through ANSI output and terminal input. `AsciiPostProcessEffect` draws glyphs into a normal CNA graphics surface and can appear in a desktop window, browser canvas, screenshot or another render target.

## A complete CRT pass

`CRTEffect` is a portable `ShaderEffect` with four independently adjustable components:

- alternating scanline darkening;
- an RGB aperture-grille or shadow-mask pattern;
- mild barrel curvature;
- a corner vignette.

The defaults are intentionally moderate: scanline intensity `0.3`, curvature `0.08`, vignette `0.25` and mask intensity `0.35`. Every scalar is clamped to the range from zero to one. `CRTMaskType` selects `None`, `ApertureGrille` or `ShadowMask`.

```cpp
CNA::Graphics::CRTEffect crt(device);
crt.setScanlineIntensity(0.38f);
crt.setCurvature(0.06f);
crt.setVignetteIntensity(0.22f);
crt.setMaskType(CNA::Graphics::CRTMaskType::ShadowMask);
crt.setMaskIntensity(0.30f);
```

The built-in effect package supplies GLSL for OpenGL-family backends, SPIR-V for SDL_GPU and WGSL for WebGPU. On a backend without the required custom-shader capability, applications should query capabilities and skip the effect rather than assuming it can run.

## Render once, process once

A CRT pass must receive the whole final image as one full-screen quad:

```text
scene draws → RenderTarget2D → one full-screen CRT draw → backbuffer
```

Curvature and vignette use the quad's texture coordinates as screen position. Applying the effect independently to every sprite would give every sprite its own tiny curved screen and dark corners. Render the scene without the CRT effect, restore the backbuffer, bind the effect, and draw the scene texture once.

Render-target orientation is normalized by CNA, so application code does not add renderer-specific vertical flips. The same full-screen pass structure also makes effect order explicit.

Scanlines and masks are tied to final pixels, so dynamic resolution deserves attention. If the CRT pass runs before an additional scale, its one-pixel pattern can blur or beat against the display grid. In most pipelines CRT should be the final graphical pass, with only overlays that intentionally remain unaffected drawn afterward.

## Combining the looks

ASCII and CRT answer different questions. ASCII changes image representation; CRT changes display character. A game can use either independently or chain intermediate render targets:

```text
3D/2D scene
    ↓
ASCII quantization
    ↓
CRT scanlines, mask and curvature
    ↓
backbuffer
```

The same pattern works with CNA's `DepthEffect`: scene to depth-reduced target, then CRT, then the backbuffer. Each stage owns one concern, which keeps parameters predictable and avoids a single shader with every retro option tangled together.

For a crisp character grid, render at a resolution divisible by the ASCII cell dimensions and use a stable scaling policy. For an authentic CRT impression, tune at the final output size because scanline and mask patterns operate in screen pixels. Very high mask intensity can destroy fine text, while excessive curvature wastes the outer image; subtle values usually survive a wider range of displays.

These effects demonstrate the value of making presentation a final pass. The game remains ordinary CNA code, the scene can be tested before stylization, and a different visual identity becomes a configuration choice rather than a renderer rewrite.

## Testing a stylized pipeline

Keep at least one screenshot of the scene before post-processing and one after it. The first catches changes in geometry, lighting and content; the second catches shader packages, quantization, render-target orientation and effect parameters. A final screenshot alone can hide a scene regression behind heavy stylization.

Automated pixel tests should fix the renderer, output size, cell dimensions and all CRT values. For manual review, also try an odd resolution and a resized window: edge cells, destination rectangles and curvature are where coordinate errors tend to appear. Finally, test every intended graphics backend. CNA supplies several shader dialects, but equivalent shader source still needs evidence that sampling and screen coordinates agree.
