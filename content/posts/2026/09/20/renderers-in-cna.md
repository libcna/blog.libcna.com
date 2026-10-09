---
title: Renderers in CNA
date: 2026-09-20T11:12:53Z
updated: 2026-10-09T17:49:00Z
description: |
  Graphics rendering is one of the largest parts of CNA.
author: Robert Vokac
categories:
  - Graphics
tags:
  - Renderers
  - Graphics APIs
  - OpenGL
  - DirectX
  - Vulkan
  - WebGPU
  - Software Rendering
originalUrl: https://blog.libcna.com/2026/09/20/renderers-in-cna/
classicpressId: 27
classicpressStatus: publish
draft: false
---

Graphics rendering is one of the largest parts of CNA.

CNA has **14 renderers (12 implementation families)**.

They range from OpenGL ES, WebGL and Direct3D 9 to Vulkan, Direct3D 11, Metal and WebGPU.

CNA also includes a CPU renderer, browser-native rendering paths, 2D backends, translation layers and diagnostic renderers that deliberately produce no pixels.

They are not all intended for the same purpose.

The maturity of renderers is classified as:

- **6 Production**
- **5 Supported**
- **3 Experimental**

The implementation technology of renderers is classified as:

- **6 Native**
- **4 TranslationLayer**
- **1 Software**
- **1 Web**
- **2 Diagnostic**

A renderer can, for example, be a native graphics backend while still being Supported rather than Production

## Why CNA has many renderers

CNA applications do not depend on Vulkan, Direct3D, OpenGL, Metal, SDL GPU, WebGPU or any other single graphics technology.

- They depend on CNA.

Every technology like OpenGL, Vulkan, Metal, WebGPU and SDL may be an important today. Decades from now, it may not be.

If a future platform introduces another graphics API, CNA should be able to gain a new renderer underneath the framework without requiring applications to rewrite their high-level graphics code.

## 14 renderers does not mean 14 separate codebases

Three renderers share he same implementation. This implementation is named EasyGL, which is the CNA's shared OpenGL-family renderer.

- OpenGL ES 3
- OpenGL 3.3
- WebGL 2

These three renderers expose different graphics profiles, shader languages, capabilities and platform requirements.

## EasyGL

### OpenGL ES 3 - Production

OpenGL ES 3 is one of CNA's primary EasyGL renderer profiles.

It provides a more capable modern OpenGL ES path and acts as an important reference implementation for the shared EasyGL architecture.

It is particularly relevant to portable and mobile-oriented graphics environments.

### OpenGL 3.3 - Production

OpenGL 3.3 is CNA's main EasyGL desktop OpenGL profile.

It provides a programmable desktop OpenGL baseline while remaining available across a broad range of systems, drivers and hardware.

Because it shares most of its implementation with the OpenGL ES and WebGL profiles, improvements to EasyGL can benefit several CNA targets at once.

### WebGL 2 - Supported

WebGL 2 is CNA's browser-oriented EasyGL profile.

It maps closely to the OpenGL ES 3 generation and provides CNA with a conventional GPU-accelerated graphics path inside modern browsers.

## DirectX and Windows graphics

CNA supports two Direct3D generations on Windows.

Together they span the XNA-era Direct3D 9 model and the mature programmable Direct3D 11 architecture.

### Direct3D 9 - Production

Direct3D 9 is especially important to CNA because it belongs to the graphics generation from which XNA itself emerged.

XNA 4.0 used Direct3D 9 on Windows, so CNA's Direct3D 9 renderer is useful for more than simply providing another backend.

It provides a particularly valuable reference point when investigating XNA rendering behavior.

### Direct3D 11 - Production

Direct3D 11 is one of CNA's primary Windows renderers.

It provides a mature programmable GPU model.

That makes it an important practical renderer as well as a useful comparison point for other CNA backends.

## CNA does not target only the newest graphics APIs

SDL Renderer is very different from Vulkan.

A CPU rasterizer is very different from Metal or WebGPU.

XNA 4.0 was designed in a graphics environment very different from Vulkan, Metal or WebGPU.

Supporting both XNA-era and modern rendering architectures helps CNA preserve the high-level programming model while replacing the implementation underneath it.

## Modern GPU APIs

### Vulkan - Production

Vulkan is one of CNA's primary modern renderers.

It provides explicit control over GPU resources, pipelines, synchronization and command submission.

That makes it architecturally very different from OpenGL and from XNA's original Direct3D 9 environment.

Vulkan has therefore become one of CNA's important renderer-parity targets.

### WebGPU - Experimental

WebGPU provides CNA with a modern portable graphics model spanning native and browser environments.

On native systems CNA can use `wgpu-native`.

Browser builds can target WebGPU through Emscripten.

CNA treats WebGPU as one public renderer identity even though the environment underneath it differs between native and web builds.

The renderer is classified as a **TranslationLayer** because the WebGPU implementation can ultimately map the API onto lower-level platform graphics technologies.

### Metal - Supported

Metal is CNA's native Apple GPU renderer.

It provides a direct graphics path for Apple's modern graphics API and is an important part of CNA's broader Apple-platform direction.

The renderer is independent of CNA's platform layer: graphics rendering and operating-system integration are deliberately separate architectural layers, and current Apple builds can pair Metal rendering with CNA's SDL3-based platform integration.

## SDL graphics backends

CNA supports two very different SDL graphics APIs.

### SDL Renderer - Production

SDL Renderer uses SDL's high-level 2D rendering API.

It is deliberately a 2D renderer.

It is appropriate for XNA-style applications centered around functionality such as `SpriteBatch`, textures and compatible render targets.

Unsupported 3D functionality does not need to be disguised as something it is not.

A narrower renderer can still be Production quality within its supported scope.

### SDL GPU - Supported

SDL GPU uses SDL3's modern GPU API.

Unlike SDL Renderer, it provides a programmable GPU architecture and can support a much broader subset of CNA's graphics model.

SDL itself manages the lower-level graphics technology beneath that abstraction, so CNA classifies SDL GPU as a TranslationLayer renderer.

## FNA3D - Experimental

FNA3D is the graphics library developed for FNA, another XNA-compatible framework.

That makes it particularly interesting as a CNA renderer.

Instead of CNA translating its graphics API directly to Vulkan, OpenGL or Direct3D, the FNA3D renderer translates CNA's graphics operations into FNA3D's XNA-oriented graphics API.

FNA3D can then select SDL GPU, Direct3D 11 or OpenGL underneath that layer at runtime.

This provides an unusual comparison point:

**one XNA-compatible framework's graphics architecture being used underneath another XNA-compatible framework.**

It is also useful for finding assumptions in either implementation that would be difficult to notice when testing only against a native API.

## Translation layers are useful

FNA3D is only one example of a broader category.

The current CNA renderer registry classifies four renderer identities as **TranslationLayer**:

- SDL Renderer
- SDL GPU
- WebGPU
- FNA3D

These are not all the same type of abstraction.

SDL Renderer and SDL GPU expose SDL's graphics abstractions.

WebGPU presents a portable modern graphics model that can itself be implemented over lower-level native APIs.

FNA3D provides a graphics API designed specifically for an XNA-compatible framework and can select its own lower-level graphics backend at runtime.

## CPU rendering

Not every CNA renderer needs a GPU.

CNA currently has one renderer identity classified explicitly as **Software** technology.

### Software - Experimental

The Software renderer is CNA's own CPU rasterizer.

It renders real graphics entirely on the CPU without relying on OpenGL, Vulkan, Direct3D or another GPU API.

It can rasterize actual geometry into a CPU-owned framebuffer, making correct pixel readback possible without a GPU or native display surface.

That makes it useful for:

- deterministic graphics testing
- CI environments without GPU access
- server environments
- cross-renderer comparisons
- investigating rendering behavior without involving a GPU driver

The long-term value of the Software renderer is not simply that it can draw without a GPU.

It provides an independent implementation against which GPU-backed renderers can be compared.

A CNA application therefore does not fundamentally require a hardware graphics accelerator to produce pixels.

## Browser-native renderers

CNA currently has one renderer identity in its **Web** category:

- WebGL 2

WebGL 2 uses the shared EasyGL implementation and provides programmable GPU-backed rendering through the browser's WebGL API.

## Diagnostic renderers

Two CNA renderers deliberately do not behave like normal pixel-producing graphics backends.

They are classified as **Diagnostic** technology.

### Headless - Supported

Headless allows CNA graphics infrastructure to exist without requiring a normal GPU or visible window.

It is useful for automated tests, CI, servers and applications whose logic depends on graphics objects existing even though no real frame needs to be displayed.

It should not be confused with the Software renderer.

Software actually rasterizes graphics.

Headless exists primarily to provide graphics behavior without normal rendering output.

### Stub - Supported

Stub is the deliberately minimal no-op renderer.

It accepts the role of CNA's graphics backend while doing essentially no real rendering.

That makes it useful for testing code paths that should not depend on graphics output and for identifying accidental renderer dependencies elsewhere in an application or framework.

Together, these backends demonstrate another important property of CNA's architecture:

**the graphics API presented to an application does not necessarily require either a visible window or a GPU behind it.**

## 14 renderers, but not 14 equal renderers

CNA does not have 14 completely interchangeable graphics renderers with identical capabilities.

Some:

- are general-purpose GPU renderers
- implement only 2D
- render entirely on the CPU
- depend on another graphics abstraction
- exist only in browsers
- render no pixels at all

A renderer's **maturity** describes how ready and validated its implementation is within the scope that it claims to support.

Its **capabilities** describe what that renderer can actually do.

For example, SDL Renderer is intentionally much narrower than Vulkan because SDL Renderer is a 2D abstraction.

- That does not prevent SDL Renderer from being classified as Production within its supported scope.

SDL Renderer operates in an environment fundamentally different from general-purpose 3D renderers.

Headless and Stub deliberately make no normal pixel-output claim.

## Production renderers

CNA classifies these six renderers as **Production**:

- SDL Renderer
- OpenGL ES 3
- OpenGL 3.3
- Vulkan
- Direct3D 9
- Direct3D 11

Production is CNA's highest current renderer maturity level.

It means the renderer is considered appropriate for regular use within the feature scope it claims to support, with broad and verified coverage.

A Production renderer does not necessarily have the same capabilities as another Production renderer.

## Supported renderers

The current **Supported** renderers are:

- WebGL 2
- Headless
- Stub
- SDL GPU
- Metal

These renderers are functional and maintained.

They may have narrower capability boundaries, less renderer-parity coverage, less hardware validation or other remaining work that keeps them below the Production maturity level.

## Experimental renderers

The current **Experimental** renders are:

- WebGPU
- Software
- FNA3D

Experimental renderers are active CNA backends, but their public behavior, capability coverage or implementation may still require substantial development and validation.

A renderer's maturity is not permanent and can change in the future.

## Technology categories

The technology category answers: W**hat kind of implementation is underneath it?**

The current renderer set is divided as follows.

### Native - 6

- OpenGL ES 3
- OpenGL 3.3
- Vulkan
- Direct3D 9
- Direct3D 11
- Metal

### TranslationLayer - 4

- SDL Renderer
- SDL GPU
- WebGPU
- FNA3D

### Software - 1

- Software

### Web - 1

- WebGL 2

### Diagnostic - 2

- Headless
- Stub

## Many renderers strengthen the abstraction

Renderer diversity is also a testing strategy.

OpenGL can allow behavior that Vulkan does not.

Vulkan can expose resource-lifetime and synchronization mistakes hidden by a more implicit API.

Direct3D can reveal different state, shader, texture-format and resource assumptions.

A CPU renderer removes the GPU driver from the equation entirely.

A 2D-only backend forces CNA to distinguish functionality that genuinely requires a general-purpose 3D graphics pipeline from functionality that does not.

This diversity can reveal bugs and make the abstraction stronger.

## Graphics is separate from the platform

The important CNA design principle is that the **renderer and platform are separate systems:**

- The renderer determines how graphics are produced.
- The platform determines things such as windows, operating-system events, input and native integration.

CNA's platform layer currently includes SDL3, Headless and Terminal platform implementations for specialized environments.

The graphics renderer is not supposed to define the entire operating environment around the application

## You normally use only one renderer

Having 14 renderers in CNA does not mean a normal game contains all of them.

- The usual CNA configuration selects one renderer at build time with: `CNA_GRAPHICS_RENDERER`

A project that only needs the SDL Renderer does not have to ship Vulkan, Metal or any other CNA renderer.

An individual CNA game contains only those renderers, it needs.

## Multi-renderer builds are possible

CNA also supports an optional multi-renderer architecture through:`CNA_GRAPHICS_RENDERERS`

Several renderers can be compiled into the same application. One of these renderers is selected before the first `GraphicsDevice` is created via the CNA public extension `GraphicsRendererSelection.`

A preferred renderer can come from:

- an explicit `GraphicsRendererSelection::SetPreferred()` call
- the `CNA_GRAPHICS_RENDERER` environment variable
- the build's compile-time default renderer

This selection cannot be changed after the first `GraphicsDevice` is created. After that the renderer underneath an already-running graphics system cannot be switched.

Multi-renderer builds are useful for:

- renderer comparison tools
- launchers
- automated test suites
- compatibility investigation
- applications that genuinely need runtime renderer selection

Fallback is deliberately disabled by default.

If an application asks for a renderer that cannot be used, CNA normally reports that failure instead of silently substituting another renderer.

Applications that genuinely want fallback can configure an explicit fallback chain or enable automatic fallback across the renderers compiled into that build.

This behavior is explicit because silently replacing the requested renderer can hide a real deployment or compatibility problem.

## There is a cost

Every renderer adds some combination of:

- implementation work
- maintenance
- testing
- documentation
- platform validation
- build complexity
- renderer parity work
- performance analysis
- debugging

A change to CNA's shared graphics behavior may affect many renderer implementations.

A renderer that appears correct on one machine may still require validation on different drivers and real hardware.

CNA's renderer work increasingly focuses on: **correctness, parity, testing, optimization, simplification and stabilization.**

## The goal is a limited set of renderers

The current set is intended to be useful and maintainable.

What matters is what its diversity provides:

- independence from individual graphics technologies
- portability across operating systems and environments
- stronger testing of the common graphics abstraction
- coverage of substantially different graphics architectures
- native, translated, software, browser and diagnostic rendering paths
- CPU and headless execution
- the ability to add future graphics technologies underneath existing applications

The important work is making the existing implementations increasingly correct, understandable, tested and maintainable.

## The CNA framework spans a wide range of graphics technologies

XNA was originally built on DirectX 9.

There are APIs such as Vulkan, Metal and WebGPU, OpenGL, OpenGL ES, SDL abstractions, FNA3D, browser APIs, a CPU rasterizer and diagnostic backends.

These technologies differ enormously.

Any CNA application talks to CNA. The renderer is replaceable and the graphics API underneath CNA can change.
