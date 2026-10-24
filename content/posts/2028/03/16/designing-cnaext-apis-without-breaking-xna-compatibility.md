---
title: Designing CNAEXT APIs Without Breaking XNA Compatibility
date: 2028-03-16T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Add useful CNA extensions while keeping the Microsoft.Xna surface, behavior and migration story clear.
author: Robert Vokac
categories: [Development]
tags: [CNA, CNAEXT, API Design, Compatibility]
draft: false
---

CNA preserves XNA-shaped public APIs while modern platforms require capabilities XNA never exposed. Extensions belong behind the `CNAEXT` marker and, where appropriate, CNA namespaces—not disguised as original members.

Ask three questions: can the feature be expressed through an existing XNA contract; is it renderer/platform capability rather than a new game API; and can an extension remain optional? Only then add surface.

```cpp
class CNAEXT ShaderEffect : public Effect {
public:
    CNAEXT std::vector<CNA::ShaderDiagnosticEXT> GetShaderDiagnosticsEXT() const;
};
```

Names should describe portable meaning, not SDL/Vulkan mechanisms. Return capabilities/refusals rather than forcing games to test renderer strings. Ownership, thread affinity, failure, units and lifetime require Doxygen as much as signatures do.

Extensions must not change original defaults or overload resolution unexpectedly. Keep tests for both the XNA contract and extension. A game not using CNAEXT should retain its prior behavior.

Provide fallback/migration examples, version experimental APIs visibly and avoid aliases that preserve accidental old CNA spellings forever. Review generated C API/bindings impact only when those layers are in scope.

Qualification includes builds with extensions enabled/disabled, unsupported capability, lifecycle and at least two implementations where portability is claimed. CNAEXT is successful when it adds power without making “XNA compatible” ambiguous.

## Review checklist

Start with a concrete user scenario and show why existing composition cannot solve it. Write the proposed signature, ownership and failure contract before implementation. Identify the baseline when capability is absent. Then audit namespace, `CNAEXT` marking, documentation and generated surfaces.

Test invalid arguments, disposed resources, device mismatch, repeated calls and shutdown. If the extension accepts a renderer-native concept, replace it with a portable descriptor or admit that it belongs in a backend-specific experimental layer. Include a sample that never branches on renderer identity.

Finally compare builds with and without `CNA_CNAEXT`, update the extension catalog and publish stability level. Experimental additions may evolve; stable additions need migration/deprecation policy. A small coherent API with exact refusal is preferable to broad methods that succeed differently on each backend.

## Capability before convenience

An extension that depends on backend support needs one canonical capability query. Construction/use on unsupported devices should fail with `NotSupportedException` or an explicitly documented invalid result, not accept and draw a substitute. The capability description explains what is executed, not merely which object can be created.

Avoid renderer enumeration switches:

```cpp
if (profile.Supports(GraphicsCapability::CustomEffects))
    effect = BuildEnhancedEffect(device);
else
    effect = BuildStockFallback(device);
```

The fallback belongs to application/product policy. CNA reports facts; it should not silently decide that bloom equals copying a texture.

## Naming, types and overloads

Original XNA types remain in matching `Microsoft::Xna` namespaces and property methods follow CNA's established convention. New project-owned helpers can live in `CNA`. Suffix extension diagnostics/capabilities consistently where the project convention requires it.

Before adding an overload, test implicit conversions and source compatibility. A new overload can make old calls ambiguous. Prefer strong descriptors over lists of booleans and integers whose meaning shifts by backend.

Descriptors validate on construction or call and own their strings/vectors. Never retain `string_view` or spans beyond documented call duration. Mark returned pointers/references as owned, borrowed or nullable.

## Evolution example

Suppose version 1 adds screenshots as `Capture(path)`, then web/mobile cannot provide a writable path. A portable first design instead returns/async-delivers pixels or accepts a storage abstraction. Review host constraints before freezing the surface.

When extension v2 needs new options, add a descriptor/defaulted overload while preserving v1 semantics, or deprecate with a migration window. Tests run old call sites against the new implementation.

## Documentation evidence

Every extension article/API page needs: purpose, availability, include/build flag, lifecycle, threading, failure, sample, fallback, support matrix and qualification links. A source snippet compiling on one renderer is not portability evidence.

Audit public headers for accidental non-XNA members lacking `CNAEXT`, and audit extensions for native types leaking into public surface. This keeps the compatibility boundary readable to both porters and maintainers.

## Integration and deprecation tests

Build small source consumers using only XNA-compatible surface, and separate consumers explicitly enabling extensions. The first should not need extension headers/options or observe changed behavior. The second should compile against installed CNA and handle unavailable capability.

For deprecation, keep old/new calls in tests during window and prove equivalent behavior or document conversion. Warnings point to migration page/example. Removal happens only under published versioning policy; do not leave undocumented alias indefinitely.

Review exception types/argument validation and object-device association uniformly with neighboring CNA APIs. Clone/copy semantics need special care for resource-owning extensions: state copied, GPU object sharing/recompilation and texture bindings must be documented/tested.

Finally add extension to capability/catalog/support matrix and release notes. If maintainers cannot answer which backend executes it and what unsupported does, API is not ready to freeze.
