---
title: Consoles and CNA
date: 2026-12-10T18:06:12Z
updated: 2026-09-13T18:18:47Z
description: |
  CNA is designed as a portable game framework, but there is one major category of gaming hardware it does not currently support: game consoles.
author: Robert Vokac
categories:
  - Development
tags:
  - Portability
  - Platform API
  - Consoles
  - Nintendo
  - PlayStation
  - Xbox
  - Nintendo Switch
  - PlayStation 5
  - Xbox Series
  - PS Vita
  - Homebrew
originalUrl: https://blog.libcna.com/2026/12/10/consoles-and-cna/
classicpressId: 117
classicpressStatus: future
draft: false
---

CNA is designed as a portable game framework, but there is one major category of gaming hardware it does **not currently support**:

**game consoles.**

At the moment, CNA has no officially supported runtime target for:

```text
Nintendo Switch / Switch 2

PlayStation 4 / PlayStation 5

Xbox One / Xbox Series X|S
```

and it also does not currently provide working ports for older or homebrew-oriented systems such as:

```text
PlayStation Vita
PlayStation Portable
PlayStation 2
PlayStation 3
Nintendo 3DS
Wii
GameCube
Dreamcast
original Xbox
```

The current situation can therefore be summarized very simply:

```text
CNA console support today:

Nintendo consoles      no
PlayStation consoles   no
Xbox consoles          no
retro consoles         no
```

This does **not** mean CNA's architecture fundamentally prevents console support.

Quite the opposite: several parts of CNA are already moving in a direction that would make future console ports practical.

The main obstacles are access, platform-specific integration, restricted console environments, dependencies and testing — not the basic XNA-style API.

---

## Why doesn't CNA support consoles today?

The first reason is simple:

**CNA has not been ported to one yet.**

There is currently no build configuration such as:

```text
CNA_PLATFORM=PS5
CNA_PLATFORM=SWITCH
CNA_PLATFORM=XBOX
```

There is no CNA console SDK integration, no console-specific build profile and no console hardware conformance suite.

The currently implemented CNA platform backends are:

```text
SDL3
SDL2
HEADLESS
TERMINAL
```

None of these by itself turns CNA into a console framework.

Likewise, CNA currently has many graphics renderers, but having a renderer that resembles the hardware generation of a console does not constitute a console port.

For example:

```text
CNA has DIRECTX12
```

does not imply:

```text
CNA supports Xbox Series X|S
```

and:

```text
CNA has OPENGL1
```

does not imply:

```text
CNA supports Dreamcast or PSP
```

A complete console port involves much more than drawing triangles.

---

## Modern consoles are closed development platforms

The largest immediate obstacle for current commercial consoles is not technical.

It is access.

Modern commercial consoles use development environments distributed by their platform holders to approved developers.

Examples include:

```text
Nintendo Switch / Switch 2
    Nintendo development environment

PlayStation 4 / PlayStation 5
    Sony development environment

Xbox One / Xbox Series X|S
    Microsoft GDK with Xbox extensions
```

These environments include platform-specific:

```text
headers
libraries
compilers and toolchains
graphics interfaces
debugging tools
deployment tools
documentation
development hardware
certification information
```

Some of this information is available only under agreements with the platform holder.

Consequently, CNA cannot simply download a public SDK and add:

```cpp
#ifdef CNA_PS5
```

to the public repository.

For current PlayStation and Nintendo consoles in particular, important platform code and documentation are not public.

Xbox has more publicly available GDK material, but full console development still requires the Xbox-specific development environment and appropriate developer access.

---

## SDL does not remove this requirement

CNA currently uses SDL extensively through its platform architecture.

SDL itself has console ports.

This may initially suggest an easy solution:

```text
CNA
 ↓
SDL
 ↓
console
```

But modern-console SDL ports do not magically bypass the platform holder.

For systems such as Nintendo Switch and modern PlayStation consoles, the corresponding SDL ports are provided separately to developers who already have the necessary platform access.

The public SDL repository cannot contain everything required to build a commercial Switch or PlayStation game.

So even if CNA itself needed no changes at all:

```text
CNA
 ↓
SDL3 console port
```

would still require the official console development environment.

SDL can simplify a console port.

It cannot replace the console SDK.

---

## Public CNA must remain public

This creates an important architectural requirement for CNA.

The public repository is:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

It must remain usable as a normal open-source repository without accidentally containing confidential console material.

A future modern-console architecture would therefore probably resemble:

```text
                    public CNA
                        │
                        ▼
             CNA Platform interfaces
                        │
                        ▼
                console boundary
                        │
             private / licensed code
                        │
                        ▼
                  console SDK
```

Platform-specific code that is legally restricted would have to remain outside the public CNA repository.

The public framework could still contain generic concepts such as:

```text
suspend / resume
user accounts
controller disconnect
title storage
platform capabilities
```

because those concepts are not secret.

But proprietary SDK headers, libraries and restricted implementation details could not simply be committed into the public source tree.

---

## CNA's Platform API is an important step

An older version of CNA's console feasibility analysis identified one of the largest architectural problems:

```text
CNA assumed too directly that platform = SDL3.
```

That situation has significantly improved.

Modern CNA now has a dedicated platform abstraction centered around interfaces such as:

```text
CNA::Platform::IPlatform
```

with implementations including:

```text
Sdl3Platform
Sdl2Platform
Headless
Terminal
```

The architecture is now much closer to:

```text
                     CNA Game
                        │
                        ▼
                  CNA runtime
                        │
                        ▼
                    IPlatform
             ┌──────────┼───────────┐
             ▼          ▼           ▼
           SDL3        SDL2       Headless

                         ...

                 future console
                    platform
```

This is highly relevant to consoles.

A console port should not require rewriting `Game`, `ContentManager`, `SpriteBatch`, `Model` or the rest of the high-level API.

Instead, the new environment should be connected underneath the same platform boundary.

---

## Platform and renderer are separate

CNA has another architectural advantage: host-platform integration and graphics rendering are separate systems.

Conceptually:

```text
                         Game
                          │
                          ▼
                         CNA
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
             Platform             Graphics
                │                   │
                ▼                   ▼
        console lifecycle      console renderer
        input / storage         graphics API
```

A future console may therefore need:

```text
one platform implementation
+
one compatible graphics path
```

rather than a completely separate version of CNA.

On some consoles, an existing CNA renderer architecture might be reusable.

On others, a dedicated renderer would be required.

---

## Having many renderers helps — but does not solve the port

CNA already contains rendering approaches ranging from modern GPU APIs to old fixed-function and CPU implementations.

Relevant examples include:

```text
DIRECTX8
DIRECTX11
DIRECTX12

OPENGL1
OPENGLES1

SDL_GPU

SOFTWARE
PORTABLEGL
TINYGL
```

This makes CNA unusually interesting for older-console experiments.

For example, several homebrew environments expose graphics APIs conceptually similar to old OpenGL or OpenGL ES.

But this should not be overstated.

The current CNA renderer implementations have their own platform restrictions and build assumptions.

An existing:

```text
OPENGL1
```

renderer cannot simply be copied to a PlayStation Vita executable and expected to work.

It would first need to be adapted, compiled and tested against the actual homebrew graphics environment.

The existing renderers are useful architectural starting points.

They are not existing console ports.

---

## Modern consoles are only one category

It is useful to divide console targets into several groups.

## Current commercial consoles

Examples:

```text
Nintendo Switch / Switch 2
PlayStation 4 / PlayStation 5
Xbox One / Xbox Series X|S
```

These require official developer access for normal commercial development.

For CNA, this means console work cannot seriously begin merely from public documentation.

---

## Older consoles with homebrew toolchains

A very different situation exists for systems such as:

```text
PlayStation Vita
PSP
PlayStation 2

Nintendo 3DS
Wii
GameCube

Dreamcast
original Xbox
```

Public community development environments exist for many of them.

Examples include projects and ecosystems such as:

```text
VitaSDK
pspdev
PS2SDK

devkitPro
libogc

KallistiOS
nxdk
```

These do not turn CNA into a console framework automatically, but they make experimentation possible without obtaining a modern commercial-console SDK.

This makes old and homebrew consoles a realistic place to attempt CNA's **first actual console port**.

---

## Some old consoles already have SDL ports

Another interesting fact is that public SDL support exists for several homebrew targets.

Examples include systems such as:

```text
Nintendo 3DS
PlayStation 2
PlayStation Portable
PlayStation Vita
```

This could substantially reduce the work required for an initial CNA experiment.

The path could theoretically become:

```text
CNA
 │
 ▼
CNA Sdl3Platform
 │
 ▼
SDL3 homebrew port
 │
 ▼
console homebrew SDK
```

But CNA's dependencies and build environment would still need to survive that toolchain.

So even here:

```text
SDL supports the console
```

does not automatically imply:

```text
CNA supports the console.
```

---

## Why PS Vita is an interesting possible first target

The CNA console analysis identifies the **PlayStation Vita** as one of the most practical candidates for a first experimental console port.

There are several reasons.

It has a public homebrew ecosystem:

```text
VitaSDK
```

and public SDL support.

It also has considerably more memory than many older consoles.

That matters because taking a desktop-oriented C++ framework directly to a system with:

```text
16 MB
32 MB
64 MB
```

of RAM introduces an entirely different category of engineering problems.

A Vita port could therefore provide a useful middle ground:

```text
real game console
+
restricted environment
+
public development tools
+
enough hardware resources to make bring-up realistic
```

A sensible first milestone would not be a full CNA game.

It would be something much smaller:

```text
start CNA Game
      ↓
initialize graphics
      ↓
load one texture
      ↓
SpriteBatch draws it
      ↓
read controller
      ↓
exit cleanly
```

Only after that would audio, 3D, networking and more complex content need to be addressed.

---

## Retro consoles are much harder than they look

Older consoles are technically accessible, but accessibility does not mean easy portability.

Consider memory alone.

Approximate memory budgets for some older systems are dramatically smaller than a modern PC:

```text
Dreamcast        tens of MB
PlayStation 2    tens of MB
PSP              tens of MB
Nintendo Wii     under 100 MB main system memory class
```

A modern framework may casually allocate more memory than an entire old console possesses.

Desktop-oriented code can assume:

```text
gigabytes of RAM
virtual memory
modern filesystem
threads
large standard library
large executable
large temporary buffers
```

A retro console may provide none of those luxuries.

So supporting such hardware would require more than getting the compiler to accept CNA.

---

## sharp-runtime is a major concern

CNA also depends on **Sharp Runtime**.

Sharp Runtime provides many `System::*` concepts used by CNA and is an important part of the framework architecture.

On a normal desktop this is not unusual.

On a restricted console toolchain it becomes much more important.

Areas that may cause problems include:

```text
std::filesystem
threads
chrono functionality
file streams
locale behavior
exception support
standard-library completeness
```

CNA's console feasibility analysis specifically identifies Sharp Runtime as one of the areas likely to fail before much of CNA itself does.

The Android work has already demonstrated the general class of problem: an unusual toolchain can expose standard-library assumptions that never appear on a desktop Linux build.

A console port would therefore require not only:

```text
CNA console profile
```

but probably also:

```text
Sharp Runtime restricted profile
```

---

## Filesystems are very different

A desktop game often assumes it can reason in ordinary filesystem paths.

A console may instead have concepts such as:

```text
read-only installed title content

per-user writable storage

save-game storage

temporary storage

platform sandbox paths

removable storage on some older systems
```

The game may not be allowed to access arbitrary locations.

Consequently, a future console CNA should not expose:

```text
"/home/user/game/save.dat"
```

as its fundamental storage abstraction.

The cleaner model is:

```text
Title Content
User Storage
Save Storage
Temporary Storage
```

with the platform deciding what those concepts mean.

CNA already has abstractions such as:

```text
TitleContainer
StorageDevice
```

that provide a natural place to develop this model further.

---

## Console lifecycle is different

Desktop applications usually have a relatively simple lifetime:

```text
start
run
exit
```

Consoles need stronger lifecycle semantics.

A game may need to react to:

```text
suspend
resume
user signed out
controller disconnected
system overlay
constrained execution
storage device change
```

Some of these behaviors are also certification requirements.

A framework cannot simply ignore them and expect games built on it to pass platform certification.

The CNA Platform API therefore eventually needs to make such concepts first-class rather than pretending every system behaves like a desktop PC.

---

## User accounts matter

On a PC, a game can often start and simply use the operating-system user.

On consoles, the active game user may be part of the platform API.

A title may need to know:

```text
which user is playing?

which user's save data should be opened?

did that user sign out?

which controller belongs to that user?
```

This affects:

```text
StorageDevice
GamerServices
input
cloud saves
achievements
multiplayer
```

and is another reason that console support extends far beyond the graphics renderer.

---

## Controller support does not mean console support

CNA already understands many gamepad models.

Its platform input layer contains identities for controllers including:

```text
Xbox 360
Xbox One

PlayStation 3
PlayStation 4
PlayStation 5

Nintendo Switch Pro Controller
Nintendo Joy-Con
```

This is useful on desktop systems because those controllers can be connected to a PC.

But:

```text
CNA recognizes a DualSense controller
```

does **not** mean:

```text
CNA runs on PlayStation 5.
```

Likewise:

```text
CNA recognizes a Switch Pro Controller
```

does not constitute Nintendo Switch support.

Controller compatibility and console operating-system support are completely different things.

---

## Console button policy

Even the apparently simple gamepad abstraction has console-specific details.

Different ecosystems have different conventions for:

```text
confirm
cancel
back
menu
```

Nintendo's physical A/B arrangement differs from Xbox.

PlayStation uses its own symbols and some conventions have historically varied by region.

This means a game should ideally ask for a semantic action such as:

```text
Confirm
```

rather than hard-coding:

```text
Button A always means confirm.
```

A mature CNA console layer would eventually need a platform button policy for these behaviors.

---

## Shaders are another challenge

Modern desktop frameworks often compile shaders at runtime during development.

Consoles generally want much more controlled shader pipelines.

A shipping console game may require shaders to be compiled through platform tooling before deployment.

This means a CNA renderer relying on:

```text
runtime HLSL compilation
runtime GLSL compilation
runtime shader translation
```

may need an alternative path.

The preferred console architecture is much closer to:

```text
source shader
     │
     ▼
build-time compiler
     │
     ▼
platform bytecode
     │
     ▼
game package
```

rather than:

```text
game starts
     │
     ▼
compile shader source
     │
     ▼
render
```

CNA already has considerable work around compiled effects and shader portability, which would be valuable for a future console profile.

But it would still need to be validated against the actual target.

---

## Dependencies need a console profile

A desktop CNA build can use many optional libraries.

A console build cannot simply assume all of them are available.

Depending on configuration, a normal development tree can involve technologies such as:

```text
FFmpeg
ENet
Skia
Blend2D
various third-party graphics libraries
testing frameworks
```

A console configuration would need a deliberately restricted build profile.

Conceptually:

```text
CNA console profile

tests                 off
desktop examples      off
unsupported devices   off
FFmpeg/media          optional or off
network stack         platform-specific
dynamic plugins       off
graphics libraries    restricted
static linking        preferred
```

The exact profile would depend heavily on the target console.

A PlayStation Vita profile and a PlayStation 5 profile would be very different despite sharing the PlayStation name.

---

## Static linking is actually a CNA advantage

One positive result from CNA's console analysis is that the framework does not fundamentally depend on a runtime plugin model based on arbitrary dynamic libraries.

Consoles commonly prefer tightly controlled, statically linked executables.

CNA's compile-time renderer architecture fits this environment well:

```text
configure project
      │
      ▼
select renderer
      │
      ▼
compile one application
      │
      ▼
static deployment
```

This is a much more console-friendly architecture than discovering arbitrary graphics plugins at runtime.

---

## CNA being native C++ also helps

CNA has another potential advantage over XNA-compatible frameworks based on managed runtimes.

CNA itself is native C++.

There is no requirement to bring:

```text
.NET CLR
JIT compiler
Mono runtime
```

onto a console simply to execute ordinary CNA game code.

This eliminates a major category of console-porting work.

Frameworks such as FNA and MonoGame have historically had to solve not only graphics and operating-system integration but also the problem of running their managed environment on console hardware.

CNA avoids that particular problem.

Sharp Runtime is still an important dependency, but it is itself native C++, not a CLR that requires a JIT.

---

## What about FNA and MonoGame?

Both FNA and MonoGame demonstrate that an XNA-style API can work on modern consoles.

But their public repositories do not magically contain unrestricted copies of every proprietary console SDK.

Console support is separated according to the legal requirements of the target.

The lesson for CNA is not:

```text
copy their console code.
```

The useful lesson is architectural:

```text
XNA-style game API
        │
        ▼
portable framework
        │
        ▼
small platform-specific boundary
        │
        ▼
licensed console environment
```

That is exactly the architecture CNA should aim for.

---

## Why CNA is better positioned now than before

The older console feasibility analysis identified platform abstraction as one of CNA's largest prerequisites.

That work has now substantially happened.

CNA currently separates:

```text
platform
renderer
audio
framework runtime
```

much more clearly than before.

This is important because a console port can eventually replace only the layers that actually require replacement.

For example:

```text
                   CNA application
                        │
                        ▼
                      CNA
             ┌──────────┴──────────┐
             │                     │
             ▼                     ▼
      ConsolePlatform       ConsoleRenderer
             │                     │
             └──────────┬──────────┘
                        ▼
                  console SDK
```

The rest of the framework can remain shared.

That does not make console support easy.

But it changes the problem from:

> Rewrite CNA for a console.

to:

> Port CNA's boundaries to a console.

That is a much healthier position.

---

## Steam Deck is a different case

Devices such as:

```text
Steam Deck
ROG Ally
Legion Go
other handheld gaming PCs
```

may look and behave like consoles from the player's perspective.

Technically they are not new console platforms for CNA.

A Steam Deck runs a Linux-based PC environment.

An ROG Ally commonly runs Windows.

So CNA can target them through its existing:

```text
Linux
```

or:

```text
Windows
```

support.

A game may still need:

```text
controller-first UI
fullscreen behavior
performance tuning
small-screen UI
suspend-friendly behavior
```

but that is game adaptation, not a new CNA operating-system port.

This distinction is useful:

```text
Steam Deck running CNA
```

does not mean CNA has gained Nintendo/PlayStation/Xbox console support.

It means CNA already runs on the PC operating system installed on that device.

---

## What would count as real console support?

CNA should not claim support for a console merely because somebody manages to compile a library.

A meaningful support milestone would require at least:

```text
configure with the real target toolchain
        │
        ▼
build CNA + Sharp Runtime
        │
        ▼
link a real executable
        │
        ▼
launch on console hardware
        │
        ▼
Game lifecycle works
        │
        ▼
graphics work
        │
        ▼
controller works
        │
        ▼
ContentManager works
        │
        ▼
audio works
        │
        ▼
storage works
```

A mature commercial target would require still more:

```text
suspend / resume
user switching
controller disconnect
save storage
system dialogs
error handling
network behavior
startup constraints
resource limits
certification requirements
```

Only then would it be reasonable to list the console as a genuinely supported CNA target.

---

## Possible future console categories

A reasonable long-term roadmap could therefore look like:

```text
Phase 1
    strengthen portable/restricted build profiles

Phase 2
    make Sharp Runtime work in restricted environments

Phase 3
    first public homebrew console

Phase 4
    additional old/homebrew systems

Phase 5
    licensed modern console,
    once official SDK access exists
```

There is little value in pretending that Phase 5 can be implemented properly without the required access.

---

## A possible first experiment

If CNA eventually decides to prove its console architecture with public tools, a system such as the **PlayStation Vita** remains an interesting candidate.

It offers a useful combination:

```text
real console
public homebrew SDK
public SDL support
C/C++ toolchain
reasonable hardware resources
```

A successful Vita experiment would provide strong evidence that CNA can survive outside normal desktop/mobile/web environments.

It would also reveal problems in:

```text
Sharp Runtime
filesystem assumptions
memory ownership
threading
content loading
input
build dependencies
```

before CNA attempts a much more legally and technically constrained modern console.

This remains a future idea, not current CNA support.

---

## Current status

The most important table in this article is therefore very simple:

| Platform family | CNA support today |
| --- | --- |
| Nintendo Switch / Switch 2 | No |
| PlayStation 4 / PlayStation 5 | No |
| Xbox One / Xbox Series X\|S | No |
| PlayStation Vita / PSP / PS2 / PS3 | No |
| Nintendo 3DS / Wii / GameCube | No |
| Dreamcast | No |
| Original Xbox | No |

There are currently **zero officially supported game-console targets in CNA**.

That statement should remain explicit until a console build has actually been implemented and tested.

---

## But console support is architecturally possible

The absence of current support should not be confused with an architectural dead end.

CNA already has several useful foundations:

```text
native C++

CNA Platform API

separate graphics renderer API

compile-time renderer selection

multiple host-platform implementations

many graphics backends

mobile and Web ports proving non-desktop lifecycle support

headless operation

XNA-compatible controller abstraction

content-system abstraction
```

These are exactly the types of boundaries a portable console framework needs.

The remaining work is substantial, but it is identifiable.

---

## Source code and documentation

The CNA repository is available at:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

The main existing console feasibility analysis is:

```text
misc/cnaconsoles.md
```

It describes:

- modern licensed consoles;
- older homebrew consoles;
- development toolchains;
- likely renderer mappings;
- restricted build profiles;
- filesystem requirements;
- Sharp Runtime concerns;
- platform-holder access;
- possible first console targets;
- lessons from FNA and MonoGame.

Some architectural statements in that document describe an older CNA state from before the current Platform API was completed.

The current platform architecture can be found primarily under:

```text
modules/platform/
```

with platform selection in:

```text
cmake/PlatformSelection.cmake
```

and graphics selection in:

```text
cmake/RendererSelection.cmake
```

The currently selectable platform implementations are:

```text
SDL3
SDL2
HEADLESS
TERMINAL
```

There is currently no Nintendo, PlayStation or Xbox implementation.

---

## Conclusion

CNA does **not currently support any game console**.

That includes both modern systems such as:

```text
Nintendo Switch
PlayStation 5
Xbox Series X|S
```

and older homebrew-accessible systems.

For current commercial consoles, the largest immediate obstacle is official platform access: CNA cannot build and test a real commercial-console port without the appropriate SDK, agreements and development hardware.

For older consoles, those legal restrictions are often much smaller, but technical restrictions become more severe:

```text
small memory
limited standard libraries
different filesystems
unusual graphics APIs
restricted threading
different lifecycle
specialized toolchains
```

CNA's architecture, however, is becoming increasingly suitable for this work.

The Platform API now separates host integration from the framework.

The graphics system separates renderers from the platform.

CNA is native C++.

Its renderer selection is compile-time.

And several existing renderers provide useful starting points for both modern and retro hardware.

So the correct description of CNA today is not:

> CNA supports consoles.

It does not.

Nor is it:

> CNA cannot support consoles.

There is no fundamental architectural reason why it could not.

The accurate statement is:

> Console support is a future CNA goal that now has much of the required framework architecture, but no console has yet been ported, built and verified.

When the first console actually runs a CNA game, that claim can change.

Until then, CNA's console support remains exactly:

```text
0 supported consoles
```
