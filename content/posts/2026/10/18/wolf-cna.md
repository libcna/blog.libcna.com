---
title: Wolf CNA
date: 2026-10-18T12:00:00Z
updated: 2026-10-17T14:06:31Z
description: |
  Wolf CNA is an original C++23 retro first-person shooter that renders a polygonal 3D world through CNA.
author: Robert Vokac
categories:
  - Projects
  - Games
tags:
  - CNA
  - Wolf CNA
  - C++23
  - First-person shooter
  - 3D
  - WebAssembly
  - Procedural generation
  - Audio
draft: false
---

**Wolf CNA** is an original retro first-person shooter written in C++23 and built on CNA.

**Source:** [https://github.com/libcnalab/wolf-cna](https://github.com/libcnalab/wolf-cna)

**Play the browser build:** [https://play.libcna.com/wolf-cna/wolf-cna.html](https://play.libcna.com/wolf-cna/wolf-cna.html)

![Wolf CNA gameplay](https://github.com/libcnalab/wolf-cna/raw/main/screenshot.png)

The name signals its early-1990s design language, but the project is not a distribution of Wolfenstein 3D and contains no Wolfenstein game data.

Its levels, enemies, weapons, textures, sounds and music are project-owned or provenance-documented assets.

---

## Real polygonal 3D

Wolf CNA is not a software ray-caster.

The world is rendered as ordinary 3D geometry through CNA:

~~~text
level grid
    │
    ▼
polygonal walls, floors, ceilings and doors
    │
    ▼
VertexBuffer / IndexBuffer
    │
    ▼
BasicEffect and depth testing
    │
    ▼
CNA renderer
~~~

Enemies, pickups and decorations are camera-facing textured polygons inside that world. Doors and secret walls have real interpolated positions that affect rendering, collision, navigation, hitscan and the automap.

This choice makes the project visually retro while still exercising CNA's normal 3D API.

---

## The playable campaign

The current repository contains six authored sector files:

~~~text
starter bunker
sector 2
sector 3
sector 4
Hidden Reservoir
Warden Core
~~~

The normal route progressively unlocks sectors. A concealed elevator branches to the hidden area, and Warden Core supplies the boss encounter and campaign ending.

Every shipping sector is a 64×64 grid built from rooms, corridors, doors, locks, patrol routes, secrets, pickups, landmarks and an elevator goal.

The game audits those files rather than trusting them blindly. Invalid symbols, disconnected routes, blocked patrol arrows and malformed rows are rejected.

Completion produces kill, treasure and secret percentages, target-time awards and score bonuses. High scores can enter a three-letter name in a validated top-eight table.

---

## Weapons and enemies

The player can use:

- a knife;
- a sidearm;
- a repeater;
- a heavy automatic weapon.

Each weapon has its own range, damage, spread, cadence, first-person art and attack frame. Movement widens firearm spread, automatic weapons consume one round per emitted shot, and held bursts use deterministic shot sequences that can survive save/load.

The current enemy roster includes:

~~~text
security guard
security hound
rapid-fire trooper
heavy unit
Bunker Warden
~~~

Enemies do more than move directly toward the player.

They can follow authored patrol arrows, see in a direction, react after archetype-specific delays, hear weapons through connected rooms, remember the last known position, search, open ordinary doors and respect security locks.

Difficulty changes enemy presence, health, speed, reaction, hearing, firing cadence, incoming damage, ammunition and the player's life allowance.

---

## Doors, locks and secrets

Ordinary doors slide sideways into wall pockets and close only when the doorway is clear.

Cyan and amber access cards open their matching security doors. Enemies may operate ordinary doors but cannot bypass those locks.

Secret walls are full polygonal cells. Activating one pushes it one or two safe cells away from the player, permanently exposing the passage. Its moving position participates in collision and save data rather than being only a visual animation.

Elevators are immediately usable goals. Optional power relays and terminals add exploration and score context without turning the exit into an artificial hard lock.

---

## Authored and procedural play

Wolf CNA supports two related structures.

The campaign uses authored sectors and a fixed progression.

**Procedural Run** creates an endless sequence from a seed and depth:

~~~text
seed + depth
      │
      ▼
candidate sector
      │
      ▼
connectivity, spacing, resource and goal audits
      │
      ├── reject and generate another candidate
      └── accept and play
~~~

Deeper floors add pressure through denser opposition and tighter ammunition. Five themes rotate, and every fifth depth becomes a Warden encounter.

Procedural runs can be saved and resumed with their seed, depth and deterministic combat state intact.

---

## HUD, sound and music

The full-width blue HUD shows:

~~~text
level
score
lives
status portrait
health
ammunition
access cards
current weapon
~~~

The portrait changes with health, attacking, damage and defeat.

World sounds use listener-relative stereo pan and distance attenuation. Weapons, enemy archetypes, doors, locks, pickups, impacts and objectives have distinct generated cues.

Five original generated music tracks provide one sector theme each. They are sixteen-bar loops with their own tempo, harmony and lead figure rather than one short phrase repeated forever.

All of this runs through CNA's audio and graphics APIs.

---

## Saving and long-running state

Wolf CNA maintains two kinds of files:

- a versioned profile for unlocked sectors, settings and high scores;
- three versioned run slots for the complete playable state.

Run saves retain the player, enemies, pickups, doors, push walls, objectives, automap, score checkpoints and deterministic shot sequence.

Malformed or incompatible files are refused without replacing the active run. Older supported versions migrate forward, and writes use a recoverable temporary-file path.

Losing a non-final life rebuilds the current sector from its authored state and rolls score back to the sector-entry checkpoint. Losing the final life returns to the title flow.

---

## Native and browser builds

The native game uses CNA for its window, input, graphics, audio and game loop.

The Emscripten target packages the levels, textures and sounds with the application and runs through CNA's **WEBGL2** renderer. The deployed set consists of HTML, JavaScript, WebAssembly and a preloaded data bundle.

Browser work also exposed useful framework-level findings. Pointer lock works, but the project's recorded browser measurements show weaker relative mouse counts than the comparable desktop motion. Wolf CNA documents that as a backend finding instead of hiding it behind game-specific compensation.

The current handoff says that **OPENGLES3** and **WEBGL2** are the renderer paths exercised so far. A wider current-CNA renderer compatibility campaign remains open.

---

## Current status

The word “prototype” is still accurate, but it no longer means a single empty test room.

The authored campaign, boss, procedural mode, AI, weapons, audio, persistence, menus, difficulty system and browser target are all real.

The remaining work is mostly qualification and refinement:

- play-testing the full six-sector route;
- broadening CNA renderer coverage;
- tuning mouse, audio, difficulty and procedural runs;
- continuing the bounded classic-FPS feature campaign.

The project deliberately retired larger ideas that did not serve its focused scope.

---

## Why Wolf CNA matters

Wolf CNA tests CNA as the foundation of a complete game rather than as an API demonstration.

It combines:

~~~text
continuous first-person input
polygonal 3D
animated billboards
collision and navigation
combat state
spatial audio
persistence
procedural generation
browser deployment
~~~

The result has a classic visual vocabulary, but its implementation is a modern, original CNA application.

That makes Wolf CNA both a playable project and a demanding integration test for the framework beneath it.
