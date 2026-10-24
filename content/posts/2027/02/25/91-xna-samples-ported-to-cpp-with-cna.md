---
title: 91 XNA Samples Ported to C++ with CNA
date: 2027-02-25T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  Ninety-one Microsoft XNA samples have been ported to C++23 with CNA, validated on Linux and the Web, and collected in a playable browser gallery.
author: Robert Vokac
categories:
  - Projects
  - Development
tags:
  - CNA
  - XNA
  - C++23
  - WebAssembly
  - WebGL2
  - Samples
featuredImage: /media/2027/91-xna-samples-ported-to-cpp-with-cna/platformer.png
featuredImageAlt: The XNA Platformer Starter Kit running from its C++ CNA port
draft: false
---

**Ninety-one Microsoft XNA samples have now been ported to C++23 with CNA.** Their source is available in the [cna-samples repository](https://github.com/libcna/cna-samples), and the [CNA Samples gallery](https://samples.libcna.com/) lets you explore the collection and launch the published WebAssembly builds directly in a browser.

This is more than a set of screenshots or programs that merely compile. The campaign used the original XNA samples as compatibility tests for CNA: preserve what each sample teaches, retain its structure and content, and make the same program work through CNA's XNA-shaped C++ API.

The milestone is the result of reviewing the full archive rather than selecting only the easiest programs. The campaign catalogued 153 physical upstream directories: games, focused demonstrations, tutorial stages, tools, libraries, phone variants, asset packs and projects tied to retired services. Ninety-one reached the completed port scope. The remainder received an explicit disposition instead of disappearing from the count when they proved inconvenient or did not represent a runnable XNA 4.0 game.

![The Platformer Starter Kit running in CNA, with a jungle level, gems and the exit](/media/2027/91-xna-samples-ported-to-cpp-with-cna/platformer.png)

## From C# and XNA 4.0 to C++23 and CNA

The original samples cover much of the practical XNA 4.0 surface. Some are tiny demonstrations of one graphics or input concept. Others are complete games with menus, animation, audio, persistence and several levels.

The ports keep the original lifecycle, update and draw order, algorithms, controls, content identifiers and file decomposition wherever C++ permits. The goal was not to redesign the samples around a new engine abstraction. Their code now calls CNA, but should still be recognizable to somebody familiar with the XNA originals.

That fidelity requirement also shaped how missing functionality was handled. If a faithful translation exposed an XNA behavior missing from CNA, the general implementation was fixed in CNA. Missing .NET behavior belonged in Sharp Runtime. Sample-local shortcuts that only made one program appear to work were not accepted.

This separation matters. A private loader, a hand-translated shader or a sample-only renderer call might produce an attractive screenshot, but it would say little about whether another XNA program can run. Fixing the shared implementation makes every later port stronger and turns the samples into a cumulative compatibility test.

## How one sample became a verified port

Each sample began with the exact upstream project, not with the state of an older CNA translation. The original project metadata established its XNA version, language, target platform and intended product. Source files, content declarations, custom pipeline extensions and inactive platform branches were all part of the review.

For runnable samples, the unchanged XNA program was built and executed as a reference. The C# and C++ sources were then compared closely, including lifecycle order, constants, input mapping, cameras, state transitions, effects and audio. The port was not complete merely because its title screen appeared.

The final verification normally covered three products:

1. the original Microsoft XNA build used as the behavioral reference;
2. a native CNA build using the OpenGL ES 3 reference path on Linux;
3. a non-threaded or, where genuinely required, threaded WebAssembly build using WebGL 2.

Representative interaction was exercised in each available product. Depending on the sample, evidence included screenshots, exact content hashes, deterministic state dumps, frame comparisons, audio paths, saved data, multiplayer processes or focused CNA and Sharp Runtime regression tests.

## A broad compatibility collection

The 91 ports span far more than basic triangle rendering. The collection includes:

- 2D sprites, fonts, blending, render targets and post-processing;
- 3D models, lighting, shadows, skinning, particles and custom effects;
- keyboard, mouse, touch, gamepad and sensor-oriented input;
- audio, localization, storage and screen-management patterns;
- custom content processors and serialized object graphs;
- starter kits and games such as Platformer, Spacewar, Marble Maze and Role Playing Game.

![Terrain and a skydome produced by the Generated Geometry sample's custom content processors](/media/2027/91-xna-samples-ported-to-cpp-with-cna/generated-geometry.png)

The visual range is large even before reaching the full games. One sample renders procedural terrain beneath a cylindrical skydome; another demonstrates cel shading, hatching and other non-photorealistic techniques. Others isolate bloom, distortion, rim lighting, normal mapping, shadow maps, particles, skinning or instanced geometry so that a specific rendering contract can be inspected without a complete game around it.

![The Non-Photorealistic Rendering sample displaying its colored hatching technique](/media/2027/91-xna-samples-ported-to-cpp-with-cna/non-photorealistic.png)

Several samples are especially valuable because they combine systems that are easy to test only in isolation. The Reach Graphics Demo, for example, brings stock effects, models, animation, render targets and SpriteBatch together. Larger games exercise content loading, transitions, input, audio and persistent state over a much longer path.

![A turn-based battle in the Role Playing Game sample running through CNA](/media/2027/91-xna-samples-ported-to-cpp-with-cna/role-playing-game.png)

The games show why these systems have to work together. Spacewar combines two game modes, menus, ships, projectiles, effects, sound and gamepad-oriented input. Marble Maze uses a moving ball, a tilting maze, collision and background-loading behavior. Ship Game places a first-person combat HUD inside a detailed 3D environment. These are much more demanding compatibility targets than a single isolated API call.

![The Spacewar title screen with its Retro and Evolved game modes](/media/2027/91-xna-samples-ported-to-cpp-with-cna/spacewar.png)

![The ball and stone maze in Marble Maze](/media/2027/91-xna-samples-ported-to-cpp-with-cna/marble-maze.png)

![The first-person interior and HUD of Ship Game](/media/2027/91-xna-samples-ported-to-cpp-with-cna/ship-game.png)

## The original content still matters

An XNA sample is not only its `Game` class. Its XNB files, effects, models, fonts, custom processors and serialized data are part of the program's behavior.

Where possible, the ports use exact content produced by Microsoft's XNA Content Pipeline. Custom readers and object graphs were compared with the original data rather than replaced with loose images or sample-specific loaders. Some of the hardest compatibility work happened here: resolving XNB reader tables, supporting compiled effects, preserving reflective data and reproducing the contracts expected by `Content.Load<T>()`.

![The Sprite Effects sample applying normal-mapped lighting to a sprite](/media/2027/91-xna-samples-ported-to-cpp-with-cna/sprite-effects.png)

That work improved CNA itself. The sample collection acted as an external consumer of the framework, finding gaps that smaller unit tests would not necessarily expose.

It also tested the boundary between runtime compatibility and design-time tooling. A sample-owned XNA content processor can be built with the original toolchain and its exact output retained for the C++ runtime. That proves the runtime contract without pretending that every historical Visual Studio, WinForms or Content Pipeline authoring tool has itself been recreated as a cross-platform CNA application.

## Racing Game: the collection's showcase

The visual highlight of the collection is the [XNA Racing Game](https://samples.libcna.com/RacingGame.html). It is a complete third-person racing game rather than a small API demonstration: menus, track selection, opponents, lap timing, vehicle handling, post-processing, sound, saved progress and a full race all have to operate as one product.

![The Racing Game car accelerating along its tropical track](/media/2027/91-xna-samples-ported-to-cpp-with-cna/racing-game.png)

Its C++ translation is correspondingly substantial. CNA must load the authentic XNA content, render the track and vehicles, preserve the menu-to-race flow, update the camera and physics, and maintain gameplay state over an entire session. Linux is the feature-complete reference, and browser testing covers startup, menus and race execution through WebGL 2, alongside additional checks for persistence, resize, fullscreen and context handling.

Racing Game is also the clearest example of why technical completion and public distribution are separate questions. The available source snapshot does not contain a sufficient redistribution grant for the packaged game assets. The gallery therefore publishes its information page and real in-game screenshot, but deliberately withholds the playable Web bundle. The port is not replaced by a mock-up, and the licensing boundary is not hidden behind a broken Play button.

The screenshot above is taken from the real CNA version. It represents the largest game in the campaign and the strongest single demonstration of how far the XNA-compatible runtime has progressed.

## Native and browser validation

Each completed port was validated as a native Linux application and as a WebAssembly build using WebGL 2. Browser qualification meant more than producing `.wasm`: the complete bundle was served over HTTP and exercised in a real browser, including rendering, content, representative input, state changes and clean shutdown behavior where applicable.

The original XNA version was built and run when possible. Its visible and observable behavior was then compared with the native CNA port and the browser build. Screenshots, deterministic state dumps, content hashes and focused regression tests supplied evidence appropriate to each sample.

The public gallery turns those browser products into something useful beyond the test campaign. Every entry explains what the original sample demonstrates, links to its C++ source, lists its controls and provides a representative screenshot. Published playable entries open in a separate tab and run with CNA's C++ API through WebAssembly and WebGL 2.

![The Avatar Shadows sample showing an animated CNA avatar casting a shadow](/wp-content/uploads/2026/10/avatar-shadows.png)

## Honest boundaries

The gallery records limitations instead of hiding them. The Lens Flare sample has a documented EasyGL occlusion-query precision difference. Performance Utility is published as a partial browser implementation because its local profiling tools work while public browser networking remains unfinished. Racing Game has an informational page and screenshot, but no public playable bundle because the available source snapshot does not provide the required redistribution grant.

These exceptions are important. A compatibility project is useful only when “ported” does not silently mean “rewritten until the first frame appeared.” Known differences, platform constraints and rights boundaries need to remain visible beside the successes.

The same principle applies to older XNA generations, Windows Phone variants, retired Xbox LIVE features and Windows-only authoring tools. Some were deleted by explicit scope decisions, some remain deferred for future platform work and some were retained as evidence-backed non-ports. Recording those outcomes protects the meaning of the 91 completed ports: the number was not reached by quietly counting unrelated assets or incomplete placeholders as games.

## What the collection gives CNA

The value of the project now extends beyond preserving old demonstrations. Together, the ports provide several complementary forms of evidence:

- application-level tests of the public XNA-shaped API;
- real content that exercises XNB readers, effects, models, fonts and custom data;
- native and browser workloads ranging from a few draw calls to complete games;
- readable examples for developers learning a particular technique;
- regression scenes that make visual or behavioral changes easier to recognize.

A unit test can establish the result of a matrix operation or a resource-state transition. A complete sample answers a different question: can those pieces still cooperate inside the kind of program for which XNA was designed? Keeping both forms of testing is what makes compatibility credible.

## Explore the samples

Visit [samples.libcna.com](https://samples.libcna.com/) to browse the full gallery, or open [github.com/libcna/cna-samples](https://github.com/libcna/cna-samples) to study the C++23 source.

Together, the 91 ports form a practical archive of XNA techniques, a set of playable browser examples and a demanding compatibility suite for CNA. They show that code written around the XNA programming model can live beyond its original runtime—and that preserving the details is what makes that claim meaningful.
