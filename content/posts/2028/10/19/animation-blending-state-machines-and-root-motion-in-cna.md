---
title: Animation Blending, State Machines and Root Motion in CNA
date: 2028-10-19T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Extend CNA model skinning with game-owned animation sampling, blend trees, state machines, events, root motion and deterministic tests.
author: Robert Vokac
categories: [Development]
tags: [CNA, Animation, Skinning, State Machines, Root Motion]
draft: false
---

The existing *Models, Animation and Skinning in CNA* article covers loading, skeletons and skin matrices. Real characters need another layer: sampling multiple clips, blending poses, choosing states, extracting root motion and sending final bone transforms to the CNA rendering path.

CNA does not need to dictate one animation graph. The game owns animation policy and data structures; the renderer consumes a palette. Keep simulation state, animation state and final presentation pose distinct.

## Sample clips into local poses

A skeleton defines parent indices and bind pose. A clip stores keyed local transforms per bone. At time `t`, find surrounding keys, interpolate translation/scale linearly and rotation with normalized shortest-path quaternion interpolation.

```cpp
struct LocalTransform { Vector3 translation; Quaternion rotation; Vector3 scale; };
using LocalPose = std::span<LocalTransform>;

void SampleClip(const AnimationClip& clip, double time,
                PlaybackMode mode, LocalPose output);
```

Missing tracks fall back to bind pose or a documented reference pose. Validate key order, finite values, bone indices and clip duration during content build. Sampling output comes from a frame/skeleton-sized scratch arena rather than allocating one object per bone every frame.

Convert local pose to model-space transforms in parent-before-child order, then multiply by inverse bind matrices to produce skinning matrices in the convention expected by the effect. A one-bone and two-bone fixture catches multiplication-order differences across tools.

## Blend poses correctly

Cross-fade two local poses using a transition weight. Blend local transforms before rebuilding hierarchy; blending final matrices introduces shear and poor rotation. Normalize quaternion results and choose shortest arc.

A locomotion blend tree maps speed and direction to idle/walk/run/strafe samples. Normalize weights and define behavior outside the authored range. Phase synchronization keeps left/right foot cycles aligned when blending walk and run. Without it, feet slide or pop even when weights are mathematically correct.

Additive animation stores a delta from a reference pose. Apply it after the base pose for recoil, breathing or aim offsets. State clearly which bones and coordinate convention the additive clip uses. A mask can restrict an upper-body action while legs continue locomotion; soften mask boundaries across spine bones to avoid a visible hinge.

## State machines are gameplay-facing policy

States such as Locomotion, Jump, Fall, Land and Attack contain an animation graph plus transition rules. Feed them stable parameters—grounded, speed, vertical velocity, action events—not raw keyboard buttons or renderer time.

```cpp
struct AnimationInputs {
    float planarSpeed;
    float turnRate;
    bool grounded;
    bool jumpStarted;
    std::optional<ActionId> action;
};
```

Evaluate transitions in deterministic priority order. Define whether a new transition can interrupt the current one and from which source pose it blends. Capture the current blended pose for smooth interruption if memory permits. Protect against endless immediate transition loops with a bounded evaluation count.

Keep visual state separate from authoritative gameplay. Animation may publish named events, but a sword hit should normally be validated by gameplay timing and collision rather than trusting that a render frame crossed a marker.

## Events and skipped time

Footsteps, particles and audio often follow clip markers. Event evaluation must handle looping, reverse or scaled playback and a time step crossing several events. Do not compare only exact timestamps. Give events stable IDs and distinguish presentation-only events from gameplay requests.

During catch-up or a long pause, cap cosmetic event bursts. A footstep that happened ten frames ago may be dropped, while an animation-complete state transition must still occur. Define seek behavior for replay/photo/editor tools: fire none, fire crossed, or rebuild state.

## Root motion

Root-motion clips encode displacement and rotation. Extract the delta between previous and current sample, including loop wrap, and send desired motion to the character controller. The controller resolves collisions and returns actual movement. Animation then compensates visual root as required so the mesh does not move twice.

```cpp
RootDelta desired = animation.ExtractRootDelta(previousTime, currentTime);
MoveResult actual = controller.Move(desired.translation, desired.rotation);
animation.ApplyRootCorrection(desired, actual);
```

Decide who owns facing, vertical movement and warps. Attacks may use horizontal root motion but leave gravity authoritative. A motion-warping layer can align an authored action to a target, but must be bounded and collision-aware.

For networking, either simulate root motion deterministically from shared clip/state data or convert it into authoritative movement commands/snapshots. Clip/content identity becomes protocol-relevant.

## Palette limits and performance

Renderers have limits on shader constants, uniform buffers or texture-backed palettes. Query capabilities and choose a supported skinning path, split meshes or CPU-skin selected content where necessary. Do not branch on backend names.

Update only characters needing a pose. Distance-based animation LOD can reduce sampling rate while interpolating presentation, simplify graphs or freeze distant crowds. Bounds must remain conservative when pose updates are reduced.

Profile sampling, graph evaluation, hierarchy build, palette upload and draw separately. Batch compatible skinned materials where ordering permits, but each character normally needs unique palette data.

## Validation and tools

An animation inspector shows state/transition, normalized clip times, blend weights, masks, root delta, events and bone hierarchy. Draw skeleton axes and compare bind/model/skinning transforms. A scrubber with fixed input makes content defects reproducible.

Tests cover loop boundaries, zero/one-key tracks, shortest quaternion path, missing tracks, interrupted transitions, several events in one step, root-motion wrap and controller rejection. Golden poses at named times plus recorded state-machine scenarios protect the entire path from content to CNA skinning.
