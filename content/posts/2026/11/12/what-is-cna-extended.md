---
title: What is CNA Extended?
date: 2026-11-12T15:50:02Z
updated: 2026-09-13T15:55:19Z
description: |
  CNA Extended is a C++23 port of MonoGame.Extended designed to run on top of CNA.
author: Robert Vokac
categories:
  - Projects
tags:
  - C#
  - CNA Ecosystem
  - CNA Extended
  - MonoGame.Extended
  - Tilemaps
  - ECS
  - Particles
  - 2D
originalUrl: https://blog.libcna.com/2026/11/12/what-is-cna-extended/
classicpressId: 89
classicpressStatus: future
draft: false
---

**CNA Extended** is a C++23 port of [MonoGame.Extended](https://github.com/craftworkgames/MonoGame.Extended) designed to run on top of CNA.

Its goal is to bring many of the higher-level game-development utilities from the MonoGame.Extended ecosystem to native C++ while preserving their original design and behavior as closely as practical.

**GitHub:** [github.com/libcna/cna-extended](https://github.com/libcna/cna-extended)

## CNA Extended is not CNAEXT

The names are unfortunately similar, but these are two completely different things.

**CNAEXT** is the optional modern graphics API inside CNA itself. It adds features such as PBR, HDR, post-processing, advanced lighting, particles, compute shaders, GPU culling, and other modern rendering functionality.

**CNA Extended**, or `cna-extended`, is a separate library built on top of CNA.

Conceptually:

```text
CNAEXT
    ↓
modern graphics extensions inside CNA

CNA Extended
    ↓
game-development utilities above CNA
```

CNA Extended does not replace CNA and is not part of the XNA 4.0 compatibility layer.

It is an additional library for applications that want more ready-made game-development functionality.

## Where does it come from?

CNA Extended is based on **MonoGame.Extended**.

MonoGame.Extended provides utilities on top of MonoGame for areas such as:

- collision detection
- tilemaps
- tweening
- particles
- sprite sheets
- bitmap fonts
- screens
- viewport management
- input helpers
- entity-component systems

CNA Extended translates the runtime-useful parts of that library to C++23.

The objective is intentionally conservative:

**port MonoGame.Extended faithfully rather than redesigning it into a different library.**

Where differences between C# and C++ require changes, the implementation adapts to C++ while trying to preserve the original concepts and behavior.

## The stack

A CNA Extended application can conceptually look like this:

```text
Game
 ↓
CNA Extended
 ↓
CNA
 ↓
Renderer / Platform / Audio
 ↓
Operating system
```

Sharp Runtime is also an important part of the implementation:

```text
CNA Extended
 ├── CNA
 │    └── Microsoft.Xna.Framework-style API
 │
 └── Sharp Runtime
      └── System.*-style C++ infrastructure
```

This matters because MonoGame.Extended was originally written in C#.

Many of its APIs rely on .NET concepts that would otherwise need to be redesigned during the C++ port.

Sharp Runtime provides equivalents for many of those concepts.

## 2D collision detection

One major area being ported is MonoGame.Extended's 2D collision system.

CNA Extended includes geometry and collision concepts such as:

- bounding boxes
- circles
- capsules
- polygons
- oriented bounding boxes
- lines
- rays
- collision shapes

The planned and partially implemented collision system includes both broad-phase and narrow-phase functionality.

Broad-phase structures include concepts such as:

```text
QuadTree
SpatialHash
```

while the collision world handles the actual relationships between collision actors and shapes.

This provides a higher-level collision system without turning CNA itself into a physics engine.

## Tweening and timers

CNA Extended also ports utility systems for animation over time.

Tweening can be used for gradual transitions such as:

```text
position
opacity
scale
rotation
UI values
```

Instead of manually implementing every transition inside `Update()`, applications can describe the value transition and let the tweening system advance it.

Timers provide similar reusable infrastructure for time-based game behavior.

## Viewport adapters

Another MonoGame.Extended feature being brought over is the viewport-adapter system.

Viewport adapters help separate:

```text
game's logical resolution
```

from:

```text
actual window / display resolution
```

For example, a game might logically render at:

```text
320 × 180
```

while running inside:

```text
1920 × 1080
```

A viewport adapter can handle the relationship between those coordinate spaces.

This is particularly useful for 2D games, fixed-resolution games, pixel-art projects, and applications that need predictable coordinates across different display sizes.

## Sprite and graphics utilities

CNA Extended adds higher-level helpers around CNA's XNA-compatible 2D graphics API.

This area includes work around:

- `SpriteBatch` extensions
- sprites
- sprite sheets
- texture atlases
- nine-patch graphics
- animation controllers
- drawing helpers
- custom effects

The purpose is not to replace `SpriteBatch`.

Instead, CNA Extended builds more convenient game-oriented concepts on top of it.

## Bitmap fonts

Bitmap-font support is another part of the project.

CNA Extended can work with BMFont-style `.fnt` data rather than requiring every text workflow to go through XNA's original compiled content system.

This fits a broader design decision in CNA Extended: where the original MonoGame.Extended runtime used content produced by its .NET content pipeline, the C++ port often prefers direct loading of the underlying source format.

## Sprite animation

The animation module focuses on frame-based sprite animation.

Conceptually:

```text
Texture atlas
    ↓
Sprite frames
    ↓
Animation
    ↓
Animation controller
```

This is useful for ordinary 2D character, effect, and interface animation without requiring a game to build its own frame-management system.

## Particles

CNA Extended also ports MonoGame.Extended's particle system, which itself has roots in the Mercury Particle Engine.

Particle systems can be used for effects such as:

- smoke
- sparks
- fire
- explosions
- rain
- magic effects
- debris

Again, this functionality lives above CNA rather than expanding the responsibilities of the core framework.

## Entity Component System

CNA Extended includes work on an **Artemis-style Entity Component System**.

The main concepts include:

```text
World
Entity
Component
Aspect
Systems
```

An ECS provides another way to organize game objects.

Instead of building a large inheritance hierarchy:

```text
GameObject
 ├── Enemy
 ├── Player
 ├── Vehicle
 └── Projectile
```

behavior can be composed from components and systems.

CNA itself does not require applications to use an ECS.

CNA Extended simply provides one for projects that want it.

## Tilemaps

Tilemap support is another major area.

The project targets several popular map formats:

- **Tiled** — TMX and JSON
- **LDtk**
- **Ogmo Editor**

The goal includes both loading the map data and rendering it through CNA.

This makes CNA Extended particularly useful for 2D games, where tile-based level editors are often central to the development workflow.

## Direct source-format loading

One important difference from the original MonoGame.Extended architecture is the content workflow.

CNA Extended deliberately does **not** plan to port `MonoGame.Extended.Content.Pipeline`.

That pipeline belongs to the MonoGame/.NET MGCB build environment and does not have a natural equivalent in the native C++ runtime.

The `.xnb` readers that exist only to consume output from that pipeline are therefore also excluded.

Instead, CNA Extended prefers direct source formats where practical:

```text
Tiled TMX / JSON
LDtk JSON
Ogmo JSON
TexturePacker JSON
BMFont .fnt
```

This avoids recreating a .NET content-pipeline toolchain solely for CNA Extended.

## Why is this separate from CNA?

It would be possible to put many of these systems directly into CNA.

I do not think that would be the right architecture.

CNA's primary responsibility is the XNA 4.0 programming model.

Things such as:

```text
ECS
tilemap engines
particle frameworks
tweening systems
sprite animation controllers
```

are useful, but they are higher-level game-development choices.

Not every CNA application needs them.

Keeping CNA Extended separate allows the core framework to remain focused while applications that want these systems can opt into them.

The relationship is similar to the original ecosystem:

```text
XNA / MonoGame
       ↓
MonoGame.Extended
```

becoming:

```text
CNA
 ↓
CNA Extended
```

## The CNA::Extended namespace

CNA Extended does not pretend that its additions are official XNA APIs.

Its public C++ API lives under namespaces such as:

```cpp
CNA::Extended
CNA::Extended::Graphics
CNA::Extended::Tilemaps
CNA::Extended::Particles
CNA::Extended::ECS
```

This clearly separates it from:

```cpp
Microsoft::Xna::Framework
```

which CNA uses for XNA-compatible functionality.

That boundary is important.

An application using only `Microsoft::Xna::Framework` can remain focused on XNA compatibility.

An application that deliberately wants extra functionality can use `CNA::Extended`.

## Still under development

CNA Extended is currently an **early-stage project**.

Its repository already contains work across a surprisingly broad part of MonoGame.Extended, including foundations for:

- math and shapes
- collections
- 2D collisions
- input listeners
- timers
- tweening
- viewport adapters
- vector drawing
- screens
- graphics extensions
- bitmap fonts
- sprite animation
- particles
- ECS
- Tiled
- LDtk
- Ogmo

But it should not yet be treated as a finished replacement for the complete MonoGame.Extended library.

The project is being developed incrementally, with the upstream implementation serving as the primary reference.

## Why CNA Extended matters

CNA intentionally stays relatively close to the philosophy of XNA: provide the framework, then let games decide what higher-level architecture they want.

But writing every game subsystem from scratch is not always useful.

CNA Extended can provide another layer:

```text
CNA
    ↓
low-level game framework

CNA Extended
    ↓
reusable game-development systems

Game
    ↓
project-specific gameplay
```

That can make CNA more practical for larger 2D and game-oriented projects without making the core framework itself increasingly engine-like.

CNA remains the foundation.

CNA Extended provides optional tools above it.

That is the purpose of the project:

**bring the useful runtime parts of MonoGame.Extended into the native C++ CNA ecosystem while keeping them separate from the XNA-compatible core.**

---

**CNA Extended:** [github.com/libcna/cna-extended](https://github.com/libcna/cna-extended)
**CNA:** [github.com/libcna/cna](https://github.com/libcna/cna)
**Sharp Runtime:** [github.com/libcna/sharp-runtime](https://github.com/libcna/sharp-runtime)
**MonoGame.Extended:** [github.com/craftworkgames/MonoGame.Extended](https://github.com/craftworkgames/MonoGame.Extended)
