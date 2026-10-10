---
title: XNA 4.0 C# games run on CNA.NET too
date: 2026-10-12T10:00:00Z
updated: 2026-10-12T10:00:00Z
description: |
  Original XNA 4.0 C# games, unchanged, now run on CNA through CNA.NET: 81 of the 83 official Microsoft samples and dozens of open-source games.
author: Robert Vokac
categories:
  - C#
  - Projects
tags:
  - CNA.NET
  - C#
  - .NET
  - XNA
  - Bindings
  - C API
  - Samples
  - Games
draft: false
---

Until now, an XNA 4.0 game written in C# had three places to run: the **original XNA 4.0** on Windows, **FNA**, and **MonoGame**.

Now it has a fourth: **CNA.NET**.

CNA.NET is the C# binding for CNA. It lets an XNA 4.0 C# game run on CNA **without changing the game's source code**.

This article explains what CNA.NET is, how it works, and what already runs on it.

## What CNA.NET is

[CNA](/2026/09/13/what-is-cna/) is a C++ reimplementation of the XNA 4.0 programming model. [CNA.NET](https://github.com/libcna/cna-dotnet) (repository `cna-dotnet`) puts a C# API on top of it.

The important part is what CNA.NET is **not**.

It is **not** a C# game engine. It contains no renderer, no audio mixer, no content loader and no input system of its own.

It is a **thin C# layer over the CNA C API**. Every call a game makes goes through that C API into the **C++ CNA core**, where the real work is done.

```text
C# XNA 4.0 game                 the game's own sources, unchanged
        ↓
CNA.XnaCompat                   the Microsoft.Xna.Framework API, as C#
        ↓
CNA.Framework                   CNA's own C# API, owns the native resources
        ↓
CNA.Interop                     P/Invoke declarations, internal
        ↓
CNA C API                       the stable C boundary of CNA
        ↓
CNA C++ core                    renderers, audio, input, content, networking
```

The game is still a C# program. It runs on **.NET 8** or newer. It references `Microsoft.Xna.Framework`, `Microsoft.Xna.Framework.Graphics`, `Microsoft.Xna.Framework.Input` and the other XNA namespaces exactly as it did in 2010.

But the `GraphicsDevice` it draws with, the `SpriteBatch`, the `ContentManager`, the `SoundEffect` and the `GamePad` are the ones implemented in C++ in CNA.

CNA.NET is one of the language bindings built on [the CNA C API](/2026/10/01/the-cna-c-api-and-the-road-to-11-programming-languages/). It is the most complete one.

## Source compatibility, measured

The goal of CNA.NET is **source compatibility with XNA 4.0**.

That is not a slogan. It is measured.

A verifier compares CNA.NET's public API with the real XNA 4.0 reference assemblies, type by type and signature by signature. The current result for the selected XNA 4.0 Windows runtime profile:

- **256 of 256** public types
- **0** differences
- **0** CNA types leaking into XNA signatures
- an **empty** allowlist

The `GamerServices`, `Avatar` and `Net` profile adds another **75 of 75** types with 0 differences.

The managed layer is verified against the native side as well: **1,419** native imports, all resolving, with the layout of **1,137** native and managed values checked and **0** mismatches. CNA.NET accepts exactly one reviewed CNA C API generation at a time; today it is **0.46.0**.

## The official Microsoft samples

The first proof is the **XNA Game Studio 4.0 sample collection** from Microsoft, in the [`cna-dotnet-samples`](https://github.com/libcna/cna-dotnet-samples) repository.

This is not a port. The original C# files are checked in **as close to verbatim as .NET 8 permits**. Everything that has to change to make a sample build lives in its project file, not in the sample's code. Each sample has a `missing.md` that lists every byte that differs from Microsoft's original, and why.

For many samples that list is empty. `PrimitivesSample`, for example, is byte-identical to the original.

The compiled content, the `.xnb` files, comes from the **real XNA 4.0 content pipeline**. CNA reads `.xnb` files; it did not produce these.

The result:

- **81 of the 83** official samples run on CNA.NET

The two that do not are `PerformanceUtility`, which needs `Net` features not yet covered, and `Yacht`, which needs a Windows Phone `GamerServices` host.

There is a rule behind this list. A sample is attempted on CNA.NET only after the **C++ port** of the same sample, in the sibling [`cna-samples`](https://github.com/libcna/cna-samples) repository, has been finished and proved. If a sample failed here, it must be the binding's fault, not the core's.

## Dozens of real games

Samples teach. Games are written to ship.

So the second proof is **real XNA 4.0 games with public source code on GitHub**, compiled unchanged against CNA.NET.

In the last complete walk-through, on 3 October 2026:

- **85** open-source XNA 4.0 projects
- **198** runnable programs among them
- **193** played correctly

Some of them:

- **XNA 4.0 Racing Game Kit** — exDream's RacingGame, brought to XNA 4.0
- **Neon Vector Shooter**
- **Heroes of Rock**
- **Zombie Smashers X**
- **TIE Fighter Forever**
- **Sonic 3**, **Super Mario World**, **Mario3**, **Super Luigi**
- **The Legend of Zelda** (a clone attempt)
- **Escape From Enceladus**
- **Flight Sim**
- **Resonance**
- **Bubble Bound**
- **Mahjong**, **Solitaire**, **PhreeCell**, **Blackjack**, **Dominó Tropical**
- **Moto Trial Racer**, **Rookie Drivers**, **Kosmic Warz** and other Windows Phone 7 titles
- **Speedy Blupi**
- Microsoft's networking samples: **Network Prediction**, **Peer to Peer**, **Network Game State Management**
- the sample projects of **XNA 4.0 Game Development by Example**, **XNA Shader Programming**, **Programming Windows Phone 7** and other books
- engines and frameworks: **Farseer Physics 3.5** samples, **cocos2d-x for XNA**, **Xen**, **ExEn**, **LilyPath**, **Project Mercury**

Each game is compiled from its **own unchanged sources**, with the same files, defines and profile its XNA project used.

Its content comes either from the `.xnb` files the repository ships, or from the game's own content project, **built by the official XNA `BuildContent` under Wine**, including the game's own content pipeline extensions.

### Compared with the real XNA, pixel by pixel

For several games, the title screen drawn by CNA.NET was compared with the title screen drawn by the game's **own XNA-built executable** running under Wine.

- **Megaman vs. Zombies**: 8 pixels out of 480,000 differ
- **Rookie Drivers**: 0.24 % of the pixels differ
- **Dominó Tropical**: 0.32 %, all in one tile whose alpha pulses under the mouse pointer

This is what CNA is for. Where FNA and XNA disagree, CNA follows XNA.

### Windows Phone 7 games

Many XNA 4.0 games were written for **Windows Phone 7**.

They run on CNA.NET as well, through `CNA.PhoneCompat`: the mouse acts as the finger, and Escape acts as the Back button. **88** of the 198 programs in the corpus are phone programs.

### What did not run

The campaign was closed on 4 October 2026, when the remaining failures stopped being about CNA.NET at all:

- repositories whose published source is **incomplete**
- projects that had already moved to **MonoGame 3** and depend on OpenTK, Lidgren or MonoGame-specific libraries
- **Silverlight** Windows Phone applications, which are XAML hosts rather than XNA games
- games that need `System.Drawing` or a dead external service

None of these is an XNA 4.0 game that CNA.NET failed to run.

## Where it runs

CNA.NET runs wherever CNA's C API runs.

| Platform | State |
|---|---|
| Linux x86_64 | the primary qualified platform, OpenGL ES 3 |
| macOS, Apple silicon | measured in October 2026 with the Software and Metal renderers; all 84 samples with a project start and keep running in Cocoa windows |
| Browser | qualified in headless Chromium with SwiftShader |
| Android | qualified in an x86_64 emulator |
| Windows, iOS | future platform campaigns |

A few of the games in the corpus were also built and run as browser and Android applications.

## FNA and MonoGame games

FNA and MonoGame games that stayed on the XNA 4.0 API migrate to CNA.NET the same way. The original `.cs` files are kept, and a small SDK-style project wraps them.

Engine-specific extensions of FNA or MonoGame are not promised. XNA 4.0 is the contract.

For a new game, `cna-dotnet-template` installs a `dotnet new cna-game` template.

## Status

CNA.NET is **beta** and **source-first**.

- There are no published NuGet packages and no downloadable native binaries yet. CNA and CNA.NET are built from source.
- The binding has the exact public surface of XNA 4.0, but it is not yet behaviorally complete.
- A stabilization phase is expected to begin in January 2027. That is a roadmap expectation, not a release date.

CNA.NET is licensed under the Microsoft Public License, like CNA.

## Why this matters

CNA was built so that XNA 4.0 games keep running.

The C++ core does the work. The C API makes it reachable from any language. CNA.NET makes it reachable from the language XNA games were actually written in.

An XNA 4.0 game from 2010 can now run on the original XNA, on FNA, on MonoGame — and on CNA.NET, with the C++ CNA core underneath.
