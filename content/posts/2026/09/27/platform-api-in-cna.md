---
title: Platform API in CNA
date: 2026-09-27T11:26:04Z
updated: 2026-10-09T18:08:54Z
description: |
  SDL3 is currently one of the most important dependencies underneath CNA. But the rest of CNA is not supposed to be an SDL3 application.
author: Robert Vokac
categories:
  - Development
tags:
  - SDL3
  - Portability
  - Architecture
  - Platform API
  - Win32
  - X11
  - Wayland
  - Cocoa
originalUrl: https://blog.libcna.com/2026/09/27/32/
classicpressId: 32
classicpressStatus: publish
draft: false
---

SDL3 is currently one of the most important dependencies underneath CNA. But the rest of CNA is not supposed to be an SDL3 application.

Between the framework and the operating system sits a CNA-owned **Platform API**.

Its purpose is to isolate windowing, events, input, system services, native window handles, timing and other host-specific functionality from the rest of the framework.

Today CNA has several platform implementations:

- **SDL3**
- **Headless**
- **Terminal**

## What does "platform" mean in CNA?

A CNA platform implementation is the layer that communicates with the environment in which the application is running.

Conceptually, the architecture looks like this:

```text
XNA / CNA application
        ↓
CNA framework
        ↓
CNA::Platform
        ↓
SDL3 | Headless | Terminal
        ↓
Operating system / host environment
```

The central interface is `IPlatform`.

It is much broader than a window abstraction.

The Platform API covers areas such as:

- window creation and management
- event delivery
- high-resolution timing
- keyboard and mouse
- gamepads and joysticks
- text input and IME
- haptics and sensors
- displays
- clipboard access
- native dialogs
- system tray integration
- cameras
- filesystem paths
- system information
- native window handles
- OpenGL context creation
- Vulkan surface creation
- presentation of CPU-rendered frames

The rest of CNA consumes these CNA-owned interfaces rather than directly depending on whichever native library happens to implement them.

## SDL3 is behind the boundary

SDL3 remains CNA's default platform implementation and its only implementation for graphical windows.

Windows, X11, Wayland, macOS, iOS, Android and browser environments are reached through SDL's own video drivers.

Its implementation lives inside the Platform module and translates between SDL and CNA.

SDL events become `PlatformEvent` values.

SDL windows become `IPlatformWindow` objects.

SDL keyboard, mouse, gamepad, joystick, sensor, clipboard, display, dialog and other functionality is exposed through CNA-owned interfaces.

This distinction is important.

The framework does not need to pass `SDL_Window*` throughout the codebase simply because SDL created the window.

SDL-specific knowledge stays close to the SDL3 platform implementation.

SDL itself is normally linked privately by the Platform module instead of becoming part of CNA's public platform contract.

There are deliberate exceptions, such as renderers that are themselves explicitly built on SDL, but unrelated CNA systems should not need to know that SDL exists.

## Events are platform-neutral

Native events are translated at the platform boundary.

Different event systems can therefore feed the same CNA runtime:

```text
SDL3 event ─────┐
               ├──→ PlatformEvent ──→ CNA runtime
Terminal input ─┘
```

`PlatformEvent` can represent window changes, keyboard input, text input, mouse movement, touch, device connections, sensors, controllers, application lifecycle events and other host events.

Events are collected at the platform boundary and exposed through CNA's own event model.

The rest of CNA does not need separate event-processing code for SDL3 and Terminal.

That is one of the most important responsibilities of the Platform API.

## Platform and renderer are separate

One of CNA's most important architectural decisions is that **platform and renderer are two independent axes**.

The platform answers questions such as:

> Where does the window come from? Where do events come from? How do I access the clipboard? What displays exist?

The renderer answers:

> How are the pixels produced?

For example:

```text
SDL3 platform + Vulkan renderer
SDL3 platform + Direct3D 11 renderer
SDL3 platform + OpenGL renderer
SDL3 platform + Software renderer
```

Other combinations include:

```text
SDL3 platform + Metal renderer
Headless platform + Headless renderer
Terminal platform + Software renderer
```

Changing the platform implementation does not imply changing the application's XNA-facing API.

The renderer and operating-system integration remain separate concerns.

## Renderers can use native window handles

This separation goes deeper than simply placing SDL behind an interface.

CNA has a platform-neutral `NativeWindowHandle` describing what kind of native window actually exists.

It can represent environments including:

- Win32
- X11
- Wayland
- Cocoa
- Android
- Web
- Headless
- Terminal

An SDL3-created window on Windows can expose its underlying `HWND`.

On X11, the SDL3 platform exposes the native X11 display and window information.

On Wayland, it can expose the corresponding display and surface.

On macOS, it exposes the underlying Cocoa `NSWindow*`.

Direct3D, Metal and WebGPU consume CNA's native-window representation. SDL Renderer, SDL GPU and FNA3D use the SDL window directly.

That means a Direct3D renderer receives the underlying `HWND` through CNA's platform contract.

Likewise, Vulkan obtains its presentation surface through the platform contract.

## Narrow graphics services

Not every renderer needs direct access to a raw native window handle.

CNA therefore provides narrower platform services for specific graphics integration needs.

### OpenGL

OpenGL renderers can use `IPlatformGlContext`.

The renderer asks the platform to create and manage an appropriate OpenGL context for a CNA window.

This keeps the renderer independent from SDL's OpenGL context API.

The actual context can instead be created through whatever mechanism belongs to the selected platform backend.

### Vulkan

Vulkan uses `IPlatformVulkanSurface`.

The platform knows how to create a Vulkan presentation surface appropriate for its window system.

The SDL3 platform creates that surface through SDL for the active window system.

The Vulkan renderer does not need to own the entire operating-system integration layer itself.

### CPU rendering

Software and other CPU-oriented renderers can use `IPlatformSurfacePresenter`.

They produce a finished RGBA frame and give it to the platform for presentation.

This is deliberately not another rendering API.

The renderer still creates the image.

The platform only handles getting those finished pixels onto whatever destination it represents.

Together these seams allow very different host environments to participate in the same graphics architecture.

## Capabilities are explicit

Different platform implementations cannot honestly provide identical functionality.

A terminal does not behave like a graphical desktop.

Headless execution has no physical desktop.

Wayland has a different architecture from X11.

SDL can expose functionality through abstractions that do not map one-to-one onto every native platform.

CNA therefore has an explicit `PlatformCapabilities` structure.

It can describe capabilities such as:

- multiple windows
- high DPI
- multiple displays
- native window handles
- surface presentation
- OpenGL contexts
- Vulkan surfaces
- clipboard
- text input and IME
- precise keyboard and mouse behavior
- gamepads and joysticks
- haptics
- sensors
- dialogs
- system tray
- cameras

Capabilities begin from a conservative state.

A platform implementation must explicitly advertise functionality that it really supports.

Unsupported functionality should **fail clearly rather than silently pretend to work**.

This matters especially when comparing graphical, headless and terminal backends.

A backend does not need to implement every possible CNA platform feature before it can be useful.

It can expose the capabilities it actually implements and expand over time.

## SDL3 platform

**SDL3 remains CNA's default general-purpose platform implementation.**

It provides a broad set of services needed by normal desktop and other supported CNA environments.

These include areas such as windows, displays, high DPI, graphics integration, keyboard and mouse input, controllers, text input, clipboard access, dialogs, system information and other platform services.

It also maps SDL-created windows into CNA's platform-neutral native-handle representation.

SDL3 therefore remains extremely valuable to CNA.

The purpose of the Platform API is not to remove SDL3.

It is to make SDL3 **replaceable**.

## Headless platform

The **Headless platform** is very different from the normal desktop implementations.

It has no SDL dependency and no physical graphical window.

But it still implements the same `IPlatform` contract.

Its window is an in-memory CNA object that can participate in framework behavior without requiring a real desktop surface underneath it.

Headless is useful for:

- automated testing
- CI
- game logic
- server-like applications
- environments without a display

It also has architectural value.

If CNA's Platform API were merely an SDL API hidden behind virtual functions, implementing Headless cleanly would be difficult.

Instead, Headless acts as another test that the contract describes CNA concepts rather than SDL concepts.

## Terminal platform

The **Terminal platform** goes even further.

It targets POSIX terminal environments and does not require a conventional graphical window system.

The application's window can be represented through a real terminal.

Finished CPU-rendered frames can be converted into terminal output, while terminal input and resizing can feed the same CNA Platform API.

Keyboard functionality can make use of richer terminal protocols when available while retaining fallback behavior.

Mouse handling is naturally constrained by terminal character-cell coordinates rather than behaving exactly like a pixel-based desktop pointer.

There is no native GPU window.

No `HWND`.

No X11 window.

No Wayland surface.

Yet it still participates in the same Platform API.

That makes Terminal one of the strongest demonstrations that CNA's platform abstraction is not inherently shaped around SDL — or even around conventional graphical desktops.

It also enables unusual environments such as SSH sessions, terminal multiplexers and machines without a normal graphical desktop.

## One selected default platform

The primary platform implementation is selected at build time through `CNA_PLATFORM`.

Current selections include:

```text
CNA_PLATFORM=SDL3
CNA_PLATFORM=HEADLESS
CNA_PLATFORM=TERMINAL
```

Not every value is valid on every operating system.

For example, Terminal requires a POSIX environment and is unavailable on Windows.

`PlatformFactory` creates the platform implementation selected for that build.

Headless is compiled in every build because it is valuable for testing the contract.

Terminal is also available on POSIX builds.

The SDL3 platform implementation is compiled only when selected. SDL chooses its window-system driver at runtime; `SDL_VIDEODRIVER` can select one explicitly.

## Other portable platform backends are possible

The Platform API is not limited to SDL or native operating-system backends.

Another portable window/input library could also be placed behind the same contract.

For example, a future **GLFW platform backend** would be architecturally possible:

```text
CNA
 ↓
GLFW platform backend
 ↓
Win32 / Cocoa / X11 / Wayland
```

GLFW is **not currently a CNA platform backend**, and there is no requirement to add it.

But the architecture allows this kind of alternative.

Other portable libraries could be evaluated in the same way if they provided a useful implementation of CNA's platform contract.

This is another consequence of owning the abstraction at the CNA level rather than making SDL itself the abstraction.

## Platform, renderer and audio are separate axes

CNA takes separation further than platform versus graphics.

The **platform**, **graphics renderer** and **audio backend** are separate architectural choices.

A platform provides the host environment.

A renderer produces graphics.

An audio backend communicates with the audio system.

A build with `CNA_ENABLE_SDL=OFF` uses Headless or Terminal, a Headless, Software or Stub renderer, and NULL or Linux ALSA audio. Graphical window builds require SDL3.

## Dependencies should be replaceable

An application can use CNA while Vulkan, Direct3D, OpenGL, Metal, WebGPU or another graphics implementation exists underneath it.

## The application stays above the platform

The final architecture is simple:

```text
Application
     ↓
CNA / XNA programming model
     ↓
CNA Platform API
     ↓
selected implementation
     ↓
host environment
```

The selected implementation may be SDL3, Headless or Terminal.

The same contract can support additional implementations in the future.
