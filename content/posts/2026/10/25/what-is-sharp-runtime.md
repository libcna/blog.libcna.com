---
title: What is Sharp Runtime?
date: 2026-10-25T13:25:19Z
updated: 2026-09-19T16:15:07Z
description: |
  Sharp Runtime is a C++23 implementation of a practical subset of the .NET System.* libraries.
author: Robert Vokac
categories:
  - Development
tags:
  - C#
  - Sharp Runtime
  - .NET
  - System
  - Porting
  - CNA
originalUrl: https://blog.libcna.com/2026/10/25/what-is-sharp-runtime/
classicpressId: 56
classicpressStatus: future
draft: false
---

**Sharp Runtime** is a C++23 implementation of a practical subset of the .NET `System.*` libraries.

It exists primarily to make it easier to port C# frameworks, libraries, games, and tools to native C++ while preserving familiar .NET concepts and APIs.

Sharp Runtime is an important foundation library in the CNA ecosystem, but it is also an independent project.

Most importantly:

**Sharp Runtime is not a CLR and it is not an attempt to reimplement the entire .NET platform.**

There is no JIT compiler, garbage collector, IL execution engine, or general-purpose .NET runtime.

Instead, Sharp Runtime implements useful `System.*` functionality directly in C++23.

**GitHub:** [https://github.com/libcna/sharp-runtime](https://github.com/libcna/sharp-runtime)

**Website:** [https://sharpruntime.com](https://sharpruntime.com)

## Why does Sharp Runtime exist?

CNA itself is a C++ reimplementation of XNA 4.0.

But XNA was originally written for C#, and C# applications depend on much more than just `Microsoft.Xna.Framework`.

They also use types such as:

```text
System.String
System.DateTime
System.TimeSpan
System.Exception
System.IO.Stream
System.Collections.Generic.List<T>
System.Threading.Tasks.Task
System.Net.*
System.Text.*
```

When translating C# code into C++, these dependencies quickly become a problem.

One option would be to rewrite every use of .NET APIs into unrelated C++ equivalents.

For example:

```text
System.String         → std::string
System.DateTime       → custom date library
System.IO.Stream      → custom stream abstraction
Task<T>               → custom async system
List<T>               → std::vector
```

Sometimes that is appropriate.

But for a large port, constantly redesigning every API can make the resulting C++ code very different from the original C# source.

Sharp Runtime provides another option:

**keep much of the original .NET programming model while implementing it natively in C++.**

## A bridge between C# and C++

Conceptually, Sharp Runtime sits here:

```text
Original C# project
        ↓
C++ port
        ↓
Sharp Runtime
        ↓
C++ standard library / native OS
```

A translated class can often retain recognizable APIs and structure rather than being completely redesigned around the C++ standard library.

That makes Sharp Runtime particularly useful for projects where fidelity to an existing C# codebase matters.

## What does Sharp Runtime contain?

Sharp Runtime already covers a broad range of .NET-style functionality.

The current project includes areas such as:

- core value types and strings
- dates and times
- exceptions
- delegates
- spans
- collections
- concurrent and asynchronous collections
- text processing
- regular expressions
- globalization
- JSON
- XML and LINQ to XML
- streams and files
- compression and ZIP archives
- hashing
- sockets and networking
- HTTP
- MIME
- WebSockets
- threading
- tasks and continuations
- channels
- timers
- synchronization primitives
- numerics
- HMAC and PBKDF2
- secure random-number generation

The project is currently divided into **41 independently selectable CMake components**, rather than forcing every application to link the entire library.

## It follows .NET where practical

The public API intentionally follows .NET naming and behavior when that maps reasonably to C++.

For example, a port can use namespaces resembling:

```cpp
System::IO
System::Text
System::Net
System::Collections
System::Threading
```

This is useful when translating an existing codebase because the relationship to the original source remains visible.

But Sharp Runtime is still a C++ library.

Internally it uses C++ concepts such as:

- RAII
- deterministic destruction
- standard-library ownership
- templates
- native C++ exceptions
- fixed-width types

It does not try to make C++ behave exactly like managed C# at all costs.

## No garbage collector

This is one of the largest differences from .NET.

C# normally relies on garbage collection.

Sharp Runtime does not implement one.

Object lifetime follows C++ rules and uses mechanisms such as RAII and standard smart pointers where appropriate.

That means Sharp Runtime can preserve many .NET-style APIs without requiring the entire application to run inside a managed runtime.

The final program remains a native C++ application.

## No CLR or IL execution

Sharp Runtime also does not execute .NET assemblies.

The architecture is **not**:

```text
C# assembly
   ↓
Sharp Runtime
   ↓
execute IL
```

Instead, the source itself is ported to C++:

```text
C# source
   ↓
C++ translation
   ↓
Sharp Runtime APIs
   ↓
native executable
```

There is no Common Intermediate Language interpreter, JIT compiler, or CLR execution environment involved.

## Sharp Runtime and CNA

CNA and Sharp Runtime solve different problems.

CNA provides the XNA framework:

```text
Microsoft.Xna.Framework.*
```

Sharp Runtime provides much of the supporting .NET-style environment:

```text
System.*
```

Together, they make it much easier to translate software that originally looked like:

```text
C#
 ├── System.*
 └── Microsoft.Xna.Framework.*
```

into:

```text
C++23
 ├── Sharp Runtime
 └── CNA
```

This is why the two projects are often checked out side by side.

```text
project/
├── cna/
├── sharp-runtime/
└── my-game/
```

CNA does not need to become a complete implementation of the .NET Base Class Library because Sharp Runtime can provide that responsibility separately.

## Useful beyond CNA

Sharp Runtime is not limited to XNA applications.

Any project translating C# software into C++ can potentially use it.

For example, another library in the CNA organization is **cna-extended**, a C++ port of MonoGame.Extended.

That project can preserve much more of the structure of the original C# library because both CNA and Sharp Runtime provide familiar equivalents of the APIs it originally depended on.

The same approach can potentially be applied to other C# libraries where a native C++ port is desirable.

## Select only what you need

Sharp Runtime used to be easier to think of as one large compatibility library.

Its architecture is now much more modular.

Applications can request individual components through CMake.

For example, a program that only needs JSON support can request:

```cmake
set(SHARP_RUNTIME_COMPONENTS
    Text.Json
)
```

CMake then resolves the required dependency closure.

It does not automatically pull in unrelated areas such as networking, XML, threading, or every other Sharp Runtime feature.

Alternatively, applications that really need the complete runtime can request:

```text
SharpRuntime::All
```

This component system keeps the library useful for both small and very large consumers.

## Components have enforced boundaries

The modular structure is not only documentation.

Sharp Runtime has tooling that checks the dependency graph between modules.

The current graph contains **41 physical modules and 96 direct production dependency edges**.

Validation checks include:

- undeclared dependencies
- invalid includes
- dependency cycles
- duplicate public paths
- selective builds
- accidental component leakage

The intention is to prevent the library from gradually becoming one giant interconnected module where every feature depends on everything else.

## A large test suite

Compatibility libraries need extensive behavioral tests.

The current documented Linux baseline contains **17,840 passing tests across 38 test executables**, with no failures or skips.

The complete production graph is also built warning-free with GCC and separately checked with Clang using `-Werror`.

This is particularly important for Sharp Runtime because an API can have the correct C++ signature while still behaving differently from the corresponding .NET API.

The goal is not merely to reproduce names.

Behavior matters too.

## Cross-platform by design

Sharp Runtime is primarily developed and fully tested on Linux today, but it is designed to compile across additional environments.

The repository already contains evidence for:

- Linux/GCC
- Linux/Clang
- Windows/MinGW
- Emscripten
- macOS/Apple Clang

Some functionality naturally varies by platform.

When an operation genuinely cannot be provided, the preferred behavior is to report that explicitly — for example through `PlatformNotSupportedException` — rather than silently pretending that it worked.

## Intentional limits

Sharp Runtime deliberately does **not** try to implement every part of .NET.

Among the major exclusions are:

- CLR execution
- JIT compilation
- garbage collection
- general runtime reflection
- P/Invoke
- full serialization infrastructure
- late-bound `DynamicInvoke`
- X.509 certificate infrastructure
- TLS / `SslStream`
- symmetric and asymmetric encryption

Some cryptographic primitives such as hashing, HMAC, PBKDF2, and secure random generation remain in scope.

These boundaries keep the project focused on APIs that make sense for native C++ ports.

## Sharp Runtime is still evolving

The current published version is **0.1.0-beta.1**.

The project is therefore already in beta, but its public API can still change before a future stable release.

Like CNA, Sharp Runtime is a large compatibility project.

There are many details where C# and C++ have fundamentally different language and runtime semantics, and those differences have to be handled deliberately rather than hidden.

## Why not just use the C++ standard library?

For a new C++ application, that may often be the right choice.

If I were writing completely new code, I would not automatically replace:

```cpp
std::vector
std::string
std::filesystem
std::chrono
```

with .NET-shaped equivalents.

Sharp Runtime serves a different purpose.

It becomes valuable when the problem is:

> I already have a large C# codebase. How can I move it to C++ without redesigning every dependency at the same time?

For that problem, retaining recognizable `System.*` concepts can dramatically simplify the port.

## The role of Sharp Runtime

The CNA ecosystem can therefore be viewed as two complementary compatibility layers:

```text
Original C# / XNA software

        System.*
           ↓
     Sharp Runtime

Microsoft.Xna.Framework.*
           ↓
           CNA

            ↓

      Native C++23
```

Sharp Runtime handles much of the general .NET-style foundation.

CNA handles the XNA-specific framework.

Neither one runs the original CLR.

Together, they make it possible to preserve much more of the structure and behavior of software originally written for the C# and XNA ecosystem while producing a native C++ application.

That is the purpose of Sharp Runtime:

**not to recreate all of .NET, but to provide enough of its familiar runtime libraries to make serious C#-to-C++ ports practical.**
