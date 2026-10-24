---
title: Models, Animation and Skinning in CNA
date: 2027-07-08T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Load CNA models, traverse meshes and bones, play animation clips and render weighted vertices with SkinnedEffect.
author: Robert Vokac
categories: [Development]
tags: [CNA, Models, Animation, Skinning, glTF]
draft: false
---

CNA's runtime `Model` API mirrors XNA's hierarchy of bones, meshes, mesh parts, effects and buffers. A loaded model is not a single draw call: copy absolute bone transforms, combine each mesh parent with the object's world transform, apply its effects and draw its parts.

The CNA content format is not FNA's binary XNB model representation. Use CNA's content pipeline and documented readers, or import glTF through the supported route. Keep source assets and build recipes so generated content can be reproduced.

## Skinning

`SkinnedEffect` transforms each vertex by a weighted blend of bones before the ordinary world, view and projection transforms. CNA audits defaults, maximum bone counts, palette bounds and multi-bone blending against expected XNA behavior.

An animation system evaluates a clip at simulation time, creates local bone transforms, composes the hierarchy and uploads the resulting palette. Normalize time for looping clips and define what happens at the exact end. Cross-fading blends compatible poses before building final skin matrices; blending already transformed vertices is too late.

CNA's `SkinnedModelEXT` is a separate extension path for richer imported data and should not be confused with the core `Model` reader. Choose one asset contract deliberately and isolate conversion in the content layer.

Performance depends on visible meshes, palette uploads and vertex count. Cull the model before evaluating expensive animation when possible, share immutable model data across instances, and keep per-character pose state separate. Do not mutate effects stored on a shared model without understanding who else draws it.

Tests should include identity bones, one translated bone, a two-bone weighted vertex, a non-zero root, looping boundaries and a cloned effect. A recognizable character is useful visually, but tiny numeric fixtures reveal whether the fault lies in import, hierarchy composition, interpolation or the shader.

## Import and runtime boundaries

Validate indices, finite transforms, normalized weights, materials and bone references immediately after import. Decide how missing normals, tangents or clips are handled in the pipeline instead of inventing renderer-specific fallbacks.

Animation events should detect clip-time marker crossings, including wraparound and large timesteps. Root motion needs one authority: animation or gameplay. Keep a bind-pose view and skeleton debug drawing; they distinguish a bad palette from a material or vertex-layout fault quickly.

## Evaluating a pose

For every active clip, locate the keyframes around playback time and interpolate translation, rotation and scale with the appropriate operations. Build each local bone transform, combine it with its parent in hierarchy order, then multiply by the inverse bind pose to obtain the skinning palette expected by the shader. The exact multiplication convention must match CNA and the imported asset; capture a two-bone test where an incorrect order is unmistakable.

Blending two clips means blending local poses before hierarchy propagation. Additive layers require a defined reference pose, while masks specify which bones a layer may affect. Normalize quaternions after interpolation and define behavior for missing tracks. Reusing the previous frame for an absent track can make results depend on playback history.

## Runtime budgets and fallback

GPU skinning is usually the main path, but palette size is finite. The content pipeline may split a mesh into bone palettes or select a CPU fallback. Report that choice and its cost. Update animation only as often as needed for distant characters, but continue root motion and gameplay events at simulation frequency.

Keep mesh geometry, skeleton and clips shareable while each character owns playback state and its current matrices. Allocate pose buffers once and reuse them. At load time, reject cyclic hierarchies, invalid parents, out-of-range blend indices and weights that cannot be normalized safely.

Regression assets should include one rigid vertex, a weighted joint, non-uniform scale, multiple clips and a loop boundary. Compare a reference pose at exact timestamps, then render it across backends. This separates animation math from vertex layout, matrix upload and shader defects.

## Content diagnostics worth keeping

At import time, print mesh names, vertex layouts, material bindings, skeleton size, palette partitions, clip duration and keyframe count. At runtime, expose current clip, normalized time, blend weights and root-motion delta. Allow pausing on an exact timestamp and drawing bone axes over the mesh. These tools are inexpensive compared with diagnosing a character whose elbow fails only in one transition, and they give artists actionable information without requiring a graphics debugger.

## Worked example: evaluate a palette

Separate local sampling, hierarchy propagation and inverse-bind multiplication:

```cpp
void Animator::Evaluate(float time)
{
    for (std::size_t i = 0; i < bones_.size(); ++i)
        local_[i] = clip_.SampleBone(i, time, bones_[i].bindLocal);

    for (std::size_t i = 0; i < bones_.size(); ++i) {
        const int parent = bones_[i].parent;
        absolute_[i] = parent < 0 ? local_[i]
                                  : local_[i] * absolute_[parent];
        palette_[i] = bones_[i].inverseBind * absolute_[i];
    }
}
```

Matrix order must match CNA and the importer; prove it with a two-bone asset, not intuition. With `SkinnedEffect`, assign bone transforms before applying passes. A custom `ShaderEffect` uses `SetUniformMat4Array`; setting one matrix does not fill a palette.

Blend clips in local pose space, then propagate once. Missing tracks use the bind local transform, never the previous frame. Process animation markers from previous to current time and include wraparound and multi-marker jumps. Root motion belongs to either gameplay or visual animation, not both.

Reject cyclic skeletons, invalid parents and indices, non-finite transforms and weights that cannot be normalized. Keep bind-pose, skeleton-axis and vertex-weight debug views. Together they identify whether corruption begins in import, pose evaluation, upload or shader execution.

## Import rules and material linkage

Keep source nodes, meshes, skins, animations and materials distinct during import. One mesh may be instanced by several nodes; one skeleton may drive several mesh parts. Flattening everything into one object too early duplicates data and loses the transform relationships needed to diagnose it.

Convert coordinate system and units once, including inverse bind matrices and animation channels. Generate normals or tangents only under a documented policy. If a material needs tangent-space normal mapping but the mesh has no valid UV/tangent basis, disable that feature with a warning or fail content validation—do not let one renderer read arbitrary bytes.

Palette limits are a content decision. When a mesh references more bones than a backend can upload, split it into parts whose vertices and indices map to local palettes, or choose a measured CPU-skinning fallback. Report the chosen route and keep palette remapping in the built asset so runtime behavior is deterministic.

## Playback and performance

Allocate local, absolute and palette arrays once per animator. Share immutable skeletons and clips among characters. Distant characters can sample less often and interpolate visual poses, but gameplay events and authoritative root motion still advance at simulation frequency. Do not skip a footstep event merely because the mesh was off screen.

Qualification should seek to exact beginning, middle, last key and loop boundary; blend two unrelated clips at several weights; test reverse or scaled time if supported; and recreate the graphics device while retaining CPU animation state. Store numeric bone transforms for tiny oracle assets in addition to screenshots. That catches a math regression even when camera or shading changes later.
