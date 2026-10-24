---
title: Backrooms Simulator
date: 2027-01-21T12:00:00Z
updated: 2026-10-17T14:35:22Z
description: |
  Backrooms Simulator is a deterministic, effectively unbounded first-person exploration game built with C++23 and CNA.
author: Robert Vokac
categories:
  - Projects
  - Games
tags:
  - CNA
  - Backrooms Simulator
  - C++23
  - 3D
  - Procedural Generation
  - Exploration
  - Streaming
draft: false
---

**Backrooms Simulator** is a quiet first-person exploration game built with C++23 and CNA.

It generates an effectively unbounded sequence of rooms, storage areas and maintenance tunnels. There is no combat, damage, inventory, quest or game-over state. The rare figures that inhabit the world are atmospheric and harmless.

**Source:** [https://github.com/libcnalab/backrooms-simulator](https://github.com/libcnalab/backrooms-simulator)

**Web status:** Backrooms Simulator currently targets Linux desktop and is not available on `play.libcna.com`. A playable web version is being prepared.

![Level 0: the yellow rooms](https://raw.githubusercontent.com/libcnalab/backrooms-simulator/main/docs/screenshots/level0-01.jpg)

## Three connected environments

The current world has three distinct level families:

1. **The Yellow Rooms** — patterned wallpaper, office carpet, ceiling tiles, fluorescent lights, partitions and occasional furniture.
2. **Service Storage** — taller concrete spaces, shelving, boxes, beams and industrial lighting.
3. **Maintenance Tunnels** — lower concrete passages with cabinets, ducts, pipes and pressure assemblies.

Framed maintenance entrances connect the levels. A 64-bit seed makes the complete layout deterministic, including geometry, collision and the placement of rare details.

![Level 1: service storage](https://raw.githubusercontent.com/libcnalab/backrooms-simulator/main/docs/screenshots/level1-01.jpg)

The three levels share a generator, but not a single cosmetic theme.

Level 0 groups cells into irregular office zones. Openings between those zones are composed consistently, while offset partition plans, supports, columns, false doors and rare furniture break up the grid. Selected regions can become uninterrupted 60-metre halls with their own fluorescent arrangement.

Level 1 prefers larger service bays. Sparse shelf layouts, structural supports, roof beams, boxes and hanging fixtures give it a different scale from the offices. Level 2 opens the topology into longer passages and chambers, adding cabinets, ducts, ledges and supported pipe runs.

![Another deterministic arrangement of the Yellow Rooms](https://raw.githubusercontent.com/libcnalab/backrooms-simulator/main/docs/screenshots/level0-04.jpg)

![A wider service-storage layout with its industrial details](https://raw.githubusercontent.com/libcnalab/backrooms-simulator/main/docs/screenshots/level1-03.jpg)

Because the level profile is data-driven and versioned, the program records the algorithm version, recipe, seed and profile fingerprint needed to reproduce a location.

## How the generator works

The base spatial unit is a five-metre cell. Eight by eight cells form a 40-metre chunk, and groups of six by six cells choose larger regional patterns.

Stable hashes decide features such as:

```text
room and partition layouts
asymmetric openings
light arrangements
support and shelf plans
furniture and false doors
rare entrances between levels
harmless inhabitants
```

Generating a chunk again with the same seed produces the same geometry and collision, even at negative coordinates. The project does not save a collection of chunk files and does not need to remember every place already visited.

Connectivity is treated as a structural rule rather than luck. The room graph retains border connectors, and geometry and collision are generated from the same decisions so a visible opening is also traversable.

## Bounded streaming for an unbounded world

Only a 5 by 5 neighborhood of 40-metre chunks remains active around the player. Missing chunks are created gradually and distant chunks unload.

The project reuses GPU buffers and keeps bounded layout caches, so walking farther does not require retaining the whole generated world. Native frustum checks reduce drawing, while chunk-relative geometry avoids losing precision far from the origin.

This makes the project a focused test of CNA resource creation, buffer reuse, texture sampling, audio and long-running first-person rendering.

Incremental generation is synchronous and prepares no more than one missing chunk per update. That keeps work bounded, although an occasional generation or upload can still produce a visible frame-time spike.

The spare pool retains up to 48 vertex buffers, while the game-owned room-layout cache holds no more than 256 entries. When those bounds are exceeded, old resources are retired rather than allowing memory to grow with travel distance.

Collision does not depend on whether the visual chunk is currently loaded. It queries the same deterministic wall, prop and entrance rules directly. Chunk-local vertex coordinates also reduce floating-point jitter after travelling far from the origin.

The window title exposes this machinery during play: position, active and drawn chunks, triangle counts, buffer creation and reuse, packed capacity, room-cache size, entity counts, chunk build time, FPS and update rate.

## Materials and lighting

Most geometry is generated by the application. Original wallpaper, carpet and concrete images supply reusable surface detail, with procedural fallbacks when a file cannot be decoded.

CNA creates mipmaps and applies anisotropic sampling so floor and wall patterns remain stable at shallow angles. Office walls use a local baked fluorescent contribution, while obstruction and reflected floor response help partitions feel connected to their lights.

The industrial and tunnel levels reuse concrete with different tint families and construction details. Pipe runs inspect adjacent wall plans, so their exposed ends and supports remain consistent across chunk boundaries.

Lighting remains deliberately inexpensive. It is baked into vertices instead of using real moving shadow lights. Large floor pools are approximate, and the creatures receive soft contact spots rather than dynamic shadows.

## Atmosphere without combat

Three creature silhouettes can appear: the Wanderer, Watcher and Crawler. They drift inside their local area, never attack, never chase and fade away when the player comes close.

Fluorescent hum, footsteps, transitions and sparse creature sounds use licensed CC0 audio. Lighting is baked cheaply enough to support continuous generation, while original wallpaper, carpet and concrete textures give each level its own material identity.

The three figures also have distinct silhouettes: a clothed wanderer, a tall watcher and a low crawler. One immutable mesh is shared by each type. They move only inside their original clear cell and cannot physically obstruct the player.

Approaching one causes it to fade instead of attacking. Sparse breath or rustle sounds use distance attenuation, line-of-sight checks and stereo panning, with a shared cooldown so the soundscape does not become a constant series of creature cues.

This design keeps the tension of noticing something at the end of a room without changing the project into a combat or pursuit game.

![The tall Watcher silhouette in the Yellow Rooms](https://raw.githubusercontent.com/libcnalab/backrooms-simulator/main/docs/screenshots/creature-watcher.jpg)

![Level 2: maintenance tunnels](https://raw.githubusercontent.com/libcnalab/backrooms-simulator/main/docs/screenshots/level2-01.jpg)

## Current scope

The delivered milestone is intentionally compact. It has no authored story, vertical traversal, moving doors or save file. Linux desktop with CNA's OPENGLES3 renderer is the supported target today.

Deterministic tests cover world profiles, lighting, entrances and collision. Long automated sweeps exercise tens of kilometres of streamed terrain and record buffer reuse, memory and build-time evidence.

## Controls and reproducible starts

The controls are intentionally conventional:

| Input | Action |
| --- | --- |
| Mouse | Look around |
| `W A S D` | Move |
| `Shift` | Toggle walking and running |
| `R` | Return to the current level's spawn |
| `Escape` | Release the mouse, then quit |
| Left click | Capture the mouse again |

Command-line arguments can choose the seed, level, exact position, field of view, movement speeds and multisampling. That makes a reported location reproducible without walking through kilometres of rooms first.

A dedicated streaming mode automatically travels 9.6 kilometres, or another requested distance, while collecting runtime evidence. It bypasses ordinary collision for the sweep, so controller and collision validation remain separate tests rather than implied by that result.

## Validation and honest limits

Debug and Release suites check deterministic generation, profile parsing and lighting. Additional controller tests cover mouse directions, movement speed, collision and level transitions. The delivery gallery contains 104 inspected panorama views plus targeted creature and industrial checks.

A four-lap streaming run completed 38.4 kilometres while keeping active chunks, cache size and buffer capacity bounded. This is useful evidence for long-distance resource behavior, not a promise about frame rate on every desktop.

The current limitations are explicit:

- movement remains on a flat floor with no jumping, crouching or stairs;
- room families are varied but predominantly axis-aligned;
- generation and upload happen synchronously;
- creature motion is simple rather than articulated;
- subjective audio balance still needs listening on a real machine;
- native Wayland input is not yet qualified as thoroughly as the X11/Xwayland path.

The browser edition mentioned above is future work, not an existing claim hidden behind the Linux build instructions.

Backrooms Simulator is a small game, but it gives CNA a useful workload that can keep generating and rendering new space for as long as the player keeps walking.
