---
title: Designing a Material System Above CNA Effects
date: 2028-08-31T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build a thin material layer over CNA effects that owns parameters, render state, variants, fallbacks, caching and diagnostics without hiding the framework.
author: Robert Vokac
categories: [Development]
tags: [CNA, Materials, Effects, Shaders, Architecture]
draft: false
---

An effect knows how a shader program is executed. A material answers a larger game question: which effect variant, textures, numeric parameters, render states and queue semantics describe this surface? CNA deliberately provides framework-level graphics objects rather than one universal material model, so games can build the layer appropriate to their renderer.

The best material layer is thin. It removes repetitive binding and validates contracts, while preserving an escape route to CNA effects and device state. If it invents a second opaque graphics API, CNA samples and diagnostics stop being directly useful.

## Separate immutable definition from instance data

A material definition contains shared structure: shader/effect asset, technique or variant, parameter schema, queue, blend/depth/rasterizer state and default textures. Instances override values such as tint, roughness or albedo texture.

```cpp
struct MaterialDefinition {
    MaterialDefinitionId id;
    EffectHandle effect;
    RenderQueue queue;
    PipelineStateDesc state;
    ParameterLayout parameters;
    CapabilityRequirements requirements;
};

struct MaterialInstance {
    MaterialDefinitionId definition;
    ParameterBlock values;
};
```

Do not store raw pointers into an effect's internal parameter collection if effect reload can replace it. Resolve handles against a definition generation or rebuild a binding table atomically.

Keep per-object values—world matrices, skin palettes, object ID—out of shared material instances unless instances are truly unique. The renderer combines frame, view, material and object parameter blocks at draw time.

## Typed parameter schemas

String lookup on every draw is slow and lets misspellings fail late. At load time, validate that required parameters exist with compatible types and build typed slots. Optional parameters need explicit defaults. Unknown authored parameters should produce a useful error rather than disappearing silently.

```cpp
enum class MaterialSlot { BaseColor, NormalTexture, Roughness, Emissive };

bindings.Require<Vector4>(MaterialSlot::BaseColor, "BaseColor");
bindings.Optional<Texture2D*>(MaterialSlot::NormalTexture, "NormalTexture", flatNormal);
```

The names in this example are application conventions, not CNA-mandated effect parameters. Version the material schema independently from binary shader content. Migration can rename fields or transform old values while retaining clear errors for unsupported versions.

## State belongs to the material contract

Blend, depth-stencil, rasterizer and sampler choices affect correctness as much as shader code. An alpha-blended surface with depth writes accidentally enabled cannot be repaired by parameter binding. Store immutable/cached state descriptions with definitions and make the renderer bind the complete state at pass boundaries.

Separate material queue from exact submission order. Opaque items can sort by pipeline/material then front-to-back. Cutouts use their own policy. Transparent items require camera-depth ordering. Shadow and depth prepasses may use variants of the same material definition with restricted state and parameter needs.

Do not allocate CNA state objects per frame. Intern equivalent descriptions into a cache owned by the graphics-device generation and recreate them after device loss/recovery according to the project's lifecycle contract.

## Variants without combinatorial explosion

Features such as skinning, instancing, normal mapping, fog and shadow receiving can create hundreds of combinations. Define the smallest meaningful feature key and reject impossible combinations during content build.

```cpp
struct MaterialFeatures {
    bool skinned;
    bool normalMapped;
    bool receivesShadow;
    LightingTier lighting;
};
```

Some differences belong in vertex formats or separate effects rather than runtime branches. Generate only variants used by shipped content. Log compilation/load identity and warm likely variants before gameplay to avoid a first-use hitch.

Variants should be selected by material needs and CNA capabilities, not renderer name. A definition can list ordered fallbacks: PBR with shadows, PBR without shadows, simple lit, unlit error-safe. Diagnostics report both selected variant and rejected requirements.

## Asset references and hot reload

Material assets reference textures and effects through content IDs, not filesystem paths embedded in runtime objects. The loader detects dependency cycles and supplies deliberate placeholders: checkerboard albedo, flat normal, black emissive. Required versus optional dependencies are distinct.

Hot reload builds a candidate definition and all binding tables first. Only a valid candidate replaces the active generation at a frame boundary. Instances retain stable definition IDs and either migrate compatible values or surface a schema mismatch. The old effect/resources remain alive until no in-flight render snapshot references them.

## Rendering integration

Build render items containing mesh, material instance, object parameters, bounds and stable ID. Culling happens without effect mutation. Sorting creates batches. Submission then binds pass/view values once, material values when the material changes and object values per draw.

Track redundant binds and actual state changes. A material system earns its cost by making these visible and predictable. It should also allow a custom draw callback or raw CNA effect path for experimental passes without forcing every unique effect through a generic schema.

## Authoring, diagnostics and tests

An editor can show schema-aware fields, texture previews, selected variant and warnings. Never serialize transient effect indices. Store durable names/IDs and schema version. Validate ranges such as non-negative roughness or normalized direction where the material contract requires them.

Tests load valid, missing, extra and wrong-typed parameters; every fallback tier; device recreation; hot reload with instances alive; and every render queue. Golden scenes use canonical spheres/planes under controlled lighting across CNA renderers.

For a selected pixel/object, diagnostics should identify material asset, generation, effect, technique/pass, feature key, textures, states, queue and fallback reason. A material system is successful when artists get understandable errors and programmers can still trace every draw down to CNA objects.
