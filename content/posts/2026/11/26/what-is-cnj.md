---
title: What is CNJ?
date: 2026-11-26T16:39:25Z
updated: 2026-09-13T17:28:16Z
description: |
  CNJ, short for CNA Content JSON, is CNA's human-readable JSON-based content format.
author: Robert Vokac
categories:
  - Development
tags:
  - Content Pipeline
  - glTF
  - XNB
  - CNJ
  - CNA Content JSON
  - CNB
  - JSON
  - Assets
originalUrl: https://blog.libcna.com/2026/11/26/what-is-cnj/
classicpressId: 103
classicpressStatus: future
draft: false
---

**CNJ**, short for **CNA Content JSON**, is CNA's human-readable JSON-based content format.

It provides CNA with a content representation that is easy to inspect, edit, generate, diff, validate and process without requiring developers or tools to understand a complex binary container.

A CNJ asset uses the `.cnj` extension.

At its simplest, a CNJ file looks like this:

```json
{
  "cnjVersion": 1,
  "type": "SpriteFont"
}
```

But CNJ is more than a generic JSON file format. It is part of the CNA content system and integrates directly with `ContentManager`, CNA's asset readers, the glTF importer and the CNB compiler.

CNJ occupies an important position between ordinary source assets and CNA's compiled content format:

```text
source assets
     │
     ├── PNG / JPEG / WAV / DDS
     ├── glTF / GLB
     └── other source data
             │
             ▼
            CNJ
    human-readable CNA content
             │
             ▼
            CNB
      compiled CNA content
```

The pipeline is not mandatory. CNA can load many source formats directly, and CNJ itself can also be loaded directly. The diagram instead shows the role CNJ can play when an editable CNA-owned representation is useful.

## Why does CNJ exist?

Binary asset formats are efficient for machines, but they are inconvenient for development.

A binary file is difficult to:

- inspect manually;
- modify with a text editor;
- review in Git;
- generate with simple scripts;
- compare between commits;
- diagnose when something goes wrong;
- extend experimentally.

CNJ deliberately takes the opposite approach.

The structural part of an asset is represented as ordinary JSON while large binary payloads can remain in separate files.

This makes an asset such as a model understandable without requiring a binary format inspector.

For example, model metadata can live in JSON while vertex and index data remain in compact binary sidecars.

CNJ therefore does **not** attempt to encode every vertex, texture byte or animation matrix as JSON. JSON is used where JSON makes sense.

## The CNJ envelope

Every CNJ document has a small common envelope.

The two fundamental fields are:

```json
{
  "cnjVersion": 1,
  "type": "Curve"
}
```

`cnjVersion` identifies the schema version understood by the reader.

`type` identifies the kind of asset represented by the document.

The remaining fields depend on the asset type.

A SpriteFont, Model, Curve and Texture2D therefore all use `.cnj`, but their contents are different.

This is conceptually similar to XNA's content system: the filename extension does not have to encode the asset type because the content itself can identify what it contains.

## CNJ is type-aware

CNJ is not simply:

```text
JSON file -> arbitrary object
```

The requested C++ type still matters.

A normal CNA load looks like:

```cpp
auto model = Content.Load<Model>("Models/house");
```

The C++ type requested through `Load()` remains the primary type information.

If CNA resolves the asset to a CNJ document, its `"type"` field is checked as well.

This means that a file declaring:

```json
{
  "cnjVersion": 1,
  "type": "SpriteFont"
}
```

cannot silently be interpreted as a `Model`.

The CNJ envelope therefore acts both as format metadata and as an integrity check.

## Self-contained CNJ assets

Some CNJ files describe the asset themselves.

A `Curve`, for example, can contain its keys directly in JSON.

A `SpriteFont` contains glyph metadata and references its texture atlas.

A `Model` contains its structural description and references binary data where necessary.

An `AnimationClip` can contain animation information or reference an external binary clip.

These files do not merely point at another native file. The CNJ document itself defines the asset.

## CNJ as a metadata sidecar

CNJ also supports another important model: a JSON document can describe a native source file.

This is done with `sourceFile`.

For example:

```json
{
  "cnjVersion": 1,
  "type": "Texture2D",
  "sourceFile": "player.png",
  "colorKey": [255, 0, 255]
}
```

Here the PNG still contains the actual image data.

The CNJ file adds CNA-specific information around it.

This separates:

```text
payload
player.png

from

metadata
player.cnj
```

That is useful because formats such as PNG or WAV cannot naturally contain every piece of information an engine's content pipeline may need.

CNJ can therefore enrich an ordinary native asset without inventing another binary image or audio format.

Not every CNJ type supports `sourceFile`. It is intended for asset types that have a meaningful independently loadable payload.

For example, `Texture2D`, `TextureCube` and `SoundEffect` can use this model, while descriptors such as `Model` and `SpriteFont` have their own structured CNJ representation.

## Safe source references

Because CNJ documents may reference other files, CNA does not treat `sourceFile` as an unrestricted filesystem path.

The current implementation checks that a referenced source:

- is not an absolute path;
- does not escape the content root through `..`;
- does not escape through a symbolic link;
- does not resolve to another CNJ sidecar.

This is handled by CNA's CNJ source-file resolution logic rather than leaving each individual reader to invent its own path rules.

That is particularly important once content is processed by automated tools or comes from external asset packages.

## CNJ and large binary data

JSON is excellent for structure.

It is a poor format for millions of floating-point vertex values.

CNJ therefore intentionally allows external binary sidecars.

A model produced by CNA tooling may conceptually look like:

```text
character.cnj
character_vertices.bin
character_indices.bin
character_skeleton.bin
walk.cnj
```

The `.cnj` file describes what those pieces mean.

The binary files store data for which a compact binary representation is more appropriate.

This hybrid design gives CNA both:

```text
readable metadata
        +
efficient bulk data
```

without turning CNJ itself into another opaque binary container.

## Model CNJ

Models are one of the most sophisticated users of CNJ.

The current Model CNJ schema supports version 2.

Version 2 added the scene bone/node hierarchy and the relationship between meshes and their parent bones.

A model may also carry information related to:

- primitive topology;
- mesh grouping;
- alpha modes;
- alpha cutoff;
- double-sided materials;
- vertex colors;
- PBR parameters;
- normal maps;
- metallic/roughness maps;
- emissive maps;
- occlusion maps;
- material variants;
- morph targets;
- morph weights;
- morph animation;
- imported lights;
- animation references;
- glTF import diagnostics.

This demonstrates an important property of CNJ: it is not merely a tiny compatibility format.

It has become a useful CNA-native representation of fairly sophisticated asset semantics.

## CNJ and glTF

CNA has extensive glTF 2.0 support.

A `.gltf` or `.glb` model can be loaded directly by CNA, so converting glTF to CNJ is not required just to use a model.

However, CNA also contains the offline tool:

```text
cna_tool_gltf_to_cnj
```

which converts glTF content into CNA's CNJ representation plus the necessary sidecars.

Conceptually:

```text
character.glb
      │
      ▼
cna_tool_gltf_to_cnj
      │
      ├── character.cnj
      ├── geometry sidecars
      ├── skeleton data
      └── animation CNJ files
```

This is useful when a project wants a stable CNA-owned representation of imported content rather than parsing the original interchange format every time.

The direct glTF loader and the glTF-to-CNJ path are also designed to represent the same imported asset semantics.

CNJ can therefore act as an **inspectable intermediate representation** for CNA's model pipeline.

## CNJ and animation

Animations do not have to be permanently embedded into one model.

CNJ supports standalone `AnimationClip` assets.

For example, multiple models can reference a common animation such as:

```text
Animations/Idle.cnj
Animations/Walk.cnj
Animations/Run.cnj
```

These clips can participate in normal `ContentManager` loading and caching.

That makes shared animation libraries possible without duplicating the same animation data inside every model description.

## CNJ and effects

CNJ is also used by CNA's effect content readers.

The runtime recognizes the custom `Effect` representation as well as CNA's XNA-style stock effects:

```text
BasicEffect
AlphaTestEffect
DualTextureEffect
EnvironmentMapEffect
SkinnedEffect
```

Effect parameters can therefore be represented using ordinary readable content data instead of requiring a proprietary binary description.

This does not mean CNJ can magically execute arbitrary old XNA/D3D9 shader bytecode. Shader portability remains a separate graphics problem.

CNJ describes CNA content. It does not eliminate differences between graphics APIs or shader languages.

## Custom CNJ types

CNJ is not limited to types built into CNA.

CNA provides the CNA-specific `RegisterCnjLoader()` extension for game-defined content.

Conceptually:

```cpp
struct GameData
{
    std::string kind;
};

content.RegisterCnjLoader<GameData>(
    "EnemyDefinition",
    [](const std::string& json, ContentManager& content)
    {
        GameData result;
        result.kind = "Enemy";
        return result;
    });
```

A game could then have:

```json
{
  "cnjVersion": 1,
  "type": "EnemyDefinition"
}
```

Another loader producing the same C++ type could be registered under another CNJ type such as:

```text
LootTable
```

This lets projects build their own content schemas without requiring every game-specific data structure to become part of CNA itself.

## CNJ and CNB

CNJ should not be confused with **CNB**.

They serve different purposes.

| Format | Purpose |
| --- | --- |
| CNJ | Human-readable CNA content representation |
| CNB | Compiled binary CNA content |
| XNB | Original XNA compiled content format |
| glTF / GLB | External 3D interchange format |

CNJ is designed for readability and tooling.

CNB is designed as CNA's compiled content artifact.

CNA provides:

```text
cna_tool_cnj_to_cnb
```

which can compile supported CNJ content and its binary sidecars into a `.cnb` file.

For example:

```text
house.cnj
house_vertices.bin
house_indices.bin
house_skeleton.bin
        │
        ▼
cna_tool_cnj_to_cnb
        │
        ▼
house.cnb
```

The CNB compiler can absorb appropriate sidecar files into the resulting compiled asset while keeping references to resources that should remain shared.

This gives CNA a useful separation:

```text
CNJ
editable / inspectable / source-oriented

CNB
compiled / packaged / runtime-oriented
```

CNJ remains useful even when a project ultimately ships CNB.

## CNJ and XNB

CNJ originally emerged partly as a simpler alternative to implementing the entire XNA XNB ecosystem.

That historical description is no longer sufficient.

CNA now has XNB support as a separate compatibility path, while CNJ continues to exist as CNA's own readable content representation.

The current content resolution hierarchy gives compiled content priority.

Conceptually, CNA prefers:

```text
XNB
 ↓
CNB
 ↓
explicit caller-supplied file
 ↓
CNJ
 ↓
native reader formats
```

This allows original XNA content to remain authoritative when present, CNA-compiled CNB to take priority over the sources it was built from, and CNJ to take priority over ordinary loose native candidates when acting as an asset descriptor or metadata sidecar.

So CNJ is not trying to *be* XNB.

It solves a different problem.

## Why not simply use JSON everywhere?

CNJ deliberately does not try to replace every asset format with JSON.

A PNG is already a good image format.

A WAV file already knows how to store audio samples.

glTF is already a strong interchange format for 3D scenes.

Large vertex buffers are better stored in binary.

CNJ instead provides the CNA-specific layer that ties those pieces together.

That distinction is important.

The goal is not:

```text
Everything must become JSON.
```

The goal is:

```text
The structure and CNA-specific meaning of content
should be understandable and controllable by CNA.
```

## CNJ as part of the CNA content architecture

CNJ now sits inside a larger content architecture rather than functioning as an isolated file format.

A project can choose different paths depending on what it needs:

```text
PNG / WAV / DDS
      │
      └──────────────► ContentManager

glTF / GLB
      │
      ├──────────────► ContentManager
      │
      └──► CNJ ──────► ContentManager
                │
                └──► CNB ─────► ContentManager

XNB ───────────────────────────► ContentManager
```

This flexibility is intentional.

CNJ is available when readability, conversion, tooling or CNA-specific metadata are valuable, but a developer is not forced to convert every asset to CNJ merely to use CNA.

## Why CNJ matters

CNJ gives CNA something that relying exclusively on external asset formats cannot provide: a content representation controlled by CNA itself.

That has several long-term advantages.

The format can evolve with CNA.

It can describe CNA-specific features.

It can be generated by tools without requiring a complicated binary writer.

It can be inspected years later with nothing more sophisticated than a text editor.

It can be reviewed meaningfully in Git.

It can serve as an intermediate representation between importers and compiled content.

And because CNJ separates readable structure from large binary payloads, those advantages do not require sacrificing reasonable storage efficiency for heavy asset data.

In that sense, CNJ follows one of CNA's broader architectural goals: **own the abstraction while remaining able to interoperate with external technologies**.

CNA can understand XNB, glTF, PNG, WAV and other formats.

But with CNJ, CNA also has a content language of its own.

## Source code

CNJ is implemented as part of the CNA repository.

GitHub:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

Important areas in the source tree include:

```text
misc/cnj.md
plans/plan_cnj.md

modules/content/include/CNA/Internal/CnjEnvelope.hpp
modules/content/include/CNA/Internal/CnjSourceFile.hpp
modules/content/include/CNA/Internal/CnjCanonicalRead.hpp

modules/content/include/CNA/Content/Pipeline/CnjContentPipeline.hpp

modules/content/include/CNA/Content/Cnb/CnjToCnb.hpp
modules/content/src/Cnb/CnjToCnb.cpp

tools/gltf_to_cnj/
tools/cnj_to_cnb/
```

These files cover the CNJ format itself, envelope validation, safe file references, content-pipeline integration, glTF conversion and compilation from CNJ to CNB.

---

**Category:** CNA Development

**Tags:** CNA, CNJ, CNA Content JSON, Content Pipeline, CNB, XNB, XNA, JSON, glTF, Assets
