---
title: CNA Project Roadmap and the Path to 1.0
date: 2027-10-21T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: CNA's path to 1.0 is an evidence-driven stabilization program covering API contracts, renderer parity, platforms, packages and real game adoption.
author: Robert Vokac
categories: [Development, Projects]
tags: [CNA, Roadmap, Release, Testing]
draft: false
---

CNA's version number should communicate stability, not the size of its feature list. A 1.0 release means applications can select a documented surface, build against a supported package, upgrade deliberately and trust that claimed capabilities have evidence.

The first pillar is API stability. XNA-compatible declarations need continuing audit, CNAEXT boundaries must remain visible, and public ownership, threading and error contracts must be documented. Pre-1.0 is the time to remove accidental APIs rather than preserve them forever.

The second pillar is renderer and platform qualification. Each supported combination needs a capability profile, shared fixtures, lifecycle tests and dated real-hardware evidence. Unsupported routes should fail clearly. A long renderer list is less useful than a smaller set with honest matrices.

## From repository to product

The installed C++ SDK, content tools, examples and package metadata must work outside CNA's source tree. Releases need reproducible tags, dependency versions, migration notes and clean consumer probes. Web, mobile and desktop artifacts should state exactly what they contain.

Real games remain the strongest integration tests. XNA samples prove compatibility breadth; simulators and CNA Engine exercise scale, migration and modern extensions. Bugs found by consumers should become minimized tests in the owning module.

Diagnostics, Inspector, Headless and Software make qualification repeatable. They are not side projects: they supply the evidence needed to stabilize performance and behavior across changes.

The road to 1.0 therefore prioritizes closure over novelty: resolve documented blockers, reduce known gaps, qualify supported paths, freeze contracts and publish an upgrade policy. Features without maintainers or cross-platform evidence can remain experimental after 1.0 behind explicit options.

Roadmaps change as testing discovers facts. CNA should keep dated status, distinguish implemented from qualified, and never turn aspiration into a support claim. Reaching 1.0 is the point where that discipline becomes a dependable promise to downstream games.

## Concrete release gates

A candidate should pass installed consumers, API snapshots, content interoperability, sanitizers, renderer fixtures and platform lifecycle tests from a clean tag. Limitations need stable identifiers. Notes must distinguish fixes, intentional breaks and experimental modules.

After 1.0, semantic versioning governs supported APIs. Experimental options can evolve under marked contracts, while deprecations receive a migration window. Downstream projects should be able to plan upgrades from evidence rather than optimism.

## What release readiness means

A 1.0 label should describe dependable contracts, not the end of development. Public headers need ownership and error behavior documented. Supported platform-renderer pairs need clean-build instructions, packaged smoke tests and an explicit feature matrix. Content produced by supported tooling must have a compatibility policy, and applications need a stated migration path when an API is deprecated.

Quality gates should include unit tests, cross-renderer visual fixtures, sample builds, lifecycle stress, package validation and real-hardware qualification. Known unsupported features remain acceptable when capability reporting is honest and fallback behavior is documented. Silent partial implementations are release blockers because applications cannot make informed choices.

## Milestones that downstream users can verify

Organize work into observable milestones: contract stabilization, backend parity, toolchain reproducibility, packaging, documentation and release-candidate qualification. Each milestone should list artifacts and exit criteria rather than a percentage. Publish changes, accepted gaps and tested configurations with every candidate so maintainers can evaluate risk themselves.

Before freezing, build representative existing games and ports, not only framework tests. Their feedback reveals awkward ownership, missing extension points and deployment assumptions. Once frozen, limit changes to documented release blockers and require regression coverage for every fix.

After 1.0, keep experimental namespaces clearly marked, announce deprecations early and preserve a window in which old and new APIs coexist. Regular compatibility reports and reproducible packages matter more than an ambitious date. The path to 1.0 succeeds when users can build, ship, diagnose and upgrade CNA applications without relying on undocumented knowledge.

## How the community can judge progress

Keep roadmap items linked to issues, tests, documentation or release artifacts. Distinguish committed release blockers from exploration and long-term ideas. Publish qualification gaps as openly as completed backends, because honest scope lets games choose supported targets. Regular candidates give downstream projects time to report incompatibilities before the freeze. The roadmap should therefore answer three concrete questions: what is promised, what evidence proves it today, and what remains before that promise becomes stable.

## Turn “1.0 ready” into a machine-readable gate

Each supported pair needs named evidence rather than a percentage:

```yaml
release: 1.0.0-rc1
contracts:
  public_headers: frozen
  content_format: documented
  deprecation_policy: published
targets:
  - platform: Linux
    renderer: SDL_GPU
    build: pass
    conformance: pass
    samples: pass
    package_smoke: pass
    hardware:
      - {gpu: "qualified-adapter-a", driver: "recorded", result: pass}
known_gaps:
  - {feature: "example optional feature", capability: false, fallback: documented}
```

The names are illustrative; the principle is that a release candidate points to artifacts: logs, package hashes, feature matrices and real-hardware reports. Unsupported optional behavior is acceptable when the capability is false and refusal/fallback is tested. A feature claimed true but only partially executed is a blocker.

## Release-candidate sequence

Freeze public contracts, build every supported target from clean instructions, run unit and cross-renderer fixtures, build samples, package, install on clean systems, and run representative downstream games. Fix only release blockers during the candidate window and require a regression test for each fix. Publish accepted gaps and toolchain versions with the next candidate.

After 1.0, keep experimental APIs marked and outside the stable promise. Deprecation announces replacement, supplies a migration example and retains an overlap window. Track compatibility against real games and preserve older content/save fixtures. A roadmap earns trust when downstream users can independently verify every “done” statement and predict the cost of an upgrade.

## Compatibility promises to write before release

Define which public C++ headers and symbols are stable, which build options and target identities are supported, and whether ABI compatibility is promised or source compatibility is the contract. State content-format/version behavior, save responsibility, renderer/platform capability reporting and minimum toolchains. Ambiguity here becomes downstream breakage later.

Document ownership and thread affinity for public resources. Publish how unsupported features fail. Specify deprecation length and semantic-versioning rules. Experimental APIs must be visually and documentationally distinct so users understand that they are outside the 1.0 promise.

## Ecosystem readiness

Framework tests alone do not qualify the surrounding ecosystem. Build CNA samples, the content pipeline, representative games and bindings explicitly included in scope. Verify installed-package consumption from a separate project and validate documentation commands in a clean environment. Produce release archives/packages with licenses and symbols.

Invite downstream maintainers to test candidates against real projects and track their reports as release evidence. Classify blockers by broken promise, not popularity of the reporter. Publish what was tested and what was not.

## After the tag

Retain exact source, dependency locks, packages, symbols, test results and qualification metadata. Create a maintenance branch/policy for critical fixes. Run compatibility fixtures from earlier releases against every update. The purpose of 1.0 is not declaring CNA finished; it is making a stable, evidence-backed base on which games and the broader CNA ecosystem can plan.
