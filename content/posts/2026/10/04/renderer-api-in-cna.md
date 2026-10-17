---
title: Renderer API in CNA
date: 2026-10-04T12:33:36Z
updated: 2026-10-17T12:52:56Z
description: |
  CNA currently exposes 10 renderers across 8 implementation families.
author: Robert Vokac
categories:
  - Graphics
tags:
  - Renderers
  - Architecture
  - Renderer API
  - GraphicsDevice
  - Capabilities
  - CNAEXT
  - Refactoring
originalUrl: https://blog.libcna.com/2026/10/04/renderer-api-in-cna/
classicpressId: 42
classicpressStatus: future
draft: false
---

CNA currently exposes **10 renderers across 8 implementation families**.

Those renderers are extremely different.

OpenGL, WebGPU, Direct3D 9, SDL_GPU, FNA3D, software rendering and Headless do not have much in common at the native API level.

Yet all of them can sit underneath the same XNA-style `GraphicsDevice`.

The reason is CNA's internal **Renderer API**.

## The application never talks directly to the renderer

A normal CNA application uses the XNA-facing graphics API:

```text
Game
 ↓
GraphicsDevice
 ↓
Textures / Buffers / Effects / SpriteBatch
 ↓
CNA Renderer API
 ↓
OpenGL / WebGPU / Direct3D 9 / SDL_GPU / Software / ...
```

Renderer-specific classes live below the public XNA API.

The application does not normally construct a `WebGPURenderer` or call Direct3D directly.

Instead, `GraphicsDevice` translates the common CNA/XNA graphics model into the renderer contract.

That boundary is what allows the implementation underneath an application to change without changing the application's high-level graphics API.

## GraphicsRendererType

Every public renderer identity is represented by:

```cpp
CNA::GraphicsRendererType
```

The current public set contains 10 identities:

```text
OPENGLES3
OPENGL33
WEBGL2

WEBGPU

DIRECTX9

SDL_GPU
FNA3D

SOFTWARE

HEADLESS
STUB
```

The set was deliberately reduced on 13 October 2026. `VULKAN`, `DIRECTX11`, `METAL` and `SDL_RENDERER` were retired rather than aliased to another renderer. Their C ABI values remain permanently reserved, and configuration or runtime selection that still names one of them is refused with a retirement-specific error.

`SDL_GPU` is now CNA's modern native path. SDL chooses Vulkan, Direct3D 12 or Metal underneath it according to the host platform. `WEBGPU` remains CNA's direct modern renderer for native and browser targets.

An identity does not necessarily mean a completely independent implementation.

The most important example is **EasyGL**.

OpenGL ES 3, OpenGL 3.3 and WebGL 2 are three separate public identities, but they share one EasyGL implementation family.

`GraphicsRendererType` describes which renderer CNA exposes to the rest of the framework.

## Selection is normally compile-time

The simplest and recommended CNA configuration still builds one renderer:

```text
CNA_GRAPHICS_RENDERER=SDL_GPU
```

In that configuration there is almost no runtime renderer-selection problem.

The application has one renderer family and CNA uses it.

But CNA also supports optional multi-renderer builds.

A build can provide several identities through:

```text
CNA_GRAPHICS_RENDERERS=...
```

Those renderer families are linked into the same application.

`GraphicsRendererSelection` can then select which renderer should actually be used before the first `GraphicsDevice` is created.

Selection can come from:

1. an explicit `SetPreferred()` request,
2. the `CNA_GRAPHICS_RENDERER` environment variable,
3. the build's default renderer.

Once creation of the first graphics device begins, the renderer choice becomes **latched**.

The implementation cannot simply be replaced underneath an already-running `GraphicsDevice`.

## The renderer registry

A multi-renderer build needs to know exactly which renderer implementations are linked into the executable.

CNA uses `GraphicsRendererRegistry` for this.

Importantly, it does **not** rely on static self-registration.

Instead, CMake generates an explicit renderer registry at build time.

This avoids an important problem with static libraries.

If registration depended only on a static initializer inside a renderer object file, a linker could decide that the object file was otherwise unused and discard it before its registration code ever ran.

The generated registry avoids that ambiguity.

It is deterministic and exposes operations such as:

```text
All()
Count()
Find(GraphicsRendererType)
Find(name)
Default()
```

A normal single-renderer build simply has one registry entry.

A multi-renderer build has the set explicitly selected for that build.

## A renderer needs information before it exists

Renderer abstraction has a chicken-and-egg problem.

Some decisions must be made **before the renderer object itself can be constructed**.

For example:

- Does it need a window?
- What kind of window does it need?
- Does it need an OpenGL context?
- Does it need particular framebuffer attributes?
- Does it need a platform surface presenter?
- Is the renderer worth attempting on this machine?
- Which platform services must be supplied to it?

A virtual method on `IGraphicsRenderer` cannot answer these questions because the renderer has not been created yet.

CNA solves this with:

```cpp
GraphicsRendererDescriptor
```

Every renderer family provides a static descriptor describing the information that must be known before construction.

The descriptor contains data such as:

- renderer identity and public name
- required window kind
- whether a real window is needed
- whether video/window-system initialization is needed
- OpenGL framebuffer requirements
- required narrow platform services
- a cheap availability probe
- the renderer creation function
- adapter-level query hooks

This keeps renderer creation declarative instead of filling `GraphicsDevice` with a growing collection of renderer-specific branches.

## RendererWindowKind

One important part of the descriptor is `RendererWindowKind`:

```text
None
Plain
OpenGL
```

This describes the coarse kind of window environment required before the renderer exists.

A Headless or CPU-oriented renderer may not need a graphics window at all.

Direct3D 9, SDL_GPU and WebGPU use a plain window.

OpenGL requires a window/context configuration appropriate for OpenGL.

Headless, Software and Stub use `None` because they do not require a graphics window.

This also matters when renderer fallback is enabled.

If one renderer fails and CNA wants to attempt another, the existing window may or may not be compatible with the next renderer.

A plain window is not automatically interchangeable with one prepared for OpenGL.

The descriptor gives CNA enough information to make this decision before constructing the next backend.

## The Renderer API no longer assumes SDL owns the platform

The renderer architecture is closely connected to CNA's Platform API.

But the two are separate.

CNA now has three platform implementations:

- SDL3
- Headless
- Terminal

The renderer should not need to know which one created the host environment.

A Direct3D renderer should care that it has an appropriate Windows native handle.

It should not reach through the platform implementation to obtain it. CNA's current windowed platform is SDL3; the direct Win32, X11 and Wayland platform implementations were retired on 6 October 2026.

Headless and Terminal cover hosts without a graphical window system, while renderers continue to consume only the platform data and services they actually need.

## Platform services are deliberately narrow

A renderer does not simply receive the entire platform implementation and gain unrestricted access to it.

`GraphicsRendererCreateArgs` contains platform-neutral information such as a renderer surface snapshot:

```text
WindowId
NativeWindowHandle
drawable size
display scale
```

Depending on the renderer descriptor, a renderer can also receive narrow services such as:

```text
IPlatformGlContext
IPlatformSurfacePresenter
```

An OpenGL renderer can ask for an OpenGL context.

A CPU renderer can hand completed pixels to a platform surface presenter.

The renderer does not need to become a second platform implementation.

This is one of the architectural boundaries that allows CNA's renderer layer to remain independent from SDL and from any single native window system.

## IGraphicsRenderer

After construction, the central runtime renderer contract is:

```cpp
CNA::Internal::Renderers::IGraphicsRenderer
```

This is the main bridge between `GraphicsDevice` and the active renderer implementation.

It covers areas including:

- clearing and presenting
- viewport and presentation management
- render targets
- textures
- vertex and index buffers
- graphics state
- draw calls
- effects and shaders
- resource limits
- format support
- context and device recovery
- capability queries
- coordinate conversion

The interface also contains default behavior for functionality that not every renderer implements.

That is important.

A renderer that cannot rasterize 3D geometry or sample a volume texture does not need to fake that functionality simply to satisfy the common interface.

It can refuse unsupported functionality explicitly.

## Resource interfaces

Not everything is placed directly inside `IGraphicsRenderer`.

Renderer-owned resources are divided into smaller interfaces such as:

```text
IVertexBufferRenderer
IIndexBufferRenderer

IOcclusionQueryRenderer

ITextureRenderer
ITextureCubeRenderer
ITexture3DRenderer

IRenderTargetRenderer
IRenderTargetCubeRenderer

ISpriteBatchRenderer
IEffectRenderer
```

A public XNA-style `Texture2D` therefore does not need to know whether its implementation is:

- an OpenGL texture object
- a WebGPU texture
- an SDL_GPU texture
- a Direct3D 9 resource
- or CPU-owned memory

It communicates through the common renderer-side resource contract.

This decomposition is one of the most important mechanisms allowing radically different rendering technologies to live underneath the same framework.

## Capabilities are essential

An abstraction across 10 very different renderers cannot work by pretending that every renderer has identical capabilities.

CNA still has the broader `GraphicsCapability` concept for high-level capability questions.

But modern CNA also contains a substantially more detailed renderer-capability model.

This matters because simply knowing the name of a renderer often does not tell an application enough.

## RendererFeature

`RendererFeature` currently defines **28 live atomic renderer features**.

Its public numeric space still reaches ordinal 31. Four ordinals formerly used by the retired modern GPU layer remain reserved so the C ABI never silently reassigns an old feature number.

Instead of asking only whether a backend vaguely "supports shaders", CNA can distinguish things such as:

- a complete 3D graphics pipeline
- depth/stencil support
- MSAA
- multiple render targets
- anisotropic filtering
- wireframe rasterization
- occlusion queries
- accepting source-based `ShaderEffect` objects
- actually executing the supplied shader source
- compiled XNA effects
- Texture3D storage
- Texture3D sampling
- instancing
- base-instance drawing
- shadow sampling
- image-based lighting
- particular shader dialects

Each feature has a `RendererFeatureSupport` value:

```text
Unknown
Unsupported
Supported
Restricted
```

`Restricted` is especially useful.

Real graphics capabilities are often not simply yes or no.

A renderer may support a documented subset of a feature without honestly satisfying the complete contract.

Likewise, `Unknown` is intentionally different from `Unsupported`.

An unaudited capability should not automatically be reported as impossible.

## Numeric limits

Feature support is only part of the problem.

Graphics devices also have numerical limits.

`RendererLimit` currently defines **8 live numeric limits**:

- maximum texture dimension
- maximum vertex streams
- maximum uniform-buffer size
- maximum sampled textures per shader stage
- maximum vertex input bindings
- maximum vertex attributes
- maximum color attachments
- uniform-buffer alignment

As with renderer features, retired limit ordinals remain reserved in the public numeric space.

This prevents higher-level code from assuming that every renderer and every physical device has identical hardware limits.

## Surface formats have their own capability model

Even saying that a renderer "supports a format" is too vague.

A format might work as a texture but not as a render target.

It may be renderable but not filterable.

It may support transfer operations but not mipmapping or multisampling.

`RendererFormatUsage` therefore represents individual uses:

```text
TextureStorage
Sampled
Filterable
RenderTarget
Blendable
TransferSource
TransferDestination
Mipmapped
Multisample
ColorTransfer
```

The capability profile tracks both which questions have been answered and which usages are actually supported.

Again, **unknown is not the same as unsupported**.

That distinction is important while renderer audits and hardware qualification continue.

## RendererCapabilityProfile

Detailed information is collected into an immutable:

```cpp
RendererCapabilityProfile
```

owned by the active `GraphicsDevice`.

It contains information such as:

- renderer name
- detailed feature support
- numeric limits
- per-format usage support
- renderer- or device-specific limitations

It can also produce a human-readable capability report.

This reflects an important direction for CNA.

Applications, tests and developer tools should increasingly be able to ask:

> What can the active renderer actually do?

rather than:

> Is the renderer named WebGPU?

The first question scales much better.

It also works better in multi-renderer builds and with translation layers whose behavior may depend on the actual device underneath them.

## Shader dialects

Custom shader support is another case where renderer identity alone is not sufficient.

CNA exposes `ShaderDialectEXT`:

```text
Unknown
GlslDesktop
GlslEs
GlslVulkan
Hlsl
Msl
Wgsl
SpirV
```

These are shader payload dialects, not a second list of renderer identities. The presence of `GlslVulkan` or `Msl` therefore does not imply that CNA still exposes direct `VULKAN` or `METAL` renderers; the public enum and its C ABI values remain stable independently of the renderer inventory.

An application using CNAEXT shader functionality can therefore ask the active renderer which shader payload it expects rather than hard-coding an assumption based only on a renderer name.

This matters increasingly as CNA supports native APIs, browser APIs and translation layers through one graphics abstraction.

## Fallback is explicit

CNA can optionally attempt another renderer when the preferred renderer is unavailable.

But fallback is **disabled by default**.

If an application asks for WebGPU, CNA should not quietly give it Software rendering and pretend nothing happened.

When fallback is explicitly enabled, CNA records why candidates were rejected.

`GraphicsRendererFallbackReason` includes:

```text
NotCompiledIn
ProbeUnavailable
InitializationFailed
WindowKindConflict
```

The application can inspect the fallback history and understand what actually happened.

Renderer independence should not mean hidden behavior.

## Why this architecture can support many renderers

There is no single trick that allows 10 public identities to coexist.

It is the combination of several boundaries:

```text
GraphicsRendererType
        ↓
GraphicsRendererDescriptor
        ↓
GraphicsRendererRegistry
        ↓
GraphicsRendererSelection
        ↓
GraphicsRendererCreateArgs
        ↓
IGraphicsRenderer
        ↓
renderer resource interfaces
        ↓
capability / format / limit reporting
```

Each layer solves a different problem.

`GraphicsRendererType` identifies the public backend.

The descriptor defines what must be known before construction.

The registry knows what was compiled into the application.

Selection decides what should run.

The Platform API supplies the native environment without making the renderer itself responsible for the operating system.

`GraphicsRendererCreateArgs` carries the narrow creation-time context.

`IGraphicsRenderer` handles runtime graphics operations.

Resource interfaces hide native resource objects.

Capability profiles describe differences explicitly.

This is what allows the same framework to host:

- OpenGL through the shared EasyGL family
- WebGPU on native and browser targets
- an XNA-era API such as Direct3D 9
- SDL_GPU across Vulkan, Direct3D 12 and Metal hosts
- a CPU rasterizer
- a translation layer such as FNA3D
- and renderers that deliberately produce no pixels

without exposing those implementation details through the public XNA-facing graphics API.

## The Renderer API has also become large

Supporting this much functionality has created an architectural challenge of its own.

Several renderer implementations are very large.

In the current snapshot:

- `WebGPURenderer.cpp` is approximately **17,100 lines**
- `SdlGpuRenderer.cpp` is approximately **13,800 lines**
- `EasyGLRenderer.cpp` is approximately **11,600 lines**
- `SoftwareRenderer.cpp` is approximately **7,700 lines**

These are physical source-file line counts and include comments and formatting, so they should not be confused with the non-comment production LOC figures used elsewhere when measuring CNA's overall size.

The common `IGraphicsRenderer.hpp` file itself is now approximately **3,430 physical lines**.

The central `IGraphicsRenderer` class occupies roughly **1,280 lines** of that file and still contains well over one hundred virtual operations and extension hooks.

That growth happened gradually.

Every new graphics capability naturally needed somewhere to cross the renderer boundary:

```text
Texture3D
cube maps
multiple render targets
compiled XNA effects
instancing
HDR formats
device recovery
format and capability reporting
new presentation behavior
...
```

Adding another method was often the smallest immediate change.

Repeated across years of development, that produces a large central contract.

## The implementation classes have the same problem

The challenge is not limited to the interface.

A renderer such as WebGPU has responsibilities around:

- instance and device creation
- adapter selection
- presentation and swapchains
- synchronization
- textures
- buffers
- render targets
- pipelines
- descriptor management
- shader handling
- state translation
- draw submission
- readback
- recovery
- capability discovery

All of those responsibilities belong somewhere inside the WebGPU implementation.

They do not necessarily need to belong to **one enormous WebGPURenderer class**.

The same problem exists to different degrees in several of CNA's larger renderer families.

Very large implementation units are harder to navigate, review, test and maintain.

## The next stage should favor decomposition

The renderer abstraction itself is useful and should remain.

The XNA-facing graphics API should not need to change simply because the implementation underneath it is reorganized.

But large renderer implementations can increasingly be decomposed internally into smaller responsibilities:

```text
Renderer
 ├── Device / context
 ├── Presentation / swapchain
 ├── Resource management
 ├── Textures
 ├── Buffers
 ├── Render targets
 ├── Pipeline and state
 ├── Draw submission
 ├── Effects / shaders
 ├── Capabilities
 └── Debug / recovery
```

Some of this decomposition already exists through renderer resource interfaces and shared renderer infrastructure.

For long-term CNA maintenance, composition, smaller classes and clearer ownership boundaries are increasingly valuable.

## Adding another renderer should be boring

A good renderer abstraction should make the process of adding a new backend relatively predictable.

A future renderer should be able to:

1. receive a `GraphicsRendererType` identity,
2. provide its `GraphicsRendererDescriptor`,
3. declare its platform and window requirements,
4. provide its creation and availability functions,
5. implement the renderer interfaces relevant to its feature scope,
6. report its real capabilities and numeric limits,
7. join the generated build registry,
8. pass the common renderer and conformance tests.

Adding a backend should not require filling `GraphicsDevice` with another large collection of:

```cpp
#ifdef CNA_RENDERER_SOMETHING
```

branches.

Much of CNA has already moved toward descriptor-, registry- and interface-driven renderer integration.

There is still room to simplify the architecture further.

But supporting 10 public identities across 8 implementation families already demonstrates that the central separation works.

## One graphics model, many implementations

CNA's Renderer API is not based on the idea that OpenGL, Direct3D 9, WebGPU, SDL_GPU and a CPU rasterizer are alike.

The abstraction instead tries to define the common contract at the CNA/XNA level and describe genuine differences explicitly through:

- renderer descriptors
- window requirements
- narrow platform services
- resource interfaces
- feature support
- numeric limits
- format capabilities
- shader dialects

That separation keeps the XNA-facing API stable while CNA changes which implementations it is willing to maintain. The October retirement reduced the renderer set substantially, but it did not require applications to learn a different graphics model. That is the clearest evidence that the Renderer API is doing its job.
