---
title: Building an Island Simulator Feature from Start to Finish
date: 2029-02-15T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Follow one Island Simulator feature from design and asset provenance through CNA content, world placement, interaction, audio, saves, tests and screenshots.
author: Robert Vokac
categories: [Development]
tags: [CNA, Island Simulator, Content Pipeline, Gameplay, Case Study]
draft: false
---

The Island Simulator article tours a world filled with wildlife, vehicles, buildings and mysteries. This case study follows a single new feature through the production path: a crashed flying saucer, its alien occupant and a discoverable interaction. The same path applies to a boat with skeletons, hot-air balloon, elephant, tyrannosaur or any other island addition.

![Island mysteries including the crashed saucer, alien, ruined castle and volcanic crater](/wp-content/uploads/2027/02/island-simulator-new-mysteries-collage.png)

A feature is not finished when a model renders. It needs legal/provenance records, asset conversion, level placement, collision, behavior, audio, save identity, diagnostics, performance qualification and presentation evidence.

## Write the feature contract

The saucer appears at a fixed authored landmark. The player can approach, inspect it, trigger one discovery event and see/hear a short presentation. The alien has a bounded idle behavior but does not block essential navigation. Discovery persists in saves and can contribute to an exploration counter.

List non-goals: no combat, no vehicle control, no procedural relocation and no online synchronization beyond existing world-state rules. Define supported controls, accessibility text and fallback if audio or a visual effect is unavailable.

Stable IDs are chosen before placement:

```text
landmark.crashed_saucer
entity.crashed_saucer.alien
discovery.crashed_saucer
audio.crashed_saucer.hum
```

These are durable data identities, not filenames or runtime entity indices.

## Acquire and prepare assets

Record source, author, license, modifications and redistribution permission for model, textures and audio. Reject an attractive asset whose provenance cannot ship. Normalize coordinate system, units, origin/pivot and material conventions in the content pipeline.

Optimize geometry and textures for the viewing distance. Generate mipmaps and compressed target variants under the project's CNA texture strategy. Build a lower-detail mesh if the saucer is visible across the island. Alien animation clips need stable skeleton/bone mapping and tested loop boundaries.

Create separate authored data for visible mesh, simplified collision, interaction volume, audio emitter and navigation obstacle. Never use a detailed render mesh as collision only because it is already present.

The compiled asset bundle contains typed references and bounds. Validation catches missing materials, unsupported formats, invalid animation tracks and excessive complexity before the game starts.

## Place it in the world

Choose a landmark coordinate in the island scene/chunk and orient the saucer to fit terrain. A placement tool shows terrain height/normal, collision bounds, navigation impact, LOD distances and camera sight lines.

If the crash should disturb terrain, author a decal/scorch mesh, debris and vegetation-exclusion volume rather than dynamically modifying the whole terrain system. Check that the feature remains reachable from common routes and does not intersect water, huts or other persistent objects.

![Transport and wrecks on the island, including the hot-air balloon, quad and grounded boat](/wp-content/uploads/2027/02/island-simulator-transport-collage.png)

The scene data instantiates components in phases: transform/identity, presentation assets, collision/query proxies, interaction, audio and alien behavior. If a required asset fails, the candidate feature does not partially publish; the existing island remains valid.

## Interaction and behavior

The interaction system finds nearby candidates through a spatial query, filters line of sight/facing and selects a stable best candidate. UI displays a localized action prompt. On activation, gameplay validates distance/state again and emits `DiscoveryActivated` once.

```cpp
if (!progress.IsDiscovered(discoveryId) &&
    interaction.CanActivate(player, saucer)) {
    progress.MarkDiscovered(discoveryId);
    events.Emit(DiscoveryEvent{discoveryId, player.id});
}
```

Presentation listens for the event: alien reaction animation, saucer light pulse, subtitle/caption, audio sting and optional camera emphasis. Skipping or reduced-motion mode shortens the camera effect without skipping authoritative discovery.

The alien behavior uses an idle zone and a small navigation leash. It cannot wander into water or block the prompt. Its state machine and random stream are stable; cosmetic look-around does not change save data unless required.

## Audio, lighting and renderer fallbacks

A looped hum attenuates spatially and starts/stops with chunk/feature lifetime. Interaction sting is deduplicated by event ID. Captions identify meaningful non-speech audio. Voice count and distance culling keep the island's many emitters bounded.

Saucer emissive lights use the material system. Higher tiers may add a local light, particles or post-process pulse; fallback retains emissive texture/color and readable interaction. Capability selection is logged and never keyed only by renderer name.

Night/day and weather affect the landmark through the shared environment frame. The saucer must not invent a separate sun/fog calculation.

## Save, streaming and updates

Save `discovery.crashed_saucer` state plus any durable alien state, not pointers or animation time. Loading before the chunk is resident records the world delta; instantiation applies it when the feature streams in. Removing/renaming the landmark later requires a migration of its stable ID.

Chunk unload stops interaction, audio and jobs before releasing content. Late animation/content results carry chunk generation. Reload restores correct discovered presentation without replaying the one-time reward.

## Tests, screenshots and done

Automate approach from valid/blocked angles, activation, repeated activation, save/reload, unload/reload, reduced motion, captions and missing optional effect. Validate collision/navigation and memory after repeated streaming. Capture day, night and bad-weather frames on CNA renderer tiers.

Add debug overlay with source asset IDs, bounds, interaction score, discovery state, chunk generation, audio voice and selected material variant. Review license metadata with packaged files.

The feature is complete only when it enriches the island consistently: discoverable, performant, saveable, accessible, portable and traceable back to its source. That is the difference between importing an object and shipping a world feature.
