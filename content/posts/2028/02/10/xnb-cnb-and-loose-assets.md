---
title: "XNB, CNB and Loose Assets: Choosing a Content Strategy"
date: 2028-02-10T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Compare CNA content containers and loose files by compatibility, build reproducibility, startup, validation and modding needs.
author: Robert Vokac
categories: [Development]
tags: [CNA, XNB, CNB, Content Pipeline, Assets]
draft: false
---

Content strategy is not one universal winner. XNB preserves XNA-shaped compiled content and type readers. CNB is CNA's own packaged route. Loose files remain useful for development, data intended for user modification and formats already decoded at runtime.

Choose per asset class and product promise:

| Question | XNB | CNB | Loose |
|---|---|---|---|
| XNA interoperability | strongest purpose | CNA-native | source-dependent |
| Deterministic build processing | yes | yes | separate tooling needed |
| Easy user editing | poor | poor | strong |
| Early validation | pipeline | pipeline | runtime unless prevalidated |

Do not rename one format into another. Containers have distinct headers, readers, versioning and shader/content semantics.

## Build and runtime boundary

Keep source masters outside the installed runtime tree. A manifest maps logical names to compiled artifacts and records processor/compiler version. At runtime, load through `ContentManager` so caching, type identity and errors remain consistent.

Loose content still needs a schema, path model and bounds. Parse into temporary data, validate counts/references, then publish. Never rely on current directory or case-insensitive lookup.

## Mixed strategy

A game can ship CNB/XNB for core immutable content, loose localization tables for patching and a sandboxed mod directory. Define precedence explicitly so a mod cannot accidentally replace security-sensitive configuration or executable shader data.

Version packages independently of application when useful, but maintain a compatibility table. Atomic updates must not combine a new executable with an old incompatible content set.

Test clean build reproducibility, missing/truncated/wrong-type assets, case-sensitive installation, upgrade and cache invalidation. Measure package bytes, peak decode memory and time to first use. The right strategy is the smallest set of formats with explicit ownership, validation and update rules—not the largest list CNA can technically open.

## XNB in a CNA project

XNB packages type-reader metadata and processed object graphs. It is useful when porting XNA/FNA-shaped content, but reader availability and compiled effect/audio formats remain real compatibility requirements. An XNB that contains a type CNA does not implement must fail with the logical asset and reader name. Do not unpack and silently approximate unknown objects.

Keep original sources and pipeline project settings. Treat an old `.xnb` as an interoperability fixture, not the only editable master. When rebuilding, compare texture alpha/color, model coordinates, font glyph ranges, audio loops and effect parameters.

## CNB packages

CNB can organize CNA-owned compiled content and manifests. Define package version, entry identity/type, offsets, lengths/checksums and compression. Validate complete directory/table before exposing entries. One corrupt entry should not cause integer overflow or an unbounded allocation.

Package updates use immutable versioned files and atomic manifest switch. If content streams from web/server, verify bytes before publication and bound simultaneous decompression.

## Loose asset policy

Loose files are ideal for localization, configuration intended for editing and mods, but need root containment:

```cpp
Path resolved = Normalize(root / requested);
if (!IsWithin(root, resolved))
    throw ContentLoadException("asset path escapes content root");
```

Reject absolute/traversal and define symlink behavior. Bound parsers, image dimensions and model complexity. Loose custom shaders/code may carry more authority than data and deserve a separate trust policy.

## Decision record and tests

For every asset family record authoring source, build processor, runtime format, logical naming, cache scope, update/version and mod override. Generate a release manifest mapping logical IDs to package hashes.

Test identical logical asset through each supported route and ensure type/ownership semantics match. Simulate new executable with old content, old executable with new content, partial update and duplicate override. The system should accept a declared compatible pair or refuse before gameplay—not produce a hybrid scene.

## Security and resource limits

All routes parse untrusted bytes: bound container entry counts/lengths/decompression, reader object depth, string sizes, image/model dimensions and total decoded memory. Validate multiplication/offset ranges before allocation/seek. Compression ratio limit prevents tiny archive expanding without bound.

Loose/mod roots must not override executable/config/save unless explicitly designed. CNB/XNB type identity cannot instantiate arbitrary code; reader registry is allowlisted by build. Web/downloaded packages verify expected hash/signature policy before cache publication.

## Migration workflow

When changing content strategy, run both old and new outputs from same source through semantic comparison, not file-size only. Compare textures/readback, models/materials/animation, font glyphs, audio cues and shader behavior. Keep old fixture until supported save/content upgrade window ends.

Document which format third-party modders/users should author, which is internal compiled output and which tools are stable. Clear boundaries prevent users depending on incidental package internals.
