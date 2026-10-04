---
title: FX support in CNA
date: 2026-12-24T18:45:36Z
updated: 2026-09-13T18:56:00Z
description: |
  XNA 4.0 did not treat shaders as isolated vertex and pixel programs.
author: Robert Vokac
categories:
  - Development
tags:
  - DirectX
  - Vulkan
  - WebGPU
  - Graphics
  - XNB
  - SDL GPU
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

XNA 4.0 did not treat shaders as isolated vertex and pixel programs.

Its main programmable shader abstraction was the **Effect Framework**.

Developers normally wrote an HLSL `.fx` file containing:

```text
parameters
techniques
passes
vertex shaders
pixel shaders
sampler declarations
render states
sampler states
annotations
```

The XNA Content Pipeline compiled that source into Effect Framework bytecode, normally stored inside an `.xnb` asset.

CNA now supports this model as a real compatibility path.

That means CNA can load and execute compiled effects created for the XNA/FNA Effect Framework rather than requiring every old custom shader to be rewritten as a CNA-specific shader.

The basic path is:

```text
HLSL .fx
    │
    ▼
XNA-compatible FX compiler
    │
    ▼
compiled Effect Framework binary
    │
    ├── .fxb
    │
    └── Effect payload inside XNB
            │
            ▼
           CNA
            │
            ▼
    renderer-specific execution
```

This is separate from CNA's newer `ShaderEffect` API.

That distinction is fundamental to understanding shader support in CNA.

---

## Three different things called an "effect"

When discussing CNA graphics, the word **Effect** can refer to several related but different systems.

## XNA stock effects

These include familiar framework types such as:

```text
BasicEffect
AlphaTestEffect
DualTextureEffect
EnvironmentMapEffect
SkinnedEffect
```

along with CNA's additional modern effects such as:

```text
PbrEffect
SkinnedPbrEffect
```

These are predefined framework shaders.

The developer configures their properties, but does not provide an arbitrary Effect Framework program.

---

## Compiled XNA effects

This article is primarily about this category.

A game provides binary shader content originally produced from an XNA-style `.fx` source.

The public API is the normal:

```cpp
Microsoft::Xna::Framework::Graphics::Effect
```

including:

```text
EffectParameter
EffectTechnique
EffectPass
EffectAnnotation
```

These are genuine Effect Framework semantics.

---

## ShaderEffect

CNA also has:

```cpp
CNAEXT::ShaderEffect
```

for applications that own modern backend-oriented shader code.

This is a different contract.

It does not pretend GLSL, SPIR-V, WGSL or another native shader representation is an XNA Effect Framework binary.

The two systems are therefore:

```text
Compiled XNA Effect

    XNA/FNA Effect Framework
    techniques
    passes
    reflection
    annotations
    render state
    sampler state

ShaderEffect

    modern custom shader representation
    supplied for the selected backend
```

Support for one does **not** imply support for the other.

---

## Two independent capabilities

CNA explicitly exposes this difference through graphics capabilities.

Compiled XNA effects use:

```cpp
CNA::GraphicsCapability::CompiledEffects
```

while `ShaderEffect` uses:

```text
CustomEffects
```

A renderer may support:

```text
CompiledEffects = true
CustomEffects   = false
```

or the opposite.

Applications should therefore ask for the capability they actually require.

For example:

```cpp
if (device.SupportsCapability(
        CNA::GraphicsCapability::CompiledEffects))
{
    // XNA/FNA compiled Effect Framework binaries can run.
}
```

CNA deliberately does not treat:

```text
custom shader support
```

as equivalent to:

```text
XNA Effect support
```

because executing shader instructions is only one part of the Effect Framework contract.

---

## What is an .fx file?

A traditional XNA effect starts as HLSL source.

A simplified example might look conceptually like:

```hlsl
float4x4 WorldViewProjection;
float4 Tint;

Texture2D Texture;

sampler TextureSampler = sampler_state
{
    Texture = <Texture>;
    MinFilter = Linear;
    MagFilter = Linear;
};

float4 PixelShaderFunction(float4 color : COLOR0) : COLOR0
{
    return color * Tint;
}

technique Main
{
    pass Pass0
    {
        PixelShader =
            compile ps_2_0 PixelShaderFunction();
    }
}
```

Real XNA effects may contain much more:

```text
multiple techniques
multiple passes
vertex + pixel shaders
arrays
structures
annotations
textures
samplers
render-state changes
```

The `.fx` file itself is source code.

CNA does **not** compile this HLSL source at runtime.

---

## What is an .fxb file?

An `.fxb` file contains the compiled Direct3D 9 Effect Framework representation.

That binary contains much more than raw shader machine code.

It also describes the Effect object graph:

```text
parameters
    │
    ├── types
    ├── semantics
    ├── defaults
    ├── arrays
    ├── structures
    └── annotations

techniques
    │
    └── passes
            │
            ├── shaders
            ├── render states
            └── sampler states
```

This is the binary format consumed by XNA/FNA's normal:

```csharp
new Effect(graphicsDevice, effectCode)
```

path.

CNA implements the corresponding native C++ API.

---

## Loading an effect directly from bytes

A compiled effect can be constructed directly.

Conceptually:

```cpp
#include "Microsoft/Xna/Framework/Graphics/Effect.hpp"

std::vector<SharpRuntime::bytecs> bytes =
    ReadAllBytes("Bloom.fxb");

Effect effect(device, bytes);
```

CNA parses the Effect Framework binary and constructs the public reflection graph.

The first technique is selected initially, matching the expected XNA/FNA behavior.

The effect is then used much like an XNA effect.

---

## Loading an Effect from XNB

CNA's XNB implementation also contains the canonical:

```text
Microsoft.Xna.Framework.Content.EffectReader
```

So an original XNA content asset can be loaded through `ContentManager`:

```cpp
auto effect =
    content.Load<std::shared_ptr<Effect>>(
        "Effects/Bloom");
```

The path is:

```text
Bloom.xnb
    │
    ▼
ContentManager
    │
    ▼
EffectReader
    │
    ▼
compiled Effect Framework payload
    │
    ▼
Effect
```

The XNB reader validates the payload length, requires an exact read and retains the asset name for useful error reporting.

The resulting effect uses the same compiled-effect runtime as one constructed directly from bytes.

---

## Reflection

A major part of XNA's Effect API is runtime reflection.

A game can inspect parameters:

```cpp
for (int i = 0;
     i < effect.getParametersProperty().getCountProperty();
     ++i)
{
    const auto& parameter =
        effect.getParametersProperty()[i];

    parameter.getNameProperty();
    parameter.getSemanticProperty();
    parameter.getParameterClassProperty();
    parameter.getParameterTypeProperty();
}
```

CNA reconstructs the reflected Effect graph including:

```text
parameter names

semantics

scalar / vector / matrix classes

numeric types

texture types

row and column counts

arrays

structure members

annotations
```

Reflection order follows the compiled Effect binary.

This matters because some games do more than look up a parameter by name.

They may enumerate the complete Effect structure.

---

## Arrays and structures

Effect Framework parameters are not limited to:

```text
float
float4
matrix
Texture2D
```

They can also contain:

```text
arrays
structures
nested structure members
```

CNA exposes these through:

```text
EffectParameter.Elements
EffectParameter.StructureMembers
```

Conceptually:

```text
LightData Lights[4]

Lights
 ├── [0]
 │    ├── Position
 │    └── Color
 ├── [1]
 │    ├── Position
 │    └── Color
 ...
```

Views into array elements and structure members modify the underlying parent Effect parameter rather than disconnected copies.

---

## Parameter values

Compiled Effect parameters can be modified using the familiar model.

For example:

```cpp
effect.getParametersProperty()["WorldViewProj"]
    ->SetValue(worldViewProjection);

effect.getParametersProperty()["Threshold"]
    ->SetValue(0.25f);

effect.getParametersProperty()["Texture"]
    ->SetValue(&texture);
```

CNA supports the logical XNA parameter types while internally preserving the register layout expected by the Effect Framework.

That detail matters particularly for arrays and vectors.

Direct3D 9 effect constant storage is based heavily around `float4` register layout.

CNA must therefore preserve that storage model internally without exposing padding as if it were part of the user's `float3`.

---

## Dirty parameter uploads

Setting a parameter does not require CNA to blindly re-upload the entire Effect state before every draw.

Mutable top-level parameters are tracked.

When something changes:

```text
parameter.SetValue(...)
        │
        ▼
parameter becomes dirty
        │
        ▼
next pass application
        │
        ▼
changed data uploaded
```

If nothing changes, the runtime does not needlessly upload the same values again.

---

## Techniques and passes

The Effect Framework's technique/pass model is fully meaningful in CNA.

For example:

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

A compiled effect may therefore contain:

```text
Technique A
    Pass 0
    Pass 1

Technique B
    Pass 0
    Pass 1
    Pass 2
```

CNA does not simply execute:

```text
first shader found
```

and ignore the rest.

`EffectPass::Apply()` applies the actual selected pass.

This is important for old XNA games where one technique may contain multiple rendering phases.

---

## Effect::Apply()

CNA also retains its owner-level effect application behavior.

For a compiled base `Effect`:

```text
Effect::Apply()
```

is defined as applying:

```text
pass 0
of CurrentTechnique
```

while directly using:

```text
EffectPass::Apply()
```

selects the exact pass requested.

Stock effects continue to use their normal stock-effect path.

---

## Pass state is part of the Effect

One of the hardest parts of implementing XNA FX compatibility is that the shader program is only part of a pass.

A pass can also change graphics-device state.

For example:

```text
blending
depth testing
depth writes
culling
fill mode
scissor state
sampler filtering
texture addressing
anisotropy
LOD rules
```

When:

```cpp
pass.Apply();
```

is called, CNA translates supported Effect Framework state assignments back into CNA's normal XNA-style state objects.

That means after a pass:

```cpp
device.getBlendStateProperty();
device.getDepthStencilStateProperty();
device.getRasterizerStateProperty();
device.getSamplerStatesProperty()[0];
```

reflect the state selected by that pass.

This is critical for compatibility.

A renderer that translated only the shaders while ignoring the pass's state block would **not** have real FX support.

---

## State that the effect did not assign remains untouched

Another subtle XNA rule is equally important.

Suppose the game selects:

```text
BlendState A
DepthStencilState B
RasterizerState C
```

and the Effect pass changes only blending.

The correct behavior is not:

```text
reset everything to defaults
```

It is:

```text
BlendState       changed by effect

DepthStencil     remains B

RasterizerState  remains C
```

CNA tests this behavior explicitly.

An Effect pass modifies the state groups it actually assigns.

It does not indiscriminately overwrite the rest of the device state.

---

## Samplers and textures

Sampler behavior is another difficult part of Effect compatibility.

In an FX source, a sampler may refer to a texture parameter:

```text
TextureParameter
       │
       ▼
Sampler
       │
       ▼
shader register
```

CNA preserves this relationship.

The runtime does not simply guess:

> This uniform happens to have a similar name, so perhaps this texture belongs here.

Texture binding follows the reflected Effect metadata.

Sampler state may also carry information such as:

```text
filter

AddressU
AddressV
AddressW

MaxAnisotropy

MaxMipLevel

MipMapLevelOfDetailBias
```

How much of that can reach the GPU depends on the selected renderer.

Where an underlying graphics API cannot represent a particular state, CNA reports that limitation explicitly.

---

## SpriteBatch with custom FX

XNA applications frequently use custom Effects with:

```text
SpriteBatch
```

CNA supports this path as well.

Conceptually:

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

For a compiled effect, the actual Effect pass is executed.

CNA does not silently replace it with the ordinary SpriteBatch shader.

As in FNA, SpriteBatch reconnects its sprite texture to texture slot zero after applying the pass.

That behavior matters for many original XNA post-processing and 2D shader effects.

---

## Compiled effects work with normal 3D draws too

FX support is not restricted to SpriteBatch.

The shared conformance suite exercises routes including:

```text
DrawPrimitives

DrawIndexedPrimitives

DrawUserPrimitives

DrawUserIndexedPrimitives

instanced draws where supported

multiple vertex streams where supported
```

and tests non-zero offsets such as:

```text
baseVertex
startIndex
vertexStart
```

This was an important quality gate in CNA's FX implementation.

A renderer is not considered to support compiled effects merely because it can parse reflection information.

The actual shader must survive all applicable draw routes.

---

## No silent stock-shader fallback

This is one of the strongest rules in CNA's FX implementation.

Suppose a renderer successfully parses:

```text
Bloom.fxb
```

but cannot actually execute its shader.

The wrong response would be:

```text
pretend success

draw with BasicEffect instead
```

The frame may still show something, making the defect look like an art problem.

CNA instead requires:

```text
CompiledEffects == false
```

or a clear draw-time refusal for the specific unsupported route.

A backend is promoted to compiled-effect support only after the shared conformance suite proves actual rendering.

---

## Renderer support today

Compiled Effect support is renderer-dependent.

In the current CNA source tree the implemented set is approximately:

| Renderer | Compiled XNA FX |
| --- | --- |
| FNA3D | Supported |
| SDL GPU | Supported when CNA_SDL_GPU_COMPILED_EFFECTS=ON |
| EasyGL family | Supported when CNA_EASYGL_COMPILED_EFFECTS=ON |
| Vulkan | Supported when CNA_VULKAN_COMPILED_EFFECTS=ON |
| WebGPU | Supported when CNA_WEBGPU_COMPILED_EFFECTS=ON |
| DirectX 9 | Supported when CNA_DIRECTX9_COMPILED_EFFECTS=ON |
| DirectX 11 | Supported when CNA_DIRECTX11_COMPILED_EFFECTS=ON |
| DirectX 12 | Supported when CNA_DIRECTX12_COMPILED_EFFECTS=ON |
| Metal | Not implemented yet |
| fixed-function / 2D / CPU renderers | Generally unsupported by design |

FNA3D provides the natural reference implementation because FNA itself already uses FNA3D and MojoShader for this purpose.

The other renderers implement the same public contract through their own adapters.

---

## Why most FX backends are opt-in

A renderer such as Vulkan does not otherwise need MojoShader merely to render normal CNA content.

Compiled XNA effects introduce that dependency.

For this reason several renderer implementations place the feature behind configuration options such as:

```text
CNA_VULKAN_COMPILED_EFFECTS

CNA_EASYGL_COMPILED_EFFECTS

CNA_DIRECTX11_COMPILED_EFFECTS

CNA_DIRECTX12_COMPILED_EFFECTS
```

When the option is disabled:

```text
renderer continues to work normally

CompiledEffects = false

compiled Effect construction is refused explicitly
```

The build does not claim a capability whose runtime code was not included.

---

## FNA3D

FNA3D is the most natural backend for compiled effects.

FNA has already solved the problem of taking XNA Effect Framework data and executing it on modern graphics systems.

CNA uses the same broad architecture:

```text
Effect Framework binary
        │
        ▼
    MojoShader
        │
        ▼
      FNA3D
        │
        ▼
selected graphics driver
```

FNA3D therefore serves both as a working implementation and an important behavioral reference.

CNA's FNA3D path is tested against FNA-generated reflection and rendered output.

---

## EasyGL

The EasyGL family uses MojoShader's OpenGL-oriented translation.

That includes CNA renderer identities such as:

```text
OPENGLES2
OPENGLES3
OPENGL33
WEBGL1
WEBGL2
```

Different identities need different shader dialects.

For example:

```text
desktop OpenGL 3.3
    glsl120-compatible Effect translation path

OpenGL ES / WebGL
    GLES-oriented MojoShader profiles
```

The Effect runtime therefore selects the appropriate shader representation according to the actual EasyGL renderer instance.

Some older GLES/WebGL profiles naturally have additional sampler-state or shader-language limitations.

Those remain explicit.

---

## Vulkan

Vulkan required a more substantial implementation.

There is no ready-made:

```text
mojoshader_vulkan.c
```

equivalent to some of MojoShader's other adapters.

CNA therefore implements its own Effect backend around MojoShader's SPIR-V output.

Conceptually:

```text
XNA FX bytecode
      │
      ▼
  MojoShader
      │
      ▼
    SPIR-V
      │
      ▼
CNA Vulkan Effect runtime
      │
      ▼
VkPipeline / descriptors / uniforms
```

This includes translating the old Effect Framework's register-oriented model into Vulkan's descriptor and pipeline model.

It is not a trivial shader text conversion.

---

## WebGPU

WebGPU presented another interesting problem.

The native route can work from SPIR-V, while browser WebGPU primarily expects WGSL.

CNA therefore has a path approximately like:

```text
XNA Effect bytecode
       │
       ▼
   MojoShader
       │
       ▼
     SPIR-V
       │
       ├──────── native WebGPU
       │
       └──► CNA SPIR-V transformation
                  │
                  ▼
                 WGSL
                  │
                  ▼
            browser WebGPU
```

This required solving differences such as WebGPU's separate image/sampler model versus MojoShader's combined sampler representation.

The result is particularly interesting historically:

an XNA-era Direct3D 9 Effect can ultimately execute through a modern browser graphics API.

---

## DirectX 9

DirectX 9 is structurally the closest graphics API to the original compiled Effect content.

That is because an XNA 4 Effect contains Direct3D 9-era shader bytecode.

The route can therefore preserve the original shader token programs much more directly.

Conceptually:

```text
XNA Effect
    │
    ▼
D3D9 shader tokens
    │
    ▼
IDirect3DVertexShader9
IDirect3DPixelShader9
```

CNA still needs to handle:

```text
reflection
techniques
passes
parameters
states
samplers
draw routing
```

but the actual shader instruction format is native to the graphics API.

---

## DirectX 11

DirectX 11 cannot directly execute old Shader Model 2/3 bytecode as a normal modern D3D11 program.

CNA therefore uses a translation path through MojoShader's DirectX 11 integration.

The current route has been tested with:

```text
ordinary draws

indexed draws

multi-stream input

instancing

SpriteBatch

Texture2D

TextureCube

Texture3D
```

and pass/state/sampler semantics.

This is a useful example of why:

```text
Effect support
```

is larger than:

```text
can compile old HLSL
```

The runtime has to reproduce the whole XNA Effect contract.

---

## DirectX 12

DirectX 12 is even further removed architecturally from the old D3D9 Effect Framework.

CNA implements a translation/binding path that produces shader code suitable for its D3D12 pipeline and then maps the old Effect model onto:

```text
root signatures
pipeline state
resource bindings
uniform storage
frame lifetime
```

The public application still sees:

```cpp
Effect
EffectTechnique
EffectPass
EffectParameter
```

rather than DirectX 12-specific objects.

That is precisely what a compatibility layer is supposed to accomplish.

---

## Metal remains unfinished

Metal is the major remaining modern renderer without compiled XNA Effect support in the current implementation.

There is a technically plausible path because MojoShader can produce Metal-oriented shader source and CNA already has a Metal renderer.

However, CNA does not currently claim support.

Metal work requires actual macOS execution and validation.

CNA's policy is:

```text
do not advertise a backend written blind
```

A capability becomes true only after the real execution gate passes.

---

## Why many renderers will never support arbitrary FX

CNA contains renderers based on technologies such as:

```text
GDI
Direct2D
SDL Renderer
Canvas
SVG
software rasterizers
old fixed-function Direct3D
OpenGL 1
OpenGL ES 1
```

Some of these have no programmable shader stage capable of running an arbitrary Shader Model 2/3 program.

Trying to emulate every XNA Effect on them would defeat the purpose of those renderers.

So:

```text
CompiledEffects = false
```

is not necessarily unfinished work.

For many renderer identities it is the correct permanent capability result.

---

## The build-time .fx route

CNA's native Content Pipeline also understands:

```text
.fx
```

and:

```text
.fxb
```

sources.

The two routes converge after compilation.

Conceptually:

```text
effect.fx
   │
   ▼
external fxc-compatible compiler
   │
   ▼
compiled Effect Framework data
   │
   ┐
   │
effect.fxb
   │
   ┘
   ▼
CompiledEffectProcessor
   │
   ▼
XNB Effect
```

A precompiled `.fxb` needs no compiler.

A `.fx` source does.

---

## CNA does not embed fxc

CNA deliberately does **not** contain an HLSL Effect compiler.

Compiling `.fx` is an authoring/build-time operation.

The Content Pipeline can invoke an external `fxc`-compatible executable.

For example:

```bash
cna-content build Content -o bin \
    --format xnb \
    --fx-compiler "/path/to/fxc.exe"
```

On a non-Windows build machine, the compiler can be launched through another program:

```bash
cna-content build Content -o bin \
    --format xnb \
    --fx-compiler "/path/to/fxc.exe" \
    --fx-compiler-launcher wine
```

The compiler can also be selected through configuration and environment variables.

This keeps a legacy shader compiler out of the runtime framework.

---

## .fx includes are dependencies

If an Effect source contains:

```hlsl
#include "Lighting.fxh"
```

that include file is part of the build dependency graph.

CNA's pipeline resolves and records the include tree.

So:

```text
Lighting.fxh changes
       │
       ▼
dependent .fx asset becomes dirty
       │
       ▼
effect is rebuilt
```

This is important for incremental content builds.

The pipeline cannot correctly cache an `.fx` compilation if it fingerprints only the top-level source file.

---

## Effect compiler identity is part of the build

The compiler itself can affect output.

CNA therefore includes the selected compiler identity in the content-build fingerprint.

This prevents:

```text
compile with compiler A
       │
       ▼
cache output
       │
switch to compiler B
       │
       ▼
incorrectly reuse A's output
```

Changing the compiler causes the affected Effect assets to rebuild.

The same applies to important processor parameters.

---

## Effect processor parameters

The build-time `.fx` route supports parameters including concepts such as:

```text
profile

defines

debug
```

These participate in the content fingerprint.

Changing:

```text
DebugMode

preprocessor definition

target profile
```

therefore invalidates the previous output.

This makes Effect compilation behave like a real build-system component rather than an opaque external command.

---

## FX currently produces XNB, not CNB

This is an important CNA content-format distinction.

Both:

```text
.fx
```

and:

```text
.fxb
```

currently produce an Effect only when the Content Pipeline is targeting:

```text
--format xnb
```

CNB reserves an Effect asset identifier, but CNA currently defines **no native CNB Effect schema**.

So:

```text
effect.fx
   │
   ▼
CNA Content Pipeline
   │
   ▼
XNB
```

is supported.

But:

```text
effect.fx
   │
   ▼
native Effect.cnb
```

is not currently a CNA content contract.

This is deliberate.

Compiled XNA Effect Framework content remains part of the XNA compatibility path rather than being relabeled as CNA-native content without a properly designed portable schema.

---

## MGFX is not FX bytecode

MonoGame has its own compiled effect format commonly associated with:

```text
MGFX
mgfxo
```

This is **not** the same binary format as XNA/FNA Effect Framework bytecode.

CNA explicitly rejects MGFX input rather than trying to guess what it is.

The accepted compiled format is:

```text
XNA/FNA Direct3D 9 Effect Framework binary
```

including the wrapper used by XNA 4.

So:

```text
XNA .fxb      yes

XNA XNB Effect payload
              yes

MonoGame MGFX
              no
```

Supporting MGFX would require a separate runtime contract.

---

## .fx source is not accepted by the runtime constructor

Another useful distinction is:

```cpp
Effect(device, bytes)
```

does **not** mean:

```text
feed HLSL text into Effect()
```

The constructor expects already compiled Effect Framework data.

Runtime source compilation is deliberately outside the v1 compiled-effect contract.

So this:

```text
.fx source
```

belongs to:

```text
build-time content pipeline
```

while this:

```text
.fxb / XNB Effect payload
```

belongs to:

```text
runtime Effect loader
```

---

## MojoShader

A major part of CNA's FX implementation relies on **MojoShader**.

MojoShader understands the Direct3D 9-era Effect Framework and Shader Model bytecode used by XNA/FNA.

Its responsibilities include areas such as:

```text
Effect container parsing

parameter reflection

technique/pass reflection

Shader Model 2/3 parsing

translation into backend shader representations
```

CNA then connects that information to its renderer abstractions.

The relationship is roughly:

```text
XNA Effect Framework binary
          │
          ▼
      MojoShader
          │
          ▼
renderer-specific adapter
          │
          ▼
CNA GraphicsDevice
```

FNA/FNA3D use the same broad technology.

This gives CNA a valuable compatibility reference rather than requiring a completely new parser for one of XNA's most complicated binary formats.

---

## But CNA does not simply delegate everything to MojoShader

MojoShader solves shader and Effect parsing problems.

CNA still has to integrate the result into its own framework.

That includes:

```text
EffectParameter objects

EffectTechnique objects

EffectPass objects

GraphicsDevice state

Texture bindings

SamplerState

SpriteBatch

vertex declarations

instancing

resource lifetime

device reset

renderer capabilities
```

A MojoShader parse succeeding therefore does **not** mean CNA considers the renderer finished.

The final rendered result must pass CNA's shared conformance suite.

---

## Cloning

Original XNA effects can be cloned.

CNA supports:

```cpp
std::unique_ptr<Effect> copy(effect.Clone());
```

The clone remains on the same graphics device, but has independent mutable state.

That includes:

```text
parameter values
string values
texture references
current technique
native Effect runtime state
```

Changing the clone should not modify the original.

Either object can be disposed first.

Only genuinely immutable compiled shader information may be shared internally.

---

## Lifetime behavior

Effect lifetime is also explicitly defined.

CNA tests situations such as:

```text
effect disposed while selected

device reset

device destroyed before application-owned effect

effect cloned then original destroyed

same effect repeatedly created and disposed
```

Using a disposed effect produces an appropriate disposed-object error.

Disposal is idempotent.

This may sound unrelated to shaders, but resource lifetime is one of the areas most likely to differ between:

```text
OpenGL
Vulkan
D3D11
D3D12
WebGPU
```

while the public XNA API is expected to remain consistent.

---

## Security and malformed input

Compiled Effect data is a native binary format parsed by native code.

That makes malformed input a security and robustness concern.

CNA places explicit bounds on areas such as:

```text
payload size
reflection counts
offset arithmetic
arrays
structure members
shader objects
```

The direct constructor rejects malformed FX data with an argument-related error.

An unsupported renderer produces a support-related error.

The XNB ContentReader wraps failures with the asset context.

These error categories are intentionally distinct.

---

## FX fuzzing

The compiled Effect implementation has also undergone extensive coverage-guided fuzzing.

During development, malformed Effect binaries exposed many crash classes in the Effect parser and shader translators.

Those cases were fixed and retained as regression inputs.

The campaign eventually ran millions of Effect executions through the FNA3D shader paths under AddressSanitizer.

The important lesson is not the exact execution count.

It is that CNA treats:

```text
binary shader content
```

as untrusted structured data rather than assuming that every input was produced by Microsoft's compiler.

Still, fuzzing is not a mathematical proof of safety.

CNA's documentation therefore distinguishes:

```text
heavily hardened and measured
```

from:

```text
arbitrary hostile Effect bytecode is guaranteed safe
```

The latter is not claimed.

---

## Testing against FNA

Because FNA has a mature XNA Effect implementation, CNA can use it as an independent compatibility oracle.

The FX test infrastructure compares things such as:

```text
reflection

parameter metadata

techniques

passes

render state

rendered pixels
```

against FNA's own behavior.

A particularly valuable test shape is:

```text
same .fxb
   │
   ├──► FNA
   │      │
   │      ▼
   │   oracle
   │
   └──► CNA
          │
          ▼
       compare
```

This provides much stronger evidence than implementing an Effect parser and writing tests that merely repeat the same interpretation.

---

## Real Microsoft fxc

CNA's conformance work also contains Effect binaries compiled with Microsoft's historical:

```text
fxc
```

from the June 2010 DirectX SDK — the same generation of Effect compiler used by XNA's own tooling.

This is valuable because it validates CNA against genuine XNA-era Effect Framework output rather than only synthetic binary fixtures.

The compiler remains a build-time tool.

CNA applications do not need `fxc` installed merely to load an already compiled Effect.

---

## The six stock effects are different

Compiled FX support should also not be confused with CNA's stock-effect coverage.

Types such as:

```text
BasicEffect
AlphaTestEffect
DualTextureEffect
EnvironmentMapEffect
SkinnedEffect
```

are portable CNA framework APIs.

They do **not** require:

```text
GraphicsCapability::CompiledEffects
```

The renderer implements their semantics directly through the normal CNA renderer contract.

So a renderer can legitimately support:

```text
BasicEffect
```

while refusing:

```text
arbitrary game-provided .fxb
```

Those are different capability levels.

---

## PbrEffect is not an XNA FX file

Likewise:

```text
PbrEffect
SkinnedPbrEffect
```

are CNA extensions.

They provide a modern PBR material model used by systems such as CNA's glTF importer.

They are not compiled `.fx` files hidden behind another name.

The architecture is:

```text
XNA stock effects
        │
        ├── BasicEffect
        ├── SkinnedEffect
        └── ...

CNA modern stock effects
        │
        ├── PbrEffect
        └── SkinnedPbrEffect

arbitrary XNA compiled Effect
        │
        └── Effect(.fxb)

modern application-owned shader
        │
        └── ShaderEffect
```

Keeping those categories separate makes CNA's graphics architecture much easier to reason about.

---

## Why keep old FX support?

It might be tempting to say:

> Direct3D 9 Effect Framework bytecode is old. Just rewrite the shaders.

That is reasonable for a new small project.

It is much less reasonable for a large existing XNA game.

A game may contain:

```text
dozens
hundreds
or more
```

custom effects.

Those shaders may encode important game-specific rendering behavior.

Forcing every XNA port to rewrite them before the game can render correctly would dramatically reduce CNA's compatibility value.

FX support therefore serves one of CNA's central goals:

```text
old XNA content
      │
      ▼
modern CNA renderer
```

without requiring the original game's shader architecture to be discarded first.

---

## Why keep ShaderEffect as well?

The inverse question is equally important.

If CNA can execute old `.fxb`, why have `ShaderEffect`?

Because an XNA Effect is designed around the Direct3D 9 era.

A new CNA application may want:

```text
modern GLSL

SPIR-V

WGSL

modern resource binding

new GPU capabilities
```

without reproducing:

```text
D3D9 Effect techniques
legacy pass states
Shader Model 2/3 constraints
```

So:

```text
compiled Effect
```

is primarily a **compatibility technology**.

`ShaderEffect` is a **modern custom-shader technology**.

Both are useful.

They solve different problems.

---

## A useful decision rule

For an existing XNA game:

```text
already has .fx/.fxb/XNB Effects
        │
        ▼
use compiled Effect support
```

For a new CNA application that needs custom shaders:

```text
owns the shader code
does not need XNA Effect Framework semantics
        │
        ▼
consider ShaderEffect / modern CNA shader APIs
```

For ordinary standard materials:

```text
no custom shader required
        │
        ▼
use stock effects
```

such as:

```text
BasicEffect
PbrEffect
SkinnedPbrEffect
```

---

## Current architecture

The overall shader picture in CNA now looks approximately like:

```text
                         CNA Graphics
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼

    Stock Effects       XNA Compiled FX       ShaderEffect
          │                   │                    │
    BasicEffect              .fxb            backend-oriented
    SkinnedEffect            XNB Effect       shader package/source
    PbrEffect                  │                    │
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                         Renderer API
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
       EasyGL               Vulkan              DirectX
          │                    │                    │
       WebGPU               SDL GPU              ...
```

Not every renderer supports every branch.

Capabilities say which paths are real for the selected renderer.

---

## Source code

The CNA repository is available at:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

The primary porter-facing compiled-effect documentation is:

```text
docs/fx-compiled-effects.md
```

The distinction between old XNA FX and CNA's newer shader API is documented in:

```text
docs/shader-effect-vs-fx-bytecode.md
```

FX robustness work is documented in:

```text
docs/fx-bytecode-fuzzing.md
```

and the implementation/rollout history is tracked in:

```text
plans/plan_fx.md
```

Content Pipeline support for `.fx` and `.fxb` is documented in:

```text
docs/content-pipeline.md
```

The shared cross-renderer conformance framework lives around:

```text
tests/support/CNA/TestSupport/CompiledEffectConformance.hpp
tests/support/CNA/TestSupport/CompiledEffectFixtures.hpp
```

Renderer implementations include areas such as:

```text
modules/renderers/fna3d/
modules/renderers/easygl/
modules/renderers/sdl-gpu/
modules/renderers/vulkan/
modules/renderers/webgpu/
modules/renderers/directx9/
modules/renderers/directx11/
modules/renderers/directx12/
```

and shared MojoShader integration is under:

```text
modules/renderers/common/mojoshader/
```

CNA also contains development tools such as:

```text
tools/graphics/mojoshader_effect_probe.cpp
tools/graphics/mojoshader_gl_probe.cpp
tools/graphics/mojoshader_vulkan_probe.cpp
tools/graphics/mojoshader_sdlgpu_probe.cpp
tools/graphics/compiled_effect_fuzzer.cpp
```

---

## Conclusion

FX support in CNA now covers much more than recognizing an old shader file.

CNA can load genuine XNA/FNA Effect Framework binaries, reconstruct their public reflection model and execute their shader programs through multiple modern renderer architectures.

The supported runtime contract includes:

```text
parameters
arrays
structures
annotations

techniques
passes

textures
samplers

render state
depth state
rasterizer state

SpriteBatch
3D draws
instancing where available

clone
lifetime
ContentManager / XNB loading
```

The current path begins with a fundamentally old technology:

```text
XNA 4.0
Direct3D 9
Shader Model 2/3
Effect Framework
```

but can end on technologies such as:

```text
OpenGL
Vulkan
WebGPU
DirectX 11
DirectX 12
SDL GPU
```

through CNA's renderer adapters.

At the same time, CNA does not confuse this compatibility system with its modern shader APIs.

The distinction remains:

```text
Stock Effects
    portable framework-provided effects

Compiled Effect
    compatibility with XNA/FNA .fxb and XNB Effects

ShaderEffect
    modern application-owned custom shaders
```

And at build time:

```text
.fx source
    │
    ▼
external XNA-compatible compiler
    │
    ▼
FX bytecode
    │
    ▼
XNB
```

while already compiled `.fxb` content can enter the pipeline directly.

This separation gives CNA an important property:

> An old XNA game can retain its original Effect architecture, while a new CNA application is not forced to design new shaders around a Direct3D 9-era format.

That is the purpose of FX support in CNA: preserve the old contract faithfully without making it the limit of CNA's future graphics architecture.
