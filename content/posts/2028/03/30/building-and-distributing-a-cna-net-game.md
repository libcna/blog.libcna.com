---
title: Building and Distributing a CNA.NET Game
date: 2028-03-30T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Structure a CNA.NET project, package native CNA libraries and qualify managed/native lifetime across desktop targets.
author: Robert Vokac
categories: [Development]
tags: [CNA, CNA.NET, C Sharp, Distribution, Bindings]
draft: false
---

CNA.NET lets C# game code use an XNA-shaped managed surface backed by CNA. A distributable game contains managed assemblies, native CNA/platform/renderer libraries and content built for a compatible version.

```csharp
public sealed class MyGame : Game
{
    private readonly GraphicsDeviceManager graphics;
    private SpriteBatch spriteBatch = null!;

    public MyGame() => graphics = new GraphicsDeviceManager(this);
    protected override void LoadContent() => spriteBatch = new SpriteBatch(GraphicsDevice);
    protected override void Draw(GameTime gameTime) {
        GraphicsDevice.Clear(Color.CornflowerBlue);
        base.Draw(gameTime);
    }
}
```

Pin CNA.NET and native CNA revisions as one tested set. Package native libraries per runtime identifier/architecture and verify resolution on a clean machine without developer paths. Content filename case and working-directory assumptions remain cross-platform risks.

Managed GC does not replace native ownership. Dispose games, resources and callbacks in documented order; prevent delegates from being collected while native code may call them, then unregister before shutdown.

Publish framework-dependent or self-contained according to product size/runtime policy. Test optimized publishing, trimming only when binding metadata is preserved, crash symbol mapping on both sides and upgrade saves.

Qualification builds and runs representative C# XNA-shaped games, lifecycle stress and all claimed platforms. Distribution is complete when one archive/package starts on a clean target with no SDK and reports matching managed/native build identities.

## Interop failure diagnosis

If startup reports missing native library, inspect published architecture/RID, file placement and transitive dependencies before changing search paths globally. If a call crashes, confirm managed signature, calling convention, struct layout and lifetime against the generated native header. Never “fix” layout with arbitrary padding.

Callbacks cross a GC boundary. Retain delegates for the entire native registration, marshal exceptions back into managed state and unregister before disposing their owner. Avoid high-frequency allocations/marshalling in update/draw; expose batch/buffer APIs where the binding contract supports them.

Test Debug and Release, x64/arm64 targets in scope, repeated game construction, window close, content failure and finalizer pressure. Publish a diagnostic that prints CNA.NET assembly version, native ABI/build ID, selected platform/renderer and native search result. That single record turns most user deployment failures into identifiable version or packaging mismatches.

## Project and native asset layout

Reference the managed package/project and copy content with stable casing. Native libraries belong under runtime-specific output (`runtimes/<rid>/native` or the repository's documented layout), not a developer-wide PATH. Avoid copying every renderer if the product qualifies only one.

```xml
<ItemGroup>
  <Content Include="Content/**" CopyToOutputDirectory="PreserveNewest" />
</ItemGroup>
```

Use actual CNA.NET package instructions. Verify publish output manifest and run from another directory so working-directory leakage is visible.

## Managed/native ownership

Wrappers should implement `IDisposable` when owning native handles, guard disposed use and use finalization only as last-resort leak protection. Deterministic `using`/game shutdown is required for graphics/audio resources. Non-owning wrappers must not destroy parent objects.

One native error becomes a typed managed exception with operation context. Callbacks catch managed exceptions, enqueue/report them and do not unwind through native frames. Pin/copy buffers according to call duration; never retain a pointer after managed memory can move.

## Content and shaders

C# code may look XNA-like while runtime content still must be supported by CNA. Preserve original sources, rebuild through supported pipeline and distinguish XNA FX bytecode, CNA `ShaderEffect` packages and unsupported MGFX. A file named `.xnb` is not proof every contained reader exists.

## Publish matrix

For every RID/architecture, run `dotnet publish` configuration, inspect native dependencies and execute a smoke game: create window, load texture/font/sound, draw/read input, save and exit. Test self-contained/framework-dependent route promised to users and trimming/AOT only where binding reflection/callbacks have explicit support.

Archive managed PDBs and native symbols under the same build ID. Crash reports need both managed and native stacks. Upgrade tests install previous build/content/save, then the candidate, rather than testing fresh publish only.

## Frame-loop allocation discipline

Interop calls inside `Update`/`Draw` should avoid per-call string conversions, arrays and delegate allocation. Cache immutable wrappers/parameter handles where safe and use spans/buffer routes documented by binding. Profile managed allocations and native call count in representative crowded frame.

Do not cache resource wrappers beyond native parent/device lifetime. After device/game disposal, every managed method throws disposed rather than invoking stale handle. Content cache returns same expected managed identity/ownership semantics.

## Error/support report

Add one command/menu export with .NET runtime/OS/arch, CNA.NET assembly/file version, native ABI/build, resolved native library path, renderer/platform/audio, content build and exception chain. Redact user paths/secrets.

Test wrong architecture/native ABI/version intentionally so message says requested/loaded identities. Test missing optional renderer module and fallback. This prevents common `DllNotFound`/`EntryPointNotFound`/access violation from being reported without decisive context.

Keep CNA.NET templates/sample pinned and build them in CI from installed package. A binding that passes generator/unit tests but whose template cannot publish clean standalone game is not release-ready.
