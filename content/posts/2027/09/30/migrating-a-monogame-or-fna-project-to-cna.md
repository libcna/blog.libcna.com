---
title: Migrating a MonoGame or FNA Project to CNA
date: 2027-09-30T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Plan a C# MonoGame or FNA migration to CNA by separating language translation, API compatibility, content conversion and renderer evidence.
author: Robert Vokac
categories: [Development]
tags: [CNA, MonoGame, FNA, Migration, C++23]
draft: false
---

MonoGame and FNA projects resemble XNA, but migrating them to CNA is not a mechanical compiler switch. CNA is C++23, property syntax becomes getter and setter methods, ownership becomes explicit, and each source framework has extensions beyond the original XNA 4.0 contract.

Inventory the game before translating. List framework APIs, custom effects, content processors, platform services, native libraries and MonoGame/FNA-specific extensions. Classify each item as CNA-compatible, CNAEXT replacement, game-owned rewrite or genuine blocker.

Port a vertical slice first: startup, one screen, input, representative content, audio and saving. Select one qualified renderer and keep the original game available as a visual and behavioral reference. Translating the whole codebase before testing a frame multiplies uncertainty.

## C++ differences are architectural

Replace C# properties with CNA's property methods and garbage-collected references with deliberate values, smart pointers or owners. Define copy and move behavior for resources. Event subscriptions need an unsubscribe lifetime. Exceptions crossing threads and callbacks need an application policy.

Do not assume MonoGame-built XNB files or FNA runtime details are byte-compatible. Use CNA's content pipeline and verify each asset class. Custom HLSL or Effect bytecode may need a compatible compiled route or a new multi-backend `ShaderEffect`.

Build comparison scenes for blending, fonts, input edges, timing, audio and saves. Accept only documented differences. Once the slice is stable, migrate subsystem by subsystem and keep both builds running the same recorded scenario.

The fastest migration is rarely the one with the most automated textual conversion. It is the one that separates language changes from framework changes and proves each boundary before removing the original implementation.

## Extension inventory

MonoGame may hide platform helpers, processors and effect assumptions behind familiar namespaces. FNA projects may depend on `EXT`, FAudio or FNA3D behavior. Search generated content and dependencies as well as source, recording a CNA equivalent or rewrite for each item.

Port pure logic first, adapters next and presentation last. Temporary compatibility shims need an owner and removal criterion or they become a permanent second framework.

## Establish a migration baseline

Before changing dependencies, record a working release: compiler and framework versions, content build output, screenshots, save fixtures, controller mappings and performance measurements. Add a smoke route through startup, one gameplay scene, pause, save/load and exit. Without this baseline every difference becomes a debate about what the old build actually did.

Inventory usage by subsystem rather than resolving errors randomly. Separate standard XNA-shaped API calls from framework extensions, native interop and custom pipeline processors. Move direct framework access behind small game-owned adapters where behavior differs. This reduces repeated conditional code and gives each incompatibility one testable home.

## Content and behavior parity

Rebuild content from source and compare metadata as well as appearance: texture alpha mode, model axes, font glyph ranges, sound formats and effect parameters. Do not copy old compiled artifacts merely because they load. Preserve source licenses and validate filename case on a case-sensitive system.

Run both builds through the same scenarios. Compare input edge behavior, fixed-step timing, audio looping, viewport scaling, blend defaults and persistence paths. Classify differences as bug, intentional CNA behavior or accepted migration change. Record the decision so a later renderer change does not reopen it.

Ship first with the smallest renderer and platform set you can genuinely qualify. Remove shims once callers use the new abstraction, then run clean-build and package tests outside the development machine. Migration is finished only when the CNA build can be maintained independently—not when enough compatibility code exists to reach the title screen.

## Keep the migration reviewable

Split changes by concern: build system, platform services, content, rendering, audio, input and persistence. Each step should compile or clearly document why it cannot yet. Maintain a ledger of unsupported calls and accepted differences with owners. This structure makes review and bisection possible and prevents a temporary replacement from disappearing inside a giant port commit. Once parity is reached, delete dead project files and verify documentation points only to the CNA workflow.

## Worked example: isolate extension differences

Suppose the original game calls a framework-specific storage helper throughout its screens. Do not add conditional compilation at every call. Define a game-owned boundary:

```cpp
class IGameStorage
{
public:
    virtual ~IGameStorage() = default;
    virtual std::vector<std::byte> Read(std::string_view slot) = 0;
    virtual void WriteAtomic(std::string_view slot,
                             std::span<const std::byte> bytes) = 0;
};
```

Implement it once using CNA platform storage and test it with an in-memory fake. Apply the same pattern to framework-specific dialogs, rich presence, video or content extensions. Compatibility code now has one owner and can be removed when no caller needs it.

## Migration ledger

Track each difference as data:

```text
ID      Area      Old behavior       CNA status       Evidence
MIG-12  Input     trigger deadzone   matched          replay/input-12.json
MIG-19  Shader    MGFX artifact      converted        captures/robot-pbr/
MIG-27  Save      user path helper   adapter ready    tests/storage-roundtrip
```

Compile pure gameplay first, then adapters, content and presentation. Rebuild content from original sources and compare alpha, model axes, glyphs, sound loops and effect parameters. MGFX or framework-specific compiled assets are not renamed into compatibility; convert source into a route CNA genuinely supports.

Run original and CNA builds through deterministic scenarios. Compare screenshots, save fixtures, input replays, audio event logs and frame budgets. Classify every difference. Start shipping with the smallest platform/renderer matrix actually qualified, then expand. Remove old project files and shims only after their ledger items close.

## Framework-specific areas to inventory

Search for namespaces and types from MonoGame/FNA extensions, platform directives, native handles, custom content importers/processors, compiled shader containers, storage helpers, video, networking and launch/build tooling. Also inspect semantics hidden behind familiar XNA names: pointer ownership, exception behavior and device-reset paths can differ even when code compiles.

For content, retain original images, models, audio and shader sources. Record how the old pipeline transformed them: premultiplication, color space, model coordinate conversion, font character regions, sound compression and effect compilation. A visual mismatch often begins in processing rather than runtime rendering.

For input, compare button edge transitions, trigger/stick dead zones, mouse coordinate space, text/IME and hotplug. For timing, compare fixed-step catch-up and inactive behavior. For audio, compare loops, instance exhaustion, category volumes and interruption. For saves, qualify actual older user data before changing write format.

## Shipping without permanent fork logic

Temporary shims need a removal condition such as “all callers use `IGameStorage`” or “all shader sources have portable packages”. Put that condition in the ledger and prevent new callers. Once removed, search the tree for old symbols and conditional framework branches.

Document supported CNA revision and build options. Run a clean consumer build, not only an in-tree developer build. Package and launch without MonoGame/FNA artifacts accidentally remaining on the machine. A migration is successful when future changes are made against CNA's documented contracts instead of a hidden compatibility layer that recreates the former framework.
