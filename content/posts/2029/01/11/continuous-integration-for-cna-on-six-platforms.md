---
title: Continuous Integration for CNA on Six Platforms
date: 2029-01-11T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Design a CNA CI matrix for Windows, Linux, macOS, Android, iOS and Web with reproducible dependencies, layered tests, renderer evidence and signed releases.
author: Robert Vokac
categories: [Development]
tags: [CNA, Continuous Integration, CMake, Testing, Release Engineering]
draft: false
---

A CNA game can target Windows, Linux, macOS, Android, iOS and Web, but “the desktop job passed” does not prove the other five compile, package or start. Continuous integration should produce evidence in layers, because not every runner can launch every graphics backend or mobile application.

This article complements the build, packaging and release-engineering articles. It describes a project pipeline, not a promise that every hosted CI provider supplies every runner or signing environment.

## Define supported configurations

Create a machine-readable matrix of target OS, architecture, compiler/toolchain, build type, CNA platform backend, CNA renderer, graphics test level and package format. Mark required release configurations separately from experimental ones.

```yaml
targets:
  - id: linux-x64
    toolchain: clang
    platform: sdl
    renderers: [vulkan, opengl, software, headless]
    tests: native
  - id: web-wasm
    toolchain: emscripten
    platform: web
    renderers: [webgl]
    tests: browser
```

Names are project configuration examples; keep them aligned with actual CNA CMake options and capability probes. The matrix prevents undocumented combinations from appearing only in shell conditionals.

Pin compiler/SDK/CMake/CNA revisions and external dependencies. Record them in build metadata/SBOM. A floating “latest” image can make yesterday's commit impossible to reproduce.

## Fast checks before the full matrix

Every change first runs formatting/lint where adopted, content/schema validation, unit tests for pure game logic and one representative native build. Fail quickly before spending scarce macOS/mobile/browser resources.

Use change-aware selection only as an optimization, never as the sole release proof. Shared math, content or CMake changes can affect every target. A scheduled and release pipeline runs the full required matrix regardless of path filters.

Cache immutable dependency downloads and compiler outputs with keys including toolchain/options, while keeping caches untrusted: verify hashes and never let cache presence replace declared dependencies. Do not cache generated release identity or signing material.

## Desktop jobs

Windows, Linux and macOS jobs configure from a clean checkout, build with bounded parallelism, run headless/unit tests, then package. Native graphics smoke tests require an actual or validated virtual display/GPU environment; label software emulation clearly.

Run renderer matrices where hardware allows and collect logs plus golden-image outputs. One backend's success cannot certify another. Compare images using stated tolerance/masks and preserve diff artifacts. The CNA software renderer is useful for deterministic/headless coverage but is not evidence that Vulkan, Direct3D, Metal-like or OpenGL paths work.

Installer tests install into an isolated environment, launch a smoke scene, verify assets/config and uninstall while preserving user data according to policy.

## Android and iOS

Cross-compile jobs catch most API and link errors. Android produces architecture-specific or universal packages under the chosen Gradle/CMake integration, then runs unit/instrumented smoke tests on a pinned emulator and selected physical-device lab for release qualification.

iOS builds require the Apple toolchain and simulator/device split. Simulator success does not prove device architecture, graphics or signing. Keep provisioning/signing credentials in protected CI environments with least privilege; pull requests from untrusted forks never receive them.

Mobile smoke scenarios cover install, cold launch, suspend/resume, orientation/resize, touch, audio interruption, storage and low-memory handling. Capture device/OS/GPU identity with results.

## Web

The Web/Emscripten job builds all required assets with deterministic manifests, serves them from a local HTTP server and drives supported browsers. Test asynchronous startup, input, audio unlock, content fetch failure, resize/fullscreen and save persistence.

Browser automation can capture console/network errors and screenshots. Test threaded and non-threaded variants only where deployment headers/capabilities support them. Verify hosting headers, MIME types, compression and cache invalidation as part of a deployment fixture, not only the `.wasm` compilation.

## Layer graphics evidence

Use four layers:

1. CPU unit tests for math/content/gameplay;
2. headless/software render smoke and replay tests;
3. native renderer golden/conformance corpus on qualified runners;
4. periodic physical-device/manual visual qualification.

Each artifact records commit, CNA revision, target, renderer, driver/runtime, content hash and test configuration. Baseline updates require reviewed visual evidence; regenerating all goldens automatically erases regressions.

Flaky tests are quarantined with owner and deadline, not silently retried until green. Retries may distinguish infrastructure failure but the first failure remains visible.

## Artifacts, signing and promotion

Build unsigned artifacts once per target, hash and retain them. Signing/notarization runs in protected jobs and produces provenance linking signed output to the exact unsigned input. Promote the same verified artifact through test, candidate and release channels rather than rebuilding source for each environment.

Generate packages, debug symbols, licenses/SBOM, manifest, checksums and release notes. Scan dependencies/packages under a defined policy. Reproducibility checks compare semantic contents where signing timestamps prevent byte identity.

## Pipeline tests and ownership

CI code itself needs tests: matrix expansion, artifact naming, version propagation, cache keys and release gates. A dry-run validates that every supported target is represented. Scheduled jobs detect SDK image expiration before release day.

Publish a dashboard of required/optional jobs, duration, queue time and failure category. A red platform cannot be hidden by five green ones. Six-platform CI succeeds when every claim maps to a named artifact and evidence level, and a release can be reconstructed without depending on undocumented runner state.
