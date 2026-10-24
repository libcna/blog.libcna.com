---
title: Writing a Minimal CNA Game Engine Layer
date: 2028-05-25T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Add screens, worlds, assets and diagnostics above CNA without hiding its lifecycle, content and renderer contracts.
author: Robert Vokac
categories: [Development]
tags: [CNA, Game Engine, Architecture, Screens, ECS]
draft: false
---

CNA is a framework. A game may add a thin engine layer for screens, worlds, actions, assets and diagnostics, but that layer should reduce repetition rather than replace CNA with another opaque framework.

Start with boundaries:

```cpp
struct GameContext {
    GraphicsDevice& graphics;
    ContentManager& content;
    InputActions& input;
    Diagnostics& diagnostics;
};

class Screen {
public:
    virtual void Enter(GameContext&) = 0;
    virtual void Update(GameContext&, const GameTime&) = 0;
    virtual void Draw(GameContext&, const GameTime&) = 0;
    virtual void Exit(GameContext&) = 0;
};
```

Keep screen transitions queued at frame boundaries and content ownership scoped. World simulation produces render data; render passes consume it. Input becomes actions before gameplay. Platform and renderer capabilities stay visible rather than being replaced by engine-name checks.

Avoid premature ECS, scripting, asset hot reload and editor reflection until a real game needs them. Every abstraction needs an escape route to CNA plus diagnostics identifying the underlying resource/pass.

Test one vertical slice: boot, menu, load, play, pause, save, unload and exit, including failure/cancellation. Track allocations, resources and component counts. A minimal engine layer is successful when game code becomes clearer while CNA documentation and samples remain directly applicable.

## Module order and boundaries

Begin with action input, screen state and scoped assets. Add a world with fixed-step update and render-list boundary, then save DTO conversion and diagnostics. Add ECS, serialization/editor or hot reload only when a real game requires them.

Screens request transitions at frame boundaries. World simulation never opens native UI; presentation never mutates authority. Keep dependencies one-way from CNA/platform services toward application, world and rendering.

Use fake services for simulation tests and real renderers only for presentation fixtures. Log current screen/content scope/pass names. A sample should still be able to use CNA directly without this layer; otherwise a “minimal engine” has become an undocumented replacement framework.

## Screen transitions

Represent Push, Pop, Replace and Quit as requests processed after update. Validate, load/cancel, call Exit/Enter in defined order and publish stack atomically. Covered screens update/draw according to modal/transparency policy. A failed replacement leaves old active or shows error—never half transitions.

Each screen owns content scope or declares shared assets. Async results carry generation so late completion releases instead of mutating dead screen.

## World boundary

Simulation uses fixed tick, commands and durable IDs—no GPU/audio/native handles. It emits render snapshot/list and audio events. Presentation consumes them, enabling headless replay/server tests. Start with simple typed storage; add ECS only when queries/composition justify it.

## Services and rendering

Interfaces cover storage, localization, audio commands, platform UI and clock. Production adapters call CNA; tests use fakes. Pass through context/constructors instead of global lookup.

Frame passes declare targets/state and invoke CNA directly. Materials own parameters while capability/fallback plan remains visible. Diagnostics drill from engine pass/item to CNA resources.

For each wrapper ask whether it adds game policy/testing/ownership or only renames CNA. Keep a direct CNA sample and one-day-understandable layer. The engine should stay smaller than the framework it organizes.

## Save, replay and failure

World converts to/from versioned DTO at coherent tick; screens/render/services excluded. Replay records semantic commands. Inspector reads snapshots, not arbitrary mutable internals. Tools share schemas but need not link whole runtime.

Exercise content cancel/fail, transition with late async completion, world exception, renderer fallback, save failure, device removal and shutdown during loading. Owners stop callbacks/work before destruction; minimal shared error screen still runs.

Document module/lifecycle graph, test pure world/services/transitions/render fixtures and package vertical slice. Track code size/dependency direction and delete unused abstractions after shipping. “Minimal” is maintained constraint, not initial label.

## One vertical slice in detail

Boot creates long-lived services/shared content and pushes title. New Game requests loading screen; worker prepares CPU level; main thread finalizes device assets; candidate world replaces loading. Input actions feed fixed ticks; world emits render/audio events; renderer draws named passes. Pause pushes modal without destroying world. Save snapshots DTO at tick boundary. Exit pops level, cancels jobs, releases level scope, then shared services/device/platform.

Instrument this path with transition IDs, content scope, world generation, pending jobs/resources. Failure at every arrow should leave either prior valid screen or error/menu. This one executable lifecycle is more valuable than dozens of abstract managers.

Add features only when slice exposes repeated policy. Keep migration notes when public game-layer APIs change, especially saves/mod/scripts. A game engine layer earns its existence through shipped-game clarity and tests, not the number of generic systems it contains.
