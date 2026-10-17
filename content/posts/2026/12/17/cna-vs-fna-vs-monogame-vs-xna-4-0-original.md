---
title: CNA vs FNA vs MonoGame vs XNA 4.0 (original)
date: 2026-12-17T18:31:07Z
updated: 2026-10-17T13:34:14Z
description: |
  XNA 4.0, FNA, MonoGame and CNA share one programming model, but CNA now serves both native C++ and original C# games through CNA.NET.
author: Robert Vokac
categories:
  - Development
tags:
  - C#
  - Graphics
  - Content Pipeline
  - XNA 4.0
  - XNB
  - CNB
  - FNA
  - MonoGame
  - CNA.NET
  - .NET
  - XNA
  - Game Framework
  - Game Development
originalUrl: https://blog.libcna.com/2026/12/17/cna-vs-fna-vs-monogame-vs-xna-4-0-original/
classicpressId: 127
classicpressStatus: future
draft: false
---

CNA, FNA and MonoGame all have the same ancestor:

**Microsoft XNA Framework 4.0.**

But they are not three interchangeable implementations of exactly the same idea.

Their goals are different.

A useful way to summarize them is:

```text
XNA 4.0
    the original

FNA
    preserve XNA

MonoGame
    continue and evolve XNA

CNA
    rebuild XNA around a native C++ core
    and expose it to C# through CNA.NET
```

That difference in philosophy explains most of the technical differences between the four frameworks.

---

## At a glance

|  | XNA 4.0 | FNA | MonoGame | CNA |
| --- | --- | --- | --- | --- |
| Main language | C# | C# | C# / .NET | C++23 core; C# through CNA.NET |
| Status | Discontinued | Active | Active | Active, 0.x; CNA.NET is beta and source-first |
| Open source | No | Yes | Yes | Yes |
| Primary goal | Original framework | XNA accuracy and preservation | Cross-platform XNA successor | XNA-compatible C++ core, C# binding and curated CNA systems |
| XNA compatibility | Reference itself | Accuracy-first | High, but allowed to evolve | Accuracy-first; exact selected C# metadata, behavior still incomplete |
| Managed runtime | .NET/CLR | .NET + native libraries | .NET + native backend | None for C++; .NET 8+ for CNA.NET |
| Original XNB | Native | Strong compatibility | Strong compatibility | Broad compatibility, with explicit remaining limits |
| Own content pipeline | XNA Content Pipeline | No | MGCB | CNA Content Pipeline |
| Native compiled content | XNB | XNB | MonoGame XNB | CNB + XNB |
| Human-readable CNA format | — | — | — | CNJ |
| glTF integration | No | External/custom | Pipeline/ecosystem dependent | Built into CNA |
| Graphics extensions | No | Intentionally limited in scope | Framework continues evolving | Bounded CNAEXT module |
| Selectable renderers | No | Backend abstraction | Several platform backends | 10 identities over 8 curated families |
| WebAssembly | No | Not a primary official target | Not in current official platform list | Yes |
| Current console support | Historical Xbox 360 | Several modern consoles | Several modern consoles | None |

The table alone, however, hides the most important differences.

---

## XNA 4.0: the original

Microsoft XNA Framework 4.0 is the reference point for everything else in this comparison.

It provided the programming model that became familiar to a generation of C# game developers:

```csharp
Game
GameTime
GraphicsDevice
GraphicsDeviceManager
SpriteBatch
Texture2D
RenderTarget2D
BasicEffect
Model
ContentManager
Keyboard
Mouse
GamePad
SoundEffect
Song
```

A typical XNA game revolved around:

```text
Initialize
    ↓
LoadContent
    ↓
Update
    ↓
Draw
```

The API was compact enough for small games while still exposing relatively low-level graphics concepts.

XNA 4.0 targeted the Microsoft ecosystem of its time, principally Windows, Xbox 360 and Windows Phone. Microsoft later discontinued XNA, leaving the original framework tied to an increasingly obsolete development environment.

Yet the API survived.

That happened largely because FNA and MonoGame demonstrated that the XNA programming model was still useful long after Microsoft's implementation stopped evolving.

CNA is another, much newer attempt to preserve that model.

---

## XNA is still the semantic reference

When discussing compatibility, XNA itself is special.

It cannot be:

```text
90% XNA compatible
```

because it defines what XNA compatibility means.

If original XNA does something surprising, then from a strict compatibility perspective that surprising behavior may be the correct behavior.

This distinction is important for reimplementations.

For example:

```text
What should Matrix do here?

What exception should ContentManager throw?

What does SpriteBatch do in this edge case?

How is a packed vector converted?

How does the XNB reader interpret this object graph?
```

Documentation is useful.

But ultimately the original Microsoft implementation is the strongest behavioral reference.

---

## FNA: preserve XNA

FNA has the clearest preservation-oriented philosophy of the three successors.

[The project describes itself](https://fna-xna.github.io/) as a reimplementation of **Microsoft XNA Game Studio 4.0 Refresh** and explicitly states that its goal is to reproduce XNA accurately rather than redesign it.

This leads to an important principle:

```text
If XNA behaves one way,
FNA generally wants to behave the same way.
```

FNA is therefore particularly attractive for existing XNA games.

Its purpose is not primarily:

> What would XNA look like if we redesigned it in 2026?

It is much closer to:

> How do we keep software written for XNA running correctly on modern systems?

---

## FNA and game preservation

This preservation focus is not merely theoretical.

FNA is developed by people who have used it to port a large number of real commercial XNA games.

The project explicitly describes preservation of the XNA game catalogue as one of its primary goals.

That gives FNA a different optimization target from a framework designed mainly for new projects.

If an XNA game depends on some obscure historical behavior, changing that behavior to produce a cleaner API may actually be undesirable.

In FNA:

```text
compatibility
```

usually wins over:

```text
API redesign
```

---

## FNA remains C#

FNA preserves the managed programming model.

Typical application code still looks like XNA C#:

```csharp
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

public class MyGame : Game
{
    protected override void Update(GameTime gameTime)
    {
    }

    protected override void Draw(GameTime gameTime)
    {
    }
}
```

Underneath that managed API, FNA uses native libraries to provide portable graphics, audio and platform functionality.

The result is still fundamentally a **C#/.NET XNA implementation**.

CNA.NET preserves the same source language, but its managed types are a facade over CNA's C API and C++ implementation. The game code can look almost identical while the architecture underneath it is fundamentally different.

---

## MonoGame: continue XNA

MonoGame has a different philosophy.

It began as an open-source reimplementation of XNA and still provides the familiar XNA-style API, but it has evolved into a broader modern .NET game framework.

MonoGame describes itself as a cross-platform game framework for desktop, mobile and console development using C#.

It therefore has two jobs:

```text
keep XNA-style development familiar

and

continue evolving after XNA stopped
```

That makes it less preservation-pure than FNA, but potentially more natural for developers who want an actively evolving C# framework.

---

## FNA and MonoGame deliberately differ here

FNA's own documentation explains the philosophical difference directly.

FNA aims at full XNA 4.0 Refresh compatibility.

It describes MonoGame as an XNA-like successor where compatibility is important but is not the project's absolute preservation constraint.

That should not be interpreted as:

```text
FNA good
MonoGame bad
```

They are optimizing for different things.

FNA asks:

> What did XNA do?

MonoGame can also ask:

> What should this framework do now?

Both are legitimate goals.

They simply produce different trade-offs.

---

## CNA: rebuild the model in C++

CNA takes a more unusual approach.

Its public programming model is based on XNA 4.0, but the framework itself is written in:

```text
C++23
```

The familiar C# namespace:

```csharp
Microsoft.Xna.Framework.Graphics
```

becomes the C++ namespace:

```cpp
Microsoft::Xna::Framework::Graphics
```

A CNA game can therefore look conceptually similar to XNA:

```cpp
class MyGame final : public Game
{
protected:
    void Update(const GameTime& gameTime) override
    {
    }

    void Draw(const GameTime& gameTime) override
    {
    }
};
```

but it compiles as native C++.

CNA is licensed under the Microsoft Public License, and portions of the project are derived from or based on FNA, also under Ms-PL.

It is not simply FNA compiled by a C++ compiler.

It is a separate C++ implementation of the XNA programming model.

---

## Native C++ is CNA's biggest fundamental difference

The architecture can be summarized as:

```text
XNA       C# -> CLR -> platform

FNA       C# -> .NET -> FNA + native libraries

MonoGame  C# -> .NET -> MonoGame + native backend

CNA       C++23 -> native executable

CNA.NET   C# -> .NET -> CNA.NET -> CNA C API -> CNA C++
```

CNA uses **Sharp Runtime** for many `System::*`-style facilities that make an XNA-like C++ API practical, but it does not require a CLR simply to execute the game.

This changes several aspects of development:

```text
memory ownership
object lifetime
templates
native debugging
ABI concerns
toolchain selection
integration with C/C++ libraries
```

A developer writing directly against CNA is therefore making a much larger language decision than someone choosing between FNA and MonoGame.

That is no longer the only way to use CNA.

---

## CNA.NET brings C# XNA games to CNA

[CNA.NET](https://github.com/libcna/cna-dotnet) adds a strict C# XNA facade above CNA's native C API:

```text
original XNA 4.0 C# game
        │
        ▼
CNA.XnaCompat
        │
        ▼
CNA.Framework / CNA.Interop
        │
        ▼
CNA C API
        │
        ▼
CNA C++ core
```

This changes the comparison substantially. CNA is still implemented in C++23, but using it no longer requires rewriting an XNA game in C++.

The measured CNA.NET result for the selected XNA 4.0 Windows runtime profile is:

```text
256 of 256 public types
0 metadata differences
0 CNA types leaking into XNA signatures
empty compatibility allow-list
```

The separately measured `GamerServices`, `Avatar` and `Net` profile adds another 75 of 75 types with no metadata differences.

The more important application-level evidence is that **81 of the 83 official Microsoft XNA Game Studio 4.0 samples run on CNA.NET**. A broader campaign covered 198 runnable programs from 85 open-source XNA 4.0 projects; **193 ran correctly** from their original C# sources.

It is therefore reasonable to say that CNA.NET already runs nearly all of the ordinary XNA 4.0 C# games exercised by that campaign. That is a measured corpus claim, not a promise that every historical project is automatically portable. Native or mixed-mode dependencies, Windows Forms, Silverlight hosts, missing proprietary assets, dead online services and FNA- or MonoGame-specific extensions remain separate migration problems.

CNA.NET is also source-first rather than binary-drop-in compatibility. Games are normally rebuilt against `CNA.XnaCompat`; matching Microsoft's strong-named assembly identity is not its primary goal. The binding is still beta, has no public NuGet/native-binary distribution and is not behaviorally complete.

The detailed evidence and project list are in [XNA 4.0 C# games run on CNA.NET too](/2026/10/12/xna-4-0-c-sharp-games-run-on-cna-net-too/).

---

## CNA is the youngest implementation

This is important to state clearly.

FNA and MonoGame have years of production use behind them.

CNA is still a young 0.x framework, and CNA.NET is not yet release-ready.

Its compatibility evidence is already substantial, but evidence over a large corpus and years of production use are not the same thing.

Today the relationship is roughly:

```text
FNA
    mature preservation runtime

MonoGame
    mature general-purpose XNA successor

CNA
    young native C++ runtime
    + broadly exercised C# compatibility layer
```

CNA should therefore not be presented as automatically more proven than FNA or MonoGame.

It is not.

Its interesting characteristics are elsewhere.

---

## Compatibility philosophies compared

The four frameworks can be placed on a spectrum.

```text
                          EVOLUTION
                             ↑
                             │
                     MonoGame
                             │
                             │       CNA / CNA.NET
                             │
                             │
XNA original ────────────────┼──────────────► new systems
                             │
                     FNA     │
                             │
                             ↓
                         PRESERVATION
```

This diagram is necessarily simplified.

CNA is unusual because its native and managed entry points try to do both:

```text
preserve XNA behavior
        +
add explicitly separated CNA functionality
```

The separation is important.

Instead of silently redefining XNA classes wherever possible, CNA uses its own extension concepts such as:

```text
CNAEXT
CNJ
CNB
Renderer API
Platform API
C API and language bindings
```

The intention is that:

```text
XNA compatibility
```

and:

```text
CNA evolution
```

do not have to be the same layer.

---

## XNA API surface

At the conceptual level, all four frameworks share large areas such as:

```text
Microsoft.Xna.Framework

Microsoft.Xna.Framework.Graphics

Microsoft.Xna.Framework.Content

Microsoft.Xna.Framework.Input

Microsoft.Xna.Framework.Audio

Microsoft.Xna.Framework.Media
```

and concepts including:

```text
Vector2
Vector3
Matrix
Quaternion
Color

Game
GameTime

GraphicsDevice
SpriteBatch

Texture2D
RenderTarget2D

VertexBuffer
IndexBuffer

Effect
BasicEffect

Model

Keyboard
Mouse
GamePad
```

This shared vocabulary is the reason moving between these frameworks can feel surprisingly familiar.

The implementation underneath it can nevertheless be completely different.

---

## Content: XNA

Original XNA included one of its most characteristic components:

**the XNA Content Pipeline.**

Authoring assets were processed at build time:

```text
PNG
FBX
WAV
SpriteFont
FX
...
   │
   ▼
XNA Content Pipeline
   │
   ▼
XNB
```

The game then used:

```csharp
Content.Load<Texture2D>("player");
```

without needing to know how `player.xnb` had been produced.

The pipeline supported custom importers and processors and was tightly integrated with the XNA development environment.

---

## Content: FNA

FNA intentionally does **not** provide its own replacement Content Pipeline.

This is a deliberate design decision, not a missing feature.

FNA's documentation states that it supports the XNA content system for preservation, but recommends specialized/custom content tooling for new projects rather than recreating another enormous XNA-style build pipeline.

For an existing XNA game the normal concept is:

```text
existing XNB
    │
    ▼
   FNA
```

FNA also extends `Content.Load` to support several raw formats directly, including common image and audio formats.

So FNA deliberately separates:

```text
runtime XNA compatibility
```

from:

```text
providing a giant replacement asset compiler
```

---

## Content: MonoGame

MonoGame took the opposite path and built its own XNA-style content tooling.

Its system is centered around:

```text
MGCB
MonoGame Content Builder
```

with:

```text
importers
processors
custom processors
MGCB Editor
```

and support for importing existing XNA `.contentproj` projects into its tooling.

Conceptually:

```text
source assets
     │
     ▼
    MGCB
     │
     ▼
MonoGame compiled content
```

For developers who liked the original XNA content workflow, MonoGame therefore provides the most direct modern continuation of that style.

---

## Content: CNA

CNA has gone still further and now has several content representations.

Its native architecture includes:

```text
CNJ
    CNA Content JSON

CNB
    CNA Binary Content

XNB
    XNA compatibility format
```

The CNA Content Pipeline can process source assets and produce native CNB content.

It can also produce XNB for XNA-compatible workflows.

CNA additionally supports source formats such as glTF through its own importer architecture.

For an existing C# game, CNA.NET normally keeps the game's authentic XNA-built `.xnb` files. Its managed content layer implements XNA reader activation, shared resources, custom `ContentTypeReader<T>` types and LZX handling above CNA's native loader. The 81 official samples that run on CNA.NET use content produced by the real XNA 4.0 pipeline rather than silently replacing it with CNB.

Conceptually:

```text
PNG ───────┐
WAV ───────┤
glTF ──────┤
CNJ ───────┤
XNB ───────┤
           ▼
    CNA Content Pipeline
           │
       ┌───┴───┐
       ▼       ▼
      CNB     XNB
```

This is a much larger content-tooling scope than FNA intentionally attempts.

It is also considerably newer and less battle-tested than either FNA's runtime content compatibility or MonoGame's MGCB ecosystem.

---

## XNB compatibility

The format relationship is worth separating carefully.

Original XNA:

```text
XNA Content Pipeline
        ↓
       XNB
```

FNA:

```text
existing XNA XNB
        ↓
       FNA
```

MonoGame:

```text
MGCB
 ↓
MonoGame's XNB-based content ecosystem
```

CNA:

```text
XNB compatibility
       +
native CNB
       +
human-readable CNJ
```

FNA's documentation notes that both FNA and MonoGame can consume most original XNA content, while their own tooling and some formats — particularly effects — have important differences.

---

## Effects and shaders

This is another area where the philosophies become visible.

Original XNA used its Effect system and HLSL-oriented build pipeline.

The typical application interface was:

```csharp
Effect
EffectTechnique
EffectPass
EffectParameter
```

with stock effects such as:

```text
BasicEffect
AlphaTestEffect
DualTextureEffect
EnvironmentMapEffect
SkinnedEffect
```

---

## FNA effects

FNA places strong emphasis on preserving the original XNA effect model.

It supports XNA Effect binaries and FXC-produced Effect Framework binaries and translates them for other graphics APIs through its runtime graphics infrastructure.

This is consistent with FNA's preservation goal:

```text
old XNA shader asset
       │
       ▼
      FNA
       │
       ▼
modern host platform
```

rather than requiring an old game to redesign its entire shader system.

---

## MonoGame effects

MonoGame provides its own shader compilation technology as part of its broader tooling ecosystem.

Its shader infrastructure has evolved independently from the original Microsoft XNA implementation.

[MonoGame 3.8.5](https://monogame.net/blog/2026-07-15-3.8.5-release-2026/) introduced its new native backend, a Vulkan target and a Windows DirectX 12 target. These are shipping successor features rather than details inherited from XNA's original implementation.

Again, this represents the project's successor philosophy.

MonoGame does not need every internal implementation detail to remain frozen in 2010.

---

## CNA effects

CNA tries to maintain original Effect semantics while simultaneously supporting graphics systems that XNA never knew about.

That means CNA contains several overlapping layers:

```text
XNA-compatible Effect API

compiled XNA Effect compatibility

PbrEffect / SkinnedPbrEffect

ShaderEffect

CNAEXT modern shader packages
```

For new CNA graphics code, shader packages carry renderer-selected representations such as:

```text
GLSL ES
desktop GLSL
SPIR-V
WGSL
```

while old XNA-style games can remain on the Effect abstraction.

This duality is typical of CNA's architecture:

```text
do not delete the old abstraction

add another layer when the old abstraction is insufficient
```

---

## Graphics: original XNA

XNA 4.0 came from the Direct3D-era Microsoft ecosystem.

Its API was deliberately higher level than raw Direct3D but still exposed many GPU concepts:

```text
VertexBuffer
IndexBuffer
RenderTarget2D

BlendState
RasterizerState
DepthStencilState
SamplerState

Effect
```

The API has aged remarkably well.

But modern rendering now expects concepts that did not exist as first-class XNA abstractions.

Examples include:

```text
compute shaders
storage buffers
GPU-driven rendering
modern explicit synchronization
PBR pipelines
HDR post chains
image-based lighting
```

---

## Graphics: FNA

FNA's graphics implementation is designed to make XNA graphics semantics work correctly across modern platforms.

The emphasis remains:

```text
make the XNA API work
```

rather than:

```text
turn XNA into Unreal Engine
```

FNA does provide extensions where they solve practical portability or hardware problems, including additional surface formats and other `EXT` APIs.

But FNA intentionally remains recognizably an XNA runtime.

That restraint is one of its strengths for preservation.

---

## Graphics: MonoGame

MonoGame has historically provided several graphics paths and has now shipped another significant modernization.

Its supported desktop stack includes OpenGL and DirectX paths, while 3.8.5 added the native-backend Vulkan target and Windows DirectX 12 target.

This makes MonoGame increasingly interesting for developers who want:

```text
XNA-style C#
        +
modern platform evolution
```

without leaving the .NET ecosystem.

---

## Graphics: CNA

Graphics remains one of CNA's clearest architectural differences.

CNA has a renderer abstraction designed to allow the same high-level framework to sit above many graphics implementations.

The current set is deliberately curated: ten public identities over eight implementation families.

```text
OPENGLES3   OPENGL33   WEBGL2
WEBGPU      SDL_GPU    FNA3D
DIRECTX9    SOFTWARE   HEADLESS   STUB
```

The three GL identities share the internal EasyGL family. `SDL_GPU` lets SDL own the Vulkan, Direct3D 12 and Metal backends instead of presenting each as a separate CNA renderer.

Above the XNA contract, CNA retains features such as:

```text
PbrEffect and SkinnedPbrEffect
IBL
shadow reception
float render targets
instancing
compiled XNA effects
Texture3D and TextureCube
portable ShaderEffect packages
```

The optional `CNAEXT` module is now intentionally bounded. It contains portable CRT, ASCII and colour-depth/dithering effects, debug drawing and shader-package helpers. The former HDR render pipeline, pass framework, shadow engine, clustered renderer, probe system, compute/storage abstractions, indirect drawing and GPU timers were removed during the alpha-stage scope reduction.

The retained CNA-owned systems are explicitly outside the original XNA 4.0 contract.

That allows CNA to say:

```text
Microsoft::Xna::Framework
    compatibility layer

CNAEXT and CNA-owned formats
    CNA evolution layer
```

rather than silently pretending these features were part of XNA.

---

## Renderer philosophy

The four projects therefore approach graphics differently.

```text
XNA
    one historical Microsoft implementation

FNA
    reproduce XNA graphics semantics portably

MonoGame
    preserve the familiar API while evolving backends

CNA
    preserve the XNA-facing API
    + expose a curated renderer set
    + keep bounded extensions separate
```

CNA formerly explored dozens of renderer identities. Forty-one have now been retired, and the project explicitly does not plan to add or restore renderers without a new owner decision.

The surviving renderers still have different capability and qualification levels. Being selectable does not mean every CNA graphics feature is equally complete on every family.

---

## Platform support

The original XNA 4.0 world was relatively narrow.

Its important targets were:

```text
Windows
Xbox 360
Windows Phone
```

Those were first-class Microsoft platforms of the time.

Modern XNA successors exist largely because developers wanted to take the same programming model elsewhere.

---

## FNA platforms

[FNA's public documentation](https://fna-xna.github.io/) describes desktop portability as its primary focus and supports Windows and GNU/Linux from the same managed assembly model.

It also documents support for Apple platforms and lists Xbox One/Series, Nintendo Switch and PlayStation 5 among its additional targets. Closed-console deployment naturally still depends on having appropriate platform access.

This is particularly impressive given FNA's strict compatibility focus.

---

## MonoGame platforms

[MonoGame currently advertises](https://docs.monogame.net/articles/getting_started/platforms.html) a very broad platform matrix.

Its public project documentation includes:

```text
Windows
Linux
macOS

Android
iOS / iPadOS

PlayStation 4
PlayStation 5

Xbox

Nintendo Switch 1
Nintendo Switch 2
```

with [console targets available to appropriately registered developers](https://docs.monogame.net/articles/console_access.html).

This is one of MonoGame's strongest advantages today.

For a commercial C# game that needs broad established platform coverage, MonoGame has a maturity advantage CNA does not currently have.

---

## CNA platforms

CNA is much earlier in this process, and its targets have deliberately different evidence levels.

Its intended target family includes:

```text
Windows
Linux
macOS
Android
iOS / iPadOS
Web / WebAssembly
```

but these targets do not yet have equal verification.

Linux x86_64 is CNA's main development and full-suite environment. Windows builds run under Wine through DXVK for `DIRECTX9` and vkd3d-proton for SDL_GPU's Direct3D 12 path, but current real-Windows hardware qualification is still missing. `WEBGL2` and `WEBGPU` run in Chrome, while Android's default `OPENGLES3` path is exercised on an x86_64 emulator.

Apple support has moved beyond source-only status. macOS CI builds the `SOFTWARE` path, runs portable suites and a bundle smoke application, with an SDL_GPU Metal smoke job as a separate gate. iOS final-links device and simulator applications and runs a `SOFTWARE` simulator smoke; physical-device qualification and the SDL_GPU iOS path remain incomplete.

And unlike FNA and MonoGame:

**CNA currently supports no game consoles.**

That includes:

```text
Nintendo
PlayStation
Xbox
```

CNA's current maintenance scope contains no console implementation.

---

## Web is an interesting CNA difference

One area where CNA takes a different route is WebAssembly.

CNA contains an Emscripten/WebAssembly target with `WEBGL2` and `WEBGPU` renderer paths.

That allows an architecture such as:

```text
C++ CNA game
     │
     ▼
Emscripten
     │
     ▼
WebAssembly
     │
     ▼
browser
```

with real rendering exercised in Chrome.

Web is therefore treated as a genuine CNA target rather than as an unrelated third-party port.

CNA.NET also has a browser route for C# games; its compatibility campaign has executed representative games in headless Chromium. That is useful runtime evidence, but not a claim about every browser, physical GPU, audio path or interactive host.

---

## Console support comparison

The console situation can be summarized approximately as:

| Framework | Console story |
| --- | --- |
| XNA 4.0 | Xbox 360 was an original first-class target |
| FNA | Modern console support exists for several platforms, subject to platform access |
| MonoGame | Broad modern console support for registered developers |
| CNA | No console support today |

This is currently one of the clearest areas where CNA is behind FNA and MonoGame.

Architecture can make a future console port easier.

It cannot substitute for an actual console port.

---

## Tooling

The development environments are also very different.

## XNA 4.0

XNA was deeply associated with Microsoft's development stack of its era:

```text
Visual Studio 2010 generation
XNA Game Studio
MSBuild
Content projects
```

Using the original toolchain today is increasingly an exercise in legacy software maintenance.

Even current Windows installations can require workarounds for the old installer and dependencies.

---

## FNA tooling

FNA is a modern .NET project but intentionally keeps its workflow relatively direct.

Its documentation recommends referencing the FNA project directly rather than relying on unofficial NuGet packaging.

An existing XNA project can often be adapted by replacing XNA references with FNA while retaining already-built content.

This makes FNA particularly suitable for porting.

---

## MonoGame tooling

MonoGame provides the most complete modern managed development environment of the three successors.

It includes:

```text
.NET project templates

NuGet packages

MGCB

MGCB Editor

shader compiler tooling

documentation and tutorials
```

and integrates naturally with IDEs such as Visual Studio, VS Code and Rider.

For a developer who wants a contemporary C# workflow, this is a major advantage.

---

## CNA tooling

Native CNA lives in the C++ ecosystem. Its normal toolchain involves:

```text
CMake
Ninja or another CMake generator
GCC
Clang
MSVC-compatible compilers
CLion / VS Code / other C++ IDEs
```

Content compilation is handled by CNA's own tools rather than XNA Game Studio.

Examples include:

```text
cna-content

cna_tool_gltf_to_cnj
cna_tool_gltf_to_cnb
cna_tool_cnj_to_cnb
```

For C# developers, CNA.NET adds a separate .NET 8+ workflow. An existing game keeps its original `.cs` files and gains a small SDK-style wrapper project that references `CNA.XnaCompat`; a new project can start from the installable `dotnet new cna-game` template.

That makes CNA usable from Visual Studio, VS Code, Rider and the `dotnet` CLI without changing the language of an XNA game. The trade-off is distribution maturity: CNA.NET is still built from source, its matching native CNA library must be supplied explicitly, and no public NuGet/native-binary release currently hides that setup.

---

## Licensing

Licensing is relatively simple for the three open-source descendants.

| Framework | Main licence |
| --- | --- |
| XNA 4.0 | Microsoft proprietary software licence |
| FNA | Microsoft Public License |
| MonoGame | Microsoft Public License, with some portions under other compatible terms |
| CNA | Microsoft Public License |

FNA's repository explicitly uses Ms-PL.

MonoGame is also primarily Ms-PL.

CNA uses the same licence family, which is particularly useful because some CNA work is derived from or informed by existing Ms-PL XNA reimplementation work.

---

## Which is closest to original XNA?

If the question is strictly:

> Which current framework most strongly prioritizes behaving exactly like XNA 4.0?

the answer is:

**FNA.**

That is its explicit project mission and it has years of shipped-game evidence behind it.

CNA also invests heavily in XNA parity. CNA.NET exactly matches the selected XNA 4.0 public metadata profile and already runs nearly all games in its broad application campaign, while native CNA settles disputed behavior against genuine XNA measurements. Its remaining disadvantage here is maturity and incomplete behavioral/platform qualification, not a lack of compatibility ambition.

MonoGame maintains high XNA familiarity but deliberately allows itself to evolve.

---

## Which has the largest modern XNA ecosystem?

Today, the strongest answer is:

**MonoGame.**

It has:

```text
mature tooling
large user base
modern .NET integration
desktop support
mobile support
commercial games
console support
content pipeline
documentation
```

and continues to receive major graphics/backend development.

For many new C# projects, that combination is compelling.

---

## Which is best for preserving an existing XNA game?

For the most mature preservation-focused runtime, the default answer remains:

**FNA.**

Its architecture, development philosophy and production history are explicitly shaped around that problem.

But CNA.NET is now a credible fourth route for original C# source, not merely a future possibility. Its campaign ran 193 of 198 runnable programs from 85 open-source XNA projects and 81 of 83 official samples. A project that wants to preserve its C# game while moving the implementation underneath it to CNA's C++ core can therefore choose:

```text
existing XNA C# source
        │
        ▼
     CNA.NET
        │
        ▼
native CNA runtime
```

The choice is not only about compatibility percentages. FNA offers the more established preservation runtime and shipping history. CNA.NET offers the CNA renderer, content, platform and C API architecture underneath the familiar C# surface, but currently demands source builds and more careful qualification.

---

## Which is best if you want C++?

Of these four:

**CNA.**

That is the fundamental reason CNA exists as a separate project.

FNA and MonoGame solve the problem while preserving the managed C# implementation model. CNA also offers the same XNA-facing C# source model through CNA.NET, but routes it into a native C++ core.

CNA asks a different question:

> What if the XNA 4.0 programming model were available as a native modern C++ framework?

That produces:

```cpp
Microsoft::Xna::Framework::Vector3
Microsoft::Xna::Framework::Graphics::Texture2D
Microsoft::Xna::Framework::Graphics::SpriteBatch
Microsoft::Xna::Framework::Content::ContentManager
```

for a native game. CNA.NET is available when keeping the original C# is the better choice.

---

## Which exposes the widest CNA-owned graphics surface?

CNA still goes beyond strict XNA with PBR effects, portable shader packages, glTF integration, CPU rendering and a small CNAEXT effect/debug module.

But it is no longer accurate to describe the project as an ever-expanding renderer experiment. The set is frozen at ten public identities over eight families, 41 older identities are retired, and the former general-purpose HDR/compute engine layer has been removed.

The useful distinction is now:

```text
XNA-compatible graphics contract
        +
curated renderer choices
        +
bounded CNA-owned extensions
```

Qualification remains renderer-dependent.

---

## Which is safest for a commercial game today?

There is no universal answer, but maturity matters.

For a new C# commercial game:

```text
MonoGame
```

is currently the most obvious broad-platform choice of these frameworks.

For porting an existing XNA game while preserving its behavior:

```text
FNA
```

is an extremely strong choice.

For a new native C++ project that specifically wants the XNA model and accepts a young 0.x framework:

```text
CNA
```

may be interesting.

For an existing C# XNA game, CNA.NET already has unusually broad corpus evidence, but its source-first setup and incomplete release/platform qualification still make it a more hands-on choice than FNA or MonoGame.

For a new production game, original XNA itself generally makes little sense as the primary framework because Microsoft discontinued it and its toolchain belongs to an older Windows development environment.

---

## CNA.NET overlaps with FNA's use case, not its architecture

This distinction is important.

FNA has an extremely focused reason to exist:

```text
preserve XNA games
```

CNA.NET now addresses the same starting problem — running existing XNA C# source — but does so through CNA's C API and native C++ runtime. It does not need to defeat FNA at preservation to justify that architecture.

CNA's direction is broader:

```text
XNA API compatibility
        │
        ├── native C++23
        ├── CNA.NET for C# source
        ├── C API and other bindings
        ├── curated renderer abstraction
        ├── Platform API
        ├── CNA Content Pipeline
        ├── CNJ
        ├── CNB
        ├── glTF
        └── CNAEXT modern graphics
```

That is a different project.

FNA deliberately avoids some of this scope.

CNA now keeps this broader scope curated rather than continually adding new subsystems.

---

## CNA is not trying to become MonoGame either

MonoGame already provides a strong answer to:

> What should a modern cross-platform C# successor to XNA look like?

Recreating MonoGame feature-for-feature would not be especially interesting, even though CNA.NET now gives CNA a C# entry point.

CNA instead has a different opportunity:

```text
strict XNA application API

        +

native C++ runtime and C ABI

        +

curated CNA-owned content and graphics extensions
```

The strict managed facade and the CNA-owned extensions remain separate. CNA.NET does not add FNA- or MonoGame-specific APIs merely to increase the number of projects that compile.

---

## And none of them replace original XNA as the reference

Despite being discontinued, original XNA remains historically important.

It is the common ancestor.

When compatibility questions become difficult, the real framework remains the strongest oracle for questions such as:

```text
What did XNA actually do?

What bytes did its Content Pipeline produce?

Which exception did it throw?

How did this math type behave?

What happened in this GraphicsDevice edge case?
```

FNA, MonoGame and CNA can each choose how closely they want to reproduce that answer.

But XNA defines the answer they are comparing themselves against.

---

## Four philosophies

The difference can ultimately be summarized in four sentences.

## XNA 4.0

> This is the original XNA.

It defines the programming model and behavior the others inherited.

## FNA

> Keep XNA alive.

Reimplement XNA as accurately as possible and make existing games portable without unnecessarily changing what XNA means.

## MonoGame

> Continue XNA.

Keep the familiar programming model while evolving the framework, tooling and platform support for modern .NET game development.

## CNA

> Rebuild XNA around a native C++ core and make it available to both C++ and C# games.

Preserve the XNA programming model where compatibility matters, expose it to original C# source through CNA.NET and keep additional CNA-owned systems explicitly separate.

---

## Choosing between them

A practical decision tree looks approximately like this:

```text
Do you specifically need the historical Microsoft implementation?
    │
    └── yes ─► XNA 4.0
               mainly for legacy/reference purposes

Do you have an existing C# XNA game and want the most established
accuracy-first preservation runtime?
    │
    └── yes ─► FNA

Do you want to keep that C# source but run it on CNA's native core,
and accept a beta, source-first toolchain?
    │
    └── yes ─► CNA.NET

Do you want a mature modern C# XNA-style framework
with broad desktop/mobile/console support?
    │
    └── yes ─► MonoGame

Do you specifically want native C++23,
XNA-style APIs, CNA's curated renderer set,
and its native content/platform architecture?
    │
    └── yes ─► CNA
```

There is no need for one project to make the others obsolete.

They exist because the end goal is different.

---

## Source projects

The projects discussed here are:

- Microsoft XNA Framework 4.0 — the original Microsoft framework;
- [FNA](https://github.com/FNA-XNA/FNA);
- [MonoGame](https://github.com/MonoGame/MonoGame);
- [CNA](https://github.com/libcna/cna);
- [CNA.NET](https://github.com/libcna/cna-dotnet) — CNA's C#/.NET binding.

Their own documentation is the best source for current platform and tooling details because all three active projects continue to evolve.

---

## Conclusion

XNA 4.0, FNA, MonoGame and CNA share a recognizable programming model, but they represent four different points in the history of that model.

```text
             Microsoft XNA 4.0
                    │
          original programming model
                    │
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
      FNA       MonoGame        CNA

  preserve       evolve      native C++ core
    XNA            XNA       + CNA.NET for C#
```

**XNA 4.0** is the historical original.

**FNA** is the strongest preservation-oriented continuation.

**MonoGame** is the mature modern C# successor with the broadest established general-purpose ecosystem.

**CNA** is the newest member of the family: a native C++23 reimplementation with a curated renderer/content/platform architecture. **CNA.NET** places an exact selected XNA 4.0 C# metadata facade above that core and already runs nearly all games in its measured open-source corpus.

Today, FNA and MonoGame are considerably more mature choices for shipping games.

CNA's advantage is not maturity.

Its opportunity is a different architecture:

```text
XNA-style API
     +
native C++
     +
CNA.NET for existing C# source
     +
curated renderers and bounded graphics extensions
     +
native content formats
     +
new platform abstractions
```

If CNA and CNA.NET continue to mature while retaining a clearly separated XNA-compatible core, they can occupy a position that neither FNA nor MonoGame is trying to occupy:

**one native C++ implementation that serves both new C++ programs and original XNA 4.0 C# games.**
