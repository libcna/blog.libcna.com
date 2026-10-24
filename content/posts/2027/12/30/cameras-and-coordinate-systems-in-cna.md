---
title: Cameras and Coordinate Systems in CNA
date: 2027-12-30T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Make CNA 2D and 3D camera transforms, picking, projection and large-world coordinate conventions explicit and testable.
author: Robert Vokac
categories: [Development]
tags: [CNA, Camera, Coordinates, Matrix, Picking]
draft: false
---

Camera bugs usually come from mixing spaces: local, world, view, clip, normalized device, viewport, drawable and virtual UI. Name the space in variables and convert at explicit boundaries.

For 3D, store position, orientation and projection parameters, then derive matrices:

```cpp
view = Matrix::CreateLookAt(position, position + forward, up);
projection = Matrix::CreatePerspectiveFieldOfView(
    fieldOfViewRadians, viewportAspect, nearPlane, farPlane);
```

Document handedness, forward/up, radians versus degrees, matrix multiplication order and depth convention. Use an asymmetric axes model to test them.

## 2D camera

A 2D camera typically composes translation, rotation, zoom and viewport-center translation. Use its inverse for world-space pointer input. Keep UI in another pass so zoom does not change menus.

Pixel art needs final drawable-pixel alignment. Fractional zoom or camera translation can shimmer under point sampling. Decide whether to restrict zoom, snap transformed origins or accept smooth filtering.

## Picking a ray

Convert a pointer from logical/window coordinates through the active viewport into drawable pixels. Unproject one point at near depth and another at far depth using view/projection, then normalize their difference:

```cpp
Vector3 nearPoint = viewport.Unproject({x, y, 0.0f}, projection, view,
                                       Matrix::getIdentityProperty());
Vector3 farPoint = viewport.Unproject({x, y, 1.0f}, projection, view,
                                      Matrix::getIdentityProperty());
Ray ray(nearPoint, Vector3::Normalize(farPoint - nearPoint));
```

Use depth values required by CNA's contract. Intersect bounds broadly, then precise collision if needed. Test viewport corners and letterbox rejection.

## Stable motion and large worlds

Follow cameras need damping based on elapsed time, not a fixed per-frame fraction. Define teleports that reset smoothing and temporal rendering history. Apply camera shake as a presentation offset rather than mutating authoritative player/world state.

Large coordinates lose float precision. Partition worlds into regions/cells with local coordinates or periodically rebase presentation while keeping stable logical identity. Physics, networking, audio and rendering must agree on the conversion.

Test near/far clipping, window resize, FOV extremes, mirrored views, camera cuts, picking known objects and deterministic paths. Draw camera axes, frustum and rays in a debug overlay. A camera system is reliable when every conversion can be named and inverted—not merely when the default view looks plausible.

## Camera controllers versus camera state

Keep orbit, follow, first-person and cinematic controllers separate from the camera's final state. A controller consumes actions/targets and proposes pose; constraints resolve collision and bounds; presentation adds shake; camera builds matrices. Switching controllers then preserves projection and does not copy unrelated input logic.

An orbit camera uses target, distance, yaw/pitch with pitch/distance clamps. A follow camera uses a target offset and time-based critically damped or exponential smoothing. A cinematic path needs explicit timestamps and interpolation, plus a cut flag that resets smoothing, motion vectors and temporal history.

Camera collision should shorten desired distance using world queries and recover smoothly when obstruction clears. Never move the authoritative player to repair the view. Test thin walls, starting inside geometry and teleport.

## Numeric and viewport diagnostics

Log pose, near/far, FOV/aspect, viewport and determinant/finite status. Assert matrices contain finite values and near is positive/below far. Draw the frustum from another debug camera and project labeled points whose expected screen positions are known.

For split-screen, each camera owns a viewport and input conversion. For render-to-texture cameras, aspect comes from target, not window. Reflection cameras deliberately mirror pose and may require culling correction. These variants should reuse the same named-space conversion utilities so a fix applies everywhere.

## Screen/world conversion utilities

Centralize `WorldToScreen`, `ScreenToRay`, `VirtualToDrawable` and inverse functions with viewport parameter. Return optional/failure when point lies behind camera, outside bars or matrix non-invertible. UI hit tests should never duplicate projection math.

```cpp
std::optional<Vector2> WorldToScreen(Vector3 world,
                                     const Camera& camera,
                                     const Viewport& viewport);
```

Tests round-trip known points within tolerance and cover corners/near/far. Label variables `worldPosition`, `drawablePoint`, `virtualPoint` rather than generic `pos` at boundaries.

## Jitter and temporal rendering

Temporal antialiasing may add subpixel projection jitter. Culling/picking/UI usually use unjittered matrices, while render uses jittered projection and retains previous view-projection. Camera cuts/teleports/resizes invalidate history. Keep both matrices explicit to prevent picking wobble.

## Release checklist

Run every controller at different frame rates, input devices and aspect ratios. Test smoothing under pause/resume, collision, teleports, FOV zoom and large-world rebasing. Capture axes/frustum/picking and world-to-screen UI markers. A camera bug report includes pose/matrices/viewport/coordinate space, enabling deterministic reproduction instead of “camera feels wrong.”
