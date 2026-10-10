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

The previous release, `0.1.0-alpha.1`, was tagged on 20 August 2026. Since then, CNA received **about 3,600 commits**.

Nobody can read all of them in one sitting, and this article does not try. It describes the most important changes: the ones that change what CNA is, what it supports, and how it is built.

The full list is in the [CHANGELOG](https://github.com/libcna/cna/blob/v0.1.0/CHANGELOG.md), and the release itself is the tag [`v0.1.0`](https://github.com/libcna/cna/releases/tag/v0.1.0).

## From 51 renderers to 14

At its peak, CNA had **51 renderer identities**.

**37 of them were removed.**

Not because they did not work. Several of them were excellent pieces of work.

They were removed because of the **cost of maintaining them**.

Every renderer has to follow every change of the renderer interface, every newly restored XNA 4.0 behavior, every new test and every new platform. With 51 renderers, every one of those changes had to be made, built and tested 51 times.

The removed renderers include:

- historical Direct3D versions: **Direct3D 1, 2, 3, 5, 6, 7, 8 and 10**, and also **Direct3D 12**
- older and alternative OpenGL profiles: **OpenGL 1, OpenGL 2, OpenGL 4, OpenGL ES 1, OpenGL ES 2 and WebGL 1**
- renderers built on third-party graphics libraries: **bgfx, Magnum, Diligent Engine, Wicked Engine, sokol, LLGL, IGL and rlgl**
- 2D and vector libraries: **Skia, Blend2D, NanoVG, OpenVG, Direct2D and PixiJS**
- software and retro paths: **TinyGL, PortableGL, Glide and GDI**
- browser DOM paths: **HTML DOM, SVG DOM and Canvas**
- **FreeDirect**

CNA now has **14 renderers**:

| Renderer | Notes |
|---|---|
| OpenGL ES 3 | EasyGL |
| OpenGL 3.3 | EasyGL |
| WebGL 2 | EasyGL |
| Vulkan | |
| Direct3D 11 | |
| Direct3D 9 | |
| Metal | |
| WebGPU | native and in the browser |
| SDL GPU | |
| FNA3D | |
| SDL Renderer | 2D |
| Software | CPU renderer |
| Headless | diagnostic, no pixels |
| Stub | diagnostic, no pixels |

This is a curated set. A renderer is added only when it brings real platform coverage, compatibility value, architectural value or a capability the existing set does not reasonably cover.

The removed renderers are not lost.

- `docs/removed-renderers.md` records every removed renderer, the commit that removed it and the exact third-party dependency it wrapped.
- Their C API values are **permanently reserved**. No surviving renderer was renumbered.
- Selecting a removed renderer is a configure-time error that names it. It never silently falls back to another renderer.

More about the remaining renderers is in [Renderers in CNA](/2026/09/20/renderers-in-cna/).

## SDL3 is the one graphical platform

Two platform changes are just as large.

CNA carried **two SDL platform backends side by side, SDL2 and SDL3**. **The SDL2 backend was retired** on 4 October 2026. SDL3 is now the only SDL platform in CNA.

**The native Win32, X11 and Wayland platform backends were removed too.**

They worked. They allowed a CNA game to run without SDL at all. But, like the renderers, they cost too much to maintain next to SDL3.

**Windows, X11 and Wayland are still supported.** They are now supported **through SDL3**, which reaches each window system through its own `windows`, `x11` and `wayland` video drivers.

Renderers did not notice the change. A renderer still receives the native window it needs: an `HWND` on Windows, a `Display*` and window on X11, a `wl_display*` and `wl_surface*` on Wayland.

The windowless platforms remain:

- **Headless**
- **Terminal**

And a game can **run in a terminal again**: the Software renderer now hands its finished frames to the terminal platform.

The longer story is in [How CNA can survive SDL](/2026/09/24/how-cna-can-survive-sdl/).

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
