---
title: How large is CNA?
date: 2026-09-17T10:58:05Z
updated: 2026-10-02T13:37:40Z
description: |
  Today, CNA contains the XNA-compatible framework, 18 graphics renderers a content system and content pipeline, audio, input, networking, native and portable platform backends, focused graphics and device extensions, XNA Design support, a native C API, a large test suite, and supporting tools.
author: Robert Vokac
categories:
  - About
tags: []
originalUrl: https://blog.libcna.com/2026/09/17/how-large-is-cna/
classicpressId: 22
classicpressStatus: publish
draft: false
---

Today, CNA contains the XNA-compatible framework, 18 graphics renderers a content system and content pipeline, audio, input, networking, native and portable platform backends, focused graphics and device extensions, XNA Design support, a native C API, a large test suite, and supporting tools.

The figures below describe the development branch "next" measured on October 2, 2026.

## Around 368,000 lines of non-generated production C++ code

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

For example, Direct3D, Vulkan and SDL GPU contain generated shader headers, while the graphics extensions use generated shader-package headers.

These generated files account for approximately: **135,000 lines of generated C++.**

## The C API adds another 101,000 lines

A native C API is directly included inside the CNA repository and currently contain approximately: **101,000 lines of non-generated C and C++ code.**

The C API is much more than a tiny compatibility wrapper.

- It provides a language-neutral ABI over CNA's C++ implementation and is intended to form the foundation for bindings to additional programming languages.

## The tests are huge too

Module test directories currently contain approximately: **312,000 lines of C and C++ test code.**

- Of that, **265,943 lines** belong to the framework and renderer modules outside the C API, while the C API contributes another **45,104 lines** in its dedicated test directory.

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
| Renderers | 137,116 lines |
| Content and Content Pipeline | 71,213 lines |
| Platform | 43,655 lines |
| Graphics | 36,778 lines |
| Gamer Services | 17,637 lines |
| Audio | 11,763 lines |
| Networking | 9,419 lines |
| Math | 7,185 lines |
| Input | 6,599 lines |
| Devices and Device Extensions | 5,588 lines |
| Media | 5,127 lines |
| Runtime | 4,177 lines |
| Inspector | 3,834 lines |
| Diagnostics | 1,898 lines |
| Graphics Extensions / CNAEXT | 1,743 lines |
| Core | 1,713 lines |
| Design | 895 lines |
| Video, Storage and Phone | 1,847 lines |
| Framework total, excluding C API | 368,187 lines |

These numbers change frequently because CNA is still under active development.

## 18 graphics renderers

CNA currently exposes **18 public renderers** implemented through **14 renderer families**.

The shared EasyGL renderer family provides five public identities:

- OpenGL ES 2
- OpenGL ES 3
- OpenGL 3.3
- WebGL 1
- WebGL 2

CNA also contains renderer implementations for:

- Vulkan
- WebGPU
- Direct3D 9
- Direct3D 11
- Direct3D 12
- Metal
- SDL Renderer
- SDL GPU
- FNA3D
- Canvas
- Software
- Headless
- Stub

## Graphics is separate from the renderers

CNA's main graphics module is separate from the individual renderer implementations.

It currently contains **36,778 lines of non-generated production C++**, or approximately **36,800 lines**, and provides the XNA-facing graphics API and shared infrastructure such as:

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

That separation is one of the reasons CNA can support 18 renderer identities without requiring applications to be written directly against those APIs.

## CNAEXT extensions for graphics and devices

CNA also contains extensions called **CNAEXT**, separate from the XNA-compatible API and intended for functionality that did not exist in XNA 4.0.

Dedicated extension modules include `graphics-ext` and `devices-ext`.

The graphics-extension module now contains **1,743 lines of production C++**, or approximately **1,700 lines**.

There are also **1,696 lines of generated shader-package C++ headers** used by that module. Those generated headers are excluded from the implementation figure.

The graphics extensions focus on:

- ASCII post-processing
- CRT effects
- colour-depth reduction and dithering
- standalone `DebugDraw`
- portable shader-package values used by the retained effects and custom shaders

The graphics extensions include core PBR effects, glTF import, custom shaders and renderer capabilities such as compute and storage resources. Their availability still depends on the renderer and platform.

## Content is another large subsystem

Content loading and processing together account for approximately:

**71,000 lines of non-generated production C++.**

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

## The native platform layer has become substantial

The platform subsystem now contains approximately:

**43,700 lines of production C++.**

SDL3 remains CNA's default platform implementation, headless and POSIX terminal implementations.

CNA now also has working native platform backends for:

- **Win32** on Windows
- **X11** on Linux
- **Wayland** on Linux

## Lines of code are not a quality metric

CNA is simultaneously trying to:

- reproduce the XNA 4.0 programming model
- support 18 graphics renderers
- remain independent of any single graphics API
- support portable and native platform backends
- process old and modern asset formats
- run real XNA software
- provide focused optional graphics and device extensions
- support XNA Design and other less commonly implemented framework areas
- expose a native C ABI
- enable bindings to additional programming languages
- maintain a very large compatibility and regression test suite

That naturally creates a substantial codebase.
