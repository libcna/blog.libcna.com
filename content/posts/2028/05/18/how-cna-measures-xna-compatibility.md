---
title: How CNA Measures XNA Compatibility
date: 2028-05-18T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: See how CNA turns public API contracts, FNA behavior, samples, fixtures and cross-renderer evidence into compatibility claims.
author: Robert Vokac
categories: [Development]
tags: [CNA, XNA, Compatibility, Testing, Evidence]
draft: false
---

Compatibility is not a percentage inferred from matching class names. CNA separates API surface, documented behavior, content/runtime interoperability and platform-renderer qualification.

Sources of evidence include public XNA contracts and documentation, the open-source FNA implementation, project-owned samples, known content fixtures, CNA unit/conformance tests and observed outputs produced by those approved test assets.

An API inventory maps type/member/signature status. Behavioral tests cover defaults, exceptions, numeric/layout rules, ownership and lifecycle. Content tests use bounded valid/malformed XNB/FX/assets. Renderer fixtures verify pixels, readbacks, state and capability refusal. Samples integrate systems in realistic loops.

```text
claim: SpriteBatch AlphaBlend supports premultiplied content
evidence: blend unit math + pixel fixture + multi-renderer capture
scope: listed renderer/platform builds and formats
```

Capability `true` requires execution, not parsing or a fixed substitute. Unsupported paths refuse clearly. Reports record revision, configuration, hardware/driver and exact tests; implementation and qualification remain distinct.

Regressions receive a minimized fixture that fails before and passes after. Compatibility reports publish gaps rather than hiding them in a headline number. This evidence model lets users decide whether their game's particular API/content/backend set is supported and makes progress independently verifiable.

## Evidence levels

Distinguish declared, implemented, structurally tested, behaviorally tested and hardware-qualified. Matching headers can still throw; unit tests can pass without promised pixels. Reports state the highest level and exact configuration.

Negative evidence matters: malformed input refusal, capability false, device mismatch and disposed use prevent false claims. Cross-renderer fixtures hold application inputs constant and compare state/readback/pixels with justified tolerance. Installed consumers prove packaging; samples prove integration; real games feed minimized regressions back.

Where public behavior is uncertain, CNA documents its FNA-compatible or intentional extension behavior rather than inventing backend-specific answers.

## Surface inventories

Maintain types/members/signatures/events/enums/overloads from approved public contracts and map each to implementation/tests. A present symbol can be partial/refusal/extension. Compile signature fixtures catch overload/const/reference/property changes; layout tests protect packed values and vertex structures.

## Behavioral evidence

Tests cover defaults, numeric/clamping, exceptions, state, events, disposal and device association. The project's approved behavioral references are public contracts and open-source FNA, plus project-owned samples/assets. Malformed suites cover truncation, impossible counts, unknown readers and disposed use; fuzzing complements targeted behavior.

## Graphics/content tiers

Capability profiles distinguish API acceptance, supplied shader/content execution, correct pixels/state/readback and hardware qualification. Stock effects, ShaderEffect and compiled FX have separate gates. Content reports container/readers and semantic alpha/model/font/audio/effect output—not merely opening a header.

## Reports and regressions

Publish commit/options/platform/renderer/hardware and fail/skip reasons. Named gaps remain until evidence closes them. Real game divergence becomes minimized fixture, classified application/shared/backend/unsupported, fixed in owning layer and run across affected population.

This trace from claim to evidence makes compatibility independently reviewable and reproducible.

## Populations and change control

Organize tests by core/lifecycle, content, services, graphics resources/state/effects/draws, platform and renderer. Each has owner/gate/exclusions. Coverage count does not equate simple operator with compiled-effect runtime.

Samples provide vertical build/load/loop/input/draw/shutdown evidence; ported games provide downstream qualification but do not replace minimized tests.

Public behavior changes identify contract, affected API/content/backends and migration. Compatibility review distinguishes bug fix from CNAEXT. Reports use precise “implemented”, “tested on”, “hardware-qualified on” and publish skips. Users can match requirements to evidence rather than a misleading headline percentage.

## Example evidence entry

```yaml
contract: Graphics.SpriteBatch.AlphaBlend
surface: implemented
behavior:
  - unit/blend-premultiplied
  - pixel/sprite-alpha-over-background
renderers:
  sdl_gpu: pass
  easygl: pass
  software: pass
  headless: not_applicable
limitations: []
```

An entry links exact tests/revisions; it is generated/validated where possible so docs cannot drift silently. Failure/skip carries reason and issue. Release comparison shows new, regressed and newly qualified claims.

Compatibility also includes consumer experience: installed headers/CMake, content toolchain and packaging. A runtime that passes in-tree but cannot build a normal external game has incomplete evidence. Downstream projects can submit minimized legal fixtures that join permanent suite, turning ecosystem reports into durable improvement.

Release gates sample claims from every evidence tier and verify linked artifacts still exist and run. Documentation pointing to a removed test is failed evidence. Reports should be generated from evidence manifests where practical, while narrative explains limits. This keeps compatibility statements synchronized with code and exposes missing qualification before release notes are published.
