---
title: CNA Modules
date: 2026-11-19T16:16:21Z
updated: 2026-10-09T18:02:52Z
description: |
  CNA is a large framework, but it is not built as one giant C++ library.
author: Robert Vokac
categories:
  - Development
tags:
  - Architecture
  - CNAEXT
  - CNA
  - Modules
  - CMake
  - Modularization
  - Dependencies
originalUrl: https://blog.libcna.com/2026/11/19/cna-modules/
classicpressId: 96
classicpressStatus: future
draft: false
---

CNA is a large framework, but it is not built as one giant C++ library.

The current architecture divides the framework into **22 physical modules**, together with a separate tree of renderer implementation families.

Each module owns a specific part of CNA, has its own source and public headers, and normally builds as an independent CMake target.

The current high-level structure is:

```text
modules/
├── core/
├── diagnostics/
├── inspector/
├── math/
├── design/
├── platform/
├── runtime/
├── graphics/
├── input/
├── audio/
├── media/
├── content/
├── content-pipeline/
├── storage/
├── devices/
├── devices-ext/
├── graphics-ext/
├── gamer-services/
├── net/
├── phone/
├── video-ffmpeg/
├── c-api/
└── renderers/
```

The 22-module count refers to the physical framework modules outside `renderers/`.

The renderer tree forms another modular layer of its own, currently containing **12 implementation families that provide 14 public renderer identities**.

Some modules are optional or conditional. For example, the C API must be explicitly enabled, FFmpeg is an optional video backend, Gamer Services and networking depend on networking being enabled, and Design is deliberately an opt-in tooling module.

**GitHub:** [github.com/libcna/cna](https://github.com/libcna/cna)

## What is a CNA module?

A normal CNA module follows a physical layout such as:

```text
modules/<module>/
├── CMakeLists.txt
├── include/
├── src/
├── tests/
└── examples/
```

Not every module needs every directory, but the ownership boundary is explicit.

A module normally has its own CMake target and public include surface.

For example:

```text
cna_math          → CNA::Math
cna_design        → CNA::Design
cna_platform      → CNA::Platform
cna_graphics_core → CNA::GraphicsCore
cna_content       → CNA::Content
```

Normal applications do not need to manually assemble the framework from all of these pieces.

The traditional `CNA` target remains the main umbrella:

```cmake
target_link_libraries(MyGame PRIVATE CNA)
```

It composes the normal runtime framework and selected renderer into one convenient application-facing target.

The individual module targets are useful internally, for tools, tests and applications that deliberately want a smaller dependency closure.

## Why modularize CNA?

A framework of CNA's size becomes increasingly difficult to maintain if every subsystem is physically part of one library.

A mathematics library should not need SDL.

A command-line content compiler should not require a graphical window.

A running game that loads already compiled assets should not need FreeType merely because FreeType is useful when building a `.spritefont`.

Networking should not pull ENet into an application that never uses networking.

XNA design-time type converters should not need to become part of every game executable.

And code that only needs `Vector3` should not drag an entire graphics renderer into its dependency closure.

The module system gives those boundaries a physical form.

## Core

`CNA::Core` contains small pieces shared across the rest of CNA.

Examples include:

- CNA exceptions
- logging
- release and version information
- target-platform information
- renderer identity and selection
- renderer maturity and category information
- common path utilities
- framework-root types such as `PlayerIndex`

Core also provides a very small header-only surface:

```text
CNA::CoreHeaders
```

This is useful when another module only needs common header-level types or definitions and does not need the implementation library itself.

That helps keep dependency closures small.

## Diagnostics

`CNA::Diagnostics` provides optional runtime statistics and profiling.

Its `CNA_DIAGNOSTICS` setting selects `OFF`, `STATS` or `FULL`, depending on whether an application needs no instrumentation, counters or detailed profiling.

The module provides the observation foundation used by Inspector.

## Inspector

`CNA::Inspector` is an optional development tool for inspecting a running CNA application from a separate process.

It includes an in-process agent and the standalone `cna-inspector` browser bridge.

It requires `CNA_BUILD_INSPECTOR=ON` and explicit linking with `CNA::Inspector`. It stays outside the normal `CNA` umbrella.

## Math

`CNA::Math` contains the familiar XNA mathematical foundation.

This includes:

- `Vector2`
- `Vector3`
- `Vector4`
- `Matrix`
- `Quaternion`
- `Color`
- `Point`
- `Rectangle`
- `Plane`
- `Ray`
- `BoundingBox`
- `BoundingSphere`
- `BoundingFrustum`
- curves
- `MathHelper`
- packed-vector interfaces

Math is intentionally one of CNA's smallest dependency islands.

It depends primarily on the required Sharp Runtime foundation and CNA's minimal core header surface.

It does **not** require a renderer, SDL, audio, content or the game runtime.

That makes `CNA::Math` useful independently from most of the framework.

## Design

`CNA::Design` implements the `Microsoft.Xna.Framework.Design` namespace.

It contains design-time type-conversion infrastructure for XNA value types, including converters for:

- `Vector2`
- `Vector3`
- `Vector4`
- `Matrix`
- `Quaternion`
- `Color`
- `Point`
- `Rectangle`
- `Plane`
- `Ray`
- `BoundingBox`
- `BoundingSphere`

The module also contains the common `MathTypeConverter` infrastructure and registration code needed to integrate these types with the ComponentModel-style functionality provided by Sharp Runtime.

Design is deliberately small.

Its main CNA dependency is `CNA::Math`, together with the required Sharp Runtime ComponentModel functionality.

It does not need Runtime, graphics renderers, SDL, media or networking.

Importantly, **`CNA::Design` is intentionally opt-in**.

The normal `CNA` application umbrella does not automatically pull design-time converter implementation code and registration into every game.

A tool or application that needs `Microsoft.Xna.Framework.Design` can link it explicitly.

## Platform

`CNA::Platform` is CNA's boundary to the host operating environment.

It defines abstractions for areas such as:

- windows
- events
- timing
- displays
- native window handles
- keyboard
- mouse
- gamepads
- joysticks
- haptics
- text input
- sensors
- cameras
- clipboard and system services
- OpenGL contexts
- Vulkan surfaces
- CPU surface presentation

Current implementations include:

- **SDL3**
- **Headless**
- **POSIX Terminal**

SDL3 remains the default portable backend.

CNA had real native Win32, X11 and Wayland implementations, which were retired due the cost of their maintenance

The Platform API therefore represents CNA concepts rather than SDL concepts.

## Graphics

`CNA::GraphicsCore` contains CNA's XNA-facing graphics system and the common renderer contract.

This is where types such as these belong:

```text
GraphicsDevice
Texture2D
TextureCube
VertexBuffer
IndexBuffer
RenderTarget2D
SpriteBatch
Effect
BasicEffect
Model
BlendState
SamplerState
RasterizerState
DepthStencilState
```

It also contains shared renderer infrastructure such as:

- `IGraphicsRenderer`
- renderer descriptors
- renderer capabilities
- the generated renderer registry
- format-capability tracking
- renderer resource interfaces
- image loading
- graphics-resource management

Graphics does not itself mean OpenGL, Vulkan, Direct3D or another native API.

Those implementations live separately under `modules/renderers/`.

The Graphics module also owns the core `PbrEffect`, `SkinnedPbrEffect` and custom `ShaderEffect` APIs.

## Renderers

The renderer tree is effectively another modular architecture inside CNA.

CNA currently exposes **14 public renderer identities implemented through 12 renderer families**.

The implementation-family tree currently includes:

```text
modules/renderers/
├── easygl/
├── vulkan/
├── webgpu/
├── directx9/
├── directx11/
├── metal/
├── sdl-renderer/
├── sdl-gpu/
├── fna3d/
├── software/
├── headless/
└── stub/
```

There is also internal shared renderer infrastructure under areas such as `renderers/common/`.

That common infrastructure is not another public renderer family.

Three public identities share the EasyGL family:

- OpenGL ES 3
- OpenGL 3.3
- WebGL 2

This is why CNA has more public renderer identities than independent implementation families.

Each renderer family owns its native implementation and renderer-specific dependencies.

Vulkan code stays inside the Vulkan family.

Direct3D implementation code stays in the DirectX families.

OpenGL-specific implementation details stay in EasyGL.

Browser-specific implementation code stays in the browser renderer families.

CPU rendering stays in Software.

Shared implementation code can live in internal renderer helper modules, such as the Direct3D common layer used by Direct3D 11.

This separation is a major reason CNA can support many substantially different rendering technologies without filling `GraphicsDevice` with native graphics API code.

## Input

`CNA::Input` contains the XNA input APIs together with CNA's additional input functionality.

It covers areas such as:

- keyboard
- mouse
- gamepads
- touch
- gestures
- text input
- joysticks
- haptics
- input-device discovery
- sensor-related input surfaces

The actual operating-system communication is delegated to the Platform API.

The Input module understands concepts such as `KeyboardState`, `MouseState` and `GamePadState`.

`CNA::Platform` knows how the selected SDL3, Headless or Terminal implementation obtains the underlying information.

## Audio

`CNA::Audio` contains XNA's audio system.

This includes:

- `SoundEffect`
- `SoundEffectInstance`
- `DynamicSoundEffectInstance`
- `AudioListener`
- `AudioEmitter`
- microphones
- audio categories
- XACT-style `AudioEngine`
- `SoundBank`
- `WaveBank`
- `Cue`

It also owns the internal mixer and the audio-related `FrameworkDispatcher` behavior.

Audio selection is independent of graphics and platform selection.

CNA does not conceptually require one library to provide the window system, graphics and audio at the same time.

## Media

`CNA::Media` implements the higher-level XNA media APIs.

It includes:

- `Song`
- `MediaPlayer`
- `MediaQueue`
- albums
- artists
- genres
- playlists
- pictures
- `MediaLibrary`
- `Video`
- `VideoPlayer`

Media interacts with Audio and Graphics because media playback can ultimately produce audio streams and graphical textures.

The native video decoder is kept separate.

## Video FFmpeg

`CNA::VideoFfmpeg` is an optional implementation module.

It owns the FFmpeg dependencies used for runtime video decoding when FFmpeg is available and enabled.

This separation is important.

The stable XNA-facing `Video` and `VideoPlayer` API lives in `CNA::Media`.

FFmpeg does not.

Conceptually:

```text
CNA::Media
   ↓
video decoder interface
   ↓
CNA::VideoFfmpeg      optional
   ↓
FFmpeg
```

A CNA build without the FFmpeg backend can therefore retain the public Media API while reporting unavailable video functionality appropriately.

The external decoder does not have to become a universal dependency of CNA.

## Content

`CNA::Content` contains CNA's runtime content system.

This is much larger than `ContentManager` alone.

It includes work around:

- `ContentManager`
- XNB loading
- XNB type readers
- CNJ
- CNB
- glTF 2.0 importing
- models
- textures
- sprite fonts
- sound content
- content manifests
- compression and validation

This is the side of the content system that a running application uses to load assets.

It remains physically separate from the tools that build those assets.

## Content Pipeline

`CNA::ContentPipelineBuild` is the build-time side of CNA's content architecture.

It contains XNA Content Pipeline-style APIs and CNA tooling for areas such as:

- content importers
- content processors
- SpriteFont building
- model processing
- texture processing and compression
- effect compilation
- XML content
- build-time media processing

The distinction is important:

```text
Content Pipeline
     ↓
builds assets

CNA::Content
     ↓
loads assets at runtime
```

For example, FreeType may be needed to rasterize a `.spritefont` while building content.

A finished game loading the compiled result should not need to link FreeType merely because the asset compiler did.

The module boundary enforces that distinction.

## Storage

`CNA::Storage` implements the XNA storage model.

It includes:

- `StorageDevice`
- `StorageContainer`
- related exceptions

It is deliberately small.

An interesting architectural choice is that ordinary save-root handling is treated primarily as a portable filesystem concern instead of forcing every persistence operation through the window and input platform abstraction.

## Runtime

`CNA::Runtime` ties the major framework pieces together.

It contains types such as:

- `Game`
- `GameTime`
- `GameWindow`
- `GameComponent`
- `DrawableGameComponent`
- `GameComponentCollection`
- `GameServiceContainer`
- `GraphicsDeviceManager`
- `GraphicsDeviceInformation`
- launch parameters
- title-container support

This is where the familiar XNA application lifecycle lives.

Because `Game` orchestrates many framework systems, Runtime naturally sits relatively high in the dependency graph:

```text
Runtime
├── Graphics
├── Input
├── Content
├── Audio
├── Media
├── Platform
├── Core
└── Math
```

Runtime therefore has a much broader dependency closure than small foundational modules such as Math or Design.

## Devices

`CNA::Devices` contains the XNA-era `Microsoft::Devices` APIs.

This includes sensor functionality such as:

- accelerometer
- gyroscope
- compass
- motion
- vibration

Some of these APIs are particularly relevant to the Windows Phone side of the original XNA ecosystem.

The public compatibility model belongs in Devices, while the selected platform implementation supplies whatever real native sensor functionality is available.

## Devices Extensions

`CNA::DevicesExt` contains **CNA-specific device and host functionality beyond XNA 4.0**.

Examples include:

- camera access
- clipboard
- file dialogs
- message boxes
- display information
- locale information
- power information
- system information
- system tray
- URL launching

These APIs use the Platform contract underneath them.

The distinction is:

```text
CNA::Devices
    ↓
XNA-era compatible device APIs

CNA::DevicesExt
    ↓
CNA-specific modern host functionality
```

This keeps CNA-specific extensions physically separate from the compatibility-oriented device layer.

## Graphics Extensions

`CNA::GraphicsExt` contains focused graphics utilities and effects beyond XNA 4.0.

It contains:

- ASCII post-processing
- CRT effects
- colour-depth reduction and dithering
- standalone `DebugDraw`
- `ShaderCodeEXT` and `ShaderPackageEXT` values for portable shader variants

This code is deliberately separate from `CNA::GraphicsCore`.

The core Graphics module answers:

> How does the XNA graphics model work?

GraphicsExt answers:

> What additional graphics utilities and effects should CNA provide?

The extension umbrella is:

```text
CNA::CnaExt
```

It composes the extension modules instead of creating another monolithic implementation.

## Gamer Services

`CNA::GamerServices` implements the XNA Gamer Services API where meaningful.

It contains concepts such as:

- gamers
- achievements
- guide functionality
- leaderboards
- avatars
- gamer profiles

The original Xbox Live infrastructure obviously cannot simply be recreated inside CNA.

The module therefore focuses on API compatibility and local behavior that can reasonably exist independently of Microsoft's historical online infrastructure.

Gamer Services is part of CNA's networking-enabled module group.

## Networking

`CNA::Net` implements the XNA networking model.

It contains types such as:

- `NetworkSession`
- `NetworkGamer`
- `LocalNetworkGamer`
- `PacketReader`
- `PacketWriter`
- session discovery
- session properties

Its native System Link transport uses **ENet**.

Networking can be disabled at configure time:

```text
CNA_ENABLE_NET=OFF
```

When networking is disabled, the Net and Gamer Services implementation modules do not need to enter the build and ENet does not become an unnecessary application dependency.

## Phone

`CNA::Phone` contains pieces of the Windows Phone application environment expected by XNA phone software outside the main XNA framework namespaces.

This includes areas such as:

```text
Microsoft::Phone::Shell
Microsoft::Phone::Notification
```

The module exists because reproducing only `Microsoft.Xna.Framework` is not enough for some Windows Phone-era XNA applications.

It remains physically separate from the ordinary desktop Runtime module.

## C API

`CNA::CApi` is CNA's experimental native C ABI.

Unlike the normal C++ framework, it is built only when explicitly enabled:

```text
CNA_BUILD_C_API=ON
```

On ordinary native platforms it provides the `cna_c_api` library.

WebAssembly uses an architecture suited to JavaScript and WebAssembly integration.

The C API wraps the canonical C++ CNA implementation rather than reimplementing the framework.

Its purpose is to provide a stable language-neutral boundary over the C++ core.

It is currently the foundation for CNA work involving seven additional application languages:

- C
- C#
- Java
- TypeScript
- Python
- Rust
- Swift

Together with native C++, that means CNA currently has language work targeting **8 programming languages** around the same C++ core.

**Related article:** [CNA in Multiple Programming Languages](https://blog.libcna.com)

## The umbrella targets

Although CNA's physical implementation is modular, it keeps simple application-facing entry points.

The main target remains:

```text
CNA
```

It combines the normal framework modules with the selected renderer.

There is also:

```text
CNA::CnaExt
```

for the CNA extension modules, and:

```text
CNA::Design
```

for the opt-in XNA design-time layer.

When the experimental C API is enabled, there is also:

```text
CNA::CApi
```

for the language-neutral native ABI.

The important point is that physical modularization does not force normal application developers to manually maintain a long list of internal libraries.

A game can still simply link:

```cmake
target_link_libraries(MyGame PRIVATE CNA)
```

while specialized tools can choose narrower modules.

## Not every dependency is allowed everywhere

One of the most important purposes of modularization is dependency ownership.

For example:

```text
SDL
    → SDL platform/audio implementations

ENet
    → Net

FFmpeg runtime decoder
    → VideoFfmpeg

FreeType
    → ContentPipelineBuild

renderer SDK / native graphics API
    → corresponding renderer family
```

A dependency should live as close as practical to the functionality that actually needs it.

For example, choosing SDL3 should not make SDL headers part of CNA's public Platform API.

Selecting SDL3 should not make SDL a dependency of Math.

Using Direct3D should not turn the Platform API into a Direct3D API.

This prevents one implementation detail from becoming an accidental requirement of the entire framework.

## Some real cycles remain

A modular architecture does not mean pretending that CNA forms a mathematically perfect acyclic graph.

Some real relationships exist where XNA semantics naturally create cycles.

One example is Graphics and Input.

`GraphicsDevice` participates in updating touch-panel and window-related input state, while input functionality such as `MouseCursor` can depend on graphics resources such as `Texture2D`.

Another relationship exists around Audio and Media because `FrameworkDispatcher` participates in pumping audio and media state while media playback itself uses the audio system.

Renderers also naturally have a two-way static-library relationship with GraphicsCore:

```text
GraphicsCore
   ↓
creates / drives renderer

Renderer
   ↓
uses common graphics types and contracts
```

CNA declares these relationships explicitly where they genuinely exist.

That is very different from hiding everything behind one enormous library and claiming the subsystems are independent.

Modularity means clear ownership and controlled dependencies, not pretending every subsystem can exist in total isolation.

## Physical ownership is enforced

CNA contains configure-time validation for physical source ownership.

Production translation units are expected to live underneath a declared module:

```text
modules/<name>/src/
modules/<name>/tests/
modules/<name>/examples/
```

Renderer code similarly belongs underneath its registered renderer implementation family.

If production code appears outside the known module structure, the configuration can reject it.

The old global repository-level:

```text
src/
include/
```

layout is not allowed to silently grow back into another monolithic implementation tree.

There are documented cases where one module consumes source or infrastructure owned by another implementation family, but those relationships are explicit rather than accidental.

This turns modularity into an architectural rule instead of merely a directory-naming convention.

## Why this matters for CNA's future

CNA is already large enough that maintaining it as one inseparable C++ library would become increasingly difficult.

The module architecture gives each major subsystem clearer ownership:

```text
Core
    → shared CNA foundation

Diagnostics
    → optional runtime statistics and profiling

Inspector
    → optional external inspection tool

Math
    → mathematics

Design
    → XNA design-time tooling and converters

Platform
    → host environment

GraphicsCore
    → XNA graphics contract

Renderers
    → graphics implementations

Input
    → user-input model

Audio
    → sound

Media
    → songs, video and media libraries

VideoFfmpeg
    → optional FFmpeg video implementation

Content
    → runtime asset loading

ContentPipelineBuild
    → build-time asset processing

Runtime
    → Game lifecycle

Storage
    → persistence

Devices
    → XNA-compatible device APIs

DevicesExt
    → CNA-specific host/device services

GraphicsExt
    → CNAEXT graphics functionality

GamerServices / Net
    → XNA services and networking

Phone
    → Windows Phone compatibility

CApi
    → language-neutral ABI
```

This also makes future refactoring safer.

A renderer can be restructured without turning it into the Platform module.

The Platform implementation can change without rewriting Math.

SDL3, Headless or Terminal can evolve independently of the XNA-facing input types.

The content compiler can gain another build-time dependency without forcing it into every running game.

The Design module can evolve without becoming part of every normal application.

And a language binding can depend on the C ABI without becoming another implementation of the C++ framework.

## Modules also make replacement possible

Modularity is not only about organizing source files.

It also creates replaceable implementation boundaries.

The Platform contract can be implemented by SDL3, Headless or Terminal.

The Graphics contract can be implemented by 14 public renderer identities.

Video can use the optional FFmpeg implementation without making FFmpeg part of the Media API itself.

Language bindings can reach CNA through the C ABI without becoming part of the canonical C++ implementation.

This is an important long-term property.

A dependency can change without forcing every subsystem above it to change at the same time.

## One framework, many modules

From an application developer's point of view, CNA can still look like one framework:

```cmake
target_link_libraries(MyGame PRIVATE CNA)
```

Underneath that simple target, however, CNA is composed from a much more explicit graph of independently owned systems.

There are currently **22 physical framework modules**, together with **12 renderer implementation families providing 14 public renderer identities**.

The purpose is not to make users think about twenty-two libraries every time they start a game.

It is to prevent CNA itself from becoming one inseparable block containing hundreds of thousands of lines of C++ with every dependency leaking everywhere.

Small pieces can have small dependency closures.

Tooling-only functionality can remain tooling-only.

Optional native dependencies can remain optional.

Platform implementations can remain replaceable.

Renderer implementations can remain isolated.

And the public application-facing framework can remain simple.

**The application can see one framework. The implementation can remain many independently owned pieces.**

---

**CNA:** [github.com/libcna/cna](https://github.com/libcna/cna)
 **CNA organization:** [github.com/libcna](https://github.com/libcna)
