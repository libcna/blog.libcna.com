---
title: Terrain Rendering in CNA
date: 2028-08-03T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build a scalable terrain layer above CNA with height data, chunk meshes, normals, LOD, materials, streaming, collision and cross-renderer tests.
author: Robert Vokac
categories: [Development]
tags: [CNA, Terrain, 3D Rendering, LOD, Heightmap]
draft: false
---

Terrain is a useful CNA case study because it connects content, procedural geometry, spatial queries, streaming, materials and performance. CNA provides buffers, textures, effects, render states and math. The game defines the height field, chunk format, level-of-detail policy and physical meaning of the ground.

Begin with a coordinate contract. Decide which axes are horizontal and vertical, how many world units one height sample represents, where the height origin lies and whether chunk boundaries share their last row/column. Write those choices into the asset metadata; guessing them from dimensions creates seams and scale bugs later.

## From height samples to a mesh

For a regular grid, vertex position comes from integer sample coordinate and decoded height. Texture coordinates can be world-scaled rather than stretched once across the entire map. Central differences estimate interior normals; borders need neighboring samples so two chunks calculate the same result.

```cpp
Vector3 Position(int x, int z, const TerrainMeta& m, const HeightField& h) {
    return {x * m.cellSize,
            m.baseHeight + h.At(x, z) * m.heightScale,
            z * m.cellSize};
}

Vector3 Normal(int x, int z, const TerrainMeta& m, const HeightField& h) {
    float dx = h.SampleClamped(x + 1, z) - h.SampleClamped(x - 1, z);
    float dz = h.SampleClamped(x, z + 1) - h.SampleClamped(x, z - 1);
    return Vector3::Normalize({-dx * m.heightScale, 2.0f * m.cellSize,
                               -dz * m.heightScale});
}
```

The exact CNA vector construction and property spellings depend on the checked-out API; the algorithm is game-owned. Generate indices once for a given chunk resolution and reuse them where buffer ownership permits. Verify winding and cull mode on every renderer rather than fixing an inverted surface by globally disabling culling.

Keep CPU height samples even after uploading the mesh if gameplay performs height queries, edits or collision. GPU vertices are not a convenient authoritative database.

## Chunk ownership and bounds

Partition large terrain into chunks small enough to cull and stream but large enough to avoid excessive draw calls. A 33×33 vertex grid represents 32×32 cells and can share boundary heights with its neighbor. Give each chunk an integer coordinate, content revision, local bounding box and state.

Compute vertical bounds from actual height ranges, not the entire possible format range. Conservative bounds prevent missing geometry; tighter bounds improve frustum and occlusion decisions. Store world position as integer chunk plus local coordinates when very large worlds would lose floating-point precision.

Workers may decode height data, calculate vertices, normals and collision metadata. Create CNA vertex/index buffers and publish chunk render resources on the graphics-owning thread. A late result carries terrain generation and chunk revision, so it cannot overwrite a newer edit or a different world.

## Level of detail without cracks

LOD reduces vertices for distant chunks, but adjacent chunks at different resolutions can expose cracks. Common solutions include skirts extending below edges, stitch index patterns for each neighbor combination, or geomorphing between levels. Skirts are simple but can show on cliffs; stitching is exact but increases index variants.

Choose LOD from projected error with hysteresis, not raw distance alone. Two thresholds prevent a chunk oscillating between levels as the camera moves. Keep neighbor LOD difference bounded if the stitching method requires it. The decision should be stable for a frame snapshot.

Avoid rebuilding geometry merely because LOD changed if prebuilt shared index buffers or multiple resident levels are affordable. Measure CPU generation, GPU memory and upload traffic to choose the trade-off.

## Terrain materials

A terrain material often blends rock, grass, sand or snow from one or more control maps. Normalize weights or define what unused weight means. World-space tiling avoids visibly stretched textures, while macro variation breaks repetition at long distance. Normal maps need consistent tangent/world-space interpretation across renderers.

```cpp
struct TerrainMaterialParams {
    Texture2D* albedoArray;
    Texture2D* normalArray;
    Texture2D* weights;
    float detailScale;
    float macroScale;
};
```

Texture arrays and advanced formats require a capability/fallback plan. An atlas path can serve less capable renderers, provided borders and mipmaps are prepared correctly. A lowest-tier material may use vertex colors or one base texture. The terrain system chooses a supported variant rather than testing renderer names.

Shadows, fog and PBR must share the same world units and depth conventions as the rest of the scene. Debug modes that show normals, weights, LOD level and chunk boundaries save hours of shader guesswork.

## Collision and queries

For a height field without caves or overhangs, bilinear or triangle-consistent height queries are efficient. Match the exact diagonal used by the render mesh; otherwise a character can float above one half of a cell and penetrate the other. Return height, normal, material and chunk revision from one query.

Raycasts traverse candidate chunks and grid cells rather than testing every triangle. Vehicle wheels often need several short ground probes per tick. Cache only with revision-aware inputs. Overhangs, tunnels and arbitrary cliffs need separate mesh or physics representation—do not stretch a height field beyond its topology.

## Streaming, editing and qualification

Prefetch chunks from camera/vehicle velocity and keep hysteresis around the resident region. A missing required collision chunk is not empty ground. Editing marks height, normals, render mesh, collision and neighboring borders dirty. Publish a coherent new revision after all required pieces are prepared.

Tests cover flat fields, ramps, sharp peaks, negative coordinates, exact borders, all LOD neighbor combinations and edits on chunk corners. Golden images show wireframe, normals, material weights and distant horizons across CNA renderers. Performance captures report visible chunks, triangles, draw calls, upload bytes, LOD transitions and query cost.

A terrain renderer succeeds when it is not only fast in a flyover, but also agrees with collision, survives streaming and produces the same deliberate fallback on every supported CNA graphics path.
