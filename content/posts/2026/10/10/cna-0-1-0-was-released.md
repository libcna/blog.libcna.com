---
title: CNA 0.1.0 was released
date: 2026-10-10T16:00:00Z
updated: 2026-10-10T16:00:00Z
description: |
  CNA 0.1.0 is the first final release of CNA. This article summarizes what changed since 0.1.0-alpha.1.
author: Robert Vokac
categories:
  - Development
  - Projects
tags:
  - Release
  - CNA
  - Renderers
  - SDL3
  - CNA.NET
  - C#
  - XNA
draft: false
---

CNA 0.1.0 was released today.

It is the **first final release** of CNA.

The previous release, `0.1.0-alpha.1`, was tagged on 20 August 2026.

This article describes the most important changes: the ones that change what CNA is, what it supports, and how it is built.

The full list is in the [CHANGELOG](https://github.com/libcna/cna/blob/v0.1.0/CHANGELOG.md), and the release itself is the tag [`v0.1.0`](https://github.com/libcna/cna/releases/tag/v0.1.0).

## CNA.NET: XNA 4.0 C# games on CNA

The biggest new thing around this release is not in the CNA repository at all.

It is **[CNA.NET](https://github.com/libcna/cna-dotnet)** (`cna-dotnet`): a C# binding that lets **original XNA 4.0 C# games run on CNA**.

```text
C# XNA 4.0 game                 unchanged sources
        ↓
CNA.XnaCompat                   the Microsoft.Xna.Framework API
        ↓
CNA.Framework → CNA.Interop     managed implementation, P/Invoke
        ↓
CNA C API → CNA C++             the CNA core
```

The game is still a C# program on .NET 8. Inside, the **C++ CNA core** does the real work: graphics, audio, input, content, networking.

It is not a port. The game's C# sources are compiled unchanged against CNA.NET, exactly as its own XNA project compiled them.

What runs on it today:

- **81 of the 83 official Microsoft XNA Game Studio 4.0 samples**, still in their original C# ([`cna-dotnet-samples`](https://github.com/libcna/cna-dotnet-samples))
- **dozens of real XNA 4.0 C# games with public source code on GitHub**. In the last walk-through, **193 of 198** runnable programs from **85 open-source XNA 4.0 projects** played correctly on CNA.NET: games, engines, physics samples, book and course projects.

A few of those games:

- XNA 4.0 Racing Game Kit
- Neon Vector Shooter
- Heroes of Rock
- Zombie Smashers X
- TIE Fighter Forever
- Sonic 3
- Super Mario World (Sprint 4)
- Mario3
- Flight Sim
- Speedy Blupi

CNA.NET also matches the public surface of XNA 4.0 exactly: **256 of 256** public types of the selected XNA 4.0 Windows runtime profile, with **zero differences**.

CNA.NET has its own repository and its own schedule. It is not part of the CNA 0.1.0 release, and it is not behaviorally complete yet. But it already shows what CNA was built for: XNA 4.0 games keep running.

## Graphics

Most of the remaining commits went into the renderers that stayed.

- **Software renderer** — the largest single area of work in this release, with almost 400 commits: classic render target formats, multiple render targets, compiled XNA effects and SpriteBatch.
- **Vulkan** — about 250 commits, including base-instance drawing, indirect drawing with compute-generated arguments, and GPU timestamps.
- **Metal and macOS** — CNA was qualified on real Apple silicon: compiled XNA effects on Metal through MojoShader and SPIRV-Cross, DXT, cube and volume textures, and instancing.
- **WebGPU** — besides native `wgpu-native`, a real in-browser path through Emscripten.
- **SDL GPU**, **Direct3D 11** and the **EasyGL** renderers received their own parity work.
- **CNAEXT modern rendering** — clustered shading, GPU particles, GPU instance culling, auto exposure, volumetric fog, atmospheric sky and decals, as CNA extensions outside of XNA 4.0.

## Content

- The **XNA content pipeline** in CNA can now write **XNB** as a second output format, including **XNA-compatible LZX compression**.
- Processors such as the FontTextureProcessor produce **byte-identical** output to XNA.
- The **CNB** content format, CNA's own, gained new schemas and hardening.

More about content is coming in a separate article.

## XNA 4.0 fidelity

A systematic sweep compared CNA's behavior with XNA 4.0 across the framework, sometimes measured to the bit, such as how a `BoundingSphere` grows.

Where FNA and XNA disagree, CNA follows XNA.

## Online

`GamerServices` and `Net` now work against **CNA's own account service**: accounts, profiles, friends, presence, achievements, leaderboards, sessions with invitations and host migration, network voice and avatars.

It is not compatible with Xbox LIVE, and it was never meant to be.

More in [CNA goes online: gamer services, avatars and networking](/2026/10/05/cna-goes-online-gamer-services-avatars-and-networking/).

## The C API

The native C API is what CNA.NET and the other language bindings are built on.

It went from **0.7.0** in `0.1.0-alpha.1` to **0.46.0** in this release.

It is still **experimental**, and its version moves independently of CNA's.

## Dependencies are now enforced

CNA is built from several repositories:

- **sharp-runtime** — the .NET `System.*` subset in C++
- **easy-gl** — the OpenGL/OpenGL ES layer used by EasyGL
- **meta-gl** — the type-safe OpenGL wrapper under easy-gl

They are separate Git checkouts next to CNA, not submodules. Until now, a CNA release could only write down which revision of them it was tested against.

All three were released today as well, and **CNA 0.1.0 requires them**:

| Repository | Required version |
|---|---|
| sharp-runtime | **0.1.0** |
| easy-gl | **0.1.1** |
| meta-gl | **0.4.1** |

If a checkout next to CNA declares an incompatible version, CMake stops configuration and says which tag to check out.

## Still 0.x

CNA 0.1.0 is a final release, but it is still a **0.x** release.

A minor release may still change the public API, and renderer coverage is uneven by design. Each renderer documents its own boundary, and the known bugs are listed in `NEXT.md`.

But from today, there is a fixed point to build on: **CNA 0.1.0**.
