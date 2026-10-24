---
title: "Cameras for Real Games: Follow, Orbit, Shake and Split-screen"
date: 2028-10-12T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Turn CNA camera math into production camera rigs with follow damping, orbit input, collision, shake, transitions and per-viewport policy.
author: Robert Vokac
categories: [Development]
tags: [CNA, Camera, Split-screen, Input, 3D]
draft: false
---

The earlier *Cameras and Coordinate Systems in CNA* article establishes view/projection math, unprojection and precision. A shipped game needs a second layer: a camera rig that follows targets, responds to actions, avoids walls, blends between modes and remains presentation-only.

The rig produces a `CameraPose` from an immutable simulation snapshot. Gameplay should not read the smoothed camera position as authority. Aiming can use a deliberate ray derived from the active pose, but movement and collision remain in simulation coordinates.

```cpp
struct CameraPose {
    Vector3 position;
    Quaternion orientation;
    float verticalFov;
    float nearPlane;
    float farPlane;
};
```

## Follow cameras and damping

A third-person follow camera starts from a target anchor—often head/shoulder or vehicle pivot—and a desired offset in target or world space. Instant snapping exposes animation noise. Frame-rate-independent exponential damping approaches the desired pose smoothly:

```text
weight = 1 - exp(-response * deltaSeconds)
smoothed = lerp(current, desired, weight)
```

Apply position and rotation damping with appropriate vector/quaternion operations. Do not use a fixed `0.1` lerp per rendered frame; it changes behavior with FPS. Teleports and scene loads reset/snap the history. Large discontinuities may use a threshold or explicit event.

Separate horizontal target motion, vertical terrain motion and rotation responses when the design needs different feel. A platformer may look ahead in movement direction; a racing camera may lag acceleration and roll cosmetically.

## Orbit input

Convert mouse delta or right-stick action into yaw/pitch rates. Mouse commonly represents direct angular delta; stick represents angular velocity multiplied by time. Apply sensitivity, inversion and acceleration settings before the rig.

Clamp pitch away from singular/undesired angles and wrap yaw safely. Construct orientation from a stable world-up convention or local vehicle frame. When target heading assistance recenters the camera, use a delay and bounded angular response; player input cancels assistance immediately.

Shoulder switching changes lateral offset through collision-aware transition. Aim modes can reduce FOV and offset, but they need defined crosshair/ray alignment. FOV transitions use presentation time and respect reduced-motion/accessibility options.

## Camera collision

Walls between target and desired camera should bring the camera forward rather than hiding the character. Sweep a sphere from anchor to desired position, place the camera before the hit and use hysteresis: contract quickly to avoid clipping, expand more slowly to reduce popping.

A ray can slip through thin gaps that the camera near plane cannot. A sphere or near-plane-aware volume gives better results. Ignore the followed character and non-blocking foliage through collision layers. Starting inside geometry requires a recovery rule.

Camera collision is not character collision. It may use smoothed presentation transforms and should never push physical objects. Draw the anchor, desired position, sweep volume and final hit in debug mode.

## Camera shake

Shake is a layered offset applied after the base rig and collision, before matrices are built. Define events with amplitude, frequency, duration, falloff, spatial attenuation and seed. Combine bounded contributions, then apply user intensity and accessibility reduction.

Use coherent noise or authored curves rather than a new independent random jump every frame. Rotational shake generally communicates impact with less positional clipping. Critical aim and UI remain stable unless the game deliberately models weapon sway separately.

Because shake is presentation-only, replay files can record semantic shake events rather than every camera sample. A fixed seed and event time reproduce captures.

## Transitions and camera stack

Gameplay, cutscene, spectator, death and photo cameras can be rigs selected by a camera director. A transition blends poses, FOV and selected post-process values. Blending orientations uses shortest-path quaternion interpolation; near/far planes may switch or blend under validation.

Input ownership changes at a defined point. During a cutscene blend, gameplay might remain active, freeze or continue AI while ignoring player movement. The camera director requests policy; it does not directly pause the world.

Keep a stack for temporary overrides such as conversation or scope view. Each entry has owner generation. If its owner disappears, the director returns to the previous valid rig rather than retaining callbacks into a destroyed scene.

## Split-screen and multiple views

Each local view owns independent rig state and uses its viewport aspect ratio. Shared simulation snapshots feed all rigs. Never reuse the full-window projection for quarter-screen. Per-player shake, settings and collision queries stay isolated.

A shared-camera cooperative mode computes group bounds, desired center and distance/FOV while enforcing world constraints. Split/merge decisions need hysteresis and a transition that preserves player identity. These policies belong above basic camera math.

## Tests and diagnostics

Run rigs with recorded target paths at 30, 60, 144 and irregular render rates; equivalent elapsed time should yield equivalent damping within tolerance. Test teleport, target destruction, zero delta, pause, resize, wall corners, low ceilings and rapid shoulder switching.

Diagnostics show active rig/stack, target ID, desired/base/final pose, damping constants, collision hit and shake layers. Golden captures use fixed time/seed and representative viewport sizes. A production camera feels subjective, but its timing, ownership and collision decisions should be completely inspectable.
