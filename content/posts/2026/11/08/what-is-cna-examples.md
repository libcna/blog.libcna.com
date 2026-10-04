---
title: What is Cna Examples?
date: 2026-11-08T15:33:13Z
updated: 2026-09-13T15:49:38Z
description: |
  CNA Examples is an interactive catalog of demonstrations covering the CNA framework.
author: Robert Vokac
categories:
  - Projects
tags:
  - CNA Ecosystem
  - Samples
  - Testing
  - Graphics
  - CNA Examples
  - Examples
  - API
originalUrl: https://blog.libcna.com/2026/11/08/what-is-cna-examples/
classicpressId: 86
classicpressStatus: future
draft: false
---

## What is CNA Examples?

**CNA Examples** is an interactive catalog of demonstrations covering the CNA framework.

Instead of distributing hundreds of tiny programs, CNA Examples puts them into **one browsable CNA application**. You launch it, choose an area of the framework, select a category, and run the demonstration directly inside the application.

**GitHub:** [github.com/libcna/cna-examples](https://github.com/libcna/cna-examples)
**Try online: **[https://demos.libcna.com/cna-examples/cna_examples.html](https://demos.libcna.com/cna-examples/cna_examples.html)

![Screenshot](https://github.com/libcna/cna-examples/raw/develop/screenshot.png)

## One application, hundreds of demonstrations

The current development version contains:

- **13 major areas**
- **79 categories**
- **249 demo screens**

Every demo exercises a real `Microsoft::Xna::Framework` or `CNA::*` API. They are not mocked screenshots or static documentation.

The current areas are:

| Area | Demo screens |
| --- | --- |
| Framework | 17 |
| Math | 16 |
| Content | 7 |
| Storage | 4 |
| Diagnostics | 4 |
| Input | 52 |
| Audio | 12 |
| Devices | 15 |
| Networking | 15 |
| Media | 17 |
| Avatars | 7 |
| 2D Graphics | 40 |
| 3D Graphics | 43 |
| Total | 249 |

The exact number will continue to grow as CNA itself grows.

## What does it look like?

CNA Examples behaves more like an interactive reference application than a traditional collection of source folders.

The navigation is hierarchical:

```text
CNA Examples
    ↓
Area
    ↓
Group
    ↓
Category
    ↓
Demo
```

For example:

```text
3D Graphics
    ↓
Textures
    ↓
Cube Textures
    ↓
RenderTargetCube demonstration
```

or:

```text
Input
    ↓
GamePad
    ↓
GamePad state demonstration
```

You can navigate with keyboard, gamepad, mouse, or touch.

## CNA Examples is not CNA Samples

There are two different projects that should not be confused.

### CNA Samples

[cna-samples](https://github.com/libcna/cna-samples) contains ports of Microsoft's original XNA samples.

Those are useful primarily for **XNA compatibility testing**.

### CNA Examples

[cna-examples](https://github.com/libcna/cna-examples) is original CNA-specific work.

Its purpose is to systematically demonstrate the CNA API.

The difference is roughly:

```text
CNA Samples
    ↓
Can existing XNA software run on CNA?

CNA Examples
    ↓
What can CNA do, and how does each API behave?
```

Both projects are useful, but they solve different problems.

## Framework demonstrations

The Framework section covers some of the most fundamental CNA concepts:

- `Game`
- the game loop
- `GameComponent`
- `DrawableGameComponent`
- services
- dispatching
- windows
- `GraphicsDeviceManager`

These demos are useful when learning CNA because they show how the pieces around rendering and game lifetime fit together.

## Math

The Math area demonstrates XNA's mathematical types and behavior, including:

- `Vector2`
- `Vector3`
- `Vector4`
- `Matrix`
- `Quaternion`
- geometry types
- curves
- `Color`
- packed vectors

Some demos also have separate automated checks that verify the mathematical claims shown on screen.

This is important because a demonstration that merely *looks* correct can still contain incorrect explanatory text.

## Input is one of the largest areas

Input currently has **52 demo screens**.

It covers much more than just keyboard and mouse:

- keyboard
- mouse
- gamepads
- touch
- joysticks
- text input
- haptics
- other device-specific input functionality

Some of these demonstrations naturally require actual hardware.

A gamepad demo cannot be fully hardware-verified without a gamepad.

The project distinguishes between features verified against real devices and features that can only be exercised partially in the current development environment.

## Graphics

Graphics forms the largest part of CNA Examples.

There are currently:

- **40 2D graphics demos**
- **43 3D graphics demos**

They exercise areas such as:

- textures
- `SpriteBatch`
- graphics states
- vertex and index buffers
- primitives
- render targets
- cube textures
- effects
- models
- depth and stencil behavior
- occlusion
- other graphics capabilities

These demonstrations are particularly useful for renderer development.

The same demo can be run through different CNA graphics backends and the results compared.

## Renderer capabilities matter

CNA renderers do not all provide identical features.

For example, `SDL_RENDERER` is intentionally a 2D renderer.

CNA Examples does not treat that as an error.

A 3D demonstration can query the active renderer's capabilities and explain that the required feature is unavailable rather than simply crashing.

This makes the application useful for exploring CNA's capability model as well as individual APIs.

The current project has verified the full set of 249 demonstrations against both the EasyGL `OPENGLES3` path and `SDL_RENDERER`, with 3D demonstrations being capability-gated on the latter where appropriate.

## More than visual demos

One of the most useful parts of CNA Examples is that the project does not rely only on a human looking at the screen.

It also contains automated validation infrastructure.

A demo can be started directly from the command line:

```bash
./cna_examples --demo "Media/Pictures/Browse"
```

It can run for a deterministic number of frames:

```bash
./cna_examples \
    --demo "Media/Pictures/Browse" \
    --frames 90
```

and capture the resulting frame:

```bash
./cna_examples \
    --demo "Media/Pictures/Browse" \
    --frames 90 \
    --screenshot result.png
```

This turns an interactive demonstration catalog into a useful test harness.

## Screenshot sweeps

The repository includes tools for automatically running large groups of demonstrations and capturing screenshots.

Conceptually:

```text
249 demos
   ↓
run each demo
   ↓
capture frame
   ↓
inspect output
   ↓
detect blank or broken rendering
```

This can expose regressions that ordinary unit tests may miss.

A graphics call may technically complete without throwing while still producing the wrong pixels.

A screenshot sweep can catch that.

## Some demos test themselves

Certain demonstrations go even further.

Instead of merely displaying a scene, they compute their own expected result.

For example, graphics tests can perform operations such as a `GetData()` round trip and display whether the returned data is correct.

This approach has already found actual CNA bugs.

One such test revealed that `RenderTargetCube::GetData()` on EasyGL could silently return zeroed data.

That is a good example of why CNA Examples is useful for framework development, not only education.

## Testing state restoration

A demonstration application has another problem: one demo can accidentally leave global graphics or window state changed for the next one.

CNA Examples therefore verifies state restoration in important areas.

For example, a resolution demo can change the back buffer and then leave the screen.

The framework verifies that the original resolution is restored afterward.

Without this discipline, the result of one demo could affect every demo that follows it.

## Synthetic assets

CNA Examples tries to keep its bundled content self-contained.

Audio, video, images, and other test media are generally generated procedurally or through tools such as FFmpeg.

This avoids turning a framework demonstration repository into a collection of third-party assets with complicated licenses.

The XNB examples are a special case: they use existing test fixtures from the CNA repository rather than bundling another copy.

## Desktop, web and eventually more

CNA Examples is designed as a cross-platform application.

The current project primarily targets Windows and Linux, with Web/Emscripten work also part of the roadmap.

Longer-term targets include environments such as:

- Android
- macOS
- iPhone
- consoles

Because the demonstrations use CNA itself, porting the catalog also becomes another way of testing CNA's cross-platform abstractions.

## A catalog of CNA itself

The long-term value of CNA Examples is not just that there are 249 screens today.

The goal is to provide a browsable map of the framework.

Instead of reading a list such as:

```text
Texture2D
RenderTarget2D
OcclusionQuery
DynamicSoundEffectInstance
NetworkSession
GamePad
MediaLibrary
StorageContainer
```

and wondering what each type actually does, a developer can open CNA Examples and see the API being exercised.

That makes it useful for:

- learning CNA
- developing CNA
- renderer testing
- regression detection
- API exploration
- documentation
- hardware testing

## Samples prove compatibility; Examples demonstrate capability

The CNA ecosystem therefore has two complementary projects:

```text
cna-samples
    ↓
real XNA programs
    ↓
compatibility evidence

cna-examples
    ↓
focused CNA demonstrations
    ↓
API and capability evidence
```

Together they provide two different views of the framework.

One asks whether CNA can run software written for XNA.

The other asks what CNA itself can do.

That is what **CNA Examples** is intended to become:

**an interactive, testable catalog of the complete CNA framework.**

---

**GitHub:** [github.com/libcna/cna-examples](https://github.com/libcna/cna-examples)
**CNA Samples:** [github.com/libcna/cna-samples](https://github.com/libcna/cna-samples)
**CNA:** [github.com/libcna/cna](https://github.com/libcna/cna)
