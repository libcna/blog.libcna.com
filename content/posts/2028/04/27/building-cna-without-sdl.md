---
title: Building CNA Without SDL
date: 2028-04-27T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Assemble an SDL-free CNA configuration from explicit platform, renderer, audio and service backends and verify no hidden SDL dependency remains.
author: Robert Vokac
categories: [Development]
tags: [CNA, SDL, Platform, Build, Dependencies]
draft: false
---

CNA separates platform, graphics and audio so SDL is a default implementation rather than framework identity. An SDL-free build must choose replacements for every service it actually needs.

Inventory window/events/input/clipboard/dialogs, renderer presentation, audio playback/capture and optional devices. Headless server may select no window, headless renderer and Null audio. Native Linux desktop may combine X11/Wayland platform, a compatible renderer and ALSA.

```bash
cmake -S . -B build \
  -DCNA_PLATFORM=HEADLESS \
  -DCNA_RENDERER=HEADLESS \
  -DCNA_AUDIO_PLATFORM=NULL
cmake --build build --parallel 8
```

Use option names documented by current CNA. Inspect configure summary and final dynamic dependencies; a nominal option is not proof that a transitive library stopped linking SDL.

Unsupported services remain unavailable through capability reporting. Do not add dummy clipboard/camera success. Game code uses service interfaces and degrades deliberately.

Test clean configure/build/install/consumer use, event/lifecycle if interactive, audio selection, renderer presentation and shutdown. Run dependency inspection on the packaged executable and start it on a machine without SDL. An SDL-free target is complete when architecture, runtime behavior and distribution all confirm the boundary.

## Audit the dependency boundary

Search application/framework hot paths for direct SDL headers, types and calls. Platform services should enter through `IPlatform`; graphics through renderer contracts; audio through its backend. Conditional compilation outside those ownership points is a warning that the abstraction leaks.

Create a capability table for the chosen configuration: window, input, text/IME, clipboard, dialogs, controller, graphics, playback, capture and devices. Mark implemented, unsupported or separately supplied. Then run a conformance program that queries the same values and exercises every true entry.

Installed CMake/package metadata must not require SDL when the configuration does not. Build a standalone consumer against the installed SDK in a clean tree, inspect link lines and dynamic libraries, and run it without SDL present.

Compare behavior with the default SDL build using shared lifecycle/input/render fixtures where capabilities overlap. Differences should belong to documented host limitations, not game conditionals. Maintain the SDL-free configuration in CI so architectural independence cannot silently rot.

## Choose a coherent stack

An interactive build needs a platform backend capable of creating/exposing a surface compatible with selected renderer. Audio can be independent. Write the combination in a build preset and document dependencies:

```json
{
  "name": "linux-native",
  "cacheVariables": {
    "CNA_PLATFORM": "X11",
    "CNA_RENDERER": "EASYGL",
    "CNA_AUDIO_PLATFORM": "ALSA"
  }
}
```

Use actual option identities from current CNA. Configure should reject incompatible pairs early rather than link a program that fails at first window.

## Common hidden dependencies

Watch example/tools/tests that include SDL directly, image/audio helpers fetched only through SDL configuration, CMake imported targets propagated publicly, and runtime selection defaults expecting SDL backend registration. Dependency inspection includes static archives/link maps where dynamic `ldd` alone cannot reveal code.

Platform input semantics may be less complete. Capability false is acceptable; fabricated held keys, clipboard or dialogs are not. Write application fallbacks through platform API, not `#ifdef CNA_NO_SDL` across gameplay.

## Test tiers

1. configure/build all SDL-free presets;
2. link installed external consumer;
3. runtime smoke for lifecycle, window/input/presentation/audio;
4. shared conformance fixtures against SDL reference where scopes overlap;
5. package/dependency audit on clean host.

Headless/Null is the simplest architectural canary. Native interactive stacks prove platform-renderer boundary. Web/mobile/console may be separately SDL-free with host-owned lifecycle.

Track binary size/dependencies and startup diagnostics. An SDL-free build should log canonical platform/renderer/audio identities and capabilities so support knows which stack ran. Keep preset in release/CI matrices; otherwise refactoring will reintroduce SDL coupling unnoticed.

## Application and transitive audit

Game code must not include SDL/call it for paths, dialogs, clipboard, controllers or timing. Use CNA APIs/capabilities; enforce include/symbol lint. Third-party middleware may independently link SDL, so define whether promise covers CNA or final executable and audit static link maps/licenses too.

Typical boundary clues: window works but renderer surface fails means platform-renderer handle contract; keys but no text means missing IME path; ALSA selected but silent means negotiation/device/mixer; headless opening display means an unexpected interactive service.

Keep triage guide and conformance executable. Release proof includes preset, configure summary, dependency manifest, capabilities and test hosts—not only a screenshot.
