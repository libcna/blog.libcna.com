---
title: CNA Demos
date: 2026-12-31T12:00:00Z
updated: 2026-10-17T14:35:22Z
description: |
  CNA Demos is a searchable catalog of focused, executable examples that also doubles as an automated compatibility and regression suite for CNA.
author: Robert Vokac
categories:
  - Projects
tags:
  - CNA
  - CNA Demos
  - XNA
  - C++23
  - Testing
  - Examples
  - Renderers
draft: false
---

**CNA Demos** is a catalog of small, focused programs that demonstrate the API of [CNA](/2026/09/13/what-is-cna/).

Each demo is intended to answer one practical question: how do I clear a frame, draw a texture, load content, play audio, read input, use a render target or select a renderer?

**Source:** [https://github.com/libcna/cna-demos](https://github.com/libcna/cna-demos)

**Web status:** CNA Demos is not currently published on `play.libcna.com`. A playable web version is being prepared.

![A SpriteFont loaded from CNA's CNJ content format](https://raw.githubusercontent.com/libcna/cna-demos/next/references/OPENGLES3/content.cnj.sprite_font.png)

## One executable, hundreds of examples

The project currently contains **719 demos in 19 categories**. They cover the XNA-compatible surface, CNA extensions and the experimental C API.

The collection can be browsed interactively or controlled from the command line:

```text
cna-demos --list
cna-demos --search sprite
cna-demos --info graphics.render_target.render_target2d
cna-demos graphics.sprite_batch.draw_texture
```

Stable hierarchical IDs connect a demo to its source file. For example:

```text
graphics.sprite_batch.draw_texture
```

maps directly to:

```text
demos/graphics/sprite_batch/draw_texture.cpp
```

That makes the catalog useful both as documentation and as code that can be copied into a project.

![A focused SpriteBatch texture-drawing demo](https://raw.githubusercontent.com/libcna/cna-demos/next/references/OPENGLES3/graphics.sprite_batch.draw_texture.png)

## Documentation that executes

CNA Demos is more than a sample gallery. Every entry carries searchable metadata, including the API names it demonstrates and whether it can run unattended.

Of the 719 current demos:

- 685 are automated;
- 31 are smoke-only;
- 3 require manual interaction.

CTest discovers the entries and exposes one test per demo. Automated runs can use frame limits, produce result reports and capture screenshots.

The same catalog therefore serves three roles:

```text
learning material
      +
API coverage map
      +
regression suite
```

## How it differs from samples and tests

CNA already has several repositories that teach or verify the framework, but they work at different scales.

| Project | Main purpose | Typical unit |
| --- | --- | --- |
| CNA unit tests | Verify behavior and contracts for maintainers | One assertion or edge case |
| Renderer regression tests | Compare pixels and backend behavior | A controlled render scene |
| cna-samples | Port Microsoft's complete XNA examples | One technique or small game |
| cna-examples | Offer an interactive tour in one application | One catalog screen |
| CNA Demos | Provide executable documentation | One concept, ID and source file |

A sample may combine a camera, models, lighting, input and content to explain a complete technique. A CNA Demo deliberately isolates one of those parts so that the important call remains visible.

The project therefore avoids wrapping CNA in another convenience engine. Its small framework removes repeated application boilerplate, but the source being taught still calls the real CNA API.

## What the catalog records

Every entry carries structured metadata rather than only a filename and title. The catalog can record:

- a stable ID and human-readable title;
- a short description and searchable tags;
- the CNA or XNA API names demonstrated;
- whether the demo is a console program, a `Game` or a separate executable;
- which renderer, audio, display, network or hardware capabilities it needs;
- how many frames an automated game should run;
- whether its output is deterministic enough for reference images;
- whether a known CNA defect is expected to make it fail.

The same data drives the terminal browser, command-line search, JSON export, CTest registration and coverage report. Adding a demo does not require updating a central switch statement: the source file registers itself and the build discovers it.

## Three kinds of execution

The catalog separates the form of a demo from what an unattended run can prove.

An **automated** demo contains checks that establish its intended behavior. A **smoke-only** demo can start, update and shut down automatically, but still needs a person to judge the feature—for example physical keyboard, mouse or gamepad input. A **manual** demo is not started by an unattended batch because it requires hardware, credentials or another external observer.

Reports use four result states:

| Result | Meaning |
| --- | --- |
| `PASSED` | The program completed and every check held |
| `FAILED` | A check failed, an exception escaped or a child returned an error |
| `SKIPPED` | A declared requirement is unavailable in this environment |
| `NOT RUN` | A manual or unavailable standalone demo was intentionally not launched |

This distinction matters. A program compiling is not evidence that it ran; a program starting is not evidence that a person inspected its pixels; a missing audio device is not the same thing as an audio assertion failing.

Known framework bugs remain visible as expected failures. If a demo marked with a known issue unexpectedly starts passing, the batch reports that change so the obsolete marker can be reviewed and removed.

## Measuring real API coverage

The generated coverage report maps demo metadata back to CNA's public surface. At the current checkpoint, at least one demo names:

- 308 of 329 XNA 4.0 types;
- 2,128 of 2,326 XNA methods, properties, constructors and events;
- 3,082 of 3,205 public CNA C API routes.

Those numbers do not claim that one short program proves every semantic detail. They provide a concrete inventory of what has executable evidence and what still needs attention.

The project also records known CNA issues found while writing or running the demos. This makes the catalog an independent consumer of the framework rather than a second copy of CNA's own tests.

The coverage is generated from the repository rather than maintained as an optimistic checklist. Demo metadata is reconciled with CNA's XNA inventory and its public C headers. Anything not matched remains in the backlog or appears as a CNA-specific name that should be reviewed.

Fields and enum values are reported separately because producing one program for every enum constant would create noise rather than useful documentation. The goal is meaningful behavior, not inflating a percentage.

![A TextureCube demo showing all six faces and authored mip levels](/wp-content/uploads/2026/12/cna-demos-texture-cube.png)

## The C API collection

The C API is exercised by 177 standalone C programs. They compile as C callers and reach the experimental ABI rather than silently testing the C++ layer from C++ code.

This part of the catalog covers areas such as:

```text
runtime and window lifecycle
vectors, matrices, curves and colors
graphics resources and effects
textures, render targets and models
input devices and haptics
content, CNB and media
audio and XACT-style objects
networking and gamer services
```

Some remaining routes are hardware-dependent, service-dependent, test hooks or constant type-name helpers. The coverage report keeps those dispositions explicit instead of treating every declaration as equally runnable on a headless machine.

## Renderer-aware runs

CNA Demos can be built with several renderers in one executable and can select a compiled-in renderer for an individual run. The current complete checkpoint covers OPENGLES3, OPENGL33, SDL_GPU, SOFTWARE, HEADLESS and STUB builds.

Small reference scenes are captured on both OPENGLES3 and the software renderer. This helps distinguish an application mistake from a renderer-specific difference while keeping each test easy to inspect.

A standard validation checkpoint builds the selected configuration, validates metadata and assets, runs the CLI and framework tests, executes the per-demo CTest entries and then performs complete SOFTWARE and OPENGLES3 smoke batches.

The software renderer is particularly useful because it needs no GPU or display server. Windowed GL runs can be isolated under Xvfb, while HEADLESS and STUB cover code paths where presenting pixels is intentionally absent.

Renderer requirements stay attached to individual entries. A 3D demo can therefore be skipped honestly on a 2D-only renderer while a math or storage demo still runs.

![Focused point-light and spot-light shadow cases from an OPENGLES3 validation run](/wp-content/uploads/2026/12/cna-demos-punctual-shadows.png)

## Visual references

Most demos prove their result with values and state checks. A few graphics concepts require a picture as well.

The initial visual-regression set contains three deterministic scenes on both SOFTWARE and OPENGLES3:

- clearing the back buffer to a known color;
- drawing a small texture through `SpriteBatch`;
- loading and rendering a compiled SpriteFont.

The capture path itself uses CNA: `GraphicsDevice::GetBackBufferData` reads the frame and `Texture2D::SaveAsPng` writes it. The comparison tool retains actual images and highlighted mismatch masks when a reference differs.

Only deliberately deterministic demos are accepted into this set. Time-driven animation is not called deterministic merely because it was captured at a numbered frame; fixed-step catch-up behavior can still put two renderers at different game times.

![A focused shader-package demo comparing original colors with selected shader output](/wp-content/uploads/2026/12/cna-demos-shader-package.png)

## Safe unattended behavior

Automation is designed not to interfere with a developer's normal environment.

Gamer Services examples use a dedicated local profile store and a demo identity instead of contacting a service configured for another game. Most networking examples remain local; the one System Link case declares its network requirement and is serialized in parallel CTest runs because it uses the discovery port.

Audio can use SDL's dummy driver in CI. Input programs are usually smoke-only unless CNA provides a controlled emulation path. A random demo receives its seed from the harness so a failed run can be reproduced.

These rules let the catalog grow without turning a full smoke run into an uncontrolled collection of windows, prompts and external connections.

## Adding another concept

The authoring workflow is intentionally small:

1. choose a hierarchical ID;
2. add one source file under the matching `demos/` path;
3. register it as a console or game demo;
4. describe its APIs, requirements and automation class;
5. build and run `cna-demos --validate`;
6. execute it on every renderer its claim covers.

No CMake list needs a new entry. This makes a large catalog maintainable while keeping every example independently readable.

## A practical companion to CNA

CNA's unit tests verify framework internals and contracts. CNA Demos approaches the same system from the perspective of an application author.

It asks whether a public feature can be discovered, compiled, executed, automated and explained in isolation. That combination makes it useful when learning CNA, debugging a renderer or reviewing compatibility work.

The repository is licensed under the Microsoft Public License, like CNA itself.
