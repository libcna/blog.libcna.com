---
title: Operating Systems supported by CNA
date: 2026-12-06T17:53:02Z
updated: 2026-09-13T18:06:10Z
description: |
  CNA is a cross-platform C++ framework designed to let the same application code run across desktop computers, mobile devices and web browsers.
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
  - Cross-platform
  - Operating Systems
originalUrl: https://blog.libcna.com/2026/12/06/operating-systems-supported-by-cna/
classicpressId: 115
classicpressStatus: future
draft: false
---

CNA is a cross-platform C++ framework designed to let the same application code run across desktop computers, mobile devices and web browsers.

The major operating systems and target environments CNA is designed to support are:

```text
Windows
Linux
macOS
Android
iOS / iPadOS
Web / WebAssembly
```

There is, however, an important distinction between **a target supported by CNA's architecture and source code** and **a target that has already been tested on the real operating system**.

At the current stage of CNA development, Windows, Linux, Android and Web have received practical execution and development attention. macOS and iOS/iPadOS are supported as target platforms in the architecture and significant code already exists for them, but they have **not yet been tested on actual macOS or iOS environments**.

This is primarily a matter of development time and access to the corresponding Apple environment, not a decision to exclude Apple platforms.

Testing and completing the Apple targets is planned, and CNA's architecture is deliberately being developed so that this work can happen without redesigning the framework.

For most application code, differences between operating systems are hidden behind CNA's XNA-compatible API.

A game can use familiar types such as:

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

without rewriting its entire architecture for every operating system.

Conceptually:

```text
                    CNA application
                         │
                         ▼
                 XNA-compatible API
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
     Windows           Linux            macOS
        │                │                │
        ├──────── Android / iOS ──────────┤
        │                                 │
        └────────── WebAssembly ──────────┘
```

The amount of practical verification behind each branch is not yet equal.

---

## Platform identification

CNA provides compile-time target identification through:

```cpp
CNA::TargetPlatform
```

The current high-level targets are:

```cpp
enum class TargetPlatform
{
    Desktop,
    Android,
    iOS,
    Web
};
```

Desktop operating systems are distinguished separately through:

```cpp
CNA::DesktopOS
```

with values such as:

```cpp
Windows
Linux
MacOSX
Other
```

The resulting hierarchy is approximately:

```text
Desktop
├── Windows
├── Linux
└── macOS

Android

iOS / iPadOS

Web
```

CNA provides helpers including:

```cpp
CNA::getCurrentPlatform();
CNA::getCurrentDesktopOS();
CNA::getCurrentPlatformName();
CNA::isMobilePlatform();
CNA::isApplePlatform();
```

This is part of the framework's portable architecture.

It does not imply that every target has already reached the same level of real-world testing.

---

## Windows

Windows is one of CNA's primary desktop targets.

CNA identifies it as:

```text
TargetPlatform::Desktop
DesktopOS::Windows
```

A normal CNA game can use essentially the same XNA-style application architecture as on Linux while CNA handles Windows-specific integration underneath it.

Windows is particularly important to CNA because it also provides access to a very large range of graphics APIs.

Depending on the selected renderer, CNA contains support for technologies such as:

```text
Direct3D
Direct2D
GDI
OpenGL
Vulkan
SDL GPU
Software rendering
```

along with CNA's experiments involving older generations of DirectX and other rendering technologies.

Operating-system support and renderer support are separate concepts.

For example:

```text
Windows
    │
    ├── Direct3D 11
    ├── Direct3D 12
    ├── Vulkan
    ├── OpenGL
    └── Software
```

can all represent the same operating-system target.

---

## Windows development and testing

CNA contains substantial Windows-specific code and build infrastructure.

Windows binaries can also be cross-built using environments such as:

```text
MinGW-w64
```

while technologies including:

```text
Wine
DXVK
vkd3d-proton
```

make it possible to execute significant parts of Windows-oriented CNA code from Linux during development.

For example:

```text
Direct3D 11
     │
     ▼
    DXVK
     │
     ▼
   Vulkan
```

can provide useful automated validation.

This does not make Wine equivalent to testing every configuration on native Windows hardware.

CNA therefore tries to distinguish between:

```text
implemented
cross-tested
native-tested
```

rather than treating those terms as interchangeable.

---

## Linux

Linux is currently the main CNA development environment and one of its most extensively exercised operating systems.

CNA identifies Linux as:

```text
TargetPlatform::Desktop
DesktopOS::Linux
```

The project is regularly developed using mainstream C++ toolchains such as:

```text
GCC
Clang
```

Linux is particularly useful for CNA because a very large number of graphics technologies can be developed and tested there.

Depending on the renderer, these include technologies such as:

```text
OpenGL
OpenGL ES
Vulkan
WebGPU
Software rendering
PortableGL
TinyGL
bgfx
FNA3D
SDL-based rendering
```

and many other experimental CNA renderers.

Linux therefore currently provides one of the strongest practical foundations for CNA development.

---

## X11 and Wayland

Linux desktop applications commonly run through one of two important display systems:

```text
X11
Wayland
```

CNA understands both types of native environment and its graphics infrastructure can work with the native information required by renderers.

For example, an X11 environment involves concepts such as:

```text
Display*
Window
```

while Wayland uses objects such as:

```text
wl_display*
wl_surface*
```

Applications built on CNA should not normally need to interact directly with these APIs.

The details of how CNA abstracts windowing and host-system integration belong to the separate **CNA Platform API** topic.

---

## macOS

macOS is an intended CNA desktop target.

CNA's source code already recognizes it as:

```text
TargetPlatform::Desktop
DesktopOS::MacOSX
```

and CNA contains Apple-specific paths and graphics work intended to make macOS support possible.

However, there is an important current limitation:

> CNA has not yet been practically tested on macOS.

This means macOS should currently be regarded as:

```text
architecturally supported
+
implementation work present
+
planned target
-
not yet verified on macOS
```

rather than being described as a fully qualified CNA platform.

The reason is primarily practical: development so far has concentrated on other environments, especially Linux, and there has not yet been enough time to perform the required macOS testing.

---

## Metal and macOS

CNA contains a Metal renderer and Apple-specific graphics infrastructure.

This is an important part of the future macOS path because Metal is Apple's modern native graphics API.

Conceptually, CNA is designed to allow:

```text
CNA application
      │
      ▼
   CNA Graphics
      │
      ▼
     Metal
      │
      ▼
    macOS
```

But the existence of the source code alone should not be confused with completed runtime qualification.

Before macOS support should be considered mature, it still needs practical work such as:

```text
building CNA on macOS
running its tests on macOS
launching real CNA applications
testing window creation and input
testing renderers
testing content loading
testing audio
testing lifecycle behavior
testing on actual Apple hardware
```

This work is planned.

The architecture and existing source code are intended to make it incremental work rather than requiring a new port of CNA from scratch.

---

## Why macOS is already part of CNA's architecture

Even though macOS has not yet been practically tested, it is useful to include it in CNA's supported target architecture now.

Otherwise code could accidentally evolve around assumptions such as:

```text
desktop == Windows or Linux
```

which would make the eventual Apple port much harder.

Instead CNA already distinguishes:

```text
Windows
Linux
macOS
```

at the platform level.

Graphics, input and operating-system abstractions are likewise designed not to assume that only the currently most frequently tested systems exist.

This is part of preparing CNA for broader portability before every individual target has received equal testing.

---

## Android

Android is one of CNA's mobile targets:

```text
TargetPlatform::Android
```

Android applications can be built using the Android NDK, allowing large parts of a CNA application to remain native C++.

A representative toolchain configuration uses:

```text
Android NDK
CMake
C++
```

rather than requiring the application itself to be rewritten around a Java game framework.

---

## Android lifecycle

Android differs significantly from a traditional desktop environment.

Mobile applications must deal with events such as:

```text
pause
resume
window recreation
orientation changes
touch input
mobile storage behavior
system-controlled application lifecycle
```

CNA's goal is to adapt these differences underneath its `Game` model so that game code remains as close as practical to the familiar XNA architecture.

Mobile-specific functionality can also involve areas such as:

```text
touch
motion sensors
orientation
compass
haptics
```

where implemented and available.

---

## Android testing

Android has received more practical execution work than the current Apple mobile targets.

CNA development has included Android-oriented builds and emulator-based work.

Nevertheless, Android itself contains an enormous variety of devices.

An emulator cannot establish complete compatibility with:

```text
every Android GPU driver
every vendor
every screen configuration
every physical sensor
every touchscreen
every Android release
```

So Android support should also be understood as an evolving compatibility target rather than an assertion that every Android device has already been individually qualified.

---

## iOS and iPadOS

CNA also includes iOS as a mobile target:

```text
TargetPlatform::iOS
```

covering the Apple mobile ecosystem including iPhone and iPad.

Like macOS, however, **iOS and iPadOS have not yet been practically tested by the CNA project**.

The current situation is therefore approximately:

```text
iOS / iPadOS target architecture
        │
        ├── platform recognition exists
        ├── Apple-related implementation exists
        ├── mobile architecture is being kept compatible
        ├── future testing is planned
        │
        └── actual iOS/iPadOS validation still pending
```

CNA should therefore not currently claim that iPhone and iPad execution has already been verified.

---

## Why iOS is still listed

It would also be misleading to classify iOS simply as an unrelated hypothetical future port.

The framework already knows about:

```text
TargetPlatform::iOS
```

and its architecture deliberately takes Apple and mobile environments into account.

The intended future architecture is:

```text
CNA application
      │
      ▼
     CNA
      │
      ▼
Apple/mobile integration
      │
      ▼
 iOS / iPadOS
```

The missing part is practical verification and the work discovered by that verification.

In real platform development, compiling source code is rarely the final challenge.

Testing on iOS will eventually need to validate areas such as:

```text
application startup
window/surface creation
touch input
graphics
audio
content loading
storage
orientation
suspend/resume
background behavior
resource recreation
real device performance
```

Some problems will almost certainly only become visible once CNA is actually run in those environments.

That testing is planned.

---

## macOS and iOS status should be described carefully

For the time being, a useful distinction is:

```text
Windows
Linux
Android
Web
    practical CNA development/test experience exists

macOS
iOS / iPadOS
    intended and implemented targets,
    but platform verification has not yet been performed
```

This wording is more accurate than either extreme.

It would be wrong to say:

> CNA does not support Apple operating systems at all.

because the framework already contains platform knowledge and implementation work directed toward them.

But it would also be wrong to say:

> CNA is fully tested on macOS, iPhone and iPad.

because that testing has not happened yet.

---

## Web

CNA also targets web browsers.

Internally this environment is represented as:

```text
TargetPlatform::Web
```

Web is not an operating system in exactly the same sense as Linux or Windows.

But from the perspective of a portable C++ application framework, it is an important execution target and naturally belongs alongside the operating-system targets.

---

## WebAssembly

CNA web applications can be built through:

```text
Emscripten
```

which allows C++ to be compiled into:

```text
WebAssembly
```

and integrated with browser APIs.

Conceptually:

```text
CNA C++ application
        │
        ▼
    Emscripten
        │
        ▼
 WebAssembly + JS
        │
        ▼
     Browser
```

A substantial amount of game code can therefore remain C++ even when the final CNA application executes inside a browser.

---

## The browser is a different environment

Web support requires more than compiling the same source code with another compiler.

Browsers have fundamentally different rules:

```text
browser-controlled main loop
sandboxed filesystem
canvas-based graphics
restricted access to system APIs
different audio startup behavior
different threading model
asynchronous APIs
no traditional native application window
```

CNA contains web-specific behavior to adapt these concepts to its normal programming model.

---

## Web graphics

CNA's browser-oriented graphics work includes technologies such as:

```text
WebGL 1
WebGL 2
WebGPU
```

as well as experimental browser presentation technologies such as:

```text
Canvas
SVG
DOM
PixiJS
```

This gives CNA multiple possible ways to present graphics in a browser rather than making the Web target synonymous with one renderer forever.

---

## WebGL context loss

A browser can invalidate a WebGL graphics context while the application continues running.

The browser may later restore it.

CNA therefore has to account for events conceptually equivalent to:

```text
webglcontextlost
webglcontextrestored
```

and rebuild graphics resources where necessary.

This demonstrates an important point about operating-system support:

```text
successful compilation
```

is only the beginning.

Real portability means adapting framework behavior to the environment's lifecycle.

---

## Same application architecture

The goal of CNA's operating-system support is to allow code such as:

```cpp
class MyGame final : public Game
{
protected:
    void LoadContent() override
    {
        player =
            Content.Load<Texture2D>("Textures/player");
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

to remain fundamentally the same regardless of whether the eventual target is:

```text
Windows
Linux
macOS
Android
iOS / iPadOS
WebAssembly
```

The framework handles as many platform differences as practical underneath this API.

---

## Current target status

A more accurate overview of the current CNA situation is:

| Target | Current status |
| --- | --- |
| Linux | Primary CNA development environment and heavily exercised |
| Windows | Major CNA target with substantial implementation and testing infrastructure |
| Android | Real mobile target with development and emulator-oriented work |
| Web / WebAssembly | Real Emscripten target with dedicated browser handling |
| macOS | Intended and partially implemented target, but not yet practically tested on macOS |
| iOS / iPadOS | Intended and partially implemented mobile target, but not yet practically tested on iOS/iPadOS |

This table will naturally change as CNA development continues.

In particular, practical Apple-platform testing is planned.

---

## What should happen next for Apple platforms?

The next step is not primarily to add macOS and iOS names to the source code.

Those concepts already exist.

The next step is to take the existing implementation to real Apple environments and discover what still needs work.

For macOS that means eventually running a matrix such as:

```text
configure
    ↓
compile CNA
    ↓
compile tests
    ↓
run tests
    ↓
launch sample application
    ↓
test graphics
    ↓
test input
    ↓
test audio
    ↓
test content
```

For iOS/iPadOS it additionally means:

```text
simulator
    ↓
real application bundle
    ↓
real device
    ↓
touch / sensors / lifecycle
```

Only after that work should the Apple targets be described as extensively verified.

---

## Why this staged approach is reasonable

A cross-platform project does not need to complete every operating system simultaneously.

CNA is still evolving rapidly.

It is reasonable to first stabilize major architectural systems on the environments currently available for day-to-day development and then expand testing to additional operating systems.

What matters is avoiding architectural decisions that make those later ports unnecessarily difficult.

CNA already attempts to do that by separating:

```text
game code
graphics abstraction
platform abstraction
input
audio
content
operating-system-specific integration
```

rather than spreading direct Linux or Windows assumptions through the whole framework.

As a result, future macOS and iOS work should primarily be a process of:

```text
testing
fixing
completing integrations
adding CI
documenting limitations
```

rather than rewriting CNA into a cross-platform framework after the fact.

---

## Graphics renderers are a separate topic

Operating-system support should not be confused with CNA's large renderer ecosystem.

For example:

```text
Windows
```

does not mean:

```text
DirectX
```

and:

```text
Linux
```

does not mean:

```text
OpenGL
```

A target operating system can potentially support many graphics implementations.

Conceptually:

```text
Windows
├── Direct3D
├── Vulkan
├── OpenGL
└── Software

Linux
├── Vulkan
├── OpenGL
├── WebGPU
└── Software

macOS
├── Metal
└── other compatible paths

Web
├── WebGL
├── WebGPU
└── browser-oriented renderers
```

Whether an individual combination is currently implemented and tested depends on the renderer itself.

That subject is covered separately by CNA's renderer documentation.

---

## The CNA Platform API is also a separate topic

Likewise, this article does not describe the internal CNA Platform API in detail.

That system deals with abstractions such as:

```text
window creation
events
keyboard
mouse
gamepads
native window handles
clipboard
display enumeration
system services
```

and how implementations such as SDL or future native platform backends connect CNA to an operating system.

That answers:

> How does CNA communicate with the operating system?

This article answers a different question:

> Which operating systems and execution environments is CNA designed to target?

---

## Portability as a long-term goal

Supporting multiple operating systems is important for more than immediate convenience.

It reduces the dependence of applications on one particular vendor or operating-system API.

A game written directly against:

```text
Win32
```

has a different long-term dependency profile from a game written against:

```text
CNA
```

where Win32 is merely one implementation beneath the framework.

Likewise, application code ideally does not need to know whether the host environment eventually uses:

```text
X11
Wayland
Cocoa
UIKit
browser APIs
```

The architectural relationship becomes:

```text
Application
    │
    ▼
   CNA
    │
    ▼
operating-system integration
```

rather than:

```text
Application
    │
    ▼
one specific operating-system API forever
```

This is especially important for games and applications intended to remain buildable for decades.

---

## Source code

The CNA repository is available at:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

Target-platform identification is primarily defined in areas such as:

```text
modules/core/include/CNA/TargetPlatform.hpp
modules/core/include/CNA/DesktopOS.hpp
modules/core/src/DesktopOS.cpp
```

Operating-system and environment-specific code is distributed across modules including:

```text
modules/platform/
modules/graphics/
modules/input/
modules/audio/
modules/sensors/
modules/haptics/
```

while build infrastructure also contains target-specific handling for environments including:

```text
Windows
Linux
Android
Apple platforms
Emscripten / WebAssembly
```

The exact maturity and test coverage of those paths continues to evolve.

---

## Conclusion

CNA is designed to target:

```text
Windows
Linux
macOS
Android
iOS / iPadOS
Web / WebAssembly
```

but these targets do not currently have equal levels of verification.

Linux is the main CNA development environment.

Windows, Android and Web have also received practical platform work.

macOS and iOS/iPadOS are already represented in CNA's architecture and source code, and the framework is deliberately being designed with them in mind, but they have **not yet been practically tested on those operating systems**.

That work remains planned.

The distinction is important because CNA should make claims based on evidence rather than treating:

```text
code exists
```

as automatically equivalent to:

```text
platform verified
```

The long-term goal remains straightforward:

```text
                      CNA application
                            │
                            ▼
                         CNA API
                            │
       ┌────────────┬───────┼────────┬──────────────┐
       ▼            ▼       ▼        ▼              ▼
    Windows       Linux   macOS   Android     iOS / iPadOS
                            │
                            ▼
                     Web / WebAssembly
```

Most application code should be written for **CNA**, while the framework absorbs the differences between the environments underneath it.

For macOS and iOS, the architecture is already moving in that direction.

The remaining task is to take those paths onto real Apple systems, test them thoroughly and fix whatever practical platform work that testing reveals.
