---
title: FX support in CNA
date: 2026-12-24T18:45:36Z
updated: 2026-10-17T13:51:23Z
description: |
  CNA can load and execute compiled XNA/FNA Effect Framework binaries across six renderer families, while keeping legacy FX separate from ShaderEffect.
author: Robert Vokac
categories:
  - Development
tags:
  - DirectX
  - OpenGL
  - WebGPU
  - Graphics
  - XNB
  - SDL GPU
  - Software Rendering
  - FNA
  - XNA
  - FX
  - Effect
  - HLSL
  - FXB
  - MojoShader
  - ShaderEffect
originalUrl: https://blog.libcna.com/2026/12/24/fx-support-in-cna/
classicpressId: 134
classicpressStatus: future
draft: false
---

XNA 4.0 did not treat a shader as only a vertex program plus a pixel program.

Its main programmable-shader abstraction was the **Effect Framework**. Developers wrote an HLSL `.fx` file containing parameters, techniques, passes, shaders, annotations and state assignments. The XNA Content Pipeline compiled that source into a Direct3D 9 Effect Framework binary, usually stored inside an XNB asset.

CNA supports that model as a compatibility path:

```text
HLSL .fx
    │
    ▼
XNA-compatible FX compiler
    │
    ▼
Effect Framework binary
    │
    ├── standalone .fxb
    └── Effect payload inside XNB
            │
            ▼
           CNA
            │
            ▼
    renderer-specific execution
```

An XNA or FNA game can therefore retain its original custom effects instead of rewriting them all before the first correct frame can be rendered.

This path is deliberately separate from CNA's newer `ShaderEffect` API.

---

## Three different kinds of effect

The word **effect** refers to three related but different systems in CNA.

### Stock effects

The XNA-compatible stock types include:

```text
BasicEffect
AlphaTestEffect
DualTextureEffect
EnvironmentMapEffect
SkinnedEffect
```

CNA also provides modern framework effects such as:

```text
PbrEffect
SkinnedPbrEffect
```

These are portable framework APIs. Applications configure their properties, but do not supply an arbitrary Effect Framework program.

### Compiled XNA effects

This is the compatibility path described in this article.

The game supplies XNA/FNA Direct3D 9 Effect Framework bytecode and uses the familiar object model:

```text
Effect
EffectParameter
EffectTechnique
EffectPass
EffectAnnotation
```

CNA reconstructs the reflected object graph and executes the compiled shaders, pass state and sampler state.

### ShaderEffect

`CNAEXT::ShaderEffect` is for application-owned, backend-oriented shader packages such as GLSL, SPIR-V or WGSL source pairs.

It does not reinterpret those formats as XNA Effect Framework bytecode and does not add XNA techniques, annotations or pass-state semantics.

The two custom-shader capabilities are independent:

```cpp
device.SupportsCapability(CNA::GraphicsCapability::CompiledEffects);
device.SupportsCapability(CNA::GraphicsCapability::CustomEffects);
```

A renderer may support either one, both or neither. Stock effects require neither capability.

---

## What CNA accepts

The runtime contract is intentionally narrow and explicit.

| Input | Accepted | Route |
| --- | --- | --- |
| XNA/FNA Direct3D 9 Effect Framework binary (`.fxb`) | Yes | `Effect(GraphicsDevice&, byte[])` |
| XNA 4-wrapped Effect payload in XNB | Yes | `ContentManager` and `EffectReader` |
| HLSL `.fx` source | Build time only | CNA Content Pipeline plus an external compiler |
| MonoGame `MGFX` / `.mgfxo` | No | Different container and runtime contract |
| GLSL, SPIR-V or WGSL packages | Not through `Effect` | Use `CNAEXT::ShaderEffect` |

The accepted binary is the legacy Effect Framework format used by XNA and FNA, including XNA 4's outer wrapper. It can contain the original Direct3D 9-era Shader Model programs as well as the Effect object graph around them.

The runtime constructor never treats arbitrary text as HLSL source and never guesses whether an unknown blob might be MGFX.

---

## Loading compiled bytes

A standalone compiled effect can be created directly:

```cpp
#include "Microsoft/Xna/Framework/Graphics/Effect.hpp"

std::vector<SharpRuntime::bytecs> bytes =
    ReadAllBytes("Bloom.fxb");

Effect effect(device, bytes);
```

The constructor validates the input, creates the renderer-specific runtime, reconstructs reflection data and initially selects the first technique.

Applications should query the exact capability before choosing this path:

```cpp
if (!device.SupportsCapability(
        CNA::GraphicsCapability::CompiledEffects))
{
    // Select another renderer, use a stock effect or report the requirement.
}
```

An unsupported renderer throws `NotSupportedException`. Invalid or truncated bytecode produces an argument-related error instead, so a platform mismatch is distinguishable from corrupt content.

---

## Loading an Effect from XNB

CNA registers the canonical:

```text
Microsoft.Xna.Framework.Content.EffectReader
```

An original XNA asset can therefore be loaded through `ContentManager`:

```cpp
auto effect =
    content.Load<std::shared_ptr<Effect>>(
        "Effects/Bloom");
```

The reader:

- enforces the content allocation limit before allocating;
- requires an exact payload read;
- assigns the asset name;
- wraps construction failures in `ContentLoadException` while preserving the underlying diagnostic.

An XNB-loaded effect and a directly loaded `.fxb` use the same runtime and expose the same behavior.

---

## Reflection is part of compatibility

An XNA effect is not only shader bytecode. Games can inspect its object graph at runtime.

For example:

```cpp
for (int i = 0;
     i < effect.getParametersProperty().getCountProperty();
     ++i)
{
    const EffectParameter& parameter =
        effect.getParametersProperty()[i];

    parameter.getNameProperty();
    parameter.getSemanticProperty();
    parameter.getParameterClassProperty();
    parameter.getParameterTypeProperty();
    parameter.getRowCountProperty();
    parameter.getColumnCountProperty();
    parameter.getAnnotationsProperty();
    parameter.getElementsProperty();
    parameter.getStructureMembersProperty();
}
```

CNA preserves:

```text
parameter order and names
semantics
scalar, vector, matrix, object and structure classes
numeric and texture types
row and column counts
arrays and nested structures
annotations
techniques and passes
```

Name lookup returns `nullptr` for a parameter that the effect does not declare. Sampler and shader objects are not exposed as public parameters, matching XNA and FNA; a texture reaches a sampler through the reflected texture parameter referenced by that sampler.

Numeric storage keeps the Effect Framework's float4 register padding internally while getters and setters expose the logical XNA shape. A `float3` array therefore remains a `float3` array instead of leaking its register padding into game code.

---

## Setting parameters

The API follows the familiar XNA model:

```cpp
effect.getParametersProperty()["WorldViewProj"]
    ->SetValue(worldViewProjection);

effect.getParametersProperty()["Threshold"]
    ->SetValue(0.25f);

effect.getParametersProperty()["Weights"]
    ->SetValue(std::vector<float>{0.2f, 0.8f});

effect.getParametersProperty()["Texture"]
    ->SetValue(&texture);
```

Setters validate the reflected type and count. Array-element and structure-member views update their parent's storage rather than disconnected copies.

Mutable top-level parameters are dirty-tracked:

```text
SetValue(...)
    │
    ▼
parameter becomes dirty
    │
    ▼
next pass application uploads it
```

If nothing changed, CNA does not upload the same values again.

String parameters follow XNA 4.0 semantics. A string value is CPU-side reflection data, belongs to its `Effect` instance and is copied independently by `Clone()`.

---

## Techniques and exact pass selection

Compiled effects retain their real technique/pass structure:

```cpp
effect.setCurrentTechniqueProperty(
    effect.getTechniquesProperty()["Bloom"]);

for (auto& pass :
     effect.getCurrentTechniqueProperty()
           ->getPassesProperty())
{
    pass.Apply();

    device.DrawPrimitives(
        PrimitiveType::TriangleList,
        0,
        2);
}
```

`EffectPass::Apply()` applies the exact selected pass. It never collapses every request to pass zero.

For the base compiled `Effect`, `Effect::Apply()` means pass zero of `CurrentTechnique`. Subclasses still receive the `OnApply()` hook before the pass is applied.

Applying a pass performs more than shader selection. In order, CNA validates ownership, calls `OnApply()`, uploads dirty values and textures, selects the native technique and pass, translates its state assignments and selects the effect for subsequent draws.

---

## Pass state is real device state

An Effect Framework pass may assign:

```text
blend state
depth and stencil state
rasterizer state
texture bindings
sampler filtering
texture addressing
anisotropy
mipmap limits and LOD bias
```

CNA translates those assignments into its normal XNA-style device state. After `pass.Apply()`, the corresponding `GraphicsDevice` state objects and collections reflect the pass.

State groups that the pass does not assign remain untouched:

```text
before pass             after pass that changes blending only

BlendState A            BlendState changed by the effect
DepthStencilState B     DepthStencilState remains B
RasterizerState C       RasterizerState remains C
```

Unknown render-state or sampler-state tokens are rejected by name. CNA does not silently ignore them or publish a half-translated state group.

`Border` and `MirrorOnce` addressing are also refused because XNA 4.0's `SamplerState` cannot represent them.

---

## SpriteBatch and normal 3D draws

Compiled effects are not restricted to one drawing helper.

They work with ordinary buffered, user, indexed and non-indexed draws, including non-zero offsets. Multi-stream and instanced routes are exercised where the selected renderer advertises those underlying capabilities.

They also work with `SpriteBatch`:

```cpp
spriteBatch.Begin(
    SpriteSortMode::Immediate,
    nullptr,
    nullptr,
    nullptr,
    nullptr,
    &effect);

spriteBatch.Draw(texture, destination, Color::White);
spriteBatch.End();
```

Every pass runs at XNA's batch granularity. SpriteBatch reconnects the sprite texture to slot zero after applying the pass, matching FNA behavior, and preserves source rectangles and sprite flips.

The shared tests also cover compiled effects sampling render targets, switching between compiled and stock effects, inheriting a stock vertex stage from a pixel-only pass and alternating between effects and clones.

A renderer is not promoted to compiled-effect support merely because it can parse reflection metadata. The effect's own parameter must survive the real draw route and appear in the read-back pixel.

---

## Renderer support today

CNA currently exposes exactly ten renderer identities over eight implementation families.

Compiled FX is implemented by six families:

| Renderer identity | `CompiledEffects` | Build option |
| --- | --- | --- |
| `OPENGLES3` | True when included | `CNA_EASYGL_COMPILED_EFFECTS` |
| `OPENGL33` | True when included | `CNA_EASYGL_COMPILED_EFFECTS` |
| `WEBGL2` | True when included | `CNA_EASYGL_COMPILED_EFFECTS` |
| `WEBGPU` | True when included | `CNA_WEBGPU_COMPILED_EFFECTS` |
| `HEADLESS` | False | None |
| `SOFTWARE` | True when included | `CNA_SOFTWARE_COMPILED_EFFECTS` |
| `STUB` | False | None |
| `DIRECTX9` | True when included | `CNA_DIRECTX9_COMPILED_EFFECTS` |
| `SDL_GPU` | True when included | `CNA_SDL_GPU_COMPILED_EFFECTS` |
| `FNA3D` | True | Always included |

The five optional flags are off by default because they add MojoShader to renderer builds that do not otherwise need it. With a flag off, the renderer continues to work normally, reports `CompiledEffects == false` and explicitly refuses compiled Effect construction.

The capability describes the binary that is actually running, not what another build of the same renderer could support.

---

## How the six implementations execute FX

The public `Effect` API stays the same, but the last part of the route differs by renderer.

### FNA3D

FNA3D owns the mature MojoShader Effect Framework integration used by FNA:

```text
XNA Effect Framework binary
        │
        ▼
    MojoShader
        │
        ▼
      FNA3D
        │
        ▼
selected FNA3D driver
```

This is the natural reference path and is always present in a CNA `FNA3D` build.

### EasyGL: OpenGL ES 3, OpenGL 3.3 and WebGL 2

The three public GL identities share CNA's EasyGL implementation and MojoShader's OpenGL adapter.

`OPENGL33` uses the `glsl120` translation profile. `OPENGLES3` and `WEBGL2` use `glsles3`.

The explicit choice matters. CNA does not let a driver silently choose a different MojoShader profile whose assumptions do not fit XNA passes that assign only one shader stage and inherit the other.

### SDL_GPU

The `SDL_GPU` route uses MojoShader's SDL GPU adapter and its SPIR-V output. SDL may then execute through Vulkan, Direct3D 12 or Metal depending on the host and available SDL GPU driver.

Those are internal SDL choices, not additional CNA renderer identities.

### WebGPU

The native WebGPU path consumes CNA's MojoShader SPIR-V integration. In the browser, CNA translates that SPIR-V into WGSL before creating the WebGPU shader module:

```text
XNA FX bytecode
      │
      ▼
  MojoShader
      │
      ▼
    SPIR-V
      │
      └── browser build ─► WGSL
                              │
                              ▼
                           WebGPU
```

The adapter also maps the old combined-sampler model onto WebGPU's separate images and samplers.

### Software

`SOFTWARE` is no longer a blanket exception to arbitrary FX.

Its optional compiled-effect runtime executes the supported legacy Shader Model programs on the CPU and participates in the same public reflection, state, SpriteBatch and pixel-output contracts as the GPU renderers.

This is functional compatibility, not a performance claim. The renderer remains a bounded CPU implementation.

### DirectX 9

An XNA 4 Effect already contains Direct3D 9-era shader tokens. `DIRECTX9` can therefore create native vertex and pixel shaders from those programs directly:

```text
XNA Effect
    │
    ▼
D3D9 shader tokens
    │
    ├── IDirect3DVertexShader9
    └── IDirect3DPixelShader9
```

MojoShader still supplies the Effect container runtime and reflection. CNA supplies the parameter, technique, pass, state, sampler and draw integration around it.

---

## Vulkan, DirectX 11, DirectX 12 and Metal are not CNA renderer identities

Earlier versions of this article described separate CNA implementations for Vulkan, DirectX 11, DirectX 12 and Metal.

Those identities have been retired.

The current architecture is:

```text
SDL_GPU
    ├── Vulkan selected internally by SDL
    ├── Direct3D 12 selected internally by SDL
    └── Metal selected internally by SDL

FNA3D
    ├── SDL_GPU selected internally by FNA3D
    ├── Direct3D 11 selected internally by FNA3D
    └── OpenGL selected internally by FNA3D
```

An effect can still ultimately run on those graphics APIs. The important correction is that applications select `SDL_GPU` or `FNA3D`, query that renderer's capability and do not select a retired CNA identity.

---

## No silent stock-shader fallback

Suppose a renderer can parse `Bloom.fxb` but cannot execute its shader on a particular draw route.

The wrong behavior would be:

```text
pretend success
draw with BasicEffect or the normal SpriteBatch shader
```

The frame might still contain plausible geometry, turning a compatibility defect into an apparent art problem.

CNA instead follows two rules:

1. A renderer without a complete runtime reports `CompiledEffects == false` and refuses construction.
2. A supported renderer refuses a specific unrepresentable shader, sampler or draw route by name rather than silently substituting another shader.

The capability becomes true only after the shared conformance suite proves real output.

---

## Current boundaries

Compiled FX does not manufacture capabilities that the selected renderer lacks.

Important current boundaries include:

- vertex-stage texture sampling is unavailable across CNA's renderer contract;
- volume-texture sampling remains renderer and profile dependent;
- cube sampling is supported across the compiled-effect implementations;
- `MipMapLevelOfDetailBias` has no OpenGL ES representation, although the pass assignment is still visible in CNA's state object;
- the SPIR-V path explicitly refuses the Shader Model 1.4 `BEM` instruction it cannot implement;
- an EasyGL context recreation invalidates the underlying MojoShader context, so the application must recreate compiled `Effect` instances from their bytecode;
- a renderer's ordinary multi-stream and instancing limits also apply to its compiled-effect draws.

These are explicit errors or documented representational limits. They are not replaced by nearby behavior.

Sampler support is tested through rendered pixels, not only by reading state objects back. The tests distinguish `Wrap`, `Clamp` and `Mirror`, exercise filtering away from texel boundaries and select different-colored mip levels to verify mip limits and LOD behavior.

---

## Building `.fx` source

CNA's Content Pipeline accepts both `.fxb` and `.fx` inputs, but the routes differ at their first step.

```text
already compiled .fxb ───────────────┐
                                     │
.fx source                           │
    │                                │
    ▼                                │
external fxc-compatible compiler     │
    │                                │
    └────────► compiled bytecode ◄────┘
                         │
                         ▼
               XNB Effect asset
```

CNA deliberately does not embed an HLSL Effect compiler. Source compilation is an authoring-time operation.

The command-line tool can be pointed at an external compiler:

```bash
cna-content build Content -o bin --format xnb \
    --fx-compiler "/path/to/fxc.exe"
```

On a non-Windows build machine it can launch that compiler through Wine:

```bash
cna-content build Content -o bin --format xnb \
    --fx-compiler "/path/to/fxc.exe" \
    --fx-compiler-launcher wine
```

The compiler and launcher can also be selected through the `CNA_FXC` and `CNA_FXC_LAUNCHER` environment variables or the `CNA_FXC_EXECUTABLE` and `CNA_FXC_LAUNCHER` CMake settings.

The pipeline records the compiler identity, processor parameters and the complete `#include` dependency tree in its fingerprint. Changing the compiler, `profile`, `defines`, `debug` setting or an included `.fxh` file rebuilds the effect.

Both `.fx` and `.fxb` currently produce an Effect only for `--format xnb`. CNB reserves an Effect identifier but deliberately has no native schema for Direct3D 9 Effect Framework content.

Runtime code therefore receives compiled `.fxb` or XNB payloads, never `.fx` source.

---

## Cloning and lifetime

Compiled effects can be cloned:

```cpp
std::unique_ptr<Effect> copy(effect.Clone());
```

The clone remains on the same graphics device but owns independent mutable state:

```text
parameter and string values
texture references
current technique
native Effect runtime state
```

Either object may be disposed first. Only immutable compiled shader artifacts may be shared internally.

CNA also defines device-reset and teardown behavior. A selected effect is removed when disposed, using a disposed effect raises `ObjectDisposedException`, disposal is idempotent and an existing effect survives an ordinary `GraphicsDevice::Reset()`.

Construction belongs at content-load time rather than in the frame loop. If a game needs many instances of the same effect, `Clone()` reuses the already translated immutable artifacts and is substantially cheaper than constructing each instance from bytecode again.

---

## Malformed input and fuzzing

Effect bytecode is a native binary format and must be treated as untrusted structured data.

CNA bounds a compiled Effect at 64 MiB and checks sizes, counts, offsets, arrays, nested structures and shader objects before building the public graph.

The parser and both major FNA3D translation routes were exercised with coverage-guided fuzzing under AddressSanitizer. The recorded campaigns exceeded three million executions on the OpenGL/GLSL route and two and a half million on the SDL GPU/SPIR-V route. Forty-one distinct crash classes found during the work became parser fixes and regression inputs.

That is strong measured hardening, not a mathematical proof that arbitrary hostile bytecode is safe. Shipping game-owned effects and accepting user-supplied shader binaries are different trust decisions.

---

## How CNA tests FX compatibility

Every renderer claiming `CompiledEffects` runs the same renderer-neutral conformance contract.

It covers:

```text
format rejection and truncation boundaries
reflection, arrays, structures and annotations
all public parameter getters and setters
technique and exact-pass selection
render, depth, rasterizer and sampler state
texture binding and dimension checks
cloning, disposal and device lifetime
buffered, user, indexed and non-indexed draws
multi-stream and instancing where supported
SpriteBatch, multiple passes and inherited stages
render-target sampling and orientation
switching between compiled, cloned and stock effects
```

The drawing sections read pixels back. A route that binds the wrong pass, loses a parameter, uses the wrong vertex stream or falls back to a stock shader produces the wrong color and fails.

FNA supplies an independent behavioral reference. The fixture set also includes binaries produced by Microsoft's historical June 2010 `fxc`, the same generation used by the XNA 4 toolchain.

Recent compatibility work has gone beyond basic Shader Model 2/3 examples. Shared tests cover legacy Shader Model 1 through 3 instructions and found real translation differences in predicated `TEXKILL`, `vPos`, `vFace`, bump-environment instructions, pixel-center correction, GLSL ES precision and vertex-color clamping. CNA either repaired those routes or kept a precise refusal for the remaining unsupported case.

---

## Choosing the right path

For an existing XNA or FNA game:

```text
already owns .fxb or XNB Effects
        │
        ▼
query CompiledEffects and retain the Effect API
```

For a new CNA application with its own backend shader packages:

```text
does not need XNA techniques, annotations or pass state
        │
        ▼
query CustomEffects and use ShaderEffect
```

For ordinary framework materials:

```text
no custom shader required
        │
        ▼
use BasicEffect, PbrEffect or another stock effect
```

Compiled `Effect` is primarily a compatibility technology. `ShaderEffect` is the application-owned custom-shader technology. Stock effects are the portable framework-provided path.

---

## Current architecture

```text
                         CNA Graphics
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
    Stock Effects       XNA Compiled FX       ShaderEffect
          │                   │                    │
    BasicEffect              .fxb           ShaderPackageEXT
    SkinnedEffect            XNB Effect      GLSL/SPIR-V/WGSL
    PbrEffect                  │                    │
          │                   │                    │
          └───────────────────┼────────────────────┘
                              ▼
                        Renderer contract
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ├── EasyGL       ├── WebGPU       ├── Software
             ├── SDL_GPU      ├── DirectX 9    └── FNA3D
```

Not every renderer supports every branch. Capability queries state which path is real in the selected build.

---

## Source code and documentation

The CNA repository is available at:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

The primary guides are:

```text
docs/fx-compiled-effects.md
docs/shader-effect-vs-fx-bytecode.md
docs/fx-bytecode-fuzzing.md
docs/content-pipeline.md
docs/renderer-registry.md
```

The active renderer implementations are under:

```text
modules/renderers/fna3d/
modules/renderers/easygl/
modules/renderers/sdl-gpu/
modules/renderers/webgpu/
modules/renderers/software/
modules/renderers/directx9/
```

Shared MojoShader integration lives in:

```text
modules/renderers/common/mojoshader/
```

The renderer-neutral conformance suite is centered on:

```text
tests/support/CNA/TestSupport/CompiledEffectConformance.hpp
tests/support/CNA/TestSupport/CompiledEffectFixtures.hpp
```

Development tools include:

```text
tools/graphics/mojoshader_effect_probe.cpp
tools/graphics/mojoshader_gl_probe.cpp
tools/graphics/mojoshader_sdlgpu_probe.cpp
tools/graphics/compiled_effect_fuzzer.cpp
tools/graphics/compiled_effect_benchmark.cpp
```

---

## Conclusion

FX support in CNA is no longer limited to recognizing an old shader file.

CNA loads genuine XNA/FNA Effect Framework binaries, reconstructs their public reflection model and executes their techniques, passes, shaders, states and samplers through FNA3D, EasyGL, SDL GPU, WebGPU, Software and DirectX 9.

At the same time, the project keeps three contracts distinct:

```text
Stock Effects
    portable framework-provided materials

Compiled Effect
    compatibility with XNA/FNA .fxb and XNB Effects

ShaderEffect
    modern application-owned shader packages
```

That separation lets an old XNA game retain its original Effect architecture without forcing a new CNA application to design its shaders around a Direct3D 9-era format.
