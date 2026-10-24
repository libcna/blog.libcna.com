---
title: Embedding CNA Through Its Native C API
date: 2028-03-23T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Consume CNA through its stable native C boundary with opaque handles, explicit ownership, result codes and callback-safe threading.
author: Robert Vokac
categories: [Development]
tags: [CNA, C API, ABI, Embedding, Bindings]
draft: false
---

The C API is an ABI boundary for embedding and language bindings, not a second C++ object model. It uses fixed-width types, opaque handles and explicit create/destroy operations so callers do not depend on C++ layout or exceptions.

```c
cna_game_desc desc = {0};
desc.struct_size = sizeof(desc);
desc.title = "Embedded Game";

cna_game_handle game = NULL;
cna_result result = cna_game_create(&desc, &game);
if (result != CNA_OK) {
    fprintf(stderr, "%s\n", cna_get_last_error());
    return 1;
}
cna_game_run(game);
cna_game_destroy(game);
```

Use exact names from current generated headers. Initialize structs and size/version fields. Never free CNA memory with the host allocator unless documented; copy strings/buffers through size-query APIs.

Map every handle's owner and destroy order. After destruction it is invalid even if the numeric value remains. Exceptions must not cross C; result/error state needs deterministic thread behavior.

Callbacks specify calling thread, duration and whether reentry is allowed. User data owns its lifetime through callback unregistration. A foreign runtime should enqueue work rather than block a render/audio callback.

Test ABI version mismatch, null/invalid handles, undersized buffers, callback during shutdown and a separately compiled installed consumer. The native API is valuable when it remains boring: stable types, explicit lifetime and errors that survive any host language.

## Buffers, strings and threading

Use two-call size queries where output length varies: request required bytes, allocate in caller, then fill. State whether sizes include terminators and whether text is UTF-8. Return required size on insufficient capacity so bindings never guess.

Handles should carry generation/type validation internally so stale or wrong-type use returns an error rather than reaching freed C++ memory. Document whether calls are main-thread-only, device-thread-only or thread-safe. A global “thread-safe” claim is rarely accurate.

Build a tiny pure-C consumer against the installed headers/library with warnings enabled, then exercise it from at least one foreign runtime binding. Run create/destroy loops, callback unregistration and error retrieval concurrently only where promised. ABI reports should record architecture, calling convention, exported symbol set and API version; compiler success inside CNA itself does not qualify an external ABI.

## Version negotiation

Export a small ABI/version query callable before creating objects. Major mismatch refuses with a diagnostic; minor/feature discovery uses size/versioned descriptors or capability functions. Do not infer compatibility from shared-library filename alone.

```c
uint32_t runtime_abi = cna_get_abi_version();
if (CNA_ABI_MAJOR(runtime_abi) != CNA_ABI_MAJOR(CNA_ABI_VERSION))
    return CNA_ERROR_INCOMPATIBLE_ABI;
```

When appending descriptor fields, caller sets `struct_size`; runtime reads only present bytes and supplies documented defaults. Never reorder/change existing fields.

## Error and exception mapping

Each failure returns `cna_result`. A thread-local or object-scoped error query supplies human text until the next relevant call. Bindings must not parse text to identify conditions—use stable result codes. C++ exceptions are caught at every exported boundary, translated and never escape.

Out parameters remain unchanged/null on failure unless specified. Validate nulls, enum ranges, sizes, handle type/device association and integer multiplication before allocation.

## Callback bridge

Registration returns a token or pairs callback/user data. Unregister waits or documents how caller knows no invocation remains. During shutdown, stop production, drain/invalidate callbacks, then release user data.

If a callback can arrive on worker/audio thread, foreign runtimes often cannot execute managed code there safely. Provide polling/queue routes or require the binding to marshal promptly without blocking.

## Installed consumer gate

Build shared and static variants in scope; compile C11 consumer with GCC/Clang/MSVC equivalents; inspect exported symbols; run under sanitizers where compatible; package and load dynamically by supported deployment route. Keep ABI header snapshots/symbol lists and fail CI on unintended changes.

Then test a minimal binding that creates platform/device/resource, registers callback, handles buffer resizing and destroys in reverse order. This catches ABI issues unit tests inside C++ cannot see.

## Ownership graph example

Document parent constraints: platform/runtime owns device context; device owns resources; game/host drives callbacks. Destroying parent with live children either returns busy/error or deterministically destroys/invalidates them according to contract—never leaves usable-looking stale handles.

Binding wrappers mirror this graph with safe ownership/reference. Avoid cycles between native callback user-data and managed wrapper. Explicit `close/dispose` unregisters callback first.

## Dynamic loading and packaging

If host loads CNA dynamically, resolve required base/version symbols first and optional later symbols by negotiated version. Missing optional becomes unavailable capability, missing required aborts with library path/version. Prevent accidentally loading another CNA copy from system path.

Package architecture-matching native dependencies and test relocation/read-only install. On Linux/macOS/Windows use documented loader/rpath rules rather than changing global PATH. Web/static/mobile routes may link differently but retain same handle/result semantics.

Use ABI sanitizer/checker/symbol diff where available plus runtime C consumer. Fuzz invalid handles/buffers and run multithreaded calls only within promised set. Security review treats all pointers/lengths from foreign host as untrusted.
