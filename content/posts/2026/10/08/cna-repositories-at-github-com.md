---
title: CNA repositories at github.com
date: 2026-10-08T12:42:49Z
updated: 2026-10-02T14:55:42Z
description: |
  CNA is no a single Git repository.
author: Robert Vokac
categories:
  - Projects
tags:
  - Bindings
  - GitHub
  - Repositories
  - CNA Ecosystem
  - Samples
  - Documentation
  - Projects
originalUrl: https://blog.libcna.com/2026/10/08/cna-repositories-at-github-com/
classicpressId: 44
classicpressStatus: future
draft: false
---

CNA is no a single Git repository.

As of October 2026, the `libcna` GitHub organization contains **26 public repositories** covering the core framework, supporting libraries, language bindings, project templates, samples, applications, experiments, documentation, and websites.

Most users do not need all of them.

## Core and foundation repositories

### cna

The main repository.

This contains the C++23 implementation of the XNA 4.0 programming model, the graphics system, 50 renderer paths, Platform API, audio, input, networking, content system, CNAEXT, tests, tools, and the native C API.

The C API is deliberately part of the main CNA repository rather than a separate project.

### sharp-runtime

A C++ implementation of a pragmatic subset of the .NET `System::*` runtime.

It provides types and runtime functionality useful when translating C# software into native C++, and it is used by CNA and several projects built around it.

### easy-gl

A toolkit-independent C++20 RAII wrapper over OpenGL and OpenGL ES.

EasyGL is also important inside CNA: the OpenGL ES 2, OpenGL ES 3, OpenGL 3.3, WebGL 1, and WebGL 2 renderer identities are built around the EasyGL renderer family.

### meta-gl

A lower-level C++23 wrapper around OpenGL ES and WebGL.

It provides type-safe GL enums and runtime function loading without exposing ordinary OpenGL headers to its users.

### xna4-spec

A reference project documenting the XNA 4.0 API surface.

It exists to provide a more systematic specification against which CNA compatibility work can be checked.

### cna-extended

An early C++23 port of MonoGame.Extended for CNA.

The project covers areas such as collision detection, tweening, viewport adapters, sprite animation, particles, ECS functionality, bitmap fonts, and tilemap formats including Tiled, LDtk, and Ogmo.

## Language bindings

CNA's native implementation remains C++, but the C API is being used as the foundation for additional programming languages.

The additional language is **C itself**, which does not need a separate binding repository because its API lives directly inside `cna`.

Together with C++, the long-term target is therefore CNA applications written in **3 languages**.

One binding currently have their own repository:

### cna-cs

C# bindings for CNA.

This is particularly important because XNA itself was primarily used from C#. The project aims to let XNA-style C# applications run on top of the native CNA core.

## Project templates

Each language also needs a practical starting point.

The organization therefore contains a set of small template repositories:

- `cna-template` — C++
- `cna-c-template` — C
- `cna-cs-template` — C#

These are intentionally separate from the binding implementations.

- A binding repository is where the language integration itself is developed.
- A template is where an application developer can start a new CNA project.

## Samples and examples

### cna-samples

One of the most important repositories outside the framework itself.

It contains C++ ports of official Microsoft XNA Game Studio 4.0 samples.

These samples are not only demonstrations. They are also compatibility tests that regularly uncover missing or incorrect CNA behavior.

### cna-cs-samples

The corresponding C# sample compatibility workspace.

Original XNA-style C# applications can be tested against the evolving CNA C# binding, helping drive the binding toward real XNA compatibility.

### cna-examples

A different kind of sample repository.

Instead of porting Microsoft samples, this is one large CNA-specific application containing a browsable catalog of demonstrations.

The current project contains **13 areas, 79 categories, and 249 demo screens**, covering framework functionality, math, content, input, audio, devices, networking, media, 2D graphics, 3D graphics, and more.

### cna-gltf-viewer

A desktop application for viewing `.gltf` and `.glb` files.

It uses CNA's own tooling to convert glTF into CNA content, loads the result through `ContentManager`, and renders it through CNA's 3D API.

## Larger CNA applications and demos

### cna-multi-language-3d-demo

This repository is intended to become one of the clearest demonstrations of CNA's multi-language architecture.

It defines one small 3D game, **CNA Starfield Courier**, which is ultimately intended to exist in C++ and all ten additional CNA languages.

Currently only the C++ implementation is complete. The other nine language directories are intentionally still empty until they contain real CNA-powered ports.

### cna-street

A much larger graphics demonstration.

It renders a detailed city street with traffic, pedestrians, shops, imported assets, PBR materials, shadows, reflections.

Its purpose is to exercise CNA's graphics layer on something substantially more complicated than an isolated test scene.``

### mesh-craft

A C++23 3D scene editor for the MC3 format.

It includes primitives, CSG operations, PBR materials, animation, and glTF/GLB and MCB export.

These projects are useful because they push CNA in ways that small tests cannot.

A framework can pass thousands of isolated tests and still reveal very different problems once it has to render a street, run a simulation, edit complex 3D scenes, or support a complete game.

## Experimental workspace

### cna-lab

Not every CNA-related experiment needs to immediately become a permanent standalone project.

`cna-lab` is a workspace for experimental CNA-related repositories, integrated using Git subtrees so that their history can be preserved while the projects are tested and developed together.

Some experiments may eventually become important projects.

Others may disappear.

That is what the lab is for.

## Websites and documentation

The GitHub organization also contains the sources behind several CNA-related websites.

### libcna.com

The main CNA website, containing documentation, tutorials, demos, videos, roadmap information, and general project information.

### samples.libcna.com

The website used to publish CNA sample applications that can run directly in the browser.

The online collection is still growing and represents only part of the much larger set of samples already ported to CNA.

### demos.libcna.com

The repository behind the CNA demos website.

### sharpruntime.com

The website repository for sharp-runtime.

## A rough map of the ecosystem

At the moment, the 44 public repositories can be summarized roughly like this:

| Area | Repositories |
| --- | --- |
| CNA core, libraries and specification | 7 |
| Language bindings | 1 |
| Project templates | 3 |
| Samples, demos, applications and experiments | 11 |
| Websites and documentation | 4 |
| Total | 26 |

The structure behind it is:

```text
                         CNA
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
  foundation          C API          XNA compatibility
   libraries              │
        │                 │
        │          language bindings
        │                 │
        └────────────┬────┘
                     │
                  templates
                     │
              games / applications
                     │
          samples / demos / tools
                     │
             websites / docs
```
