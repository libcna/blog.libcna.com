---
title: Data-driven Scenes and Prefabs in CNA
date: 2028-11-02T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build versioned scene and prefab data above CNA with stable IDs, explicit overrides, dependency validation, streaming and safe runtime publication.
author: Robert Vokac
categories: [Development]
tags: [CNA, Scenes, Prefabs, Serialization, Content Pipeline]
draft: false
---

CNA loads content and runs a game; it does not prescribe how that game's world is described. A data-driven scene format lets tools and content define entities without compiling C++ for every placement. Prefabs provide reusable authored templates. Both are powerful only when identity, overrides, migration and runtime ownership are explicit.

Do not serialize the live object graph. Runtime objects contain pointers, caches, CNA resources, callbacks and transient state. Define durable data-transfer objects, validate them, then instantiate runtime state through a controlled factory.

## Stable identity and component data

Every authored entity needs a stable ID that survives reorder and incremental edits. Human-readable names help tools but are not identity. Component types also need durable IDs and schema versions.

```cpp
struct SceneEntityData {
    AssetLocalId id;
    String name;
    std::optional<AssetLocalId> parent;
    std::vector<ComponentData> components;
};

struct SceneAsset {
    std::uint32_t schemaVersion;
    std::vector<SceneEntityData> entities;
    std::vector<AssetReference> dependencies;
};
```

References inside one scene use local IDs. References to other assets use typed asset IDs. Never persist memory addresses, vector indices or filesystem paths. At instantiation, map asset-local IDs to runtime entity IDs and resolve references in a second pass.

Reject duplicate IDs, missing parents, parent cycles, unknown required components and invalid field ranges before mutating the active world. Diagnostics include entity path, component and field.

## Prefab composition

A prefab is an entity subtree or component collection with parameters and a stable internal identity map. A scene instance stores prefab asset ID plus explicit overrides. It should not duplicate the entire expanded prefab, or later prefab fixes cannot propagate.

```cpp
struct PrefabInstanceData {
    AssetId prefab;
    AssetLocalId instanceId;
    std::vector<PropertyOverride> overrides;
    std::vector<AddedChild> additions;
};
```

An override addresses a stable internal entity/component/property ID, not “third child, second component.” When the prefab removes a target, preserve the orphaned override as a visible warning so the author can repair or delete it.

Nested prefabs need cycle detection and a maximum expansion budget. Define precedence: base prefab, nested prefab parameters, instance overrides, runtime spawn parameters. The editor should show value origin and offer Revert Override.

Avoid arbitrary deep inheritance. Composition and parameters are easier to reason about than a hierarchy of prefabs overriding prefabs indefinitely.

## Build an intermediate representation

The content pipeline parses authoring files, migrates versions, expands/validates prefabs and emits a compact runtime scene. Preserve source mapping for errors even if the runtime format is binary. Include dependency hashes/IDs and a format version.

The compiled scene should be deterministic: stable entity/component ordering, normalized numeric/text representation and no timestamps in semantic output. Deterministic builds improve caching and review.

Do not erase prefab provenance if runtime diagnostics or patching need it. A small source/provenance table can map runtime entity back to scene/prefab location without retaining full editor data.

## Instantiate transactionally

Loading produces a candidate world or scene segment. Create pure gameplay components first, resolve internal references, then acquire content resources and register with systems in defined order. If a required dependency fails, tear down the candidate without touching the active world.

```cpp
CandidateScene candidate = sceneFactory.Build(compiled, services);
ValidationReport report = candidate.Validate();
if (report.Ok()) world.PublishAtTickBoundary(std::move(candidate));
```

Registration order should not become a hidden dependency. Components declare required services/components; the factory topologically validates or performs phases such as Construct, Resolve, Activate. Shutdown runs the reverse ownership order after jobs/callbacks are stopped.

CNA textures, models and effects live in content scopes owned by the scene or shared layer. Durable scene data refers to their IDs; runtime components receive resolved handles.

## Streaming and boundaries

Large worlds divide scenes into cells/chunks with clear ownership. Cross-cell references cannot be raw runtime pointers. Use stable world IDs and a resolver that reports Unloaded, Loading, Available or Missing. Systems tolerate an unloaded neighbor or pin the required cell through an explicit dependency.

Publish a cell at a simulation boundary after its collision/navigation/render dependencies are coherent. Unload stops new work, removes it from queries, cancels owned jobs and then destroys entities/resources. Late results carry cell generation.

## Saving versus scene data

Scene content defines the initial world; a save file defines durable changes. Store destroyed/opened/stateful entity changes against stable authored IDs, plus dynamically spawned records. When a scene update removes an entity referenced by an old save, migration chooses ignore, replace or fail visibly.

Do not write modified runtime scenes back as authoring prefabs during normal play. Editor play mode may support Apply Changes, but it needs a semantic diff and explicit user review.

## Tools, tests and collaboration

An inspector shows runtime ID, source scene, prefab chain, overrides and resource dependencies. Validate edits live, but publish only complete transactions. Source-control-friendly text authoring benefits from stable ordering and IDs; concurrent edits still need conflict-aware tooling.

Tests cover parse failure, every migration, duplicate/cyclic IDs, nested prefab cycles, orphaned overrides, missing dependencies, cancellation and repeated load/unload. Round-trip source where promised, compare compiled semantic hashes and instantiate under a headless fake service set.

A scene/prefab system succeeds when authored reuse does not compromise runtime ownership: assets are versioned, references remain stable, invalid candidates never half-enter the world and a developer can trace any runtime entity back to its data origin.
