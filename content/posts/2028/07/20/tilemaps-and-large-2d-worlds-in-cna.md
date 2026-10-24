---
title: Tilemaps and Large 2D Worlds in CNA
date: 2028-07-20T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Render and stream large CNA tile worlds with chunked data, atlas-safe sampling, culling, collision and deterministic editing.
author: Robert Vokac
categories: [Development]
tags: [CNA, Tilemaps, SpriteBatch, 2D, Streaming]
draft: false
---

A small tilemap can be a two-dimensional array drawn with one `SpriteBatch` call per visible tile. A large world needs stronger boundaries: compact storage, chunk ownership, camera culling, reliable atlas sampling, collision data and asynchronous streaming. CNA provides the graphics and content primitives; the world format and policies belong to the game.

## Design the data before the renderer

Give every layer a purpose. Ground and decoration may be visual. Collision, navigation, triggers and metadata should not be inferred from a pixel color at runtime. Store stable tile IDs rather than direct texture rectangles so an atlas can be repacked without rewriting maps.

```cpp
struct TileCell {
    std::uint16_t tileId;
    std::uint8_t transform;   // rotation/flip vocabulary
    std::uint8_t variant;
};

struct ChunkCoord { std::int32_t x, y; };
struct TileChunk {
    static constexpr int Width = 32;
    static constexpr int Height = 32;
    std::array<TileCell, Width * Height> ground;
    CollisionGrid collision;
    std::uint64_t revision;
};
```

Use floor division for negative world coordinates. C++ integer division truncates toward zero, which maps cells around the origin incorrectly if used naively. Centralize `WorldToCell`, `CellToChunk` and `CellInChunk`, then test negative boundaries.

Sparse layers can use runs or object lists; dense layers favor flat arrays. Compress chunks on disk, not necessarily in live memory. Include format version, dimensions, tile-set identity, uncompressed size and checksum before allocating from untrusted or modded content.

## Draw only the visible cells

Transform camera bounds into tile coordinates, expand by one cell for partial visibility, clamp to loaded chunks and iterate in a stable layer order. Do not visit an entire world to discover most tiles are off-screen.

```cpp
CellRect visible = WorldRectToCells(camera.WorldBounds()).Expanded(1);
for (int layer : drawOrder) {
    for (ChunkCoord c : ChunksOverlapping(visible)) {
        if (const TileChunk* chunk = cache.Find(c))
            EmitVisibleTiles(*chunk, layer, visible, drawList);
    }
}
```

`SpriteBatch` already removes much per-sprite submission cost, but ordering and texture/state changes still matter. One atlas per compatible material is easier to batch than hundreds of textures. Measure before replacing clear code with a custom mesh path. Very static maps may cache chunk geometry or render selected layers into chunk textures, but then animated tiles, zoom, lighting and edits need invalidation rules.

## Prevent atlas seams

Atlas bleeding appears when filtering samples neighboring tiles. Add padding/extruded border pixels around atlas entries, calculate source rectangles consistently and choose sampler policy deliberately. Pixel-art cameras often need point sampling and pixel-snapped presentation. Smoothly scaled art may use linear filtering with padded atlas entries.

Mipmap generation must respect tile boundaries. A naïve whole-atlas mip chain blends unrelated neighbors. Generate padded entries and mips appropriately, use array textures where the renderer/capability plan allows, or avoid mipmaps under a defined camera scale.

## Decouple visuals from collision

A decorative grass tile should not become solid because an artist moved it in the atlas. Compile collision shapes from tile metadata into merged rectangles or contours per chunk. The broad phase queries only nearby chunks; narrow phase tests a moving body against candidate shapes.

Slopes and one-way platforms need explicit shape and approach rules. When a tile changes, rebuild only affected collision/navigation data and neighboring boundaries. Publish the new chunk revision at a simulation tick so queries never see half old and half new data.

## Stream chunks with hysteresis

Define at least three radii: simulation-required, rendering-prefetch and retention. Prefetch ahead of camera velocity, but retain recently exited chunks to avoid thrashing. A chunk state machine might be Unloaded, Requested, CPUReady, Published and Evicting.

Workers can read, decompress and validate chunk data. The game thread publishes it, creates any GPU resources and connects neighboring data. Every request carries world generation and chunk revision; late results from an abandoned world are discarded.

Missing chunks need a policy. An editor may show a checkerboard. A game may block movement at the loaded boundary while still rendering distant placeholders. Never treat missing authoritative collision as empty space by accident.

Bound cache memory by bytes, not only chunk count. Track CPU tiles, collision/nav data, cached render geometry and textures separately. Eviction cannot release a chunk referenced by the current simulation or render snapshot.

## Animated and varied tiles

Animate from simulation ticks when timing affects gameplay, otherwise presentation time is sufficient. Do not mutate every cell each frame; the tile definition maps time to a frame. Stable coordinate hashing can select visual variants without storing extra data, provided the hash algorithm and seed remain versioned.

Large worlds benefit from explicit origin policy. If floating-point precision becomes visible far from zero, keep integer cell/chunk coordinates authoritative and derive local render positions relative to a camera origin.

## Tools and validation

An editor should visualize chunk borders, cell coordinates, collision, navigation, streaming state and dirty revisions. Validate unknown tile IDs, missing atlas entries, duplicate object IDs, invalid transforms and objects crossing chunk ownership boundaries.

Tests cover negative coordinates, exact chunk edges, camera rotation/zoom if supported, atlas sampling, edits at neighboring borders, save/reload, corrupt chunks, fast camera movement and cancellation. Performance captures should report visited versus emitted cells, SpriteBatch flushes, chunk loads, decompression time, cache bytes and frame stalls.

The scalable design is not “draw tiles faster.” It is a set of contracts that lets content, simulation, streaming and rendering agree on what a tile is and when a chunk becomes valid.
