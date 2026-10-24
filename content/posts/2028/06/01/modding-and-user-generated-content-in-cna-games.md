---
title: Modding and User-generated Content in CNA Games
date: 2028-06-01T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Design versioned bounded CNA mod packages with explicit precedence, capability permissions and safe failure isolation.
author: Robert Vokac
categories: [Development]
tags: [CNA, Modding, User Content, Security, Assets]
draft: false
---

Mods turn local files into untrusted input. Define a manifest with ID, version, game/API range, dependencies, content roots and requested capabilities. Stable string IDs—not load order or vector index—reference game content.

```json
{"id":"example.more-islands","version":"1.2.0",
 "gameApi":">=3 <4","dependencies":[],"content":"Content/"}
```

Resolve dependency order and conflicts deterministically. Declare whether mods may override base assets and which namespaces are protected. Case-normalize according to one documented rule while preserving safe paths; reject traversal, absolute paths and archive bombs.

Bound file count, sizes, decoded dimensions, model complexity and parser recursion. Validate into temporary data before publishing to the world. A broken optional mod should identify itself and allow disable/recovery without corrupting saves.

Saves record required mod IDs/versions and stable object IDs. Missing mods need explicit refusal or data-loss-safe recovery, never silent deletion followed by overwrite.

Separate data mods from native/script execution. Native libraries have full process authority and require a different trust/distribution model. Test conflicting packages, dependency cycles, corrupt content, upgrades/removal and clean base-game mode. Good mod support is a small versioned public contract with strict resource limits, not unrestricted access to internal objects.

## Loading and diagnostics

Discover/validate manifests, resolve dependencies, build a candidate registry and publish only when the selected set passes. Namespace assets/actions by mod ID unless an allowed override is explicit. Report conflicts with both packages and winning policy.

Downloads extract to temporary storage with size/count/path validation and move atomically after verification. Cache derived data by content/tool hash. Expose active load order and errors; safe mode disables mods without deleting them.

Fuzz traversal, archive bombs, huge textures/models, duplicate IDs and localization. Apply per-mod/global budgets. Saves record required versions and never overwrite after incomplete recovery without confirmation. A supported mod API needs versioning and deprecation like any public API.

## Manifest and resolution

Require canonical ID/version, compatible game/mod API, dependencies/ranges, conflicts, content root and permissions. Reject duplicate/cyclic/unsatisfied graphs with readable chain. Deterministically resolve set and lock exact IDs/versions/hashes into profile/save/multiplayer identity.

## Registries and overrides

Build candidate item/entity/quest/localization/asset registries, qualify IDs as `mod.id:item`, validate cross-references after all parse, then publish atomically. Overrides require explicit protected policy and retain provenance. Hot reload, if supported, happens at safe menu boundary with validated candidate.

## Security tiers

Data has parser/resource risk; scripts add computation/API authority; native plugins have full process/user authority. Label/distribute separately and never auto-load untrusted native code. Server validates all authoritative game mutations regardless of client mod.

## Saves and tooling

Save exact mod set and per-mod versioned data. Missing/incompatible set offers install/safe mode/cancel; never silently delete and overwrite. Test add/update/downgrade/remove on copies.

Ship validator/packer, schemas, template and deterministic hashes. Errors name package/file/location/ID. Stable tools and bounded contracts create a healthier ecosystem than exposing internal C++ objects.

## Multiplayer, performance and fixtures

Server publishes allowed/required mod set with hashes/policy. Client compares before join; downloads are verified/bounded and never native code. Cosmetic claims are enforced—scripts/data cannot alter authority.

Measure per-mod load time, decoded memory, definitions, scripts/events. One over-budget mod fails by name, not starves base. Unload releases textures/audio/callbacks before package removal.

Maintain example mods for add/override/dependency/localization/save/script, build against every API release, install/load/save/update/remove. Malformed corpus covers archive/schema/assets. Community packages also need author/license/permission/reporting policy while respecting local user control.

## Failure containment and recovery UI

Startup first reads enabled profile and offers safe mode after previous mod-load crash marker. Load writes marker before parsing and clears after successful publication. Recovery UI lists exact failing mod/error/dependency and can disable/profile-copy without deleting packages or saves.

During gameplay, data definition should be immutable or changes transactional. A mod exception/resource failure disables affected optional feature only when world consistency is known; otherwise return to menu preserving save. Never catch and continue after arbitrary native plugin failure as if sandboxed.

Diagnostics export manifests/hashes/load order/budgets and errors, with user consent before sharing mod list. Reproduction package can include manifests/log, not copyrighted package bytes by default.

Document stability scope: schemas/IDs/host API/version window and what remains internal. Mod compatibility is a product contract requiring release tests and migration guidance, not a side effect of loose files.
