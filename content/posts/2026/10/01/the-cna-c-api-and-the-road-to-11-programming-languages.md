---
title: CNA Language Ecosystem: C++, 2 Active Bindings and 8 Archived Bindings
date: 2026-10-01T12:07:15Z
updated: 2026-10-02T14:42:54Z
description: |
  CNA is written in C++23.
author: Robert Vokac
categories:
  - Projects
tags:
  - C API
  - Bindings
  - C#
  - Java
  - TypeScript
  - Python
  - Rust
  - Go
  - Swift
  - Ruby
  - Common Lisp
originalUrl: https://blog.libcna.com/2026/10/01/the-cna-c-api-and-the-road-to-11-programming-languages/
classicpressId: 36
classicpressStatus: publish
draft: false
---

CNA is written in C++23.

That remains its native implementation language.

But C++ is not the only language in which applications can be built on top of CNA.

Today, the CNA language ecosystem has an active support surface:

- **C++** - the native CNA implementation
- **C** - active binding
- **C#** - active binding

Eight additional language bindings were developed during CNA's evolution and reached substantial levels of functionality and are archived now under CNA Lab:

- Java
- TypeScript
- Python
- Rust
- Go
- Swift
- Ruby
- Common isp

The revival can happen for any of these eight archived binding if there is an interest.

That means CNA has reached eleven programming languages during its development, while deliberately committing to long-term maintenance of a much smaller set.

## Current language status

| Language | Status | Role |
| --- | --- | --- |
| C++ | Core | Native CNA implementation |
| C | Active | Official C binding and native ABI consumer |
| C# | Active | Official .NET/XNA-oriented binding |
| Java | Archived | Preserved in CNA Lab |
| TypeScript | Archived | Preserved in CNA Lab |
| Python | Archived | Preserved in CNA Lab |
| Rust | Archived | Preserved in CNA Lab |
| Go | Archived | Preserved in CNA Lab |
| Swift | Archived | Preserved in CNA Lab |
| Ruby | Archived | Preserved in CNA Lab |
| Common Lisp | Archived | Preserved in CNA Lab |

Archived does not mean that these projects never worked or that their development was wasted.

It means CNA no longer promises to keep them synchronized with every future change to the framework.

## One C++ framework, multiple languages

CNA is not reimplemented separately for every programming language.

There is one canonical framework:

**CNA in C++.**

A native C++ application talks directly to it:

```text
C++ application
      ↓
    CNA C++
      ↓
platform / renderer / audio
```

The language bindings ultimately reach the same implementation through CNA's native C ABI:

```text
C / C#
      ↓
language binding / FFI
      ↓
    CNA C ABI
      ↓
     CNA C++
      ↓
platform / renderer / audio
```

The archived bindings were built around the same architecture.

## Why the C API matters

Exposing the C++ ABI directly to several different programming languages would be difficult and fragile.

The CNA C API translates C++ concepts into constructs that foreign-function interfaces can consume:

| C++ concept | C API |
| --- | --- |
| Object/resource | opaque CNA_Handle |
| Value type | fixed-layout CNA_* structure |
| Constructor | create function |
| Method | C function |
| Property | get/set functions |
| Overload | explicitly named function variant |
| Exception | CNA_Result + error information |
| Event/delegate | function pointer + context |
| Collection | query/copy operations |

The public C API uses C17-compatible headers and deliberately avoids exposing C++ implementation details.

It also defines ownership explicitly.

A handle can be owned, borrowed, retained or transferred rather than forcing another language runtime to guess how a C++ object's lifetime works.

## The C API is a CNA subsystem of its own

The C API is not a tiny wrapper containing a handful of functions required by a demonstration.

It lives directly inside the CNA repository and evolves together with the C++ framework.

It covers large parts of CNA's public surface and provides the interoperability foundation on which the maintained higher-level bindings depend.

## A versioned ABI

The C ABI is versioned so that a language binding can identify native library generations it has actually been qualified against.

A binding should not simply load an arbitrary version of `libcna_c_api` and hope that its assumptions remain valid.

Bindings can maintain explicit compatibility policies and reject ABI generations they have not reviewed.

## The two active bindings

The actively maintained language-binding set is deliberately limited to C and C#.

Together they cover several very different environments while keeping CNA's long-term maintenance surface manageable.

## C

[https://github.com/libcna/cna-c-template](https://github.com/libcna/cna-c-template)

C is the most direct consumer of CNA's public C API.

There is no additional high-level runtime between the application and the ABI:

```text
C application
    ↓
 CNA C API
    ↓
  CNA C++
```

If CNA concepts can be expressed cleanly through a strict C boundary, those same concepts become much easier to expose to other runtimes.

C therefore serves two roles:

- it is a useful application interface in its own right
- it continuously tests whether CNA's interoperability boundary remains understandable without C++ language features.

## C#

[https://github.com/libcna/cna-cs](https://github.com/libcna/cna-cs)

[https://github.com/libcna/cna-cs-template](https://github.com/libcna/cna-cs-template)

[https://github.com/libcna/cna-cs-samples](https://github.com/libcna/cna-cs-samples)

C# has a special place in CNA because **XNA itself was primarily a C# framework**.

The CNA.NET / `cna-cs` stack can expose the familiar XNA programming model while eventually reaching the native CNA implementation:

```text
C# XNA application
        ↓
CNA.XnaCompat
Microsoft.Xna.Framework facade
        ↓
CNA.Framework
        ↓
CNA.Interop / PInvoke
        ↓
CNA C ABI
        ↓
CNA C++
```

One of the goals is source compatibility with software written around the original XNA 4.0 programming model.

That also creates a useful testing strategy.

Original XNA C# samples can be run against the CNA C# binding.

When a sample does not work, the failure can expose a problem in the C# projection, the C API or CNA itself.

Instead of modifying the sample merely to hide the difference, the framework can be improved.

Old XNA software therefore becomes a compatibility test suite for the entire stack.

## The eight archived bindings

Java, TypeScript, Python, Rust, Go, Swift, Ruby and Common Lisp are different from abandoned prototypes.

Substantial implementations were created for all eight languages.

The decision to archive them is primarily a decision about **future maintenance scope**.

Their code remains available in CNA Lab together with their Git history.

## Java - archived

The Python binding is preserved in CNA Lab.

CNA-Java uses a private JNI adapter over the C ABI:

```text
Java application
       ↓
Microsoft.Xna.Framework.*
       ↓
private Java/JNI layer
       ↓
    CNA C ABI
       ↓
      CNA C++
```

The project is intended to expose recognizable XNA concepts as Java objects rather than forcing normal application code to manipulate native handles.

Java also gives CNA a path into the JVM ecosystem and provides a very different runtime environment from C++ and .NET.

## TypeScript - archived

The Python binding is preserved in CNA Lab.

CNA-TypeScript is particularly interesting because it can bridge the desktop/native and browser worlds.

Its TypeScript source also produces JavaScript that can be consumed without requiring application developers to write TypeScript themselves.

The project has two fundamentally different runtime paths.

A native application can use a bridge into CNA:

```text
TypeScript
    ↓
native bridge
    ↓
 CNA C ABI
    ↓
 native CNA
```

A browser application can instead use WebAssembly:

```text
TypeScript / JavaScript
          ↓
      WebAssembly
          ↓
          CNA
          ↓
browser graphics / platform
```

This makes TypeScript an important part of CNA's maintained binding set because it covers an environment very different from C, C# and Java.

## Python - archived

The Python binding is preserved in CNA Lab.

Its architecture used a private `ctypes` layer:

```text
Python
  ↓
Microsoft.Xna.Framework.*
  ↓
private ctypes layer
  ↓
CNA C ABI
  ↓
CNA C++
```

The project grew far beyond a small experimental wrapper.

It projected a large XNA-style object model into Python and exercised lifecycle, graphics, textures, `SpriteBatch`, content, effects, models, audio, media and other CNA functionality.

Python is no longer part of CNA's actively maintained binding matrix, but that work remains preserved as part of CNA's development history.

## Rust - archived

The Rust binding is preserved in CNA Lab.

CNA-Rust placed a safer Rust layer over a lower-level native interface:

```text
Rust game
   ↓
safe CNA Rust layer
   ↓
low-level interop
   ↓
CNA C ABI
   ↓
CNA C++
```

Rust was an especially useful language for testing CNA's ownership model.

Questions around owned and borrowed handles, deterministic resource release and lifetime rules become much harder to ignore when the consumer language has a strong ownership system of its own.

Even though the binding is archived, those lessons remain useful to the active C API.

## Go - archived

The Go binding and its template are preserved in CNA Lab.

Its architecture used a private cgo boundary:

```text
Go
 ↓
Microsoft/Xna/Framework
 ↓
internal interop
 ↓
CNA C ABI
 ↓
CNA C++
```

The project developed a substantial measured projection of the XNA-style API and exercised real CNA lifecycle, graphics and input functionality.

It is no longer an active CNA binding and receives no forward compatibility guarantee.

## Swift - archived

The Swift binding is preserved in CNA Lab.

It projected XNA-style concepts over the CNA C ABI using Swift's native interoperability mechanisms.

Swift was useful not only as another language experiment but also because it exercised CNA from an ecosystem closely associated with Apple platforms.

Its archived state separates preservation of that work from the obligation to continuously qualify it against every future CNA change.

## Ruby - archived

The Ruby binding and template are preserved in CNA Lab.

CNA-Ruby used Ruby's `Fiddle` FFI over the CNA C ABI.

It was developed as a measured projection of the selected XNA-style API rather than merely as a handful of hand-written demonstration wrappers.

Like the other archived bindings, it remains useful as a reference implementation and as evidence of how broadly the C API was exercised during CNA's development.

## Common Lisp - archived

The Common Lisp binding and template are preserved in CNA Lab.

## One programming model across eleven languages

The eleven-language effort demonstrated something important even though CNA no longer intends to actively maintain all eleven paths.

**Game → GraphicsDeviceManager → GraphicsDevice → Draw → rendering.**

A tiny XNA-style game might simply create a game object and clear the screen to Cornflower Blue.

In C++, that can look like this:

```cpp
#include "Microsoft/Xna/Framework/Game.hpp"
#include "Microsoft/Xna/Framework/Color.hpp"
#include "Microsoft/Xna/Framework/GraphicsDeviceManager.hpp"

using namespace Microsoft::Xna::Framework;

class BlueGame final : public Game {
public:
    BlueGame() : graphics_(this) {}

protected:
    void Draw(const GameTime& time) override {
        getGraphicsDeviceProperty().Clear(Color::CornflowerBlue);
        Game::Draw(time);
    }

private:
    GraphicsDeviceManager graphics_;
};

int main() {
    BlueGame game;
    game.Run();
}
```

The C# equivalent preserves the programming model familiar to XNA developers:

```csharp
using Microsoft.Xna.Framework;

sealed class BlueGame : Game
{
    private readonly GraphicsDeviceManager graphics;

    public BlueGame()
    {
        graphics = new GraphicsDeviceManager(this);
    }

    protected override void Draw(GameTime gameTime)
    {
        GraphicsDevice.Clear(Color.CornflowerBlue);
        base.Draw(gameTime);
    }
}

using var game = new BlueGame();
game.Run();
```

Java expresses the same basic structure using its own object model:

```java
import Microsoft.Xna.Framework.Color;
import Microsoft.Xna.Framework.Game;
import Microsoft.Xna.Framework.GameTime;
import Microsoft.Xna.Framework.GraphicsDeviceManager;

public final class BlueGame extends Game {
    private final GraphicsDeviceManager graphics;

    public BlueGame() {
        graphics = new GraphicsDeviceManager(this);
    }

    @Override
    protected void Draw(GameTime gameTime) {
        getGraphicsDevice().Clear(Color.CornflowerBlue);
        super.Draw(gameTime);
    }

    public static void main(String[] args) {
        try (BlueGame game = new BlueGame()) {
            game.Run();
        }
    }
}
```

And TypeScript can preserve the same recognizable concepts:

```typescript
import {
    Color,
    Game,
    type GameTime,
    GraphicsDeviceManager
} from "cna-ts";

class BlueGame extends Game {
    public constructor() {
        super();
        new GraphicsDeviceManager(this);
    }

    protected override Draw(gameTime: GameTime): void {
        this.GraphicsDevice.Clear(Color.CornflowerBlue);
        super.Draw(gameTime);
    }
}

const game = new BlueGame();
game.Run();
```

The archived bindings explored equivalent models in Python, Rust, Go, Swift, Ruby and Common Lisp.

## CNA Cross-Language 3D Demo?

[https://github.com/libcna/cna-multi-language-3d-demo](https://github.com/libcna/cna-multi-language-3d-demo)

The **CNA Cross-Language 3D Demo** was created as a much stronger test than simply clearing a screen.

Its game, **CNA Starfield Courier**, is a small third-person 3D application with:

- multiple sectors
- a controllable player craft
- collectibles
- moving hazards
- a chase camera
- perspective 3D rendering
- a HUD
- collision detection
- score and timers
- win and loss states
- sound effects
- background music

The reference implementation uses CNA's public XNA-style API rather than OpenGL directly, SDL rendering or renderer internals.

Future work should primarily target the native C++ implementation and the two actively maintained bindings:

```text
Starfield Courier — C++
Starfield Courier — C
Starfield Courier — C#
```
