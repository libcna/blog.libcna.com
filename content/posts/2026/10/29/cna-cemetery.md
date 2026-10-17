---
title: CNA Cemetery
date: 2026-10-29T13:51:55Z
updated: 2026-10-17T14:06:31Z
description: |
  CNA Cemetery preserves projects moved out of CNA Lab, including their complete unsquashed Git subtree history.
author: Robert Vokac
categories:
  - Projects
tags:
  - CNA Ecosystem
  - CNA Cemetery
  - Archives
  - Git
  - Bindings
  - Games
  - Tools
originalUrl: https://blog.libcna.com/2026/10/29/cna-cemetery/
classicpressId: 68
classicpressStatus: future
draft: false
---

**CNA Cemetery** is the preservation repository for projects moved out of the former CNA Lab collection.

**GitHub:** [https://github.com/libcna/cna-cemetery](https://github.com/libcna/cna-cemetery)

It is not the experimental laboratory under a new name.

Its purpose is narrower:

~~~text
project leaves CNA Lab
        │
        ▼
source and history are preserved
        │
        ▼
future readers can still inspect,
build or continue the project
~~~

At the current revision, CNA Cemetery contains **24 imported project histories**: 19 language-binding or template projects and five standalone projects.

---

## Why a cemetery?

An ecosystem changes over time.

Some experiments become standalone repositories. Some bindings are superseded by a different integration strategy. Some projects reach maintenance mode, stop being a priority or remain useful mainly as engineering records.

Deleting them would also delete useful information:

- how an API was explored;
- which designs worked or failed;
- how a complete application used CNA at the time;
- the commits that explain why the code has its present shape;
- a base from which somebody could resume the work.

CNA Cemetery gives those projects a stable historical home without presenting every one of them as a currently maintained CNA product.

The name describes repository organization, not necessarily the state of every imported project. For example, the preserved Black Pine snapshot still describes active game development, while CNA Studio explicitly says that version 1.0 entered maintenance mode.

---

## The preserved bindings

The **bindings/** directory contains nine binding-and-template pairs:

~~~text
cna-common-lisp
cna-common-lisp-template

cna-go
cna-go-template

cna-java
cna-java-template

cna-kotlin
cna-kotlin-template

cna-python
cna-python-template

cna-ruby
cna-ruby-template

cna-rust
cna-rust-template

cna-swift
cna-swift-template

cna-ts
cna-ts-template
~~~

It also contains:

~~~text
cna-vbnet-template
~~~

That makes 19 preserved language projects in total.

These directories are historical snapshots, not a promise that all nine bindings currently track CNA's active ABI, renderer set or build system.

---

## The five standalone projects

### Black Pine

**Black Pine: The Long Silence** is an original C++23 exploration and puzzle adventure built on Explore2D.

The preserved project contains a connected 124-screen, five-act route across ten visually distinct regions. Its graphics are drawn procedurally in a fixed 16-color EGA palette, and its systems include inventory puzzles, dialogue, hazards, localization, sound, persistent changes and several endings.

Its own README is careful about status: the main route is playable from beginning to end, but the game is unfinished and its final regions still need human playability and visual-authoring passes.

### CNA Studio

**CNA Studio** is a lightweight visual development companion for CNA.

It can create and inspect CNA projects, manage assets, edit scenes, manipulate objects, edit materials and lights, invoke a project's CMake build and show failures.

The project reached version 1.0.0 on 23 September 2026 and entered maintenance mode. It is intentionally not an IDE or a runtime dependency: a project authored with Studio remains an ordinary CNA project.

### Explore2D

**Explore2D** is an opinionated C++23 engine for fixed-screen exploration and adventure games.

Its gameplay core is independent of CNA. The optional CNA host supplies input, the game loop, audio and final presentation.

The engine uses a fixed 640×350 logical screen, a 16-color EGA palette, connected non-scrolling rooms, inventory interactions, dialogue, hazards, save/load, localization and procedural drawing.

### Myra-CNA

**Myra-CNA** is an independent C++23 port of the retained-mode Myra UI library to CNA.

The preserved snapshot includes a substantial validated core: widget trees, layout, rendering primitives, input routing, MML/XML loading and a growing control set. It is still incomplete; advanced controls, styles, rich text and the full upstream widget catalogue are not finished.

### Tamagotchi CNA

**Tamagotchi CNA** is an independent fan reimplementation of the international 1997 P1 virtual pet.

It separates a testable, CNA-independent simulation from the CNA application and its 32×16 monochrome LCD presentation. The preserved build implements a meaningful part of the P1 loop, but remains an unfinished prototype with provisional character art and several later-life behaviors still open.

It has its own article: [Tamagotchi CNA](/2026/10/19/tamagotchi-cna/).

---

## Complete Git history, not source dumps

Every project is integrated as a **Git subtree** without the squash option.

That distinction matters.

A copied directory tells us only what the final files looked like. An unsquashed subtree retains the commits that produced them:

~~~text
original project commits
        │
        ▼
subtree import commit
        │
        ▼
CNA Cemetery history
~~~

The repository can therefore answer questions such as:

~~~text
When was this behavior introduced?
Which design did it replace?
Was a limitation deliberate?
Which upstream revision was imported?
~~~

The top-level history also records the exact commit used for each subtree import.

Future updates can use:

~~~bash
git subtree pull \
    --prefix=<subtree-path> \
    <remote-url> \
    <branch>
~~~

The repository explicitly forbids **--squash**, because preserving individual source commits is the point.

---

## What is not in CNA Cemetery

Two former CNA Lab games now have separate repositories under the **libcnalab** organization:

- [CNA Craft](https://github.com/libcnalab/cna-craft), a port of Michael Fogleman's voxel game;
- [Wolf CNA](https://github.com/libcnalab/wolf-cna), an original polygonal retro first-person shooter.

They are not among CNA Cemetery's five standalone directories.

Their source and browser demos still exist, but their lifecycle is independent of the preservation repository:

- [CNA Craft article](/2026/10/17/cna-craft/)
- [Wolf CNA article](/2026/10/18/wolf-cna/)

---

## How to read the repository

CNA Cemetery is best treated as a collection of pinned historical projects.

For each directory:

1. read its own **README.md**;
2. check its imported revision and final commits;
3. read its status or handoff document;
4. verify its dependency expectations before attempting a build;
5. do not assume that old CNA renderer names or ABI expectations still match the current framework.

The root repository preserves history. Each subtree remains the authority for what that project actually implemented at the preserved revision.

---

## Conclusion

CNA Lab used to answer:

> What can we experiment with around CNA?

CNA Cemetery answers a different question:

> How do we keep the work, context and source history after an experiment leaves that collection?

Its value is not a claim that all 24 projects are current.

Its value is that their engineering record remains inspectable instead of disappearing.
