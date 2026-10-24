---
title: Building a Custom CNA Content Type
date: 2028-02-03T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Design a versioned custom asset, process it at build time and load it through CNA with bounded validation and clear ownership.
author: Robert Vokac
categories: [Development]
tags: [CNA, Content Pipeline, Custom Content, CNB, Assets]
draft: false
---

A custom content type moves parsing and validation out of gameplay. Instead of reading loose JSON and creating resources during a level, the build pipeline converts source into a compact versioned representation and runtime code reads exactly that contract.

Consider a dialogue graph:

```cpp
struct DialogueNode {
    std::string id;
    std::string localizationKey;
    std::vector<std::string> nextIds;
};
struct DialogueAsset {
    std::uint32_t formatVersion;
    std::vector<DialogueNode> nodes;
};
```

## Import and process

The importer parses source syntax with file/line diagnostics. The processor validates unique IDs, existing edges, reachable start nodes, bounded counts and localization keys. It can precompute string tables and indices while retaining stable IDs for diagnostics.

Do not let runtime discover that an edge points nowhere. Fail the content build with `dialogue/town.json:42: unknown node tavern_exit`.

## Write a versioned payload

Begin with magic/type identity, format version and bounded counts. Write fields in documented order using CNA pipeline primitives. Never serialize C++ struct memory: padding, endianness, pointers and library types are not formats.

Runtime reader checks version/counts before allocation, reads into temporary owned data, validates again against corruption, then returns the asset. New optional fields require a version/migration policy; changing order without bumping format is a compatibility break.

## Resource references

If custom content references textures/sounds, decide whether the pipeline embeds, converts or stores logical asset references. Runtime resolution should go through `ContentManager`, preserving caching and ownership. Avoid hidden loads from constructors that make failure order unpredictable.

## Tests and distribution

Keep tiny valid, boundary and malformed fixtures. Round-trip semantic data, test deterministic output, truncate every region, inject huge counts and load older supported versions. Verify the custom reader is registered in installed/consumer builds, not only an in-tree test.

Document source schema, compiler version, runtime format version and error examples. A custom asset is production-ready when invalid authoring fails early, compiled bytes are bounded and reproducible, and runtime ownership is indistinguishable from built-in content.

## A binary layout example

Suppose dialogue output stores a string table plus node records. Write fields explicitly:

```text
magic "DLG1"
u32 formatVersion
u32 stringCount
  repeated: u32 byteLength + UTF-8 bytes
u32 nodeCount
  repeated: u32 idStringIndex, u32 textStringIndex,
            u32 edgeCount, repeated u32 targetNodeIndex
```

Cap strings, nodes, edges per node and total edges before allocation. Validate indices after reading. Reject trailing bytes if the format promises exact payload, or version extension sections explicitly. Never use native `size_t`, enum representation or struct dump.

## Pipeline separation

Importer preserves source context. Processor converts author-facing names into stable indices and reports semantic errors. Writer knows only the processed model. Runtime reader knows only compiled bytes. Keeping these stages separate allows source syntax to evolve without changing runtime and allows validation tests without a graphics device.

For references to other assets, store normalized logical names plus required type. Runtime resolver uses the same `ContentManager` scope. Detect reference cycles during processing where possible.

## Determinism and incremental builds

Sort maps/sets before writing, normalize paths/text encoding and avoid timestamps. The same source/options/tool version must produce identical bytes. Hash source dependencies and processor settings so incremental builds rebuild exactly when semantics change.

Add a dump/inspect tool that prints version, counts and references without loading a game. It is invaluable for package diagnostics and format migration.

## Compatibility plan

Classify changes: additive optional field, new required semantics, or incompatible representation. Implement sequential readers/migrations only for versions the product promises. Maintain fixtures produced by every shipped compiler and ensure newer runtime loads them. A newer unsupported version fails with expected/actual versions and asset name, never partial data.

Finally install the content compiler/readers and build a standalone consumer. In-tree registration can hide missing exports or package metadata. The shipped workflow—not only unit tests—must create and load the type.

## Tool and runtime diagnostics

Compiler diagnostics retain source filename/line/column, property path and suggested valid IDs. Runtime errors retain logical asset, compiled version, byte offset/field and expected bounds without leaking raw untrusted content. A generic `unexpected EOF` without asset/context is insufficient.

Provide `validate` and `dump` commands usable in CI/release inspection. The dump should never allocate based on unchecked counts and can summarize references/estimated runtime bytes. Generate dependency list for incremental rebuild/package manifest.

Test concurrency/cache: loading same custom asset twice through one manager obeys cache identity; separate scopes release independently; wrong requested public type fails. If asset owns device resources, split CPU data and device creation/thread affinity explicitly.

Before format release, write specification with byte order/types/limits/version table and keep golden binary fixtures small enough to inspect. This prevents compiler/runtime evolving only by matching today's C++ implementation.
