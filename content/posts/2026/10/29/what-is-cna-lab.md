---
title: What is CNA Lab?
date: 2026-10-29T13:51:55Z
updated: 2026-10-02T14:58:39Z
description: |
  CNA Lab is the experimental area of the CNA ecosystem.
author: Robert Vokac
categories:
  - Projects
tags:
  - CNA Ecosystem
  - CNA Lab
  - Experiments
  - Games
  - Tools
  - Prototypes
originalUrl: https://blog.libcna.com/2026/10/29/what-is-cna-lab/
classicpressId: 68
classicpressStatus: future
draft: false
---

**CNA Lab** is the experimental area of the CNA ecosystem.

**GitHub:** [https://github.com/libcna/cna-lab](https://github.com/libcna/cna-lab)

The main `cna` repository is where the framework itself is developed. CNA Lab is different: it is a place for experimental games, engines, tools, language integrations, and other ideas that use CNA but are not part of CNA itself.

The current repository contains **13 experimental projects**, collected in one place as Git subtrees so their original commit history can be preserved.

## Why does CNA Lab exist?

CNA has grown large enough that not every experiment belongs in the main repository.

For example, testing a new game engine on top of CNA, building an editor, experimenting with another programming language, or creating a complete game may reveal important problems in CNA — but none of those projects should become part of the framework itself.

CNA Lab provides a boundary:

```text
CNA
 │
 ├── stable framework development
 │
 └── CNA Lab
      ├── experimental engines
      ├── games
      ├── tools
      ├── language experiments
      └── prototypes
```

An experiment is free to change rapidly, fail, be redesigned, or simply prove that an idea is not worth pursuing.

That is useful information too.

## Why Git subtrees?

The projects in CNA Lab are integrated using **Git subtrees**.

This gives the repository a centralized view of the experiments while preserving their individual history.

Conceptually:

```text
cna-lab/
├── black-pine/
├── cna-craft/
├── cna-studio/
├── bindings/
├── explore-2d/
├── wolf-cna/
└── ...
```

This is different from simply copying source directories into one repository.

The history of an experimental project can remain useful even while it lives inside the Lab.

## Explore2D

One of the more developed experiments is **Explore2D**.

Explore2D is a deliberately opinionated C++23 engine for fixed-screen exploration and adventure games.

It provides rooms, inventory, interactions, dialogue, hazards, saving, localization, procedural drawing, simple animation, sound, and other functionality above CNA.

An interesting architectural decision is that its gameplay core does **not** depend on CNA. CNA is an optional host responsible for input, the game loop, audio, and final presentation.

That makes Explore2D useful both as an engine experiment and as a test of whether CNA can remain a clean outer platform around independently testable game logic.

## Black Pine

**Black Pine: The Long Silence** is a much larger experiment built on Explore2D.

It is an original exploration and puzzle adventure containing **124 fixed screens** across a five-act story.

The game uses a strict 16-color EGA presentation, procedural code-drawn scenes, inventory puzzles, dialogue, hazards, persistent world changes, localization, save/load, sound, and a complete connected game route.

Black Pine therefore tests something very different from a small CNA sample: **Can a higher-level engine built on CNA support a complete game with substantial content and state?**

**You can play online at:** [https://demos.libcna.com/black-pine/black-pine.html](https://demos.libcna.com/black-pine/black-pine.html)

![Storm gate trailhead](https://github.com/libcna/cna-lab/raw/develop/black-pine/docs/screenshots/storm-gate-trailhead.png)

## CNA Craft

**CNA Craft** is a C++23 port of Michael Fogleman's open-source *Craft* project onto CNA.

It contains an unbounded chunk-streamed voxel world, procedural terrain, ambient occlusion, block editing, persistence, multiplayer, and browser support through WebAssembly.

The project is especially useful because it exercises CNA as the foundation of a very different type of 3D application.

Instead of writing directly to OpenGL, the port uses CNA concepts such as `Vector3`, `Matrix`, `VertexBuffer`, `IndexBuffer`, `BasicEffect`, `Texture2D`, `Keyboard`, and `Mouse`.

**You can play online at:** [https://demos.libcna.com/cna-craft/CnaCraft.html](https://demos.libcna.com/cna-craft/CnaCraft.html)

![Cna craft screenshot](/wp-content/uploads/2026/09/cna-craft_screenshot.jpg)

## Language experiments

CNA Lab is also useful for language ideas that are not yet part of the main set of CNA bindings.

### Kotlin

`cna-kotlin` explores Kotlin/JVM support.

It deliberately does **not** create another native CNA binding.

Instead:

```text
Kotlin
   ↓
CNA-Kotlin helpers
   ↓
CNA-Java
   ↓
JNI
   ↓
CNA C API
   ↓
CNA C++
```

Kotlin can already consume the Java binding directly, so CNA-Kotlin focuses on small Kotlin conveniences such as operators and generic helper functions instead of duplicating CNA-Java.

There is also a `cna-kotlin-template` experiment providing a reusable Kotlin/JVM CNA starter.

### VB.NET

The Lab also contains a **VB.NET template**.

Interestingly, this experiment demonstrated that a separate CNA-VB binding is unnecessary.

VB.NET can consume the same CLR-facing CNA-CS API:

```text
VB.NET
   ↓
CNA.XnaCompat
   ↓
CNA.Framework
   ↓
CNA.Interop
   ↓
CNA C ABI
   ↓
CNA C++
```

The experiment therefore tests how far the existing C# compatibility layer can naturally support another .NET language.

### Ruby

`cna-ruby` is the experimental archived binding for Ruby.

### Go

`cna-go` is the experimental archived binding for Go.

### Common Lisp

`cna-common-lisp` is the experimental archived binding for Common Lisp.

## Game experiments

CNA Lab also contains several projects intended to push CNA through real gameplay rather than isolated framework tests.

### Wolf CNA

**Wolf CNA** is an original retro first-person shooter experiment.

Unlike a ray-cast software clone, it renders actual polygonal 3D through CNA using vertex and index buffers, `BasicEffect`, depth testing, textures, and a first-person camera.

The project has since grown to include enemies, multiple weapons, sectors, procedural runs, saves, audio, music, doors, secrets, a HUD, and other game systems.

**You can play online at: **[https://demos.libcna.com/wolf-cna/wolf-cna.html](https://demos.libcna.com/wolf-cna/wolf-cna.html)

![Screenshot](https://github.com/libcna/cna-lab/raw/develop/wolf-cna/screenshot.png)

### Tamagotchi CNA

**Tamagotchi CNA** investigates a very different kind of application: a behavioral reimplementation of the 1997 international P1 virtual pet.

Its simulation is separated from CNA, while CNA handles the application, input, graphics, and presentation.

The project also experiments with long-running state and offline simulation — the virtual creature must continue to evolve even while the application is closed.

**You can play online at:** [https://demos.libcna.com/tamagotchi-cna/TamagotchiCna.html](https://demos.libcna.com/tamagotchi-cna/TamagotchiCna.html)

![Screenshot](https://github.com/libcna/cna-lab/raw/develop/tamagotchi-cna/screenshot.png)

## CNA Lab is also a framework test

There is another reason for these projects to exist.

A framework can look complete when tested only with small examples.

Real projects find different problems.

A platform game stresses collision, input, timing, storage, and 2D rendering.

A voxel game stresses dynamic meshes, buffers, world streaming, and persistence.

An editor stresses UI rendering, assets, multiple processes, and tooling APIs.

A large adventure stresses state management, text, localization, saving, and long-running content.

A 3D action game stresses physics, animation, models, cameras, and performance.

So the relationship works in both directions:

```text
CNA
 ↓
makes CNA Lab projects possible

CNA Lab projects
 ↓
find limitations and bugs in CNA
```

That makes the Lab useful even when an individual experiment never becomes a major project.

## Experimental means experimental

The word **Lab** is intentional.

Projects inside it should not automatically be interpreted as stable CNA components.

Some are already substantial applications.

Others are technology experiments.

Some may change architecture significantly.

Some may eventually deserve their own permanent place in the wider CNA ecosystem.

And some ideas may simply turn out not to be worth continuing.

Keeping that uncertainty outside the main CNA repository allows experimentation without confusing it with the framework's compatibility and stability commitments.

## A place to try things

The CNA repository answers:

**How should CNA itself work?**

CNA Lab answers a different question:

**What can we build on top of CNA, and what can those experiments teach us about the framework?**

That includes games, engines, editors, language experiments, content workflows, and ideas that have not yet earned a permanent place elsewhere.

That is what CNA Lab is for:

**a playground, incubator, and stress test for the wider CNA ecosystem.**
