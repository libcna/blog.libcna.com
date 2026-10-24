---
title: Collision Detection and Spatial Queries in CNA
date: 2028-06-22T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Use CNA bounding volumes, rays and frusta to build broad-phase collision, picking and reliable spatial queries without pretending they are a physics engine.
author: Robert Vokac
categories: [Development]
tags: [CNA, Collision Detection, Math, Picking, Spatial Queries]
draft: false
---

CNA provides the XNA-compatible mathematical building blocks needed by many collision systems: vectors, planes, rays, bounding boxes, bounding spheres and bounding frusta. These types answer geometric questions. They do not integrate velocity, resolve contacts or simulate rigid bodies. That distinction is the foundation of a useful design.

A game normally asks two separate questions:

1. Which pairs *might* touch?
2. For each candidate, what exactly happened and how should gameplay respond?

The first is the broad phase. It should be cheap and may return false positives. The second is the narrow phase. It can use a more accurate primitive, a triangle test or an external physics library. Keep both behind game-owned interfaces so changing the implementation does not leak into every entity.

## Start with explicit shapes

Choose the simplest volume that represents the gameplay promise. A sphere is cheap and rotation-independent. An axis-aligned `BoundingBox` is excellent for rooms, pickups and broad-phase proxies. A ray handles weapon traces, mouse picking and line-of-sight probes. A `BoundingFrustum` represents a camera volume, although visibility and physical collision should remain different policies.

```cpp
struct CollisionProxy {
    EntityId entity;
    BoundingBox worldBounds;
    CollisionLayer layer;
    CollisionMask collidesWith;
};

bool CanPair(const CollisionProxy& a, const CollisionProxy& b) {
    return (a.collidesWith & b.layer) != 0 &&
           (b.collidesWith & a.layer) != 0;
}
```

The layer filter belongs before geometry. A trigger does not need to test scenery it never observes; a projectile can ignore its owner; editor-only helpers should not enter gameplay queries. Keep trigger/query membership separate from response policy: two objects can overlap while intentionally producing no physical push.

## Transform local bounds correctly

Content commonly stores bounds in model-local space. At runtime, transform them into world space. For a box under arbitrary rotation, transforming only `Min` and `Max` is wrong. Transform all eight corners and build a new axis-aligned box, or maintain an oriented representation in the game layer and derive a conservative AABB for broad-phase use.

Non-uniform scale also matters. A sphere's radius must use a conservative scale if it remains a sphere. Negative scale and empty geometry deserve explicit tests. Cache world bounds with a transform revision rather than rebuilding every query, but invalidate the cache whenever position, orientation, scale or animation-dependent bounds change.

## Broad-phase structures

Testing every entity against every other entity grows quadratically. Small scenes may accept that, but a busy world needs a spatial index. Uniform grids work well when objects are similarly sized. Loose quadtrees or octrees suit bounded worlds. Sweep-and-prune suits axes with temporal coherence. A dynamic AABB tree handles mixed moving objects and general queries.

```cpp
class SpatialIndex {
public:
    ProxyHandle Insert(EntityId id, const BoundingBox& bounds, QueryBits bits);
    void Move(ProxyHandle handle, const BoundingBox& bounds);
    void Remove(ProxyHandle handle);
    void Query(const BoundingBox& area, QueryBits mask,
               const std::function<bool(EntityId)>& visitor) const;
};
```

Do not expose tree nodes to gameplay. Handles require generation counters so a stale handle cannot update a newly reused slot. Queue mutations if queries may run concurrently, then publish one coherent index snapshot at a defined simulation boundary.

## Ray picking from the camera

Mouse picking begins with a screen coordinate and the active viewport. Convert the near and far screen points through the inverse view-projection transform, then construct a ray from near toward far. The exact CNA viewport helpers available to a project may perform unprojection directly; the important contract is consistent viewport, projection convention and frame snapshot.

First intersect the ray with broad-phase bounds. Sort hits by non-negative distance, then perform a narrower test only where precision matters. Never choose the first container iteration result: iteration order is not a distance ordering. Decide whether the query may start inside an object and how it treats a ray parallel to a slab.

```cpp
std::optional<PickHit> Pick(const Ray& ray) {
    std::optional<PickHit> best;
    spatial.Query(ray, Pickable, [&](EntityId id, float distance) {
        if (distance < 0.0f || (best && distance >= best->distance)) return true;
        if (auto exact = NarrowPick(id, ray)) best = *exact;
        return true;
    });
    return best;
}
```

For skinned characters, a coarse animated capsule or per-bone hit volumes are often more stable than testing rendered triangles. Picking semantics should serve the product: an RTS unit wants a generous selectable footprint, while a mesh editor wants exact triangles and barycentric coordinates.

## Collision response is game policy

An intersection result alone does not say what to do. A collectible emits an event. A door blocks some actors but not others. A character controller projects motion along a surface. A physics engine may compute impulses. Return contact information in a game-owned structure and let the responsible system decide.

Avoid moving two objects apart in arbitrary pair iteration order. That causes jitter and nondeterminism. Establish ownership and ordering: static world versus movers, character controller sweeps, or an authoritative physics step. Use continuous sweeps for fast projectiles rather than hoping two discrete positions overlap.

## Numerical and behavioral tests

Test touching faces, corners and edges; an origin inside the volume; zero-length rays; parallel rays; very large coordinates; tiny objects; negative direction; non-normalized directions; and transforms with rotation and non-uniform scale. State whether touching counts as collision. Use tolerances for derived contact data, not an oversized epsilon that turns nearby objects into overlaps.

Add debug drawing for proxies, cells, rays, candidate pairs and final contacts. Color broad-phase candidates differently from narrow-phase hits and include entity IDs plus layer masks in the inspector. A collision system becomes maintainable when a developer can see *why* a pair was considered.

Qualification should combine unit tests for primitives, property tests for symmetry and containment, recorded gameplay scenarios and performance measurements with representative object distributions. CNA supplies dependable spatial vocabulary; the game supplies indexing, contact semantics and response.
