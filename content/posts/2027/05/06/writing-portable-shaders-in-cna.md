---
title: Writing Portable Shaders in CNA
date: 2027-05-06T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build a CNA ShaderEffect package for OpenGL, SDL_GPU and WebGPU without confusing portable source shaders with compiled XNA effects.
author: Robert Vokac
categories: [Development]
tags: [CNA, Shaders, GLSL, SPIR-V, WGSL]
draft: false
---

CNA supports two different effect routes. Compiled XNA `.fx` bytecode preserves the historical content format on compatible renderers. `ShaderEffect` is the CNA extension for new source-level shaders. They solve different problems and should not be presented as interchangeable files.

A portable `ShaderEffect` packages a variant for each intended backend: GLSL for the OpenGL family, SPIR-V for SDL_GPU and WGSL for WebGPU. The C++ class owns semantic parameters and chooses the correct package through the graphics device.

Keep the public effect API backend-neutral:

```cpp
class HeatEffect final : public ShaderEffect
{
public:
    explicit HeatEffect(GraphicsDevice& device);
    void setTime(float value);
    void setDistortion(float value);
protected:
    void OnApply() override;
};
```

`OnApply()` uploads current values; game code should never know the binding number used by one renderer. Agree on uniform layout, sampler order, coordinate convention and color space across every shader variant. SDL_GPU layout rules deserve particular attention because a shader that compiles can still read the wrong offsets.

## Design for capability differences

Query renderer capabilities before enabling the effect. A software or headless renderer may not execute custom GPU shaders. Provide an intentional fallback—skip the cosmetic pass, select a stock effect or use a CPU implementation—instead of treating an unsupported shader as a mysterious black frame.

Render a small deterministic fixture for each variant. Include a non-square texture, asymmetric colors and coordinates near every edge; symmetrical test pictures hide flips and binding mistakes. Compare results with a documented tolerance, not by eye alone.

Use a render target for full-screen effects and draw the completed scene once. Applying screen-coordinate effects per sprite changes their meaning and multiplies state work. Restore render targets, viewport and blend state explicitly so the next pass does not inherit accidental configuration.

Finally, keep shader packages versioned beside their C++ wrapper. A parameter rename must update GLSL, SPIR-V generation, WGSL, tests and documentation together. Portable shaders are not “write once”; they are one effect contract implemented and verified several times.

## Parameter and resource discipline

Define one table for every parameter: C++ name, shader name, type, default and update frequency. Frame constants such as time and camera matrices should not be rebuilt for every sprite, while object constants must change before each draw. Texture and sampler slots are distinct resources on some backends; document both instead of relying on the OpenGL binding model.

Matrices deserve a dedicated fixture. Upload identity, translation and a deliberately asymmetric projection, then compare known vertices. This catches transpose and multiplication-order errors before they become a distorted scene. Decide whether every color input is linear or sRGB and never repair a mismatch by tuning only one shader variant.

Preserve compiler diagnostics and generated SPIR-V as build artifacts. At runtime, report the selected dialect and effect name when creation fails. Hot reload improves iteration, but a release must use the validated package. When adding a backend, begin with flat color, then add sampling, uniforms and optional features separately so the first broken contract is obvious.

## A repeatable shader workflow

Keep every shader beside a tiny scene that proves its contract. The scene should exercise each technique, vertex layout, texture slot and important parameter; a shader tested only through a large game is unnecessarily hard to diagnose. Compile assets during the build, record the compiler version, and fail when a required backend artifact is absent. Never substitute an old binary left in the output directory.

Resolve techniques and parameters once during loading instead of performing string lookup for every draw. Separate camera, material and object updates: view and projection usually change per camera, material data per batch, and world transforms per object. This makes redundant state visible and maps cleanly onto backends with different constant-buffer strategies.

When output differs, reduce it methodically. Replace the pixel stage with a constant color, then visualize UVs, normals and depth. Disable fog, lighting and branches one feature at a time. If constant color is wrong, investigate geometry, declarations and transforms. If only sampling is wrong, inspect resource slots, sampler state, color space and texture orientation.

Portable does not mean permanently restricted to the weakest device. Maintain a dependable baseline technique and explicit enhanced techniques for extra lights or normal mapping. Choose them from advertised capabilities, not renderer names. The game then has a documented fallback rather than backend-specific accidents.

## Worked example: a portable tint effect

Let us build something small enough to understand completely: a SpriteBatch effect that multiplies a texture by a tint. The effect needs a vertex and fragment stage, one sampled 2D texture and one `vec4` parameter. Start with the GLSL ES variant because its inputs make the contract easy to see:

```glsl
// tint.vert.glsl — GLSL ES 3.0
#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;
layout(location = 2) in vec4 aColor;

uniform mat4 uMatrix;
out vec2 vTexCoord;
out vec4 vColor;

void main()
{
    gl_Position = uMatrix * vec4(aPosition, 0.0, 1.0);
    vTexCoord = aTexCoord;
    vColor = aColor;
}
```

```glsl
// tint.frag.glsl — GLSL ES 3.0
#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec4 vColor;
uniform sampler2D uTexture;
uniform vec4 uTint;
out vec4 fragColor;

void main()
{
    fragColor = texture(uTexture, vTexCoord) * vColor * uTint;
}
```

The important part is not the multiplication. It is the interface: locations 0–2, matrix name, texture unit and tint type are now a contract. The desktop GLSL, Vulkan GLSL/SPIR-V and WGSL versions must implement that same meaning even when their syntax and binding declarations differ.

For SDL_GPU source GLSL, follow CNA's documented descriptor layout. SpriteBatch's own 2D texture may use portable set 0/binding 0; native SDL_GPU fragment samplers occupy set 2. The per-draw uniform block is a 128-byte `std140` block. A shader that merely declares `uniform vec4 uTint` can compile on OpenGL but is not automatically a valid SDL_GPU layout. This is why the package contains real backend variants instead of relabeling one source string.

## Put the variants into `ShaderPackageEXT`

With `CNA_CNAEXT` enabled, describe every payload with its real language, stage, entry point and diagnostic label. Text languages use strings; SPIR-V uses a byte vector whose size is a multiple of four.

```cpp
#include "CNA/Graphics/ShaderCodeEXT.hpp"
#include "CNA/Graphics/ShaderPackageEXT.hpp"
#include "CNA/ShaderLanguageEXT.hpp"
#include "CNA/ShaderStageEXT.hpp"
#include "Microsoft/Xna/Framework/Graphics/ShaderEffect.hpp"

using CNA::Graphics::ShaderCodeEXT;
using CNA::Graphics::ShaderPackageEXT;
using CNA::ShaderLanguageEXT;
using CNA::ShaderStageEXT;
using Microsoft::Xna::Framework::Graphics::GraphicsDevice;
using Microsoft::Xna::Framework::Graphics::ShaderEffect;

ShaderPackageEXT MakeTintPackage(
    std::string glslEsVertex,
    std::string glslEsFragment,
    std::string wgslVertex,
    std::string wgslFragment,
    std::vector<std::uint8_t> spirvVertex,
    std::vector<std::uint8_t> spirvFragment)
{
    std::vector<ShaderCodeEXT> variants;
    variants.emplace_back(ShaderLanguageEXT::GlslEs,
        ShaderStageEXT::Vertex, "main", "tint.vert.glsl", glslEsVertex);
    variants.emplace_back(ShaderLanguageEXT::GlslEs,
        ShaderStageEXT::Fragment, "main", "tint.frag.glsl", glslEsFragment);
    variants.emplace_back(ShaderLanguageEXT::Wgsl,
        ShaderStageEXT::Vertex, "vs_main", "tint.wgsl", wgslVertex);
    variants.emplace_back(ShaderLanguageEXT::Wgsl,
        ShaderStageEXT::Fragment, "fs_main", "tint.wgsl", wgslFragment);
    variants.emplace_back(ShaderLanguageEXT::SpirV,
        ShaderStageEXT::Vertex, "main", "tint.vert.spv", spirvVertex);
    variants.emplace_back(ShaderLanguageEXT::SpirV,
        ShaderStageEXT::Fragment, "main", "tint.frag.spv", spirvFragment);

    return ShaderPackageEXT(
        std::move(variants),
        {ShaderStageEXT::Vertex, ShaderStageEXT::Fragment});
}
```

The package selector chooses one *complete* language pair supported by the live device. It does not combine a WGSL vertex stage with a GLSL fragment stage. Binary formats are preferred in CNA's deterministic selection order. If no complete pair is usable, construction reports the considered variants and refusal reasons.

Create the effect once during loading and fail with its real diagnostic:

```cpp
auto package = MakeTintPackage(
    ReadText("shaders/tint.vert.glsl"),
    ReadText("shaders/tint.frag.glsl"),
    ReadText("shaders/tint.wgsl"),
    ReadText("shaders/tint.wgsl"),
    ReadBytes("shaders/tint.vert.spv"),
    ReadBytes("shaders/tint.frag.spv"));

auto tintEffect = std::make_unique<ShaderEffect>(graphicsDevice, package);
if (!tintEffect->IsEffectValid())
    throw std::runtime_error(tintEffect->GetCompileErrorEXT());
```

Keep source labels meaningful. `GetShaderDiagnosticsEXT()` can then point to `tint.frag.glsl` and a source location instead of reporting an anonymous failed string.

## Wrap raw uniforms behind a game-facing class

Game code should not scatter `SetUniformVec4("uTint", ...)` throughout rendering. A small wrapper gives the parameter a type and one update point:

```cpp
class TintEffect final : public ShaderEffect
{
public:
    TintEffect(GraphicsDevice& device, const ShaderPackageEXT& package)
        : ShaderEffect(device, package) {}

    void SetTint(float r, float g, float b, float a)
    {
        tint_ = {r, g, b, a};
    }

protected:
    void OnApply() override
    {
        ShaderEffect::OnApply();
        SetUniformVec4("uTint", tint_[0], tint_[1], tint_[2], tint_[3]);
    }

private:
    std::array<float, 4> tint_{1.0f, 1.0f, 1.0f, 1.0f};
};
```

Use it like any effect passed to SpriteBatch:

```cpp
tintEffect.SetTint(1.0f, 0.65f, 0.35f, 1.0f);
spriteBatch.Begin(SpriteSortMode::Immediate,
                  BlendState::AlphaBlend,
                  SamplerState::LinearClamp,
                  nullptr, nullptr,
                  &tintEffect);
spriteBatch.Draw(texture, destination, Color::White);
spriteBatch.End();
```

Use the exact `SpriteBatch::Begin` overload present in the CNA revision you build against; the essential rule is that the same effect object receives parameters before its pass is applied. For additional textures, bind them with `SetTexture(unit, texture)` and declare the matching 2D, cube or 3D binding in the package.

## Compile SPIR-V reproducibly

Do not compile production shaders by hand and commit an unexplained binary. Make the compiler invocation part of the build. One possible CMake shape is:

```cmake
find_program(GLSLANG_VALIDATOR glslangValidator REQUIRED)

add_custom_command(
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/tint.vert.spv
    COMMAND ${GLSLANG_VALIDATOR} -V
            ${CMAKE_CURRENT_SOURCE_DIR}/shaders/tint.vert.vk.glsl
            -o ${CMAKE_CURRENT_BINARY_DIR}/tint.vert.spv
    DEPENDS shaders/tint.vert.vk.glsl
    VERBATIM)

add_custom_command(
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/tint.frag.spv
    COMMAND ${GLSLANG_VALIDATOR} -V
            ${CMAKE_CURRENT_SOURCE_DIR}/shaders/tint.frag.vk.glsl
            -o ${CMAKE_CURRENT_BINARY_DIR}/tint.frag.spv
    DEPENDS shaders/tint.frag.vk.glsl
    VERBATIM)
```

Pin or record the compiler version in release artifacts. Validate SPIR-V during the build, and copy every selected variant beside the executable or embed it through one deterministic generated source. A stale fragment binary combined with a new C++ wrapper is a package error even if both files individually compile.

## Prove the effect is portable

Render a 4×4 test texture whose corners are red, green, blue and white into a small target. Draw it at a non-square size with a tint such as `(0.5, 0.75, 1.0, 1.0)`. Read the target back and check known pixels. The asymmetric source exposes flips; the non-neutral tint proves the uniform was uploaded; alpha over a contrasting clear color proves the blend contract.

Run that fixture for every renderer/language combination you publish. Store:

- selected shader language and source labels;
- renderer, adapter and driver identity;
- compiler diagnostics, even warnings;
- the actual image and a difference image;
- exact or tolerance-based comparison rules.

If OpenGL passes and SDL_GPU fails, first check descriptor sets and `std140` offsets. If WebGPU alone fails, inspect WGSL entry points and resource groups. If every backend produces the same wrong tint, the shared wrapper or expected image is probably wrong. This is the level at which a “portable shader” becomes an engineering claim rather than a filename.
