---
title: 2D Rendering in CNA
date: 2027-06-24T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build efficient CNA 2D scenes with SpriteBatch, textures, fonts, transforms, blending and explicit render state.
author: Robert Vokac
categories: [Development]
tags: [CNA, 2D, SpriteBatch, Graphics]
draft: false
---

`SpriteBatch` is CNA's central 2D tool. A frame begins with `Begin`, submits sprites or text through `Draw` calls, and finishes with `End`. The simple shape hides meaningful choices about sorting, blending, sampling and transforms.

```cpp
spriteBatch.Begin(SpriteSortMode::Deferred,
                  BlendState::AlphaBlend,
                  SamplerState::PointClamp);
spriteBatch.Draw(texture, destination, Color::White);
spriteBatch.End();
```

Use point sampling for pixel art and linear sampling for smoothly scaled artwork. Clamp prevents atlas edges from wrapping; choose wrap only when the texture is intentionally tiled. Premultiplied alpha is the XNA default, so asset processing and blend state must agree.

## Batching and order

`Deferred` preserves submission semantics while batching at `End`. Texture sorting can reduce binds but may change overlap order. Front-to-back and back-to-front require meaningful layer depths. Measure before changing modes: fewer texture changes are useful only if the picture remains correct.

Atlas related sprites, avoid beginning and ending for every object, and keep state changes between coherent passes. A camera transform supplied to `Begin` can move the world while a second batch draws screen-space UI. Restore scissor, blend and render-target state when custom passes intervene.

`SpriteFont` uses the same pipeline. Cache layout where appropriate, but remember that localized strings and DPI scaling change dimensions. Keep important UI inside safe bounds and test narrow windows.

For lighting, minimaps or post-processing, draw a 2D scene into `RenderTarget2D`, unbind it, then composite its texture. Never sample a target while it remains bound for writing. Decide whether the HUD belongs inside the processed scene or after it.

Track sprites, draw calls, texture switches and target changes with CNA diagnostics. The fastest 2D optimization is often organizational: a stable atlas, fewer pass boundaries and no accidental per-frame resource creation.

## Coordinates, clipping and lifetime

Choose whether positions use source pixels, virtual units or drawable pixels and convert at one boundary. Round pixel-art destinations after the camera transform to prevent shimmering. Use scissor rectangles for scrollable UI, then restore rasterizer state after the clipped batch.

Textures and fonts belong to `ContentManager` or another explicit owner. Do not dispose shared content from a borrowing screen. Tests should cover negative scale, rotated origins, cropped sources, transparent overlap, font baselines and atlas edges under point and linear sampling.

## Cameras, atlases and nine-slice UI

A practical 2D camera stores position, zoom and rotation and produces one matrix passed to the world batch. Convert pointer input with the inverse matrix before hit testing. Keep the HUD in a second screen-space batch, otherwise camera zoom also enlarges menus and mouse coordinates no longer match buttons.

Texture atlases reduce switches, but require padding. Linear filtering can sample a neighboring sprite, especially when scaled or rotated, so duplicate border texels and keep source rectangles inside the padded region. For resizable panels, use nine-slice drawing: four fixed corners, four stretched edges and one stretched or tiled center. This preserves crisp borders across languages and aspect ratios.

## Transparency and render passes

Decide whether art is premultiplied during content processing. Dark fringes around sprites usually mean straight-alpha pixels are being drawn with premultiplied blending, or vice versa. Add a fixture over both light and dark backgrounds because the mismatch can hide over one of them.

Structure a frame as named passes: background, opaque world, transparent world, particles, post-processing and UI. Each pass declares its blend, sampler, transform and target. This makes it obvious where ordering matters and prevents a custom primitive renderer from leaking depth or rasterizer state into `SpriteBatch`.

For performance, inspect batch breaks before reducing visual quality. Frequent changes of texture, sampler, blend or scissor can dominate thousands of tiny sprites. An overlay with sprite count, batch count and texture changes tells whether atlas work will help. Verify optimization with the same crowded scene and preserve pixel output with screenshots.

## A useful 2D test scene

Keep one dense fixture containing pixel art at several zooms, rotated translucent sprites, overlapping layers, atlas borders, clipped scrolling text, nine-slice panels and a world-space camera beside screen-space UI. Run it at narrow, wide and high-DPI sizes with point and linear sampling. Capture both the final frame and batch counters. This single scene does not replace focused tests, but it catches accidental state leakage and scaling regressions before they reach a real level.

## Worked example: world camera plus fixed UI

Build one camera matrix and use a second batch for the HUD:

```cpp
Matrix Camera2D::MatrixFor(Vector2 center) const
{
    return Matrix::CreateTranslation(-position_.X, -position_.Y, 0.0f)
         * Matrix::CreateRotationZ(-rotation_)
         * Matrix::CreateScale(zoom_, zoom_, 1.0f)
         * Matrix::CreateTranslation(center.X, center.Y, 0.0f);
}

spriteBatch.Begin(SpriteSortMode::Deferred, BlendState::AlphaBlend,
                  SamplerState::PointClamp, nullptr, nullptr, nullptr,
                  worldCamera.MatrixFor(viewportCenter));
DrawWorld(spriteBatch);
spriteBatch.End();

spriteBatch.Begin(SpriteSortMode::Deferred, BlendState::AlphaBlend,
                  SamplerState::LinearClamp);
DrawHud(spriteBatch);
spriteBatch.End();
```

Use the exact overload in your CNA revision. Hit-test world objects by transforming the pointer with the inverse camera matrix. Round final pixel-art translation in drawable pixels to prevent shimmer.

Draw atlas sprites with an explicit source rectangle, origin, effects and depth. Duplicate border texels around atlas entries or linear sampling will bleed neighboring art. Premultiplied content belongs with `AlphaBlend`; validate transparent edges over black, white and a saturated color.

For nine-slice UI, derive nine destinations from fixed corner sizes and a stretchable center. Clamp the center when a panel is smaller than its borders. Test localized long text, maximum UI scale and narrow windows—the cases where a panel that looked correct in English usually fails.

## Sorting, clipping and ownership in a real frame

Use `Deferred` when submission order expresses overlap and no measurement proves another mode better. Texture sorting reduces binds but can reorder transparent sprites. Depth sorting works only when every draw receives a meaningful layer value. Divide fundamentally different work into explicit passes instead of searching for one sort mode that handles world, particles and UI.

Scrollable UI needs a scissor rectangle and a rasterizer state with scissoring enabled. Intersect nested clips rather than replacing the parent clip. Save or explicitly restore viewport, rasterizer and scissor before the next pass. A common symptom of leaked state is a HUD that disappears only after opening one particular inventory panel.

Content owns textures loaded through its manager. A screen borrowing an atlas must not dispose it. Runtime-created targets and dynamic textures need an explicit owner that releases them before the graphics device. Never allocate a temporary texture, `SpriteBatch` or font layout object inside every draw unless profiling proves its cost irrelevant and its lifetime intentional.

## 2D release checklist

Capture the same scene at native, fractional high-DPI and ultrawide sizes. Test point and linear samplers, premultiplied alpha, mirrored sprites, rotation around a noncentral origin, negative coordinates, source rectangles at atlas borders, nested scissor regions, non-ASCII text and a render-target composite. Record sprite count, batch breaks, texture switches and target changes. If an optimization changes pixels, determine why before accepting the new image as “close enough.”
