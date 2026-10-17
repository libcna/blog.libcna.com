---
title: How large is CNA?
date: 2026-09-17T10:58:05Z
updated: 2026-10-17T12:18:00Z
description: |
  Today, CNA contains the XNA-compatible framework, 10 graphics renderers, a content system and content pipeline, audio, input, networking, portable platform backends, focused graphics and device extensions, XNA Design support, a native C API, a large test suite, and supporting tools.
author: Robert Vokac
categories:
  - About
tags: []
originalUrl: https://blog.libcna.com/2026/09/17/how-large-is-cna/
classicpressId: 22
classicpressStatus: publish
draft: false
---

Today, CNA contains the XNA-compatible framework, 10 graphics renderers, a content system and content pipeline, audio, input, networking, portable platform backends, focused graphics and device extensions, XNA Design support, a native C API, a large test suite, and supporting tools.

The figures below describe the development branch "next" measured on October 17, 2026.

## Around 288,000 lines of non-generated production C++ code

This number excludes:

- tests
- examples, benchmarks and standalone diagnostic programs outside the production trees
- the C API
- automatically generated source files
- vendor/
- third_party/
- comment-only lines
- blank lines

## Why generated code is counted separately

Several renderers contain automatically generated C++ headers that embed compiled shaders and other generated data.

For example, Direct3D 9 and SDL GPU contain generated shader headers, while the graphics extensions use generated shader-package headers.

These generated files account for approximately: **25,000 lines of generated C++.**

This figure does not include the C API's generated route implementation, which is counted separately below.

## The C API adds around 59,000 non-generated lines and 48,000 generated lines

A native C API is directly included inside the CNA repository.

After a major maintainability refactor, it now contains approximately:

- **58,800 lines of non-generated C and C++ code**
- **48,200 lines of generated C++ route code**

The generated route code replaces a large amount of repetitive hand-written ABI glue. It is produced during development from **5,901 lines of declarative TOML specifications** by a route generator of approximately **956 lines of Python**.

The generated C++ is committed to the repository and compiled normally with CNA. The TOML specifications and Python generator are development-time tools; they are not parsed or required at runtime.

The C API currently exposes **3,205 `cna_*` functions**. Of these:

- **3,197 functions (99.75%)** use generated route code
- **2,249** are generated entirely from their specifications
- **948** use a generated ABI shell around a hand-written C++ helper containing the actual complex logic
- only **8 functions** remain fully hand-written because their ABI behavior is exceptional

This structure keeps complex implementation logic in normal C++ while generating repetitive work such as exception barriers, output validation, handle clearing and canonical boolean checks.

The C API is much more than a tiny compatibility wrapper.

- It provides a language-neutral ABI over CNA's C++ implementation and is intended to form the foundation for bindings to additional programming languages.

## The tests are huge too

Module test directories currently contain approximately: **296,000 lines of C and C++ test code.**

- Of that, **244,378 lines** belong to the framework and renderer modules outside the C API, while the C API contributes another **51,762 lines** in its dedicated test directory.

The C API refactor also introduced generated contract coverage for the generated routes, including thousands of checks for common ABI contracts such as output validation, handle behavior and boolean validation.

For CNA, this validation code is especially important because compatibility is not simply about recreating XNA class names and method signatures.

Small behavioral differences in mathematics, graphics states, content loading, audio, input, resource lifetime, networking, serialization or rendering can break real applications.

The test suite helps turn discovered compatibility problems into permanent regression tests.

Around one hundred XNA samples have also been ported or investigated during CNA development, providing another layer of real-world validation. Those separate sample projects are outside the module LOC totals in this article.

## Where is the code?

Most CNA code lives in a set of relatively independent modules.

Rendering remains the largest individual area, but CNA also contains major subsystems for content, platforms, graphics, audio, input, networking, media, devices, Gamer Services, storage, runtime infrastructure, diagnostics, inspection tools, XNA Design tooling and other parts of the XNA programming model.

Using the same methodology throughout — production code only, with tests, examples, comments, blank lines and generated source files excluded — the measured sizes currently look like this:

| Area | Non-generated production code |
| --- | --- |
| Renderers | 83,403 lines |
| Content and Content Pipeline | 73,581 lines |
| Platform | 12,720 lines |
| Graphics | 36,547 lines |
| Gamer Services | 19,334 lines |
| Audio | 11,607 lines |
| Networking | 9,662 lines |
| Math | 7,213 lines |
| Input | 6,615 lines |
| Devices and Device Extensions | 5,617 lines |
| Media | 5,174 lines |
| Runtime | 4,250 lines |
| Inspector | 3,826 lines |
| Diagnostics | 1,906 lines |
| Graphics Extensions / CNAEXT | 1,664 lines |
| Core | 1,729 lines |
| Design | 895 lines |
| Video, Storage and Phone | 1,856 lines |
| Framework total, excluding C API | 287,599 lines |

These numbers change frequently because CNA is still under active development.

## 10 graphics renderers

CNA currently exposes **10 public renderers** implemented through **8 renderer families**.

The shared EasyGL renderer family provides three public identities:

- OpenGL ES 3
- OpenGL 3.3
- WebGL 2

CNA also contains renderer implementations for:

- WebGPU
- Direct3D 9
- SDL GPU
- FNA3D
- Software
- Headless
- Stub

In October 2026, CNA retired its own Vulkan, Direct3D 11 and Metal renderers and the SDL Renderer. SDL GPU is now CNA's modern native cross-platform path: CNA maps XNA 4.0 onto SDL GPU, and SDL provides its Vulkan, Direct3D 12 and Metal backends. This retirement is the main reason the renderer and generated-code figures are much smaller than in earlier versions of this article.

## Graphics is separate from the renderers

CNA's main graphics module is separate from the individual renderer implementations.

It currently contains **36,547 lines of non-generated production C++**, or approximately **36,500 lines**, and provides the XNA-facing graphics API and shared infrastructure such as:

- `GraphicsDevice`
- textures
- vertex and index buffers
- render targets
- graphics states
- effects
- models
- `SpriteBatch`
- resource management
- display modes
- graphics adapters

The graphics module describes what the application wants to do.

A renderer translates those operations into a particular graphics API or output technology.

That separation is one of the reasons CNA can support 10 renderer identities without requiring applications to be written directly against those APIs.

## CNAEXT extensions for graphics and devices

CNA also contains extensions called **CNAEXT**, separate from the XNA-compatible API and intended for functionality that did not exist in XNA 4.0.

Dedicated extension modules include `graphics-ext` and `devices-ext`.

The graphics-extension module now contains **1,664 lines of production C++**, or approximately **1,700 lines**.

There are also **1,339 lines of generated shader-package C++ headers** used by that module. Those generated headers are excluded from the implementation figure.

The graphics extensions focus on:

- ASCII post-processing
- CRT effects
- colour-depth reduction and dithering
- standalone `DebugDraw`
- portable shader-package values used by the retained effects and custom shaders

The graphics extensions include core PBR effects, glTF import and custom vertex and fragment shaders. Their availability still depends on the renderer and platform.

## Content is another large subsystem

Content loading and processing together account for approximately:

**73,600 lines of non-generated production C++.**

The repository contains work around:

- XNB reading and writing
- content readers and writers
- compression
- textures
- models
- fonts
- audio assets
- glTF 2.0
- CNA's native CNB content format
- build-time content importing and processing

## The platform layer has become substantial

The platform subsystem now contains approximately:

**12,700 lines of production C++.**

SDL3 remains CNA's default platform implementation, headless and POSIX terminal implementations.

## Lines of code are not a quality metric

CNA is simultaneously trying to:

- reproduce the XNA 4.0 programming model
- support 10 graphics renderers
- remain independent of any single graphics API
- support portable platform backends
- process old and modern asset formats
- run real XNA software
- provide focused optional graphics and device extensions
- support XNA Design and other less commonly implemented framework areas
- expose a native C ABI
- enable bindings to additional programming languages
- maintain a very large compatibility and regression test suite

That naturally creates a substantial codebase.