---
title: What is xna4-spec?
date: 2026-11-15T15:54:03Z
updated: 2026-09-13T16:11:01Z
description: |
  xna4-spec is a machine-readable specification of the Microsoft XNA 4.0 API.
author: Robert Vokac
categories:
  - Tooling
tags:
  - Testing
  - API
  - xna4-spec
  - XNA 4.0
  - Compatibility
  - Specification
  - Tooling
originalUrl: https://blog.libcna.com/2026/11/15/what-is-xna4-spec/
classicpressId: 91
classicpressStatus: future
draft: false
---

**xna4-spec** is a machine-readable specification of the Microsoft XNA 4.0 API.

It converts the original Microsoft XNA documentation into structured XML files that can be searched, validated, compared, and processed automatically.

**GitHub:** [github.com/libcna/xna4-spec](https://github.com/libcna/xna4-spec)

## Web

You can convert these XML files into a website. A new `web` directory will be created.

![Web](https://github.com/libcna/xna4-spec/raw/develop/web.png)

## Example: Keyboard.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xna-type xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xsi:noNamespaceSchemaLocation="../../xna.xsd"
name="Keyboard" kind="class"
namespace="Microsoft.Xna.Framework.Input"
assembly="Microsoft.Xna.Framework.Input"
modifier="static">
<summary><![CDATA[Allows retrieval of keystrokes from a keyboard input device.]]></summary>
<syntax><![CDATA[public static class Keyboard]]></syntax>
<platforms>
<platform>Xbox 360</platform>
<platform>Windows XP SP2</platform>
<platform>Windows Vista</platform>
</platforms>
<constructors>
</constructors>
<properties>
</properties>
<methods>
<method name="GetState" returnType="KeyboardState" isStatic="true">
<summary><![CDATA[Returns the current keyboard state.]]></summary>
<overloads>
<overload signature="GetState(PlayerIndex)">
<summary><![CDATA[Returns the current Chatpad state for the specified player.]]></summary>
<syntax><![CDATA[public static KeyboardState GetState (
PlayerIndex playerIndex
)]]></syntax>
<parameters>
<parameter name="playerIndex" type="PlayerIndex"><![CDATA[Player index of the Chatpad to query.]]></parameter>
</parameters>
<returns><![CDATA[Current Chatpad state.]]></returns>
<exceptions>
<exception type="InvalidOperationException"><![CDATA[An invalid operation occurred when querying the Chatpad state.]]></exception>
</exceptions>
<remarks><![CDATA[Each player can have their own Chatpad, which is queried as a keyboard. To query an attached USB keyboard instead, use the GetState method that does not require a player index. This method works on Xbox 360 platforms only. Windows does not include driver support for the ChatPad. This method is included in the assemblies for Windows, but it is effectively a null function on that platform. Calls to Keyboard.GetState(playerIndex) from a Windows application are accepted, but will never return a ChatPad state change (key press or release).]]></remarks>
<platforms>
<platform>Xbox 360</platform>
<platform>Windows XP SP2</platform>
<platform>Windows Vista</platform>
<platform>Zune</platform>
</platforms>
</overload>
</overloads>
</method>
</methods>
<fields>
</fields>
<events>
</events>
</xna-type>
```

## Why does it exist?

The original XNA documentation was written for people.

That is useful when you want to read about `SpriteBatch.Draw()` or `GraphicsDevice.Clear()`.

It is less useful when you want to answer questions such as:

- Which XNA types are still missing from CNA?
- Does CNA expose every property of `GraphicsDevice`?
- How many overloads of a method existed?
- Which APIs were Windows-only?
- Which interfaces did a class implement?
- Which exceptions were documented?
- How complete is an XNA reimplementation?

For those questions, structured data is much more useful than thousands of HTML documentation pages.

That is what xna4-spec provides.

## One XML file per XNA type

The repository contains one XML document for each class, struct, interface, enum, or delegate.

For example:

```text
Microsoft.Xna.Framework/
├── Game.xml
├── GameTime.xml
├── Matrix.xml
├── Vector2.xml
├── Vector3.xml
└── ...

Microsoft.Xna.Framework.Graphics/
├── GraphicsDevice.xml
├── SpriteBatch.xml
├── Texture2D.xml
├── BasicEffect.xml
└── ...
```

There is also a master:

```text
index.xml
```

which provides an index across the complete specification.

## What is stored?

The XML contains considerably more than just type names.

For a class such as `SpriteBatch`, the specification can record:

- namespace
- assembly
- type kind
- implemented interfaces
- description
- constructors
- properties
- fields
- methods
- method overloads
- parameters
- return values
- exceptions
- remarks
- original C# syntax
- platform availability

For example, an overload is not merely recorded as:

```text
Begin
```

but with its complete signature and parameter information.

That makes automated comparison much more useful.

## A schema for XNA

The repository contains an XML Schema:

**[xna.xsd](https://github.com/libcna/xna4-spec/blob/develop/xna.xsd)**

It defines the structure of the specification.

For example, it knows that an XNA type can be:

```text
class
struct
enum
interface
delegate
```

and defines structured representations for constructors, properties, methods, overloads, fields, events, parameters, exceptions, platform information, and other metadata.

This means the XML files are not just loosely structured notes.

They can be validated against a common schema.

## Current scope

The current specification covers **19 XNA namespaces** and approximately **544 types**.

Large areas include:

- `Microsoft.Xna.Framework`
- `Microsoft.Xna.Framework.Graphics`
- `Microsoft.Xna.Framework.Graphics.PackedVector`
- `Microsoft.Xna.Framework.Audio`
- `Microsoft.Xna.Framework.Input`
- `Microsoft.Xna.Framework.Input.Touch`
- `Microsoft.Xna.Framework.Media`
- `Microsoft.Xna.Framework.Net`
- `Microsoft.Xna.Framework.Storage`
- `Microsoft.Xna.Framework.Content`
- `Microsoft.Xna.Framework.GamerServices`

It also contains the XNA Content Pipeline namespaces, including graphics, audio, processors, serialization, and build tasks.

So xna4-spec describes more than just the runtime API normally used by a game.

## Where did the information come from?

The data was converted from Microsoft's original XNA 4.0 documentation, historically published under the previous-versions section of Microsoft Learn.

xna4-spec is therefore **not an independently invented XNA API**.

It is a structured representation of Microsoft's documentation.

The repository also preserves Microsoft's ownership and attribution for that documentation and is explicitly an unofficial community project.

## Why is this useful for CNA?

CNA is trying to reproduce the XNA 4.0 programming model in C++.

That creates a very practical question:

> How do we know when the API surface is complete?

Without a machine-readable reference, this can become a manual process.

Someone opens the XNA documentation.

Then opens CNA.

Then compares classes and members one by one.

That does not scale very well.

With xna4-spec, the process can instead become:

```text
XNA 4.0 specification
        ↓
   automated audit
        ↓
CNA public API
        ↓
missing / implemented / different
```

A tool can iterate through the specification and compare it against CNA.

## API completeness reports

This makes xna4-spec particularly useful for generating compatibility reports.

Imagine that the specification says:

```text
Texture2D

Constructors: 4
Properties:   12
Methods:      18
```

An audit can inspect CNA and determine:

```text
Implemented: 31
Missing:      3
Different:    0
```

That provides a much stronger basis for compatibility work than simply saying:

> Texture2D is implemented.

A type can exist while still missing important constructors, overloads, properties, or behavior.

## Overloads matter

XNA makes heavy use of method overloads.

`SpriteBatch.Draw`, for example, has many variations.

A simplistic API database that records only:

```text
SpriteBatch.Draw
```

would lose a large amount of important compatibility information.

xna4-spec records individual signatures.

That allows an audit to distinguish between:

```text
Draw(Texture2D, Vector2, Color)
```

and:

```text
Draw(
    Texture2D,
    Rectangle,
    Rectangle?,
    Color,
    float,
    Vector2,
    SpriteEffects,
    float)
```

For a compatibility project, that distinction is essential.

## Platform information

The original XNA ecosystem was not limited to one platform.

Documentation contains APIs associated with:

- Windows
- Xbox 360
- Windows Phone

xna4-spec preserves platform information from the original documentation.

This is useful even though CNA does not necessarily intend to reproduce every historical XNA platform.

It lets an audit distinguish between:

```text
missing API
```

and:

```text
historical API outside CNA's intended target
```

That prevents compatibility statistics from becoming misleading.

## The Content Pipeline is included too

Another interesting part of the repository is the XNA Content Pipeline API.

Namespaces include areas such as:

```text
Microsoft.Xna.Framework.Content.Pipeline
Microsoft.Xna.Framework.Content.Pipeline.Audio
Microsoft.Xna.Framework.Content.Pipeline.Graphics
Microsoft.Xna.Framework.Content.Pipeline.Processors
Microsoft.Xna.Framework.Content.Pipeline.Serialization.Compiler
Microsoft.Xna.Framework.Content.Pipeline.Serialization.Intermediate
Microsoft.Xna.Framework.Content.Pipeline.Tasks
```

CNA's content architecture does not have to reproduce every part of Microsoft's original design-time toolchain exactly.

But having the original API documented in a structured format is still valuable when deciding what should be compatible, replaced, or intentionally excluded.

## It is an offline reference

Another simple benefit is preservation.

The original XNA documentation is old.

Websites change.

URLs disappear.

Documentation can be reorganized or eventually removed.

xna4-spec keeps a structured copy of the relevant API information inside a Git repository.

That makes it possible to inspect the XNA 4.0 API without depending entirely on Microsoft's current website remaining available forever.

For a project concerned with software longevity, that matters.

## It is not a behavioral specification

There is an important limitation.

xna4-spec primarily describes the **documented API contract**.

It cannot automatically tell us every detail of how Microsoft's original implementation behaved.

Documentation might say:

```text
Matrix.Invert(Matrix)
```

and provide its signature and description.

But that does not necessarily tell us every floating-point edge case of Microsoft's implementation.

Likewise, documentation may omit implementation quirks that real XNA applications depend on.

So CNA compatibility work needs several kinds of evidence:

```text
xna4-spec
    ↓
What API was documented?

Original XNA runtime / reference investigation
    ↓
How did it actually behave?

Tests and samples
    ↓
Does CNA reproduce that behavior?
```

xna4-spec is therefore an important **API oracle**, but not the only compatibility oracle.

## Different from the CNA Bible

xna4-spec and the CNA Bible also have very different purposes.

### xna4-spec

Answers:

> What does the XNA 4.0 API contain?

It is primarily structured machine-readable data.

### CNA Bible

Answers:

> How does CNA work?

It is a long-form technical book about CNA's implementation, architecture, renderers, content, testing, ecosystem, and other topics.

The relationship is roughly:

```text
xna4-spec
    ↓
reference for original XNA API

CNA
    ↓
implementation

CNA Bible
    ↓
documentation of CNA and its architecture
```

They complement each other rather than duplicate each other.

## Useful beyond CNA

Although xna4-spec was created with CNA compatibility work in mind, it is not inherently tied to CNA.

Any project implementing or studying XNA 4.0 could potentially use the data.

For example, it could be used to:

- audit another XNA implementation
- generate API tables
- build documentation tools
- study the original framework
- compare XNA-compatible frameworks
- generate test inventories
- identify platform-specific APIs
- preserve XNA API metadata

The repository is simply structured XNA information.

What a tool does with it is a separate question.

## A machine-readable map of XNA 4.0

CNA is large, but its compatibility target is large too.

XNA 4.0 contains hundreds of types spread across graphics, audio, input, media, content, networking, storage, Gamer Services, the Content Pipeline, and other areas.

Keeping that target in a machine-readable form makes compatibility work much more systematic.

Instead of relying on memory or manually browsing old documentation, CNA can ask:

```text
What existed in XNA?
What have we implemented?
What is intentionally out of scope?
What is still missing?
```

That is what **xna4-spec** is for:

**a structured, offline, machine-readable map of the XNA 4.0 API that can be used to measure and guide compatibility work.**
