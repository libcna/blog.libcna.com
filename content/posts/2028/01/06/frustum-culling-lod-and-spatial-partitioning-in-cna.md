---
title: Frustum Culling, LOD and Spatial Partitioning in CNA
date: 2028-01-06T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Reduce CNA scene work with conservative bounds, spatial structures and stable LOD decisions backed by diagnostics.
author: Robert Vokac
categories: [Development]
tags: [CNA, Frustum Culling, LOD, Spatial Partitioning, Performance]
draft: false
---

Culling saves work only when it rejects objects more cheaply than drawing them. Begin with conservative world bounds and the camera `BoundingFrustum` before introducing a tree.

```cpp
visible.clear();
for (const RenderObject& object : objects)
    if (frustum.Contains(object.worldBounds) != ContainmentType::Disjoint)
        visible.push_back(&object);
```

Transform bounds correctly. A sphere radius scales by the largest absolute axis; an AABB can be rebuilt from transformed corners or a tighter method. Animated meshes require bounds covering the active pose. A false rejection is missing geometry, so conservative correctness wins over tightness.

## Spatial structures

Use a grid for uniformly distributed worlds, quadtree for mostly planar scenes, octree/BVH for 3D, or scene-specific sectors/portals. Separate static from frequently moving objects so updates do not rebuild the whole structure. Set maximum depth and objects per node to prevent pathological subdivision.

Query structure with the frustum, then produce a flat render list. Do not draw while traversing; sorting/material batching still belongs after visibility.

## Stable LOD

Choose LOD from projected size or distance adjusted for object scale and camera FOV. Add hysteresis so an object near a threshold does not alternate every frame:

```cpp
if (lod == 0 && distance > leaveHigh) lod = 1;
else if (lod == 1 && distance < enterHigh) lod = 0;
```

Transitions can cross-fade/dither only where supported; otherwise design meshes so a switch is unobtrusive. Collision and gameplay LOD are separate from rendering LOD.

## Measure and test

Expose total, structure-tested, frustum-rejected, visible and per-LOD counts plus traversal time. Draw bounds/nodes and freeze the camera. Test objects crossing every plane, huge bounds, camera teleport, moving objects and worst-case all-visible scenes.

Compare simple linear culling with the spatial structure. If traversal/update costs more at real scene density, keep the simple path. Optimization succeeds when total frame work improves without popping or missing objects—not when the tree diagram looks sophisticated.

## Building world bounds correctly

Keep local bounds beside immutable mesh data and calculate world bounds when the transform changes. For an AABB, transform its eight corners and recompute minimum/maximum; do not transform only the two extrema when rotation is possible. For a sphere, transform its center and multiply radius by the largest absolute scale component.

```cpp
BoundingBox TransformBox(const BoundingBox& local, const Matrix& world)
{
    std::array<Vector3, 8> corners;
    local.GetCorners(corners);
    Vector3 minimum = Vector3::Transform(corners[0], world);
    Vector3 maximum = minimum;
    for (std::size_t i = 1; i < corners.size(); ++i) {
        Vector3 p = Vector3::Transform(corners[i], world);
        minimum = Vector3::Min(minimum, p);
        maximum = Vector3::Max(maximum, p);
    }
    return BoundingBox(minimum, maximum);
}
```

Use the current CNA `GetCorners`/`Transform` signatures, but preserve the algorithm. Reject non-finite transforms before they enter the spatial index.

## A loose quadtree example

For a mostly planar world, each node owns a square plus a larger loose square. An object remains in the deepest node whose loose bounds fully contain it. The looseness prevents small movements from causing constant remove/reinsert operations.

```cpp
void Quadtree::Update(ObjectId id, const BoundingBox& bounds)
{
    Node* current = locations_.at(id);
    if (current->looseBounds.Contains(bounds) == ContainmentType::Contains)
        return;
    current->Remove(id);
    Node* next = root_.FindDeepestContaining(bounds);
    next->Insert(id);
    locations_[id] = next;
}
```

Objects crossing many cells, very large objects and rapidly moving objects can remain in a separate dynamic list. A spatial structure should never duplicate an object into the render list without deduplication.

## LOD content and transition policy

Each LOD must preserve material slots, bounding behavior and a stable pivot. Store threshold plus hysteresis rather than hard-code distances in draw code. Projected height is often better than raw distance:

```text
projectedPixels ≈ objectWorldHeight * viewportHeight /
                  (2 * distance * tan(verticalFov / 2))
```

Select high detail above one threshold and leave it below a lower threshold. Preload the next LOD before switching; if unavailable, retain the current valid mesh rather than flashing empty geometry.

## Verification scene

Create objects touching each frustum plane, one enclosing the camera, one behind it and moving objects crossing tree nodes. Fly a recorded camera path and compare visible ID sets against a slow brute-force reference. Any object present in the reference but missing from the optimized set is a correctness failure.

Then measure visits, tested bounds, visible items, index updates, LOD distribution and render work. Repeat with all objects visible, since spatial structures have overhead in their worst case. Store screenshots at LOD thresholds and assert repeated camera motion does not oscillate selections.
