---
title: Custom Vertex Formats and Procedural Geometry in CNA
date: 2027-11-25T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Define vertex declarations, generate indexed CNA geometry safely and validate stride, semantics, winding and dynamic updates across renderers.
author: Robert Vokac
categories: [Graphics]
tags: [CNA, Vertex Buffers, Procedural Geometry, Graphics, Meshes]
draft: false
---

Stock vertex types cover common cases, but terrain, particles, debugging geometry and specialized shaders often need a custom layout. The C++ struct, `VertexDeclaration`, shader inputs and renderer must agree exactly about offsets, formats and stride.

```cpp
struct TerrainVertex
{
    Vector3 position;
    Vector3 normal;
    Vector2 texCoord;
    Color color;

    static const VertexDeclaration& Declaration();
};
```

Define declaration elements using `offsetof`, not a hand-maintained guess, and assert layout assumptions:

```cpp
static_assert(std::is_standard_layout_v<TerrainVertex>);
static_assert(offsetof(TerrainVertex, position) == 0);

const VertexDeclaration& TerrainVertex::Declaration()
{
    static const VertexDeclaration declaration(
        sizeof(TerrainVertex), {
            {offsetof(TerrainVertex, position), VertexElementFormat::Vector3,
             VertexElementUsage::Position, 0},
            {offsetof(TerrainVertex, normal), VertexElementFormat::Vector3,
             VertexElementUsage::Normal, 0},
            {offsetof(TerrainVertex, texCoord), VertexElementFormat::Vector2,
             VertexElementUsage::TextureCoordinate, 0},
            {offsetof(TerrainVertex, color), VertexElementFormat::Color,
             VertexElementUsage::Color, 0}
        });
    return declaration;
}
```

Match constructor spelling to current CNA. Do not assume `Vector3` or `Color` packing without the project's verified layout. The declaration stride must be `sizeof(TerrainVertex)` when uploading an array of that struct.

## Generate an indexed grid

For a grid of `columns × rows`, create one vertex per grid point and two triangles per cell. Choose winding consistently:

```cpp
for (int y = 0; y < rows - 1; ++y) {
    for (int x = 0; x < columns - 1; ++x) {
        const std::uint32_t a = y * columns + x;
        const std::uint32_t b = a + 1;
        const std::uint32_t c = a + columns;
        const std::uint32_t d = c + 1;
        indices.insert(indices.end(), {a, c, b, b, c, d});
    }
}
```

Confirm winding with the selected rasterizer/culling convention. Validate every index is below vertex count and that counts fit the selected 16- or 32-bit element size. An empty mesh should not issue a draw with underflowed primitive count.

Compute normals from height gradients or accumulate triangle normals, then normalize. Define behavior at borders. If the material uses tangent-space normal mapping, generate tangents from positions and UVs and handle degenerate UV triangles explicitly.

## Static versus dynamic buffers

Generate immutable/static geometry once during loading. For terrain that changes, decide whether to update a region, rebuild a chunk or stream a dynamic buffer. Recreating a whole GPU buffer every frame is rarely the right default.

Bound uploads per frame and retain staging data until the renderer consumes it. If using a ring, do not overwrite a segment referenced by in-flight work. Separate topology changes from position changes; stable indices can remain resident.

Procedural meshes need deterministic inputs. Store generator version and parameters if they must be recreated from saves or network state. Do not serialize raw runtime buffer handles.

## Shader agreement

Create a diagnostic shader that outputs each attribute: position transformed normally, normal mapped to RGB, UV as red/green, and vertex color directly. This finds swapped offsets faster than debugging final lighting.

Run an asymmetric vertex fixture through every renderer. Include packed color, multiple usage indices and a stride containing padding. A renderer that only works when attributes happen to be tightly packed has not implemented the declaration contract.

## Bounds, collision and lifetime

Calculate bounding boxes/spheres from generated positions for culling. Collision may use the same generator inputs but should not read back GPU geometry. Chunk large worlds so culling and updates remain bounded.

The mesh owner holds vertex/index buffers and releases them before the device. CPU source arrays can be dropped after upload when reconstruction or collision does not need them, reducing memory. If device recreation requires CPU copies, make that policy explicit and include it in the budget.

Test minimum grids, odd dimensions, maximum supported index, degenerate triangles, NaN input, non-uniform transforms and repeated create/destroy. Record vertices, indices, bytes, uploads and draws. Procedural geometry is dependable when layout, topology, ownership and reconstruction are all contracts—not when one GPU happens to display the first generated plane.

## Chunking and seams

Terrain/voxel surfaces divide into chunks for culling/update. Neighboring chunks must agree on shared edge positions/normals and LOD seam policy. Duplicate edge vertices may be necessary for different material/normal/UV, but geometry cracks are not. Add a wireframe/seam fixture with mismatched heights deliberately caught by validation.

When regenerating one chunk, build CPU candidate off-thread, validate, upload at device boundary and atomically replace. Old buffers retire after in-flight work. Include generator parameters/version in cache/save; deterministic regeneration should produce identical topology/data within promise.

## Precision and packing

Packed normals/colors reduce bandwidth but need encode/decode tests at extrema and acceptable error. Do not label integer data normalized incorrectly. Attribute formats must match shader input types on every backend. A declaration capability/refusal is better than reinterpretation.

Compute expected buffer bytes with overflow-safe multiplication. Bound resolution before allocating. Generator errors include parameter values and stage, not only GPU failure.

Qualification draws attributes directly, then final material, across all renderer families and CPU reference if available. Readback selected vertices/indices where API supports. Compare culling bounds/collision against generated positions. Performance captures generation CPU, upload bytes/time, memory and draw cost for realistic chunk churn—not static first frame only.
