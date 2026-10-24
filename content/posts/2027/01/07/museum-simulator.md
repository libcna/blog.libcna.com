---
title: Museum Simulator
date: 2027-01-07T12:00:00Z
updated: 2026-10-17T14:35:22Z
description: |
  Museum Simulator is a ten-floor first-person CNA museum whose 295 exhibit rooms turn framework APIs into interactive displays.
author: Robert Vokac
categories:
  - Projects
tags:
  - CNA
  - Museum Simulator
  - C++23
  - 3D
  - XNA
  - WebGL2
  - Interactive Documentation
draft: false
---

**Museum Simulator**, developed as **CNA 3D Museum**, turns framework documentation into a place that can be explored in first person.

Its ten floors contain **295 exhibit rooms**. Each room demonstrates a focused graphics, content, audio, input, networking or platform concept, labels the API involved and distinguishes original XNA 4.0 behavior from CNA extensions.

**Source:** [https://github.com/libcnalab/museum-simulator](https://github.com/libcnalab/museum-simulator)

**Web status:** The project has a working WebGL 2 build, but it is not yet published on `play.libcna.com`. A playable web version is being prepared.

![The entrance hall of Museum Simulator](https://raw.githubusercontent.com/libcnalab/museum-simulator/develop/docs/images/lobby.jpg)

## A framework reference you can walk through

The museum is arranged by subject rather than as a sequence of menus:

- Floor 0 introduces the building and its main systems.
- Floors 1–3 cover mathematics, sprites and fundamental 3D rendering.
- Floors 4–6 explore effects, lighting, render targets, models, animation and particles.
- Floors 7–8 cover audio, input, content, platform services and CNA extensions.
- Floor 9 contains performance and renderer-validation exhibits.

The building currently has 36 wings, 370 walkable cells and 72 exhibit kinds. A directory, minimap, elevators and stairs make the large collection navigable.

## Interactive exhibits

The rooms are not static posters. Visitors can operate controls, change values and see the corresponding CNA behavior inside the scene.

Examples include instanced rendering, light types, a CRT shader, planar mirrors, PBR glTF models, particle fire, runtime font building, content compilation and diagnostic traces.

![The interactive metallic and roughness PBR exhibit](https://raw.githubusercontent.com/libcnalab/museum-simulator/develop/docs/images/pbr.jpg)

![A renderer geometry and coverage exhibit](https://raw.githubusercontent.com/libcnalab/museum-simulator/develop/docs/images/validation.jpg)

The project uses CNA's public API directly and does not place another engine between the museum and the framework. Application code supplies the rooms, navigation and exhibit system; CNA supplies the XNA-style runtime underneath them.

## What the floors contain

The museum begins with a guided overview and becomes progressively more specialized.

The fundamentals floor turns vectors, matrices, rotations, curves, collision volumes and camera transforms into visible objects. The 2D floor concentrates on `SpriteBatch`, `SpriteFont` and text. The next level introduces buffers, primitives, dynamic geometry, instancing and textures.

The effects floors include `BasicEffect`, lighting labs, custom `ShaderEffect` programs, render-state comparisons, mirrors, multiple render targets and floating-point targets. Model-focused rooms cover glTF, PBR, skeletal animation, particles and small simulations.

Later exhibits demonstrate audio, video, keyboard, mouse, gamepad and other input. Content rooms load several image and model formats, build assets at runtime and show the output of CNA's content compiler. Platform, diagnostics, devices and the optional CNAEXT module have their own displays.

The final floor is not just a conclusion. It contains performance tools, renderer self-checks, reference scenes and an observation deck over the museum.

## XNA or CNA extension?

Each exhibit records its origin. Of the current 295 rooms, 233 demonstrate XNA 4.0 behavior and 62 demonstrate CNA extensions.

That label prevents two different ideas from being blurred together:

```text
XNA-compatible API
    behavior a ported XNA application may expect

CNA extension
    newer functionality added by CNA
```

Visitors can therefore learn features such as render targets or `BasicEffect` without mistaking a CNA-only PBR, diagnostics or shader-package facility for an original XNA API.

The generated coverage index currently names 1,292 APIs across the building. A separate map lists every room and its exact number, making the museum usable as a reference rather than only as a tour.

![The museum directory used to find exhibits across all ten floors](https://raw.githubusercontent.com/libcnalab/museum-simulator/develop/docs/images/directory.jpg)

## Finding your way

The player moves with ordinary first-person controls. The mouse looks around, `W A S D` moves, `E` or a click operates an exhibit, and `Q` chooses the previous value on a panel.

Navigation aids are part of the application:

| Control | Purpose |
| --- | --- |
| `M` or `Tab` | Open the searchable directory and floor map |
| `N` | Toggle the minimap |
| `T`, `Shift+T`, `Y` | Change or run the museum clock |
| `F1` | Show the controls |
| `F3` | Show live statistics |
| `R` | Return to the entrance |

Elevators connect all ten floors, while a complete stair system provides a walkable route between them. The directory can quick-travel to rooms on floors already visited. Door plaques, banners and accent colors help identify the current wing and subject.

## How the museum is built

The application stores the museum as a catalog of floors, wings, rooms, themes and reference views. World code turns that catalog into halls, portals and collision geometry. Rooms are built lazily rather than keeping the complete interior active at maximum detail.

Exhibits live in subject-oriented source directories such as Math, Sprites, Geometry, Performance and Validation. Rendering, interaction, UI, audio, camera and diagnostics remain separate subsystems around that catalog.

Content is also part of the demonstration. The build invokes CNA's content compiler for selected assets and the museum later loads the resulting `.cnb` and `.xnb` files through the ordinary public API.

The result is an ordinary CNA application rather than a documentation viewer that fakes its outputs. When an exhibit says it created a render target, compiled content or queried a device, the running room is using that feature.

![A planar mirror exhibit rendered inside the museum](https://raw.githubusercontent.com/libcnalab/museum-simulator/develop/docs/images/mirror.jpg)

## Different renderers, different capabilities

The same portable museum code has been toured on OPENGLES3, OPENGL33 and CNA's CPU software renderer. Optional FNA3D, WEBGPU and SDL_GPU builds exercise their own shader and effect paths.

Not every room can promise identical support everywhere. FNA3D can execute compiled XNA effect binaries, while the WebGPU and SDL_GPU configurations use their native shader representations. Wireframe fill, source shader formats, networking, video and advanced extensions can vary by build.

The exhibit checks those capabilities and displays a notice when an optional feature is unavailable. This is more informative than silently drawing a misleading substitute.

![The particle-fire exhibit in operation](https://raw.githubusercontent.com/libcnalab/museum-simulator/develop/docs/images/fire.jpg)

## Browser edition

The Emscripten build uses CNA's WebGL 2 renderer and produces an HTML shell, JavaScript, WebAssembly and a preloaded data bundle.

The browser profile retains the museum's own content-pipeline exhibits and local persistence. Native FFmpeg video, the Inspector and networking or Gamer Services are left out, and the relevant rooms identify those omissions.

The repository's browser smoke test starts the real build in headless Chrome, renders the lobby, checks that exhibits report no errors and verifies deferred IndexedDB autosave. That proves the repository has a working browser target, although the public deployment on `play.libcna.com` is still being prepared.

## A substantial verification workload

Museum Simulator is also designed to be inspected automatically. Its tools can:

- validate the complete room catalog and walking connectivity;
- visit every exhibit and operate its controls;
- capture named reference views;
- compare renderers;
- check navigation through every staircase and elevator;
- monitor resource growth during repeated tours;
- smoke-test the WebGL 2 build in Chromium.

The project has been exercised across OPENGLES3, OPENGL33, SOFTWARE, FNA3D, WEBGPU, SDL_GPU and browser WEBGL2 configurations, with explicitly different capabilities and qualifications for each renderer.

Structural tests catch duplicate room identities, disconnected doors, unreachable cells, invalid arrival poses and missing assets before a person starts exploring. The museum also validates its catalog at startup.

Scripted tours can begin in a named room, manipulate a panel, advance frames, capture a screenshot and continue elsewhere. The complete control tour visits every room and operates every available range. Separate tools compare arrival views between renderers and monitor whether repeated tours leak textures or grow memory.

This does not mean every human impression can be automated. Audible sound quality still needs listening, some services require a local account stack, and visual realism remains a judgment beyond structural correctness.

## Current boundaries

The building uses walkable stairs but no moving escalators. Software rendering can tour the whole museum without a display, although it is much slower than GPU rendering. Windows builds omit some service and video features when their optional dependencies are unavailable.

These boundaries are documented per exhibit and per renderer. The museum's value comes from making the distinction visible: a room may be structurally valid, runnable, visually reviewed or unavailable for a specific reason, and those are not treated as the same level of evidence.

## More than a showcase

Small examples are ideal for learning one API call. Museum Simulator demonstrates how many of those calls coexist in a single long-running application.

It is simultaneously an interactive CNA guide, a renderer comparison environment and a large integration test that happens to look like a virtual museum.

The source is available under the MIT License.
