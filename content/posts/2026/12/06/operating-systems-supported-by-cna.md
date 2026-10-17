---
title: Operating Systems supported by CNA
date: 2026-12-06T17:53:02Z
updated: 2026-10-17T13:41:12Z
description: |
  CNA targets Windows, Linux, macOS, Android, iOS/iPadOS and the Web, with explicitly different levels of build, runtime and hardware evidence.
author: Robert Vokac
categories:
  - Development
tags:
  - Portability
  - Windows
  - Linux
  - macOS
  - Android
  - iOS
  - iPadOS
  - WebAssembly
  - Emscripten
  - SDL3
  - Cross-platform
  - Operating Systems
originalUrl: https://blog.libcna.com/2026/12/06/operating-systems-supported-by-cna/
classicpressId: 115
classicpressStatus: future
draft: false
---

CNA targets six major operating-system or execution families:

```text
Windows
Linux
macOS
Android
iOS / iPadOS
Web / WebAssembly
```

They do not all have the same level of verification.

In CNA, the word **supported** therefore needs a qualifier. A target may be:

```text
recognized by the source and build system
        │
        ▼
successfully cross-compiled
        │
        ▼
final-linked as a real application
        │
        ▼
executed in an emulator, simulator or browser
        │
        ▼
executed on the native operating system
        │
        ▼
qualified on physical hardware with broad tests
```

Those are different claims.

The current high-level status is:

| Target | Current evidence |
| --- | --- |
| Linux `x86_64` | Primary development environment; complete suites and the broadest renderer/platform matrix run here |
| Windows | MinGW-w64 builds execute under Wine; DirectX 9 runs through DXVK and `SDL_GPU`'s Direct3D 12 path through vkd3d-proton; current real-Windows hardware qualification remains open |
| macOS | Native Apple-silicon CI builds and runs portable platform/storage suites plus an application bundle smoke; `SDL_GPU`/Metal requalification is narrower and still in progress |
| Android | NDK `x86_64` build and emulator execution with `OPENGLES3`; no physical-device qualification and no qualified `SDL_GPU` path |
| iOS / iPadOS | Experimental; device and simulator applications final-link, and the `SOFTWARE` simulator app runs one frame; no physical-device run |
| Web / WebAssembly | `WEBGL2` and `WEBGPU` execute in Chrome; the dedicated multi-renderer CI separately proves both can coexist in one Wasm bundle |

This matrix is more useful than a single yes/no support label.

---

## Three independent meanings of platform

Operating-system support in CNA is easier to understand when three independent axes are kept separate.

### 1. Build target

This answers:

> Which operating system or execution environment is this binary being compiled for?

Examples are Windows, Linux, Android and Web.

### 2. Platform implementation

This answers:

> Who owns windows, events, input, timing and host-system services?

The selectable implementations are:

```text
SDL3
HEADLESS
TERMINAL
```

### 3. Graphics renderer

This answers:

> How are pixels produced?

Examples include:

```text
OPENGLES3
WEBGL2
WEBGPU
SDL_GPU
DIRECTX9
SOFTWARE
HEADLESS
```

These axes are related, but they are not interchangeable.

For example:

```text
Windows target
    + SDL3 platform
    + SDL_GPU renderer
```

is one configuration, while:

```text
Linux target
    + HEADLESS platform
    + HEADLESS renderer
```

is another.

The audio backend is a fourth independent selection: `SDL3`, `NULL` or Linux `ALSA`.

---

## SDL3 is the windowed platform layer

SDL3 is CNA's only implementation that opens a graphical window.

It reaches each native environment through SDL's own video drivers:

```text
Windows       windows
Linux         x11 or wayland
macOS         cocoa
iOS           uikit
Android       android
Web           emscripten/browser canvas
```

CNA's former direct `WIN32`, `X11` and `WAYLAND` platform implementations were retired on 6 October 2026. SDL2 platform and audio support were retired two days earlier.

That does **not** mean CNA stopped supporting Win32 windows, X11 or Wayland.

It means those host systems are reached through SDL3 instead of through separate CNA-owned platform backends:

```text
CNA Game
   │
   ▼
CNA Platform API
   │
   ▼
SDL3
   │
   ├── Win32
   ├── X11
   ├── Wayland
   ├── Cocoa / UIKit
   ├── Android
   └── Browser canvas
```

Renderers that need a native handle still receive it through the platform-neutral `NativeWindowHandle` contract. Depending on the active SDL driver, that can carry an `HWND`, X11 `Display*` plus window ID, Wayland display/surface, `NSWindow*` or `ANativeWindow*`.

---

## Headless and Terminal

Not every CNA program needs a graphical desktop.

`HEADLESS` is available for servers, automated tests and applications that deliberately own no native window. A fully SDL-free configuration can combine:

```text
CNA_PLATFORM=HEADLESS
CNA_GRAPHICS_RENDERER=HEADLESS
CNA_AUDIO_PLATFORM=NULL
```

`TERMINAL` is a POSIX-only platform implementation. With the `SOFTWARE` renderer it can present completed CPU frames in a terminal and receive keyboard/resize events through a real pseudo-TTY contract.

These are platform implementations, not additional operating systems.

---

## Platform identification

CNA exposes compile-time target identification through:

```cpp
CNA::TargetPlatform
```

The current values are:

```cpp
enum class TargetPlatform
{
    Desktop,
    Android,
    iOS,
    Web
};
```

Desktop operating systems are distinguished with:

```cpp
CNA::DesktopOS
```

whose values are:

```cpp
Windows
Linux
MacOSX
Other
```

The resulting classification is:

```text
Desktop
├── Windows
├── Linux
├── macOS
└── Other

Android
iOS / iPadOS
Web
```

Helpers include:

```cpp
CNA::getCurrentPlatform();
CNA::getCurrentDesktopOS();
CNA::getCurrentPlatformName();
CNA::isMobilePlatform();
CNA::isApplePlatform();
```

The `CNA_TARGET_APPLE`, `CNA_TARGET_MACOS` and `CNA_TARGET_IOS` macros distinguish Apple targets in preprocessor code. Their `CNA_TARGET_` prefix is intentionally different from `CNA_PLATFORM_`, which names the selected platform implementation.

---

## Default renderer by target

When a build does not select a renderer explicitly, CNA currently chooses:

| Target | Default renderer |
| --- | --- |
| Windows | `SDL_GPU` |
| macOS | `SDL_GPU` |
| iOS / iPadOS | `SDL_GPU` |
| Web / Emscripten | `WEBGL2` |
| Linux | `OPENGLES3` |
| Android | `OPENGLES3` |

This is a build default, not a blanket maturity claim.

For example, `SDL_GPU` is the designated default on iOS, but the currently gating simulator smoke uses `SOFTWARE`; the `SDL_GPU` iOS legs remain experimental and non-gating.

---

## Linux

Linux `x86_64` is CNA's primary development and qualification environment.

It is where the broadest full CTest configurations run, using GCC or Clang and real or software-backed graphics drivers. Current Linux validation includes configurations for:

```text
OPENGLES3 / OPENGL33
SDL_GPU over Vulkan
WEBGPU through wgpu-native
SOFTWARE
FNA3D
HEADLESS
STUB
```

Linux also supplies the strongest platform-implementation matrix.

SDL3 is exercised through both of its main Linux window-system drivers:

```text
SDL3 + X11    on a private Xvfb display
SDL3 + Wayland on a private headless Weston compositor
```

The tests verify window behavior, native handles, selections, event translation and teardown. Separate configurations exercise Headless without `DISPLAY` or `WAYLAND_DISPLAY`, and Terminal through a pseudo-TTY.

This is strong Linux evidence, but it still does not mean every distribution, compositor, GPU and proprietary driver combination has been tested.

---

## Windows

Windows is a first-class build target, but its current evidence is split between cross-execution and native workflow definitions.

CNA uses the SDL3 `windows` video driver for windows, events and input. The default renderer is `SDL_GPU`, for which SDL selects Direct3D 12 on Windows. CNA also retains an explicit `DIRECTX9` renderer for XNA 4.0 pixel authenticity.

The routinely recorded Windows-oriented path from Linux is:

```text
MinGW-w64 build
      │
      ▼
     Wine
      │
      ├── DIRECTX9 ─► DXVK ─► Vulkan
      │
      └── SDL_GPU / D3D12 ─► vkd3d-proton ─► Vulkan
```

This executes real Windows binaries and real graphics calls. The DirectX 9 suite has completed under DXVK, including the exact XNA pixel-oracle corpus.

But Wine and translation layers are not equivalent to current qualification on a physical Windows machine.

A manual MSVC GitHub Actions workflow defines native-Windows legs for the DirectX 9 suite and an `SDL_GPU` Direct3D 12 smoke set. At the latest project reconciliation, that workflow existed but had not yet supplied the missing real-hardware qualification evidence.

The accurate Windows claim is therefore:

```text
implemented
cross-built
executed under Wine
pixel-tested through DXVK / vkd3d-proton
native hardware qualification still open
```

---

## macOS

macOS is no longer merely an architectural placeholder.

CNA recognizes it as:

```text
TargetPlatform::Desktop
DesktopOS::MacOSX
```

The native Apple workflow runs on Apple silicon. It builds CNA with the `SOFTWARE` renderer, executes the portable platform and storage suites, creates a self-contained `.app` bundle and launches a smoke application.

The default renderer on macOS is `SDL_GPU`; SDL owns the Metal backend underneath it. CNA's former public `METAL` renderer identity has been retired.

An `SDL_GPU`/Metal smoke job now exists to cover device creation, a swapchain, drawing and readback on macOS. That is narrower than the full Linux `SDL_GPU` qualification, and the latest reconciled project status still treats the post-retirement Apple renderer requalification as open.

The current evidence boundary is:

```text
macOS arm64 native build       verified
portable platform suites      verified
application bundle launch     verified
Intel macOS CI                not verified
full current SDL_GPU matrix   not yet re-qualified
```

So it is now wrong to say that CNA has never run on macOS. It is also too broad to call every macOS graphics, audio, input and storage path fully qualified.

---

## Android

Android is represented as:

```text
TargetPlatform::Android
```

The platform layer is SDL3 and the default/validated renderer is `OPENGLES3`, implemented by CNA's EasyGL family over OpenGL ES 3.0.

Recorded evidence includes:

```text
Android NDK cross-build
x86_64 android-24 target
emulator execution
real sample rendering
portrait handling
Android Back input
```

The current limitations are equally important:

```text
no physical Android device qualification
no Android CI job
no qualified SDL_GPU Android build or run
no claim over every vendor GPU/driver/sensor combination
```

An emulator is useful evidence for build, lifecycle and graphics integration. It cannot prove compatibility with the entire Android hardware ecosystem.

---

## iOS and iPadOS

iPhone and iPad builds use:

```text
TargetPlatform::iOS
CNA_PLATFORM=SDL3
```

iOS support is experimental, but it is no longer source-only.

CNA has:

```text
an iOS CMake toolchain
device and simulator sysroots
static SDL3 integration
generated application bundles and Info.plist
UIKit-compatible SDL entrypoint handling
mobile lifecycle and orientation wiring
a final-linked one-frame smoke application
```

CI final-links the application for an arm64 device target and for the simulator. The simulator build using `SOFTWARE` is installed and launched, constructs a real `Game` and completes one frame.

What is not yet proven:

```text
execution on a physical iPhone or iPad
device pixel correctness
real touch and sensor behavior
audio and storage on a physical device
production signing or App Store packaging
performance on real mobile hardware
qualified SDL_GPU / Metal execution on iOS
```

`SDL_GPU` is the designated default renderer and is accepted by the iOS build, but its device and simulator legs remain experimental and non-gating. The gating platform smoke uses `SOFTWARE` precisely so a platform result is not confused with an unqualified GPU backend.

tvOS, watchOS and visionOS are not current CNA targets and are rejected rather than silently treated as iOS.

---

## Web and WebAssembly

The browser target is represented as:

```text
TargetPlatform::Web
```

CNA builds C++ through Emscripten into WebAssembly and JavaScript glue:

```text
CNA application
      │
      ▼
  Emscripten
      │
      ▼
WebAssembly + JavaScript
      │
      ▼
    Browser
```

The current browser renderer identities are:

```text
WEBGL2
WEBGPU
```

`WEBGL2` is EasyGL using an exact WebGL 2 / GLSL ES 3.00 contract. There is no implicit WebGL 1 fallback.

`WEBGPU` uses Emscripten's emdawnwebgpu integration. Both 2D and 3D stock-effect paths have executed in headless Chrome.

The WebGL 2 path has broader browser evidence, including:

```text
real Chrome execution
threaded background content loading
XNB model/resource loading
touch and keyboard input
gameplay rendering
real WebGL context loss and restoration
```

The Emscripten multi-renderer workflow has a deliberately narrower purpose. It proves that `WEBGL2` and `WEBGPU` link into one Wasm bundle, register both identities and expose the JavaScript renderer-selection surface. That job does **not** launch a browser; dedicated scripts and recorded qualification runs provide the runtime evidence.

CNA's retired WebGL 1, Canvas, SVG, DOM and PixiJS renderer experiments are not current browser backends.

Browser support still depends on browser/GPU capabilities, cross-origin isolation for threaded builds, asynchronous lifecycle rules, sandboxed storage and audio-start restrictions.

---

## Mobile and browser lifecycle

Portable source does not mean identical host behavior.

Android, iOS and browsers can suspend, resize, recreate or invalidate resources under operating-system control. CNA adapts these events to the `Game` model, but applications still need to respect the lifecycle contract.

Examples include:

```text
Android pause / resume and window recreation
iOS background / foreground and orientation
browser-controlled main loop
WebGL context loss / restoration
mobile touch and sensor availability
sandboxed storage
audio activation restrictions
```

This is why a successful cross-compile is only the first level of platform support.

---

## Graphics renderers remain a separate topic

CNA exposes ten public renderer identities over eight implementation families:

```text
OPENGLES3
OPENGL33
WEBGL2
WEBGPU
HEADLESS
SOFTWARE
STUB
DIRECTX9
SDL_GPU
FNA3D
```

The three GL identities share the internal EasyGL implementation. `SDL_GPU`'s Vulkan, Direct3D 12 and Metal drivers belong to SDL and do not create additional CNA renderer identities.

Forty-one older identities have been retired. Renderer count is no longer a project goal.

An operating system supporting CNA therefore does not imply that every renderer is available or equally tested there. The authoritative source for that question is CNA's renderer registry and feature matrix.

---

## What application code sees

Most game code remains written against the XNA-compatible framework surface:

```cpp
Game
GraphicsDevice
ContentManager
Keyboard
Mouse
GamePad
Texture2D
Model
SoundEffect
```

A typical game keeps the same high-level structure:

```cpp
class MyGame final : public Game
{
protected:
    void LoadContent() override
    {
        player = Content.Load<Texture2D>("Textures/player");
    }

    void Update(const GameTime& gameTime) override
    {
        // Game logic.
    }

    void Draw(const GameTime& gameTime) override
    {
        // Rendering.
    }
};
```

The framework absorbs window-system, lifecycle, input and renderer differences where its contracts allow it to do so.

Platform-specific capabilities still need to be queried rather than assumed. A desktop mouse, mobile touch screen, browser sandbox and headless server cannot honestly expose identical host services.

---

## Source code and current documentation

The CNA repository is:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

Target identification is defined in:

```text
modules/core/include/CNA/TargetPlatform.hpp
modules/core/include/CNA/DesktopOS.hpp
modules/core/src/DesktopOS.cpp
```

The platform implementation lives under:

```text
modules/platform/
```

The most useful current documents are:

```text
handoff.md
docs/platform-abstraction.md
docs/renderer-registry.md
docs/graphics-renderer-feature-matrix.md
docs/apple-platforms.md
docs/android-graphics-limitations.md
docs/web-emscripten-graphics-limitations.md
```

Relevant CI definitions include:

```text
.github/workflows/general-tests-ci.yml
.github/workflows/platform-ci.yml
.github/workflows/apple-ci.yml
.github/workflows/d3d-windows-ci.yml
.github/workflows/emscripten-multi-renderer-ci.yml
```

These sources should be preferred over an undated statement that a platform is simply “supported”.

---

## Conclusion

CNA currently targets:

```text
Windows
Linux
macOS
Android
iOS / iPadOS
Web / WebAssembly
```

The most accurate short summary is:

```text
Linux
    primary and broadly qualified

Windows
    implemented and executed through Wine translation stacks
    native hardware qualification still open

macOS
    native Apple-silicon build, tests and bundle smoke
    current SDL_GPU qualification narrower than Linux

Android
    NDK + x86_64 emulator with OPENGLES3
    no physical-device matrix

iOS / iPadOS
    final-linked device build + SOFTWARE simulator smoke
    experimental, no physical-device run

Web
    WEBGL2 and WEBGPU execute in Chrome
    browser/GPU matrix remains bounded
```

CNA is cross-platform, but it does not pretend that every line in that list has equal evidence.

That distinction is the real meaning of operating-system support in CNA.
