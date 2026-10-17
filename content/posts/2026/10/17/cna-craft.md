---
title: CNA Craft
date: 2026-10-17T12:00:00Z
updated: 2026-10-17T14:06:31Z
description: |
  CNA Craft ports Michael Fogleman's open-source Craft voxel game to C++23 and the CNA implementation of the XNA 4.0 programming model.
author: Robert Vokac
categories:
  - Projects
  - Games
tags:
  - CNA
  - CNA Craft
  - Craft
  - C++23
  - Voxel
  - 3D
  - WebAssembly
  - Multiplayer
  - SQLite
draft: false
---

**CNA Craft** is a C++23 port of Michael Fogleman's open-source [Craft](https://github.com/fogleman/Craft) project onto [CNA](/2026/09/13/what-is-cna/).

It is a derivative work, not merely a game inspired by Craft.

**Source:** [https://github.com/libcnalab/cna-craft](https://github.com/libcnalab/cna-craft)

**Play the deployed browser build:** [https://demos.libcna.com/cna-craft/CnaCraft.html](https://demos.libcna.com/cna-craft/CnaCraft.html)

![CNA Craft running in the browser](/wp-content/uploads/2026/09/cna-craft_screenshot.jpg)

The project ports Craft's gameplay and data model to a different engine and language while keeping the original project's MIT attribution.

Its current README classifies it honestly:

> Early prototype / active development. Not a finished game.

---

## What is already implemented

CNA Craft is much larger than a rendering proof.

The current source contains:

- an unbounded, chunk-streamed voxel world;
- deterministic procedural terrain;
- hidden-face-culled chunk meshes;
- baked per-vertex ambient occlusion;
- a textured day/night sky;
- 54 selectable block types;
- block breaking, placement and eyedropper selection;
- signs attached to block faces;
- Craft-style world-editing commands;
- SQLite persistence for local world changes;
- a standalone multiplayer server;
- live player, chat and world-edit synchronization;
- native desktop and WebAssembly/WebGL 2 targets.

The world is regenerated deterministically. Only player edits need to be stored, so the native application saves deltas rather than serializing every generated block.

---

## A port of Craft

The project tracks its behavior against the real Craft source in **CRAFT_PARITY.md**.

That comparison covers areas such as:

~~~text
input and camera
movement and collision
terrain generation
chunk creation and deletion
meshing and ambient occlusion
block selection and editing
signs and commands
persistence
multiplayer protocol
rendering
~~~

Not every detail is copied literally.

For example, CNA Craft uses C++23, CNA's game loop and XNA-style graphics objects instead of Craft's C, GLFW and direct OpenGL code. Some controls deliberately follow a more familiar creative-mode convention.

The important distinction is:

~~~text
behavior and design are ported from Craft
implementation is rebuilt for CNA
~~~

No original Craft source files are shipped verbatim. The project includes Craft's MIT notice and documents the derivation in **THIRD_PARTY_NOTICES.md**.

---

## How CNA is used

Craft talks directly to OpenGL.

CNA Craft instead expresses the game through CNA's XNA-compatible API:

~~~text
Vector3 and Matrix
VertexBuffer and IndexBuffer
BasicEffect
Texture2D
Keyboard and Mouse
Game and GameTime
~~~

The rendering path is conceptually:

~~~text
procedural voxel data
        │
        ▼
visible-face chunk mesher
        │
        ▼
vertex and index buffers
        │
        ▼
BasicEffect
        │
        ▼
CNA renderer
~~~

This makes the project a useful CNA stress test. A voxel world continually creates and discards geometry, changes buffers, performs selection raycasts, streams terrain and keeps a first-person camera moving through a large generated environment.

---

## World interaction

The basic controls follow the creative voxel-game model:

| Input | Action |
| --- | --- |
| W/A/S/D | Move and strafe |
| Mouse | Look |
| Space | Jump or ascend while flying |
| Shift | Descend while flying |
| Tab | Toggle flying |
| Left click | Break a block |
| Right click or Ctrl+left click | Place a block |
| Middle click | Select the targeted block type |
| 1–9 and 0 | Select the first ten hotbar slots |
| E/R or wheel | Cycle through all 54 blocks |
| Backtick | Write a sign |
| Slash | Enter a world-editing command |

The command system includes boxes, spheres, circles, cylinders, arrays, trees and copy/paste regions. Most commands use the last one or two edited blocks as their marks, following Craft's original interaction model.

Placed signs and command-generated blocks are persisted like ordinary edits.

---

## Persistence

The native build stores changes in SQLite.

~~~text
procedural seed
      │
      ▼
base terrain regenerated
      │
      ▼
saved block/sign deltas applied per chunk
~~~

This has two useful properties:

1. the world is not bounded by the size of a save file;
2. untouched generated terrain consumes no database rows.

Chunks stream in as the player approaches and unload when they are far behind. The database restores edits when a chunk is created again.

The current schema is deliberately version-sensitive. Very old project databases are detected as incompatible instead of being interpreted incorrectly.

---

## Multiplayer

CNA Craft includes its own headless **CnaCraftServer**.

Players can:

- join the same generated world;
- see remote players;
- exchange public and private chat;
- receive a shared seed and day/night clock;
- synchronize block edits;
- observe another player through a picture-in-picture view.

The server validates edits and remains authoritative. A rejected local change is corrected on the client.

The protocol is a faithful dialect of Craft's line-oriented design, but the project is intentionally not compatible with original Craft servers. Terrain, chunk dimensions and block identifiers differ.

Online cache databases are kept separate from the local single-player world.

---

## Browser build

The WebAssembly build uses CNA's **WEBGL2** renderer.

Terrain streaming, ambient occlusion, the sky, HUD and block interaction run in the browser. Recent project commits specifically repaired Firefox behavior, pointer capture and page responsiveness.

The browser target has two important boundaries:

- it is single-player because a normal browser page cannot host or open the raw TCP connection used by the native server;
- edits are not persisted through SQLite, so the deployed world resets when the page is reloaded.

The portable build is single-threaded. A separate Chromium-oriented pthread build is possible, but requires cross-origin isolation headers for SharedArrayBuffer.

---

## Current source boundary

The standalone repository preserves the project that previously lived in CNA Lab.

Its source is substantial, with dedicated modules for rendering, worlds, persistence, networking and the server, plus focused smoke tests for world behavior, SQLite and the network protocol.

The snapshot also predates CNA's October 2026 renderer consolidation. Some older project notes still name renderer selectors that current CNA has retired.

That means two claims should remain separate:

~~~text
the deployed browser demo is playable

the source is an active prototype whose dependency
revision and renderer selection must be aligned before building
~~~

The repository's CMake files and current CNA documentation, not an old CNA Lab article, are the place to verify a new checkout.

---

## Why CNA Craft matters

CNA Craft tests a combination rarely covered by a small framework sample:

~~~text
large dynamic 3D geometry
continuous world streaming
procedural textures and terrain
persistent edits
first-person input
native networking
browser deployment
~~~

It also demonstrates a practical kind of port.

The result is recognizably Craft, but its graphics, input, timing and application lifecycle run through CNA's XNA-style programming model rather than through the original direct-OpenGL stack.

That is the point of CNA Craft: preserve the substance of an open-source game while proving that CNA can host a demanding voxel application.
