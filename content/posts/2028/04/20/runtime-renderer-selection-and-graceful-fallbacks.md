---
title: Runtime Renderer Selection and Graceful Fallbacks
date: 2028-04-20T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Select a CNA renderer from policy and capabilities, report initialization failures and apply feature fallbacks without renderer-name branches.
author: Robert Vokac
categories: [Graphics]
tags: [CNA, Renderers, Capabilities, Fallbacks, Configuration]
draft: false
---

A game may package several renderers, but selection should be policy plus evidence: user override, platform defaults, availability, initialization and required capabilities.

```cpp
for (RendererId id : preferredRenderers) {
    auto attempt = registry.TryCreate(id, window);
    if (!attempt) { LogFailure(id, attempt.error()); continue; }
    if (!MeetsRequiredCapabilities(attempt->Capabilities())) continue;
    renderer = std::move(*attempt);
    break;
}
```

Use CNA's actual registry/selection API. Tear down every partial attempt before the next. A command-line/config override should fail clearly or allow an explicit fallback policy, not silently ignore the user's diagnostic choice.

Feature code queries capabilities such as custom/compiled effects, MRT, formats or queries. It selects a baseline/enhanced technique; it never tests `renderer == Vulkan`. Publish the active renderer, adapter, capability profile and every quality fallback.

Classify requirements: essential features abort selection; optional features reduce quality in documented order. Never replace an exact data target with a visually similar format when correctness depends on bits.

Test missing modules, corrupt configuration, each renderer failing initialization, fallback success, no usable renderer and persisted bad override. Run representative saves/screens across every shipped path. Runtime selection is trustworthy when the chosen result and every rejection can be explained from one diagnostic record.

## Policy design

Keep ordered preferences separate per platform and allow environment/command-line override for diagnosis. A “safe graphics” mode can choose the most qualified baseline, lower resolution/effects and ignore the previously crashing optional renderer after confirmation. Do not permanently blacklist from one unexplained crash.

Evaluate capabilities after successful live-device creation because format/sample support can depend on adapter. Produce a feature plan—HDR target chosen, custom effects available, shadow format, query support—once and expose it to render passes. Recalculate only after device/renderer recreation.

Fallback must preserve data semantics. Cosmetic bloom can disable; an integer picking target cannot become color without a new implementation. Log each downgrade once with requested/actual values and surface it in diagnostics/settings.

Package tests enumerate every selection order and verify optional modules can truly be absent. A release claiming several renderers needs qualification artifacts for each; fallback is resilience, not permission to ship an untested primary.

## Configuration precedence

Define one order, for example: temporary command-line diagnostic override, environment override for CI, user confirmed setting, platform default. Log source and requested value. Invalid persisted value should enter safe selection and allow user recovery, not boot-loop forever.

Store renderer choice separately from renderer-specific quality. Switching backend re-evaluates capabilities/formats and selects compatible settings while preserving user intent where possible.

## Candidate attempt transaction

Each attempt owns temporary platform surface/device/resources until fully initialized. On failure, stop callbacks, release resources, destroy device/surface and only then try next. Keep all attempt diagnostics; final error lists every candidate and reason.

```text
SDL_GPU: refused — adapter lacks required Color HDR target
WebGPU: module not packaged
Software: selected — baseline capabilities satisfied
```

Essential requirements should be few and truly gameplay-critical. Enhanced feature plan records actual target formats/samples/effects, not just capability booleans. Save this plan in screenshot/crash diagnostics.

## Runtime failure versus startup fallback

A fatal device loss during play is not automatically permission to switch renderer under a live world. Cross-renderer recovery requires explicit teardown/recreation of every resource and presentation state. If unsupported, save/checkpoint if safe and show/restart with recovery choice.

Track repeated startup crash/failure cautiously. Offer safe mode after user-visible detection, but do not permanently blacklist an adapter from one unrelated crash.

## Compatibility fixtures

Run one baseline scene/save through every selected route and compare gameplay state plus permitted visual differences. Force every fallback (format, MSAA, effects, queries) in tests. Ensure unsupported enhanced content refuses at load with context rather than producing black draws.

Release UI should display active renderer and restart requirement, validate choice before persistence, and retain “reset graphics settings.” This makes multi-renderer support operable by users and support teams.

## Content and support integration

Manifest summarizes essential shader/effect/format/model routes so selection verifies them before level load or chooses packaged compatible variant. CI removes enhanced variant to exercise baseline and forces required enhanced content on incapable renderer to verify named refusal.

Renderer ranking reflects platform qualification/stability, not one universal benchmark. Auto-quality happens after selection and never silently switches renderer for a slow frame. Confirmed settings remain visible/recoverable.

Support export includes preference chain, every attempt reason, selected module/build/adapter/driver/capabilities and feature plan. This makes unexpected software/fallback selection diagnosable rather than inferred from appearance or FPS.
