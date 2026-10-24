---
title: CNA Engine
date: 2027-03-11T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  CNA Engine is a modular C++23 game-engine layer above CNA, providing reusable input, rendering, collision, animation, audio, UI and application facilities without hiding the XNA programming model.
author: Robert Vokac
categories:
  - Development
  - Projects
tags:
  - CNA
  - CNA Engine
  - C++23
  - Game Engine
  - XNA 4.0
  - CMake
  - 3D
  - Rendering
  - Animation
  - Audio
  - Collision
  - WebAssembly
draft: false
---

**CNA Engine** is a modular C++23 game-engine layer built above CNA. It provides the reusable systems that many games need—input actions, cameras, meshes, render queues, collision, animation, audio, menus, saving and diagnostics—while keeping CNA and the familiar XNA `Game` model visible underneath.

The project exists because several CNA games had independently implemented similar engine infrastructure. Car Simulator, Street Simulator, School Simulator, Backrooms Simulator, Train Simulator and other projects all needed variations of cameras, material binding, mesh ownership, culling, screenshot capture and settings. Copying another project-local renderer each time was no longer a sustainable answer.

**Source:** [github.com/libcna/cna-engine](https://github.com/libcna/cna-engine)

**Current status:** version `0.1.0`, experimental. APIs that have survived adoption by multiple real games are marked stable, but most of the broader engine remains free to change before its first stable release.

## CNA is the runtime; CNA Engine is the reusable game layer

CNA implements the XNA 4.0 programming model in C++23. It owns the application lifecycle, platform abstraction, graphics resources, stock effects, input devices, audio, storage and content management. Those are the foundations on which an XNA-style game runs.

CNA Engine deliberately sits one level higher:

```text
game or simulator
        |
        v
    CNA Engine       reusable game, scene and rendering policies
        |
        v
       CNA           XNA API, content, graphics, audio and platform layer
        |
        v
 renderer / SDL / operating system
```

The engine does not replace `Microsoft::Xna::Framework::Game`, hide the `GraphicsDevice`, or introduce a compulsory editor and proprietary world format. A game can use a single engine module, adopt the ready-made `EngineGame` application layer, or continue to draw directly with CNA whenever a specialized pass needs it.

This separation also keeps higher-level policy out of CNA itself. CNA remains focused on XNA compatibility and portable runtime services, while CNA Engine can offer opinionated facilities such as render queues, quality presets, collision and a first-person controller.

## Extracted from working games, not designed in isolation

Before implementation, the engine project reviewed the common systems in a broad set of CNA applications. The analysis covered hundreds of thousands of lines across car, street, house, island, school, museum, room, ship and train simulators.

That review found repeated implementations of:

- fixed-step simulation clocks;
- named input actions and rebinding;
- first-person, free, orbit and follow cameras;
- CPU mesh builders and GPU mesh ownership;
- materials, render queues and graphics-state restoration;
- frustum culling, distance limits, LOD and instancing;
- asset caches and quality settings;
- deterministic screenshots, diagnostics and benchmarks;
- positional audio, UI, save files and simple collision.

The engine was not created by copying one simulator wholesale. Its first APIs were tested against two deliberately different pilots: the strict-XNA Car Simulator and the PBR-based Street Simulator. Only abstractions that worked for real consumers were promoted toward stability.

![Car Simulator rendered through CNA Engine, with the night lighting and headlights retained](/wp-content/uploads/2027/03/cna-engine-car-simulator-headlights.png)

The result is an engine shaped by compatibility work. It can borrow buffers owned by an existing game, accept camera matrices calculated elsewhere, preserve explicit draw ordering and let a game supply its own material binder. Those may be less glamorous features than an editor screenshot, but they are what make gradual adoption possible without subtly changing a mature game's picture.

## Strict and enhanced profiles

Not every CNA project uses the same compatibility policy. Some applications allow only the XNA 4.0 API, Sharp Runtime and the C++ standard library. Others use CNA extensions, physically based rendering and `cna-extended`.

CNA Engine therefore has two architectural profiles.

The **strict profile** is formed by `CnaEngine::Core`, `Graphics`, `App`, `Audio` and `UI`. Its public implementation stays on CNA's XNA-compatible surface. A boundary checker scans the strict headers and fails if an extension type leaks through. This makes the profile suitable for projects that want reusable infrastructure without abandoning an XNA-only code policy.

The **enhanced profile** adds two optional targets:

- `CnaEngine::EnhancedGraphics` integrates CNA facilities such as `PbrEffect`, `SkinnedPbrEffect`, image-based lighting, reflection probes, shadow reception, local lights and browser pointer lock;
- `CnaEngine::ExtendedIntegration` adapts `cna-extended` screens, World3D cameras and 3D particles without duplicating that library.

This boundary matters. A strict game does not have to build or link `cna-extended`, while a more ambitious renderer can opt into the complete `CnaEngine::Engine` target.

## The module map

The current project is split into focused CMake targets rather than one monolithic library.

| Module | Main responsibility |
| --- | --- |
| `CnaEngine::Core` | Fixed-step clock, settings, save slots, input actions, profiling, static collision, character controller and animation data |
| `CnaEngine::Graphics` | Cameras, mesh data, GPU meshes, materials, render queues, culling, LOD, instancing, forward rendering, sky, shadows, post-processing and screenshots |
| `CnaEngine::App` | An XNA `Game` with the engine's common lifecycle, preferences, automated runs and renderer already wired |
| `CnaEngine::Audio` | Positional voices, mix categories, sound banks and a bounded voice budget |
| `CnaEngine::UI` | Built-in font, HUD drawing, notifications, menus, settings and rebinding rows |
| `CnaEngine::EnhancedGraphics` | PBR and other CNA graphics extensions |
| `CnaEngine::ExtendedIntegration` | Optional adapters to `cna-extended` |
| `CnaEngine::Engine` | The complete enhanced set |

Games select the smallest useful set. A custom XNA game can link only `Core` and `Graphics`; a new project that wants the supplied game loop and all enhanced features can link the umbrella target.

## Starting a new game

The repository includes a dependency fetcher and a project generator. A first-person game can be created with:

```bash
git clone https://github.com/libcna/cna-engine.git
cna-engine/tools/fetch_dependencies.sh
cna-engine/tools/new_game.sh my-game "My Game"

cd my-game
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 8
./build/my-game
```

The generated project is intentionally small. Its CMake file uses `cna_engine_add_game()`, its `assets/` directory is copied or packaged for the target platform, and one game class contains the initial scene. The template already demonstrates first-person walking, stairs, jumping, crates, sunlight and shadows, a HUD, a pause menu and saved preferences.

The same project can be built for the browser. Under Emscripten, the engine's CMake support creates a web package, preloads the assets and applies CNA's required WebAssembly settings. The template provides `tools/build_web.sh --serve` for the complete build-and-preview path.

## EngineGame without a closed framework

New games may derive from `CnaEngine::App::EngineGame`. It is still an XNA `Game`, but several repetitive pieces are ready:

```cpp
class MyGame final : public CnaEngine::App::EngineGame
{
    void LoadGame() override;
    void FixedUpdate(double step) override;
    void UpdateFrame(double seconds) override;
    void Submit(CnaEngine::App::Frame& frame) override;
    void DrawOverlay(GraphicsDevice& device) override;
};

int main(int argc, char** argv)
{
    return CnaEngine::App::RunGame<MyGame>(argc, argv);
}
```

`EngineGame` connects the action map, fixed-step clock, camera, forward renderer, frame statistics, screenshots, preferences, asset directory, mouse capture, optional shadows and post-processing. The game continues to decide what its simulation means and what appears in each frame.

Common diagnostic command-line options are built in. For example:

```bash
./build/my-game --frames 120 --lockstep --screenshot shot.png
```

This runs a deterministic number of frames, captures the last one and exits. The engine examples use the same mechanism as automated visual tests.

Projects that already own their `Game` subclass do not need `EngineGame`. They can instantiate an `ActionMap`, `Camera`, `GpuMesh`, `RenderQueue` or any other facility as an ordinary C++ member and integrate it into the existing update and draw sequence.

## Input, timing and player movement

Input is expressed through named actions and axes rather than hard-coded key checks scattered through game logic. One action can have keyboard, mouse and gamepad bindings, can be rebound at runtime, can report press and release edges and can persist the player's overrides.

```cpp
Input::ActionMap actions;
const auto forward = actions.AddAxis("MoveForward");
actions.BindAxis(forward,
    Input::AxisBinding::ForKeys(Keys::S, Keys::W));
```

The fixed-step clock separates deterministic simulation from presentation frames. It clamps unusual frame delays, limits catch-up work and exposes interpolation state. Automated runs can use lockstep mode so tests and captures are reproducible.

For character-scale games, `StaticWorld` accepts boxes, triangles, vertical cylinders and a height field. Its uniform grid accelerates raycasts, overlap tests and capsule contacts. `CharacterController` adds gravity, slopes, steps, jumping, wall sliding, stride events and optional head bob without pretending to be a general rigid-body physics engine.

## Geometry and the rendering path

`MeshBuilder` produces CPU-side geometry for common primitives and game-generated shapes. `GpuMesh` uploads that data through an explicit vertex layout and owns the resulting buffers through RAII. Existing projects can instead use `GpuMesh::Borrow` to expose buffers they already own, avoiding a duplicate upload during migration.

A normal frame follows a transparent sequence:

```text
RenderItem submissions
        ↓
visibility and LOD selection
        ↓
RenderQueue buckets and deterministic sorting
        ↓
ForwardRenderer
        ↓
stock XNA effects or an enhanced/custom material binder
```

Materials describe shading, textures, blending, alpha testing, face winding, fog and optional reflection data. The stock binder maps them to XNA effects. The enhanced PBR binder maps them to CNA's PBR effects, including normal and ORM textures, image-based lighting, exposure, skinned meshes and per-item reflection probes.

The renderer supports opaque, alpha-tested, transparent, overlay and explicitly sequenced work. Custom passes can run around those buckets, so a specialized sky, mirror, depth pass or game-specific effect does not need to be forced into a generic material abstraction.

Other graphics facilities include:

- frustum and distance culling with LOD statistics;
- hardware instancing with a per-instance fallback;
- skinned vertex layouts and bone palettes;
- sky colors and time-of-day lighting;
- a directional sun shadow map and shadow reception;
- local lights and light pools;
- post-processing hooks for grading, fades and vignettes;
- render statistics, GPU-memory estimates and deterministic screenshots.

![Street Simulator's PBR city scene rendered through CNA Engine](/wp-content/uploads/2027/03/cna-engine-street-simulator.png)

The Street Simulator migration is an important test of this design. Its PBR materials, instancing, skinned figures, atmospheric pass and per-item reflection probes were submitted through the engine while remaining within the project's defined screenshot tolerances. Car Simulator exercised a different route based on strict XNA effects, mirrors, headlights and existing camera matrices.

## Models, animation, audio and UI

The engine can turn an XNA `Model` into render items while preserving its mesh parts and material information. The enhanced importer understands CNA's glTF material and skinning data. Skeletons, clips and an `Animator` provide playback and cross-fades, and the renderer accepts a borrowed palette of bone transforms for each skinned item.

Audio is built around positional voices, sound banks, mix categories and a voice budget. The budget prevents a dense world from creating an unlimited number of active sources. A null audio device remains a supported test configuration, so game logic and the engine suite can run on headless machines.

The UI module intentionally stays small. It provides a built-in bitmap font, virtual-screen HUD drawing, toasts, menus, a menu stack and reusable settings and rebinding rows. It is enough for a game's debug panel, pause menu and options screen without attempting to become a full desktop widget toolkit.

Settings files support typed and clamped reads plus atomic saving. Save slots are versioned, checksummed and can recover from a backup. These systems are independent of a particular game's data schema: the engine provides safe storage mechanics, while the game defines the actual fields it saves.

## Proven through staged adoption

CNA Engine's strongest claim is not the size of its feature list but the way those features are verified.

Car Simulator and Street Simulator were the original pilots. The engine compared its cameras, meshes, rendering behavior, culling and materials against their project-owned implementations. Both later adopted the shared layer in their main development branches. The facilities used by both—camera matrices, GPU meshes, render statistics, materials, render queues, visibility and LOD, the forward renderer, quality schemas and the asset registry—are currently marked stable.

The adoption then expanded:

- Galaxy Eggbert replaced its `easy-3d` camera, geometry and drawing helpers while retaining byte-identical deterministic captures;
- Backrooms Simulator moved streamed non-indexed world geometry, input, screenshots, statistics and camera handling to the engine;
- School Simulator adopted camera, buffer borrowing, rendering, input, screenshots and asset caching while preserving its portal-culling and game-specific systems;
- Train Simulator adopted facilities that could preserve its explicitly sequenced rendering;
- shared image, noise, settings, automated-run and sun-position utilities were derived from repeated implementations across further simulators.

This staged approach is deliberate. Mature games keep their simulation, authored worlds and specialized systems. They replace one proven piece at a time, run their own tests and compare deterministic screenshots before moving to the next piece.

## Verification and compatibility

The default configuration uses CNA's software renderer, headless platform and null audio device. That lets most of the suite run without a window, GPU or speakers. The recorded baseline reports hundreds of engine tests, the complete `cna-extended` suite, installed-package consumer probes and the pilot suites.

Verification covers several different questions:

- unit tests check each facility, including software-rendered pixel results;
- boundary tests ensure strict headers do not expose enhanced APIs;
- an API snapshot makes changes to pilot-validated headers explicit;
- runnable examples render frames and assert their own invariants;
- consumer probes install the package and build separate strict and enhanced applications;
- pilot probes compare the engine with the original implementations on identical inputs;
- visual comparisons enforce documented screenshot tolerances;
- scaling tests check that culling, sorting, instancing and action updates do not grow unexpectedly;
- pinned dependency revisions make a qualified CNA baseline reproducible.

Linux is the main verified development environment. The engine suite uses headless software rendering, while pilot adoption has also exercised OpenGL 3.3 and OpenGL ES 3 through Mesa software rendering and an AMD Radeon GPU. Browser paths have been built with Emscripten and exercised through WebGL 2 in selected games and examples. Other CNA platforms are expected architectural targets, but they should not be described as qualified until their own evidence exists.

## What CNA Engine does not try to own

The project intentionally leaves several responsibilities to games or specialized libraries:

- vehicle, train, ship and aircraft physics;
- traffic logic, passengers, wildlife and game-specific NPC behavior;
- authored city, island, school or route formats;
- a universal weather policy;
- a comprehensive ECS, editor or asset database;
- a full rigid-body physics and navigation stack;
- renderer-backend implementation details owned by CNA.

It also reuses `cna-extended` for facilities that already belong there, including screens, ECS, World3D, fonts, particles and tilemaps. CNA Engine adds adapters rather than maintaining competing copies.

That restraint is central to the design. CNA Engine should make ordinary game code shorter and more consistent without turning every CNA application into the same game.

## Building the engine itself

The repository uses CMake 3.20 or newer and C++23. With CNA, Sharp Runtime and the optional sibling dependencies available beside it, a normal development build is:

```bash
cmake -S . -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_C_COMPILER_LAUNCHER=ccache \
  -DCMAKE_CXX_COMPILER_LAUNCHER=ccache

cmake --build build --parallel 3
ctest --test-dir build --parallel 3
```

Important options can disable the enhanced modules, enforce the exact pinned dependency baseline, enable pilot suites or add AddressSanitizer and UndefinedBehaviorSanitizer to the engine targets.

The project can also be installed. Its package exports components such as `Core` and `Graphics`, while CNA and `cna-extended` are supplied either as packages or source targets according to the consumer setup.

## Present scope

CNA Engine has already moved beyond a speculative framework: multiple games run on parts of it, stable APIs are defined by real shared use, new projects can be generated from a working template, and the repository contains executable examples and extensive verification.

It is nevertheless a pre-1.0 engine. Many facilities are still marked experimental, the compatibility baseline is pinned, and platform claims remain narrower than CNA's complete target list. Applications should select modules deliberately and expect migration work when following development revisions.

The project's value is the middle ground it occupies. CNA continues to offer a recognizable, portable XNA runtime. Individual games keep their identity and specialized systems. CNA Engine provides the tested layer of shared machinery between them.
