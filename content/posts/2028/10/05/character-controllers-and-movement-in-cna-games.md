---
title: Character Controllers and Movement in CNA Games
date: 2028-10-05T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build a deterministic kinematic character controller above CNA with input-relative motion, sweeps, slopes, steps, moving platforms and diagnostic tests.
author: Robert Vokac
categories: [Development]
tags: [CNA, Character Controller, Collision, Movement, Gameplay]
draft: false
---

CNA provides input, timing and math primitives, but a game decides how a character accelerates, climbs slopes, steps over curbs and reacts to moving platforms. That code is a character controller, not a feature to hide inside animation or a renderer.

This article describes a kinematic controller layered above CNA. It can use custom spatial queries or adapt to an external physics library. The controller owns intent and response; the query backend owns casts and contacts.

## Turn input into world-space intent

Read semantic actions once, then project movement relative to camera or character orientation. For a camera-relative controller, flatten camera forward/right onto the ground plane and handle the degenerate top-down case.

```cpp
Vector3 wish = cameraFlatForward * actions.move.y +
               cameraFlatRight * actions.move.x;
if (wish.LengthSquared() > 1.0f) wish.Normalize();
```

Input describes desired direction, not immediate displacement. Ground acceleration approaches a target speed; air control uses different limits. Apply dead zones before this layer. Keep facing policy separate: face movement, aim direction, locked target or vehicle orientation.

Use the fixed simulation step. Store velocity and grounded state in authoritative gameplay. Animation consumes speed/turn/ground events; it does not decide whether collision occurred.

## Choose a collision shape

A capsule is common because it slides over edges without catching square corners, but CNA's basic bounds are not a complete capsule-cast physics system. A simple project can approximate with sphere/box sweeps and ground rays; a demanding game should expose capsule sweep, overlap and contact data through its physics adapter.

```cpp
struct CharacterQueryWorld {
    virtual SweepHit SweepCapsule(const Capsule&, Vector3 delta,
                                  CollisionMask) const = 0;
    virtual std::vector<Contact> OverlapCapsule(const Capsule&,
                                                CollisionMask) const = 0;
};
```

Keep a skin width/contact offset. It prevents the shape from starting every frame exactly on a surface and fighting floating-point noise. Define whether triggers participate in blocking sweeps or are gathered separately.

## Sweep and slide

Never move directly to the desired end and only then push out; fast motion can tunnel through thin walls. Sweep along displacement, move to just before the contact, project remaining motion onto the contact plane and repeat a bounded number of times.

```cpp
for (int i = 0; i < maxSlides && remaining.LengthSquared() > epsilon; ++i) {
    SweepHit hit = world.SweepCapsule(shape.At(position), remaining, solidMask);
    if (!hit.hit) { position += remaining; break; }
    position += remaining * std::max(0.0f, hit.fraction - skinFraction);
    remaining = ProjectOnPlane(remaining * (1.0f - hit.fraction), hit.normal);
}
```

Sort/choose equal contacts deterministically and cap iterations. Corners may require projecting against two planes; blindly alternating can jitter. If initial overlap occurs after teleport or moving geometry, run a bounded depenetration with clear failure fallback.

## Grounding, slopes and gravity

Ground is not “any collision below.” Probe downward by a small snap distance, require a normal whose angle is within the maximum slope and verify the contact supports the character. Hysteresis prevents grounded state flickering on small gaps.

On walkable slopes, project desired velocity onto the ground plane while preserving intended horizontal speed according to the game's feel. On steep slopes, prevent uphill climbing and apply controlled downhill motion. Gravity accumulates while airborne; when grounded, a small downward bias can maintain contact without growing a huge negative velocity.

Jump consumes an edge command only when jump conditions permit. Coyote time and input buffering are explicit tick counters, making them testable. The jump impulse is gameplay state, not an animation notify.

## Steps and ledges

To climb a step, compare the blocked forward move with a three-part candidate: move up by at most step height, sweep forward, then sweep down to a walkable surface. Accept only if the final position is clear and gain is meaningful. This prevents stepping through low ceilings or onto steep ledges.

Ledge behavior is a design choice. Some games walk off immediately; others perform ground snapping; others prevent accidental falls. Apply snap only when descending, close enough and not jumping, otherwise it can pull a rising character back to the ground.

## Moving platforms

Track the supporting collider/entity and its transform revision. Before character motion, apply the platform's translational and rotational delta at the contact point, then resolve character intent. On jump, inherit a defined portion of platform velocity.

If the platform disappears, teleports or becomes invalid, clear support without retaining a stale pointer. Fast platforms still require sweeps so they cannot push the character through a wall. Decide whether platform motion or character motion has priority during crushing scenarios.

## Camera, animation and networking

The camera follows a presentation-smoothed character transform, while collision uses authoritative state. Animation parameters derive from local velocity, grounded state, slope and events. Root motion can provide desired displacement, but the controller still clips it against the world and reports actual displacement back to animation.

For networking, commands contain tick and semantic input. The server runs the same controller, while clients predict and reconcile using authoritative snapshots. Stable contact ordering and query data become part of the determinism boundary.

## Tests and debug views

Build a course with flat ground, seams, corners, ramps just below/above slope limit, steps just below/above height, low ceilings, moving/rotating platforms and thin walls at maximum speed. Run recorded commands at different render rates.

Draw capsule, sweep paths, hit normals, ground probe, support ID, iterations and requested versus actual displacement. Log state transitions such as Grounded→Airborne with reason. A good controller is not one that never encounters edge cases; it makes each movement decision visible and reproducible.
