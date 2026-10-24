---
title: Building a Split-screen Racing Game with CNA
date: 2029-01-25T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build a CNA racing vertical slice with vehicle dynamics, checkpoints, chase cameras, split-screen rendering, controller ownership and performance gates.
author: Robert Vokac
categories: [Development]
tags: [CNA, Racing Game, Split-screen, Vehicles, Tutorial]
draft: false
---

A racing game combines several CNA systems under pressure: continuous input, fixed-step vehicle simulation, 3D rendering, audio, effects, checkpoints, chase cameras and multiple viewports. The CNA Racing Game sample demonstrates the end result; this article focuses on the architecture of a small two-player vertical slice.

![A racing car accelerating along the tropical track in the CNA Racing Game](/media/2027/91-xna-samples-ported-to-cpp-with-cna/racing-game.png)

The milestone is one track, two local players, three laps, countdown, checkpoints, finish order and restart. Advanced tire physics, networking and a full garage can wait.

## Separate vehicle state from presentation

Authoritative vehicle state contains pose, linear/angular velocity, steering, drivetrain state and checkpoint progress. Mesh wheel rotation, suspension visuals, particles, camera lag and audio parameters derive from it.

```cpp
struct VehicleCommand { float throttle, brake, steer; bool handbrake; };
struct VehicleState {
    Vector3 position;
    Quaternion orientation;
    Vector3 linearVelocity;
    Vector3 angularVelocity;
    std::array<WheelState, 4> wheels;
};
```

Run simulation at fixed ticks. Map each assigned gamepad to semantic commands with dead zones and response curves. Keyboard may control one player under an explicit policy. Clear commands on disconnect and pause or neutralize that vehicle according to the match rules.

## A manageable vehicle model

For an arcade slice, query ground at each wheel or use a simplified chassis contact model. Suspension force depends on compression and damper velocity; tire forces depend on local longitudinal/lateral velocity, steering angle and grip limits. Apply engine/brake forces and aerodynamic drag, then integrate.

Keep units coherent: meters-like world scale, seconds, mass, force. Clamp pathological inputs and cap substeps if high-speed collision requires them. A simpler stable model is better than many coefficients with no diagnostics.

The collision backend may be custom or external. It must expose sweeps/contacts without placing CNA rendering resources in simulation. Track collision meshes use lower-complexity content than visible scenery. Reset a stuck vehicle to the most recent valid checkpoint transform after a hold action, checking clearance.

Draw wheel contacts, normals, suspension length, tire force vectors, center of mass and local velocity in a debug view. A handling problem should not require guessing from the car body alone.

## Track and race rules

Represent checkpoints as ordered trigger volumes with stable IDs. A lap counts only when the car crosses the next expected checkpoint, preventing finish-line shortcuts. Detect crossing direction if the game rejects reverse traversal.

```cpp
struct RaceProgress {
    int lap;
    CheckpointId next;
    Tick lastCrossing;
    double raceTime;
};
```

Start grid, countdown and race state advance on the authoritative tick. Input may rev during countdown while drive torque is gated. Finish order uses crossing tick plus an interpolation fraction if closer ordering is required. Results are not based on which render viewport was drawn first.

Store track centerline/checkpoint progress data for ranking unfinished racers and camera recovery. Off-track penalties and reset rules are explicit and deterministic.

## Split-screen rendering

Update the world once, create one immutable render snapshot, then draw it from two cameras. Choose horizontal/vertical split from aspect ratio or a setting. Each `PlayerView` owns viewport, scissor, camera and HUD layout.

Clear depth for each viewport and use its aspect ratio when building projection. Shared shadow/reflection work can be reused if visually acceptable; visibility and main scene draw remain per view. Restore complete render state between views.

Quarter/half-screen pixels make expensive post-processing particularly costly. Define split-screen quality: target resolution scale, shadow distance, particles and mirrors. Select capability/budget paths, not renderer-name branches. Profile one and two players separately.

## Chase camera and feedback

The camera follows a target anchor behind the car, using speed-dependent distance/FOV, damped orientation and collision sweep. Acceleration lag, banking and impact shake are presentation-only. Reset camera history with vehicle reset/teleport.

Engine audio blends RPM/load layers or changes pitch/volume from a stable vehicle parameter. Tire slip drives skid audio and particles with hysteresis. Collision events carry impulse so tiny contacts do not spam effects. Route haptics per local player and stop them on disconnect/pause.

HUD is viewport-local: lap, position, time, speed and wrong-way indicator. Countdown/results are shared overlays. Text remains readable at half screen, and color-only red/green signals gain icons/text alternatives.

## Content and performance

The track asset separates visible meshes, collision, checkpoint volumes, start grid and optional AI line. Validate checkpoint connectivity and bounds during content build. Use spatial culling/LOD for scenery and pool transient skid/particle data.

Multiple views multiply GPU scene work, not simulation. Record culling/submission/GPU time per view, total visible items, render-target bytes and audio voices. A two-player race at target display resolution is the real budget.

## Test the race, not only the renderer

Replay command traces for countdown, a valid lap, missed checkpoint, reverse finish crossing, reset, simultaneous finish and controller disconnect. Assert identical results under different render frame rates. Run cameras at several viewport ratios and capture both split layouts across CNA renderers.

The slice is finished when two devices can join, drive the same authoritative race, see correct independent views, finish in deterministic order and restart without leaked resources. Additional cars and visual quality then extend a proven loop instead of hiding structural bugs.
