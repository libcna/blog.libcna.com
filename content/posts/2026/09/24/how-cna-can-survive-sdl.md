---
title: How CNA can survive SDL
date: 2026-09-24T11:21:36Z
updated: 2026-10-02T14:16:22Z
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

But CNA is built around the  principle: **SDL should be an implementation choice, not something CNA applications fundamentally depend on.**

CNA had working native **Win32, X11 and Wayland** platform backends, which allowed CNA applications to run without SDL. But these native platform backends are retired now due the cost of their maintenance in CNA.

## SDL is important to CNA

CNA currently uses **SDL3 as its default platform backend**.

There are also Headless and POSIX Terminal backends.

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

They do not need to know whether CNA implements those concepts using SDL, Win32, X11, Wayland or some future platform technology.

CNA talks to the operating system or platform library.

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

## CNA already had multiple platform backends

### SDL3

SDL3 remains CNA's default general-purpose platform backend.

It provides the most convenient portable path across multiple operating systems and remains an important part of normal CNA configurations.

### Win32

It implements the platform layer directly using Windows APIs rather than routing windowing and input through SDL.

The Win32 backend covers areas such as:

- native window creation
- Windows event processing
- keyboard and mouse input
- text input
- DPI handling
- fullscreen state
- system services
- graphics-surface integration

This makes a fully native Windows platform path possible.

For example: **Win32 + Direct3D 12 **does not require SDL to provide the application's window or event loop.

### X11

It provides a Linux/X11 path without requiring SDL for the core platform implementation.

The backend covers native X11 windowing, events, keyboard and mouse handling, clipboard-related functionality, graphics-surface integration and other platform services.

CNA's X11 work also has an important architectural role: **it provides a real SDL-free Linux configuration.**

### Wayland

Wayland requires a substantially different architecture from X11.

The CNA implementation includes native Wayland concepts such as:

- registry discovery
- surfaces
- seats
- keyboard and pointer input
- outputs
- clipboard and drag-and-drop
- text input
- window states
- fractional scaling
- relative pointer support
- pointer constraints
- presentation timing

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

Its existence is architecturally useful because it demonstrates that CNA's platform interface is not simply an SDL wrapper with another name.

## What happens when SDL4 appears?

CNA will add an SDL4 platform backend.

Existing CNA applications can continue using CNA's platform-facing APIs.

Most of the migration work belongs inside CNA.

## What if SDL disappears completely?

If SDL were no longer maintained decades from now, that would not automatically mean: CNA is dead.

On Windows, CNA has Win32 (retired).

On Linux, CNA has X11 (retired) and Wayland (retired).

On macOS, a native Cocoa platform could be implemented.

Other environments can have their own platform implementations.

## Long-lived applications need replaceable foundations

Imagine a CNA application created in 2026. Perhaps somebody wants to run it in 2046 or 2066.

The exact versions of SDL, Windows, Linux, graphics drivers, GPU APIs and compilers available today may be irrelevant by then.

That is what CNA's architecture is trying to make possible.

SDL3 today. Perhaps SDL4 tomorrow.

Win32, X11 and Wayland already available as native alternatives.
