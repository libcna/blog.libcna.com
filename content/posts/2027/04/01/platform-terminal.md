---
title: Platform Terminal
date: 2027-04-01T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  CNA's POSIX Terminal platform presents the software renderer's RGBA framebuffer as an ANSI character grid, with keyboard, mouse, resize and honest capability reporting.
author: Robert Vokac
categories:
  - Development
tags:
  - CNA
  - C++23
  - Terminal
  - ANSI
  - Software Rendering
  - Platform
draft: false
---

CNA applications can run in a real terminal. `CNA_PLATFORM=TERMINAL` is a POSIX platform backend that combines CNA's normal game loop and input APIs with a CPU renderer, then presents the completed image as a colored ANSI character grid.

This is more than printing occasional text frames, but it is also intentionally not a new graphics renderer. Game code still draws sprites, primitives and render targets through CNA. The terminal is the platform surface on which the software-rendered result is presented.

**Design and implementation notes:** [docs/platform-terminal-analysis.md](https://github.com/libcna/cna/blob/next/docs/platform-terminal-analysis.md)

## Build without a desktop window system

Configure a terminal build with the software renderer:

```bash
cmake -S . -B build-terminal \
  -DCNA_PLATFORM=TERMINAL \
  -DCNA_GRAPHICS_RENDERER=SOFTWARE \
  -DCNA_ENABLE_SDL=OFF
cmake --build build-terminal
```

The platform accepts CPU renderers such as `SOFTWARE`, `HEADLESS` and `STUB`. Selecting a GPU renderer is a configuration error because the terminal presenter requires a CPU-visible RGBA8 frame. SDL is optional; a minimal build can use the terminal or headless platform together with software graphics and null or ALSA audio.

## A presenter, not a renderer fork

The important abstraction is `IPlatformSurfacePresenter`:

```text
Game drawing
    ↓
GraphicsDevice
    ↓
software rasterizer
    ↓
completed RGBA8 framebuffer
    ↓
TerminalSurfacePresenter
    ↓
ANSI cells on stdout
```

The software renderer hands over its finished buffer without converting the game to a separate ASCII drawing API. The presenter samples cells, chooses glyphs and colors, and writes terminal escape sequences. That preserves normal draw ordering, blending and 2D or 3D software rendering.

The terminal's reported client bounds are virtual pixels derived from its column and row count and the selected cell dimensions. A `SIGWINCH` resize updates those bounds, so the game sees an ordinary resize rather than inspecting terminal globals itself.

## Color, bandwidth and damage

On startup the backend enters the alternate screen and hides the cursor. It prefers 24-bit foreground and background colors, but can degrade through 256-color, 16-color and monochrome output when the terminal reports fewer capabilities.

Writing an entire screen as individually styled cells every frame would waste bandwidth. The presenter tracks damage and groups adjacent cells with identical attributes, reducing cursor movement and color changes. A byte budget prevents one expensive frame from blocking the game indefinitely; diagnostics report frames that had to be dropped.

The visual result depends on the terminal font, cell aspect ratio, palette and emulator. It should be treated as a distinctive presentation target, not as a pixel-identical substitute for a desktop window.

## Designing a scene for cells

A game that merely shrinks a dense desktop picture may technically run but remain unreadable. Strong silhouettes, large UI elements and restrained detail survive quantization better. Thin diagonal lines flicker between cells, small text turns into texture, and subtle color gradients can collapse when the terminal falls back from true color.

The virtual pixel size still lets existing layout code work. It is nevertheless useful to select a terminal-oriented quality preset: reduce particle counts, enlarge important prompts, avoid relying on one-pixel outlines and keep critical colors distinct in both full color and monochrome. Rendering a lower-resolution scene can also reduce CPU rasterization work before presentation.

Do not assume a fixed 80×24 terminal. Query client bounds, react to resize notifications and define a minimum useful size. When the window becomes too small, a clear pause or resize message is preferable to a broken HUD. Letterboxing can preserve a game's intended aspect ratio, but on a small terminal it may waste too many cells; responsive layout is often the better choice.

## Keyboard and text input

Terminal input exposes a fundamental mismatch. XNA's `Keyboard::GetState()` describes which keys are currently held, while traditional terminals mostly send bytes when a key is pressed. They do not reliably send releases.

When supported, CNA enables the Kitty keyboard protocol and receives distinct press, repeat and release events. That produces an exact held-key snapshot. On terminals without it, CNA uses a documented timeout heuristic to synthesize releases. The platform capability says whether keyboard state is exact, allowing a game to choose controls appropriate to the environment.

Text entry is a more natural fit: UTF-8 input can feed `TextInputEXT`. Escape-sequence parsing distinguishes navigation and function keys from typed characters without exposing parser details to the game.

## Mouse and gamepad limits

Xterm SGR mouse reporting provides buttons, wheel events and position. Coordinates are cell-based, so `Mouse::GetState()` is useful but cannot claim pixel accuracy. Mouse capture and desktop-global warping are not meaningful in this environment.

A plain terminal cannot discover a gamepad. `GamePad::GetState()` therefore reports disconnected instead of inventing an input source. Likewise, the backend does not pretend to offer multiple windows, HiDPI surfaces, native dialogs or a native OpenGL context.

These limitations are surfaced through platform capabilities. The goal is graceful adaptation, not making every method appear to work.

## Leaving the terminal intact

Raw mode, alternate-screen selection, mouse tracking and a hidden cursor all modify shared terminal state. Restoration is mandatory on normal exit, exceptions and handled signals. CNA keeps display bytes on `stdout` and diagnostics on `stderr`, and refuses interactive presentation when output is not a TTY.

This detail separates a usable backend from a demo that leaves a shell without echo or a visible cursor after a crash. Automated coverage runs the 2D demo inside a pseudo-terminal, checks alternate-screen output, drives `SIGWINCH`, and verifies terminal-specific diagnostics.

## Platform status

The current backend is POSIX-only. Linux is its natural target, including remote shells and lightweight systems where a desktop compositor is unavailable. Windows virtual-terminal support would require a separate console implementation and is not silently treated as complete.

The Terminal platform is useful for experiments, remote visualization, automated environments and games that embrace the character-cell aesthetic. Most importantly, it remains part of CNA's platform architecture: the application keeps its usual XNA-style drawing code while presentation and input adapt honestly to a very different screen.
