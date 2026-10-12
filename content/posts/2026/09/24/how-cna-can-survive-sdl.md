---
title: How CNA can survive SDL
date: 2026-09-24T11:21:36Z
updated: 2026-10-12T07:00:00Z
description: |
  SDL is one of the most important technologies used by CNA today.
author: Robert Vokac
categories:
  - Development
tags:
  - SDL
  - SDL3
  - Platforms
  - Portability
  - Architecture
  - Software Preservation
originalUrl: https://blog.libcna.com/2026/09/24/how-cna-can-survive-sdl/
classicpressId: 30
classicpressStatus: publish
draft: false
---

SDL is one of the most important technologies used by CNA today.

- It provides window management, events, input, platform integration and many other services that would otherwise require separate implementations for Windows, Linux, macOS and other systems.

For a cross-platform framework, that is enormously useful.

But CNA is built around the principle: **SDL should be an implementation choice, not something CNA applications fundamentally depend on.**

CNA had working native **Win32, X11 and Wayland** platform backends, which allowed CNA applications to run without SDL. **They were retired on 6 October 2026** due to the cost of their maintenance in CNA.

**Windows, X11 and Wayland are still supported.** They are now supported **through SDL3**.

## SDL is important to CNA

**SDL3 is CNA's only graphical platform backend.** It is the one implementation that opens a window.

There are also Headless and POSIX Terminal backends, for environments without a window.

SDL solves many difficult portability problems:

- windows
- events
- keyboard and mouse input
- game controllers
- displays
- clipboard access
- platform integration
- timing
- many operating-system differences

SDL3 reaches each window system through its own video driver: `windows`, `x11`, `wayland`, `cocoa` on macOS, `android` and others.

SDL provides a mature, portable implementation that CNA can continue using for as long as it remains useful.

## CNA Applications depend on CNA

CNA applications care about things such as:

- `Game`
- `GraphicsDevice`
- `Keyboard`
- `Mouse`
- `GamePad`
- windows
- displays
- audio
- storage

They do not need to know whether CNA implements those concepts using SDL3, a native backend or some future platform technology.

CNA, not the application, talks to the operating system or platform library.

## The platform and renderer are separate

The platform is responsible for things such as:

- window creation
- events
- input
- display information
- clipboard integration
- native operating-system services

The renderer is responsible for graphics.

This means SDL3 can create the window while Vulkan performs rendering.

The graphics renderer does not have to be the Vulkan.

And the platform implementation does not have to be SDL 3.

**Renderers did not notice the retirement of the native backends.** A renderer still receives the native window it needs, now from SDL3:

- an `HWND` on Windows
- a `Display*` and window on X11
- a `wl_display*` and `wl_surface*` on Wayland
- an `NSWindow*` on macOS

## CNA's platform backends today

### SDL3

SDL3 is CNA's default platform backend and the only one that opens a window.

It covers every desktop and mobile target: Windows, X11, Wayland, macOS, iOS, Android and the browser.

### Headless

The Headless platform implementation is intended for environments where a normal graphical desktop is unnecessary.

It is useful for:

- automated tests
- CI
- servers
- non-interactive workloads

It also helps verify that application and framework code do not accidentally depend on normal desktop functionality.

### POSIX Terminal

POSIX Terminal provides a very different platform implementation for terminal-oriented POSIX environments.

The Software renderer can hand its finished frames to it, so **a CNA game can run in a terminal**.

Its existence is architecturally useful because it demonstrates that CNA's platform interface is not simply an SDL wrapper with another name.

## The retired native backends

CNA carried three native platform backends alongside SDL3. They worked, and they allowed a CNA game to run without SDL at all.

### Win32

It implemented the platform layer directly using Windows APIs rather than routing windowing and input through SDL.

The Win32 backend covered native window creation, Windows event processing, keyboard and mouse input, text input, DPI handling, fullscreen state, system services and graphics-surface integration.

### X11

It provided a Linux/X11 path without requiring SDL for the core platform implementation: native X11 windowing, events, keyboard and mouse handling, clipboard-related functionality and graphics-surface integration.

### Wayland

Wayland required a substantially different architecture from X11.

The CNA implementation included native Wayland concepts such as registry discovery, surfaces, seats, outputs, clipboard and drag-and-drop, text input, window states, fractional scaling, relative pointer support, pointer constraints and presentation timing.

### Why they were retired

Three copies of window management, input translation, clipboard, IME and DPI handling **cost more to keep correct than the independence from SDL they bought**. SDL3 already drives all three window systems.

Selecting `WIN32`, `X11` or `WAYLAND` is now a configure-time error that names `SDL3` as the replacement. There is no alias and no silent fallback.

Their code, designs and measurements are not lost. They stay in CNA's git history.

## CNA without SDL

CNA can still be built **completely without SDL**, as a windowless configuration:

- the **Headless** or **Terminal** platform
- the **Headless**, **Software** or **Stub** renderer
- **no audio**, or **ALSA** audio on Linux

That is enough for a server, a test runner or a terminal game.

Content does not need SDL either. CNA decodes WAV sound data with its own decoder, not with SDL.

**A build that opens a window needs SDL3.**

## What happens when SDL4 appears?

CNA will add an SDL4 platform backend.

Existing CNA applications can continue using CNA's platform-facing APIs.

Most of the migration work belongs inside CNA.

## What if SDL disappears completely?

If SDL were no longer maintained decades from now, that would not automatically mean: CNA is dead.

CNA builds SDL from source, pinned to an exact commit, so an unmaintained SDL can still be built.

And if SDL stopped working on the systems of the future, CNA's platform interface is still there:

- On Windows, a native Win32 backend can be brought back. CNA has already built one once.
- On Linux, the same is true for X11 and Wayland.
- On macOS, a native Cocoa platform could be implemented.
- Other environments can have their own platform implementations.

A new platform implementation joins CNA's implementation-neutral conformance tests automatically. Headless and Terminal are already tested by them, without SDL.

## Long-lived applications need replaceable foundations

Imagine a CNA application created in 2026. Perhaps somebody wants to run it in 2046 or 2066.

The exact versions of SDL, Windows, Linux, graphics drivers, GPU APIs and compilers available today may be irrelevant by then.

That is what CNA's architecture is trying to make possible.

SDL3 today. Perhaps SDL4 tomorrow.

And if SDL ever disappears, a native platform can take its place behind the same interface. CNA has done it before with Win32, X11 and Wayland.
