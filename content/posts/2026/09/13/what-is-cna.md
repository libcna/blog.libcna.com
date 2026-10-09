---
title: What is CNA?
date: 2026-09-13T10:46:24Z
updated: 2026-10-02T13:23:22Z
description: |
  CNA is an open-source C++23 reimplementation of the Microsoft XNA 4.0 programming model.
author: Robert Vokac
categories:
  - About
tags: []
originalUrl: https://blog.libcna.com/2026/09/13/what-is-cna/
classicpressId: 17
classicpressStatus: publish
draft: false
---

CNA is an open-source C++23 reimplementation of the Microsoft XNA 4.0 programming model.

It combines an XNA-style framework with a modular runtime, 14 graphics renderers, a content system, audio, input, networking, platform abstractions and language bindings.

## XNA, rebuilt in C++

CNA preserves XNA concepts such as Game, GameTime, GraphicsDevice, SpriteBatch, ContentManager, SoundEffect, GamePad, vectors, matrices, effects, models and render targets.

It is not limited to native C++ applications. CNA C# binding can serve XNA C# applications.

CNA applications use the familiar high-level XNA API and do not care how the windows and input is actually implemented (SDL, Win32, X11 or Wayland) and how the graphics is rendered (OpenGL, Vulkan, Direct3D, WebGPU, Metal, software rendering or another renderer).

## A modular framework

CNA contains separate systems for: framework and runtime functionality, mathematics, graphics, input, audio, media, video, content, content processing, storage, devices, device extensions, phone, gamer services, networking, platform integration, renderers and the C ABI.

An important architectural principle is that **platforms and renderers are separate**.

SDL3 remains the default platform implementation, headless and POSIX terminal implementations. 

The CNA dependencies should be replaceable.

- Games and applications built on CNA should be able to live for decades.
- If SDL 3 becomes obsolete, CNA can move to SDL 4, SDL 5, native platform backends, or something else.

## 14 graphics renderers

CNA now contains **14 renders** implemented through 12 renderer families.

The shared EasyGL family provides `OpenGLES3`, `OpenGL33` and `WebGL2`.

Other renderer identities cover Vulkan, WebGPU, Direct3D 9, Direct3D 11, Metal, SDL Renderer, SDL GPU and FNA3D.

There are also specialized approaches such as the CPU-based Software renderer; and Headless and Stub implementations for cases where normal visual output is unnecessary.

Not all 14 renderers are equally complete. Some are broad 2D and 3D implementations, some intentionally support a narrower subset of functionality, some are specialized for a particular operating system or environment, and others remain experimental.

## Compatibility through real XNA 4.0 C# samples

CNA relies heavily on automated tests, reference behavior, pixel comparisons and real XNA samples.

Roughly **one hundred XNA samples have already been ported** as part of CNA development.

These samples can be run directly in the browser through WebAssembly at [https://samples.libcna.com](https://samples.libcna.com).

These samples have uncovered many CNA issues.

When necessary, behavior is compared directly with the original XNA 4.0 runtime.

The objective is to make that code behave correctly. No workarounds are used in these ported samples. Their source code stays as close as possible to the original C# implementations.

**Sharp Runtime** is the C++ reimplementation of the .NET runtime, which makes this level of source compatibility possible:

[https://sharpruntime.com](https://sharpruntime.com)
[https://github.com/libcna/sharp-runtime](https://github.com/libcna/sharp-runtime)

## Content and assets

CNA can import glTF 2.0 assets with geometry, materials, animation, skinning and many other features.

The CNA Content Pipeline follows the familiar importer → processor → writer model and can build assets into two compiled formats.

CNA has a native C++ XNB writer, which can produce XNA-style compiled content without depending on XNA Game Studio or MonoGame's build tools.

CNA can consume supported existing XNB assets through its content-pipeline compatibility path.

**CNB** is CNA's own native compiled content format.

Native assets can be processed by CNA too.

## More than C++

CNA itself is implemented in C++23, but C++ is not the only language that can use it.

CNA officially maintains bindings for C and C#.

The C binding provides a native boundary between CNA and other runtimes.

The C# binding is important because it makes it possible to run XNA 4.0 C# applications on CNA.

These eight bindings are now archived and no longer actively maintained: Java, TypeScript, Python, Rust, Swift, Go, Ruby and Common Lisp. Their source code and Git history are preserved in CNA Lab ( [https://github.com/libcna/cna-lab](https://github.com/libcna/cna-lab) ).

Each language binding exposes different assumptions about ownership, callbacks, type systems, APIs and runtime behavior, helping to uncover weaknesses and compatibility issues in CNA itself.

## Where CNA goes next

CNA is currently still an **alpha-stage project**.

The next planned CNA release is `0.1.0`.

Future CNA releases are planned to use numeric versions such as `0.1.0`, `0.1.1`, `0.1.2`, `0.2.0`.

A `1.0.0` release will be reserved for the point at which CNA is stable and mature enough. Given the scope of the project, that may still be several years away.

There is a great deal of work remaining on compatibility, renderer parity, testing, documentation, native platform support, the content pipeline, XNB interoperability, the C ABI, language bindings and long-term maintainability.

## Summary

CNA is a native, cross-platform C++ framework, that has has 18 graphics renderers, a modular runtime, native Win32, X11 and Wayland platform backends, XNA Design support, a growing CNB/XNB content pipeline, modern graphics experiments, language bindings and around one hundred sample ports.

Feature expansion in CNA is slowing down. The current priority is stability.
