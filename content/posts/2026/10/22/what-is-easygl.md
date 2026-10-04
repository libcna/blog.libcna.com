---
title: What is EasyGL?
date: 2026-10-22T13:20:47Z
updated: 2026-09-13T15:18:40Z
description: |
  EasyGL is a toolkit-independent C++20 graphics library built on top of OpenGL and OpenGL ES.
author: Robert Vokac
categories:
  - Graphics
tags:
  - OpenGL
  - C#
  - MetaGL
  - OpenGL ES
  - WebGL
  - EasyGL
  - Graphics
originalUrl: https://blog.libcna.com/2026/10/22/what-is-easygl/
classicpressId: 52
classicpressStatus: future
draft: false
---

## What is EasyGL?

**EasyGL** is a toolkit-independent C++20 graphics library built on top of OpenGL and OpenGL ES.

It provides a more convenient object-oriented API for common graphics operations while deliberately leaving window creation, context creation, events, and presentation to the host application.

EasyGL is also important to CNA.

It forms the foundation of CNA's **EasyGL renderer family**, which currently powers several renderer identities including OpenGL ES, desktop OpenGL, and WebGL profiles.

But EasyGL itself is an independent project.

It does not know anything about XNA, `GraphicsDevice`, `SpriteBatch`, or the CNA Renderer API.

**Github:** [https://github.com/libcna/easy-gl](https://github.com/libcna/easy-gl)

**Website:** [https://easygl.libcna.com](https://easygl.libcna.com)

## Where EasyGL sits

The easiest way to understand EasyGL is to look at the stack:

```text
CNA / XNA API
      ↓
CNA EasyGL Renderer
      ↓
EasyGL
      ↓
MetaGL
      ↓
OpenGL / OpenGL ES / WebGL
      ↓
GPU driver
```

Each layer has a different responsibility.

**CNA** provides the XNA-style programming model.

**EasyGL** provides higher-level C++ graphics objects and commands.

**MetaGL** provides the low-level type-safe interface to OpenGL.

The actual OpenGL implementation comes from the operating system, graphics driver, ANGLE, Emscripten, or another host environment.

## Why does EasyGL exist?

Raw OpenGL is powerful, but it is also very low-level.

Creating a vertex buffer, shader program, texture, or vertex array requires managing integer handles, binding state, object lifetimes, and many related API calls.

MetaGL makes those calls safer and more strongly typed, but deliberately keeps them close to OpenGL.

EasyGL goes one step higher.

Instead of working primarily with functions such as:

```cpp
metagl::glGenBuffers(...)
metagl::glBindBuffer(...)
metagl::glBufferData(...)
```

EasyGL can represent the resource as a C++ object:

```cpp
easygl::Buffer buffer;

buffer.create();
buffer.bind(easygl::BufferTarget::Array);
buffer.set_data(vertices, vertices_size);
```

The same idea applies to shaders, programs, textures, vertex arrays, queries, and other GPU resources.

The goal is not to hide OpenGL completely.

The goal is to make common OpenGL programming more manageable in modern C++.

## The main EasyGL objects

The public API is centered around a relatively small set of classes.

### Device

`easygl::Device` represents the main interaction point with the active graphics context.

It handles initialization, graphics state, capability queries, and drawing operations.

For example:

```cpp
easygl::Device device;

device.initialize(my_get_proc_address);

device.set_clear_color(0.2f, 0.3f, 0.3f, 1.0f);
device.clear(easygl::ClearFlags::Color);
```

The device does not create the OpenGL context.

The host must already have created and activated one.

### Shader

Represents a programmable shader stage.

For example:

```cpp
easygl::Shader vertexShader(easygl::ShaderStage::Vertex);

vertexShader.compile_from_source(vertexSource);
```

### Program

Combines shaders into a linked GPU program:

```cpp
easygl::Program program;

program.attach(vertexShader);
program.attach(fragmentShader);
program.link();
program.use();
```

### Buffer

Wraps OpenGL buffer objects used for things such as vertex and index data.

### VertexArray

Represents vertex-array state and vertex attribute layouts.

### Texture

Provides an object-oriented interface around OpenGL textures.

These objects replace much of the repetitive lifetime and handle management that normally surrounds raw OpenGL.

## EasyGL does not create windows

This is one of the most important design decisions.

EasyGL is **not tied to SDL**.

It is also not tied to GLFW, Qt, Win32, X11, Wayland, Cocoa, or another windowing toolkit.

The host application owns:

- window creation
- OpenGL context creation
- context activation
- event processing
- buffer swapping
- presentation

EasyGL only needs access to the active context and a function loader.

Conceptually:

```text
SDL3 / GLFW / Win32 / X11 / ...
              ↓
     creates GL context
              ↓
          EasyGL
              ↓
           MetaGL
              ↓
        OpenGL driver
```

This is especially important for CNA because CNA already has its own Platform API.

EasyGL does not need to duplicate that responsibility.

## Initialization

After the host creates a context, EasyGL receives a `GetProcAddress` callback:

```cpp
easygl::Device device;

device.initialize(my_get_proc_address);
```

That callback ultimately allows MetaGL underneath EasyGL to load the OpenGL functions provided by the current driver.

The callback could come from SDL, GLFW, a native platform implementation, Emscripten, or another environment.

This keeps the graphics library independent of the mechanism used to create the window.

## EasyGL and MetaGL

The difference between the two projects can be summarized simply.

### MetaGL

MetaGL answers:

> How can I call OpenGL from modern C++ in a safer and more strongly typed way?

It provides thin wrappers such as:

```cpp
metagl::glBindBuffer(...)
metagl::glCreateShader(...)
metagl::glClear(...)
```

### EasyGL

EasyGL answers:

> How can I build common rendering code without manually managing every OpenGL object and operation?

It provides objects such as:

```cpp
easygl::Buffer
easygl::Shader
easygl::Program
easygl::Texture
easygl::VertexArray
easygl::Device
```

MetaGL stays close to OpenGL.

EasyGL builds a more convenient graphics layer above it.

The MetaGL project explicitly describes itself as the foundation used by EasyGL.

## OpenGL and OpenGL ES

EasyGL is designed to work across the programmable OpenGL family.

That includes desktop OpenGL and OpenGL ES.

But these APIs do not support exactly the same features.

For example, functionality available on desktop OpenGL may be missing or restricted on an OpenGL ES context.

EasyGL therefore exposes runtime capability checking rather than assuming every context can do everything.

The public API includes concepts such as:

```cpp
easygl::Capabilities
easygl::ContextInfo
easygl::Feature
```

Applications and higher layers can inspect the actual environment before using optional functionality.

This becomes particularly important when the same code needs to run across desktop, mobile, and browser graphics environments.

## EasyGL inside CNA

EasyGL has a much larger role inside CNA than a standalone hello-triangle example might suggest.

CNA contains an `EasyGLRenderer` implementing its internal `IGraphicsRenderer` contract. Current CNA source uses EasyGL objects internally for resources and rendering operations.

The same renderer family is used for multiple graphics profiles.

Conceptually:

```text
                    ┌─ OpenGL ES 2
                    ├─ OpenGL ES 3
CNA → EasyGLRenderer├─ OpenGL 3.3
                    ├─ WebGL 1
                    └─ WebGL 2
                         ↓
                       EasyGL
                         ↓
                       MetaGL
```

These are separate CNA renderer identities because they have different capabilities and restrictions.

But they can share a large part of the same implementation.

That is one reason EasyGL became such an important reference renderer inside CNA.

## Why not use raw OpenGL directly in CNA?

CNA does have other OpenGL-family renderers that use their own implementations.

For example, legacy OpenGL, OpenGL 2, and OpenGL 4 have reasons to remain distinct from EasyGL.

But using EasyGL for the main portable programmable OpenGL family has several advantages.

Resource management can be shared.

Capability detection can be shared.

Context-loss handling can be shared.

Common OpenGL differences can be solved once instead of repeatedly inside the CNA renderer.

And CNA's renderer code can focus more on translating XNA concepts into graphics operations rather than repeatedly rebuilding basic C++ OpenGL infrastructure.

## A CNA renderer is still much more than EasyGL

It is important not to confuse the two layers.

EasyGL does not implement XNA.

For example, EasyGL does not inherently know what these mean:

```text
SpriteBatch
BasicEffect
GraphicsDevice
BlendState
RasterizerState
RenderTarget2D
XNA compiled effects
```

That translation belongs to CNA's EasyGL renderer.

The stack therefore looks more like:

```text
SpriteBatch
   ↓
CNA GraphicsDevice
   ↓
CNA EasyGLRenderer
   ↓
easygl::Program / Buffer / Texture / ...
   ↓
MetaGL
   ↓
OpenGL
```

The standalone EasyGL library stays much smaller and more general because it does not contain XNA-specific behavior.

## Context loss and resource lifetime

Graphics resources have another difficult problem: contexts can disappear.

This is particularly relevant on WebGL, mobile systems, and environments where graphics devices may be recreated.

CNA's EasyGL renderer uses EasyGL resource abstractions as part of its resource recovery architecture. The CNA codebase contains renderer resources built around EasyGL's recoverable-resource mechanisms.

That allows the higher-level renderer to separate the logical resource from the native OpenGL handle that may need to be recreated.

This is another example of work that is easier to solve once in a reusable graphics layer than independently for every CNA resource class.

## EasyGL is not an engine

EasyGL deliberately does not contain:

- scene management
- entities
- physics
- animation systems
- asset pipelines
- game loops
- input
- audio
- windows
- XNA compatibility

It is a graphics library.

A standalone application can use it directly:

```text
Application
    ↓
 EasyGL
    ↓
 MetaGL
    ↓
 OpenGL
```

CNA is simply a much larger consumer:

```text
Game
 ↓
CNA
 ↓
EasyGL Renderer
 ↓
EasyGL
 ↓
MetaGL
 ↓
OpenGL
```

This separation lets EasyGL remain useful independently of CNA.

## A deliberately replaceable layer

There is also a broader architectural reason why EasyGL exists as its own project.

CNA should not have to contain every low-level graphics utility directly inside the framework.

EasyGL can evolve independently.

MetaGL can evolve independently.

CNA can depend on their public contracts.

And other applications can use the same libraries without depending on CNA.

This makes the layers easier to reason about:

```text
MetaGL  → safe low-level OpenGL access

EasyGL  → convenient C++ graphics objects

CNA     → XNA-compatible framework and renderer abstraction
```

Each project solves a different problem.

## Why EasyGL matters to CNA

CNA has many renderer implementations, but EasyGL has historically been one of the most important ones for renderer development and comparison.

Its OpenGL-family implementation is portable, relatively direct, and capable enough to exercise a large part of CNA's graphics API.

That makes it useful as a reference when bringing other renderer implementations toward feature parity.

At the same time, EasyGL itself remains independent of CNA.

That is exactly how the layering is intended to work.

## A simpler interface to the OpenGL family

EasyGL does not try to replace OpenGL with a completely different graphics model.

It remains recognizably OpenGL-based.

But instead of requiring every application to manually manage raw handles, state, function pointers, shaders, buffers, and textures, it provides reusable modern C++ objects around those concepts.

In short:

**MetaGL makes OpenGL safer to call.**

**EasyGL makes OpenGL easier to build with.**

**CNA uses those layers to turn OpenGL into an implementation of the XNA graphics model.**
