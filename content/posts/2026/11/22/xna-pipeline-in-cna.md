---
title: XNA Pipeline in CNA
date: 2026-11-22T16:21:40Z
updated: 2026-09-13T16:38:22Z
description: |
  One of the most difficult parts of XNA compatibility is not rendering.
author: Robert Vokac
categories:
  - Development
tags:
  - Testing
  - XNA 4.0
  - Compatibility
  - XNB
  - XNA Content Pipeline
  - Content
  - ContentManager
originalUrl: https://blog.libcna.com/2026/11/22/xna-pipeline-in-cna/
classicpressId: 99
classicpressStatus: future
draft: false
---

One of the most difficult parts of XNA compatibility is not rendering.

It is content.

A typical XNA game does not load its original PNG, FBX, WAV or SpriteFont description directly at runtime. Those assets first pass through the **XNA Content Pipeline** and are transformed into compiled `.xnb` files.

CNA therefore needs to solve two different problems:

```text
source assets
    ↓
XNA-compatible Content Pipeline
    ↓
.xnb files
```

and:

```text
.xnb files
    ↓
ContentManager
    ↓
runtime CNA objects
```

Modern CNA can do both.

It can **read real XNB files**, including files produced by Microsoft's original XNA 4.0 tooling, and it now also contains a native C++ implementation of the XNA-style Content Pipeline capable of producing XNB files itself.

**CNA:** [github.com/libcna/cna](https://github.com/libcna/cna)

## What is an XNB file?

An `.xnb` file is XNA's compiled runtime-content container.

A source asset might begin as:

```text
player.png
ship.fbx
explosion.wav
font.spritefont
effect.fx
```

The XNA Content Pipeline transforms it into something optimized for loading by the game:

```text
player.xnb
ship.xnb
explosion.xnb
font.xnb
effect.xnb
```

An XNB contains more than a blob of asset data.

It also contains information describing how the object should be reconstructed at runtime, including a table of **ContentTypeReaders**.

Conceptually:

```text
XNB
├── header
├── type reader table
├── shared resource count
├── root object
└── shared resources
```

The runtime reads the table, constructs the necessary readers and then reconstructs the object graph.

That mechanism is one of the reasons XNB compatibility is substantially harder than simply parsing a PNG or WAV file.

## XNB loading in CNA

CNA implements the familiar XNA content architecture:

```text
ContentManager
      ↓
ContentReader
      ↓
ContentTypeReaderManager
      ↓
ContentTypeReader<T>
      ↓
CNA object
```

When an application asks for:

```cpp
auto texture = Content.Load<Texture2D>("Textures/player");
```

CNA's content resolution can find an XNB and deserialize it through the same basic reader model used by XNA.

In the current content-resolution order, `.xnb` is tried before CNA's other content representations.

This makes existing XNA content a first-class compatibility path rather than something that has to be converted manually before CNA can use it.

## ContentTypeReaders

An XNB usually contains the name of the reader expected to deserialize each object type.

Examples include:

```text
Texture2DReader
SpriteFontReader
SoundEffectReader
ModelReader
BasicEffectReader
ListReader<T>
DictionaryReader<TKey,TValue>
```

CNA implements a large set of these readers natively in C++.

Current support includes primitive values, XNA mathematics, collections, textures, SpriteFonts, audio, models, buffers, stock effects and several other runtime content types.

For example, CNA can read XNB content for:

- integers, floats, strings and other primitives
- `Vector2`, `Vector3`, `Vector4`
- `Matrix`
- `Quaternion`
- `Color`
- bounding volumes
- `Curve`
- `Texture2D`
- `Texture3D`
- `TextureCube`
- `SpriteFont`
- `SoundEffect`
- `Song`
- vertex and index buffers
- vertex declarations
- XNA stock effects
- `Model`
- external references
- shared resources
- compiled effects where the active renderer supports them

The `ModelReader` is particularly important because an XNA model is not a simple mesh.

It can contain:

```text
Model
├── bones
├── meshes
│   └── mesh parts
│       ├── VertexBuffer
│       ├── IndexBuffer
│       └── Effect
├── bounding volumes
├── shared GPU resources
└── Tag
```

CNA reconstructs this object graph, including shared-resource relationships rather than simply creating independent copies of every referenced object.

## Registering the built-in readers

There is an important architectural difference between C# and C++.

CNA cannot ask the CLR to discover reader classes for it.

Its reader registry therefore begins empty.

The built-in readers are registered explicitly:

```cpp
#include "CNA/Internal/Xnb/XnbBuiltInReaders.hpp"

CNA::Internal::Xnb::RegisterAllBuiltInXnbReaders();
```

This is intentionally idempotent, so an application can safely perform the registration during startup.

Once registered, XNB loading can resolve the reader names stored inside the file.

## Custom ContentTypeReaders

XNA games are not restricted to Microsoft's built-in asset types.

A game can define its own runtime data:

```text
LevelData
DialogueTree
Quest
ParticleSettings
AnimationDatabase
```

and supply its own `ContentTypeReader`.

CNA supports the same idea.

A native reader can derive from:

```cpp
ContentTypeReader<MyLevelData>
```

and implement the payload reader:

```cpp
class MyLevelDataReader
    : public ContentTypeReader<MyLevelData>
{
public:
    MyLevelDataReader()
        : ContentTypeReader<MyLevelData>(
            "MyGame.Content.MyLevelData")
    {
    }

protected:
    MyLevelData Read(
        ContentReader& input,
        std::optional<MyLevelData> existing) override
    {
        MyLevelData data =
            existing.value_or(MyLevelData{});

        data.roomCount = input.ReadInt32();

        return data;
    }
};
```

The reader is then registered using the exact identity stored in the XNB:

```cpp
ContentTypeReaderManager::AddTypeCreator(
    "MyGame.Content.MyLevelDataReader",
    []
    {
        return std::make_unique<MyLevelDataReader>();
    });
```

After that:

```cpp
content.Load<MyLevelData>("level1");
```

can use it like a built-in reader.

This design has also been tested against real third-party XNB content rather than only synthetic CNA fixtures.

## The reflection problem

This is where recreating XNA in C++ becomes particularly interesting.

XNA was built on .NET.

.NET can use **reflection**.

C++ cannot normally do this:

```text
give me all public fields of this arbitrary type
tell me their managed types
construct the corresponding readers
assign values to those fields by name
```

XNA used that ability in several places.

One important example is `ReflectiveReader`.

A developer could define a relatively ordinary C# data class and allow the Content Pipeline to serialize it without manually writing every read operation.

At runtime, XNA could use reflection to reconstruct the object.

CNA cannot simply reproduce that mechanism.

## CNA's ReflectiveTypeReaderBuilder

Instead, CNA requires the application to describe the serialized members explicitly.

For example:

```cpp
ReflectiveTypeReaderBuilder<ParticleSystemSettings>(
    "ParticlesSettings.ParticleSystemSettings")

    .Field(&ParticleSystemSettings::MinNumParticles)
    .Field(&ParticleSystemSettings::TextureFilename)

    .EnumField(
        &ParticleSystemSettings::AccelerationMode,
        "ParticlesSettings.AccelerationMode")

    .Register();
```

CNA then builds the appropriate reflective-style reader from that declaration.

This is an important distinction:

**CNA does not implement general C++ runtime reflection.**

But it **can read XNB payloads originally written for XNA's ReflectiveReader** once the native C++ program describes the type.

The original XNB does not necessarily have to be rebuilt.

## Reference types and shared resources

The distinction becomes more complicated for C# reference types.

If an object is serialized as a reference type inside something such as a list, dictionary or `Model.Tag`, CNA must preserve that reference-shaped representation.

For those types, the builder can use:

```cpp
.RegisterShared();
```

For example:

```cpp
ReflectiveTypeReaderBuilder<ModelKeyframe>(
    "CustomModelAnimation.ModelKeyframe")

    .Field(&ModelKeyframe::bone)
    .Field(&ModelKeyframe::time)
    .Field(&ModelKeyframe::transform)

    .RegisterShared();
```

XNB also has an explicit shared-resource table.

A field corresponding to:

```csharp
[ContentSerializer(SharedResource = true)]
```

can be represented with:

```cpp
.SharedResourceField(&ModelPart::effect)
```

CNA delays the assignment until the shared resources have been loaded, reproducing XNA's two-pass fix-up model.

So even without CLR reflection and garbage-collected object references, the wire semantics can still be preserved.

## Generic readers without reflection

Generic readers create another problem.

XNA can encounter something conceptually like:

```text
ListReader<Vector3>
ListReader<Matrix>
DictionaryReader<String, Int32>
ArrayReader<Vector3>
```

and use reflection and runtime generic type information to determine what must be instantiated.

C++ templates do not work like CLR generics.

CNA therefore registers concrete combinations explicitly.

Several commonly required combinations are built in, such as those needed for SpriteFonts, models and animation data.

A game can register another combination when it needs one.

For example:

```text
List<MyKeyframe>
```

is not something CNA can create automatically from a type name if `MyKeyframe` exists only inside the game.

The game knows that C++ type, so the game registers its corresponding reader.

This is a recurring CNA design principle:

> Replace implicit CLR discovery with explicit, type-safe native registration.

## XNB compression

XNB also has container-level compression.

CNA currently supports:

```text
Uncompressed XNB
LZX
LZ4
```

LZX is the important historical format because it is the compression used by the original XNA ecosystem.

CNA has both the read side and a deterministic native LZX writer.

LZ4 belongs to the later extended XNB ecosystem rather than Microsoft's XNA 4.0. CNA can read its raw-block representation, but it does not pretend that LZ4 combined with an original XNA 4.0 platform target is a file Microsoft XNA itself could have produced.

## Creating XNB files

CNA originally approached XNB primarily as a compatibility format to consume.

That has changed.

CNA now contains a **native XNB writer**.

The build path can be:

```text
source asset
    ↓
ContentImporter
    ↓
ContentProcessor
    ↓
ContentTypeWriter
    ↓
ContentWriter
    ↓
XNB writer
    ↓
.xnb
```

This brings CNA much closer to the original XNA development workflow.

For example:

```bash
cna-content build Content -o bin/Content \
    --format xnb \
    --xnb-platform windows \
    --xnb-version 5 \
    --xnb-profile reach
```

can compile source content into XNA-compatible output.

LZX compression can also be requested.

## The XNA Content Pipeline API

The implementation goes beyond having a few converters that happen to create XNB files.

CNA reproduces the architecture of the XNA 4.0 Content Pipeline itself.

It contains equivalents for concepts such as:

```text
ContentImporter<T>
ContentProcessor<TInput, TOutput>
ContentTypeWriter<T>
ContentWriter

ContentImporterContext
ContentProcessorContext

ContentIdentity
ExternalReference<T>

BuildAsset
BuildAndLoadAsset
Convert
dependency tracking
logging
processor parameters

IntermediateSerializer
BuildContent
```

This makes it possible to port custom XNA pipeline code to native C++ instead of rewriting the entire asset workflow around a completely different model.

## How complete is the Content Pipeline API?

The current measured XNA 4.0 pipeline profile contains:

```text
128 / 128 public or protected types
705 / 705 relevant public or protected members
27 / 27 enum values

10 / 10 built-in importers
12 / 12 built-in processors
47 / 47 processor properties

18 / 18 declared source extensions
```

The current parity report has **zero missing types and zero missing measured members**.

That does not mean every implementation detail is identical.

C++ cannot reproduce every CLR mechanism literally.

The parity model therefore distinguishes:

```text
EXACT_EQUIVALENT
SEMANTIC_EQUIVALENT
HOST_SUBSTITUTION
```

For example, a .NET attribute cannot literally exist in the same form in native C++.

The capability can still be reproduced.

## Replacing pipeline attributes and assembly scanning

In XNA, an importer might look like this:

```csharp
[ContentImporter(
    ".quest",
    DefaultProcessor = "QuestProcessor")]
public class QuestImporter
    : ContentImporter<Quest>
{
}
```

The XNA build system can scan assemblies and discover that class through reflection.

CNA has no CLR assembly scanner.

Instead, the same metadata becomes a descriptor:

```cpp
ContentImporterAttribute attribute(".quest");
attribute.setDefaultProcessorProperty(
    "QuestProcessor");
```

and the class is explicitly registered:

```cpp
RegisterXnaImporter<QuestImporter>(
    *registry,
    "QuestImporter",
    attribute);
```

Processors use the equivalent model.

This gives CNA the same information without pretending that a C++ executable is a .NET assembly.

`PipelineComponentScanner` then scans CNA's **registered component catalog**, rather than loading arbitrary assemblies and reflecting over their classes.

## Replacing reflection in IntermediateSerializer

XNA also uses reflection for its intermediate XML serialization.

CNA handles this in a similar explicit way.

A C# type such as:

```csharp
public class Quest
{
    public string Name { get; set; }
    public List<Vector3> Waypoints;
}
```

can become a C++ type that describes its serializable members:

```cpp
static void DescribeContent(
    ContentTypeDescriptor<Quest>& d)
{
    d.Field("Name", &Quest::name);
    d.Field("Waypoints", &Quest::waypoints);
}
```

CNA's `IntermediateSerializer` then performs the generic serialization work.

The game describes the schema.

CNA provides the machinery.

Again, the reflection mechanism disappears, but the useful behavior remains.

## .contentproj support

CNA can also work with XNA-style content projects.

Instead of manually converting every project into another build format, a project can be built with:

```bash
cna-content build MyGameContent.contentproj \
    -o Content
```

CNA interprets important XNA content-project information such as:

- `XnaPlatform`
- `XnaProfile`
- `XnaCompressContent`
- importer selection
- processor selection
- logical asset names
- processor parameters
- content and copy items
- `Link`
- output paths

There is also CMake integration for adding a content project as a build dependency.

This matters because compatibility with an XNA game is not just compatibility with individual PNG or FBX files.

The **content project's build decisions are part of the game's behavior**.

## Custom pipeline components

A game can also port its own importer, processor and writer.

In XNA these might live in a separate C# pipeline assembly.

In CNA they are compiled into a native content compiler and explicitly registered.

For example:

```text
QuestImporter
      ↓
QuestProcessor
      ↓
QuestWriter
      ↓
QuestReader
```

The writer declares the reader identity that will appear in the resulting XNB.

At runtime the game registers that reader with `ContentTypeReaderManager`.

This preserves the same important relationship XNA had:

```text
build-time ContentTypeWriter
          ↕
runtime ContentTypeReader
```

CNA does not dynamically load arbitrary C# pipeline assemblies, but custom native pipeline code is fully supported.

## Testing against the real XNA 4.0 pipeline

Implementing an API with the right class names is not enough.

A pipeline can successfully produce a valid XNB and still behave differently from Microsoft's pipeline.

For that reason, CNA development went much further than synthetic unit tests.

A corpus was built from **real Microsoft XNA sample projects**.

The reference files were produced by the **genuine Microsoft XNA 4.0 Content Pipeline running on Windows 7**.

The process was essentially:

```text
original Microsoft XNA sample asset
            ↓
original XNA 4.0 Content Pipeline
        on Windows 7
            ↓
reference XNB
```

Then the exact same original source asset and its original `.contentproj` settings were fed to CNA:

```text
same source asset
same importer
same processor
same processor parameters
same target/profile
            ↓
CNA Content Pipeline
            ↓
CNA-generated XNB
```

The files could then be compared directly.

## Byte identity as a compatibility test

The strongest possible result is:

```text
SHA(reference.xnb)
    ==
SHA(cna-generated.xnb)
```

That means CNA did not merely produce something that its own reader accepts.

It reproduced Microsoft's output byte for byte.

An earlier focused test on the XNA Platformer sample had already achieved a striking result:

**44 of 45 successfully buildable assets were byte-identical to Microsoft's XNA 4.0 output.**

That result motivated a much larger sweep.

## 7,726 genuine XNB files

The later compatibility campaign expanded the test to the available Microsoft XNA sample corpus.

The final denominator contained:

**7,726 genuine XNB files**

produced by Microsoft's XNA 4.0 Content Pipeline.

Every reference was classified.

The final clean sweep produced:

| Result | XNB files |
| --- | --- |
| Byte-identical | 4,337 |
| Semantically identical | 747 |
| Accepted difference | 815 |
| Sample-specific custom pipeline gap | 1,797 |
| Environment gap | 9 |
| Reference no longer present | 21 |
| Unexplained | 0 |
| Total | 7,726 |

The most important number is not actually 4,337.

It is:

**0 unexplained differences.**

Every XNB in the corpus either matched, differed in a measured and understood way, required sample-specific custom code, was externally blocked, or had another explicit classification.

## What does “semantically identical” mean?

Byte identity is excellent evidence, but it is not always the correct requirement.

For example, two valid LZX streams can represent the same decompressed payload while choosing different compression decisions.

Likewise, tiny floating-point differences may produce exactly the same runtime object.

The semantic-difference checks therefore decompressed and parsed both sides instead of accepting a convenient label.

The final campaign had **747 semantically identical XNBs**.

For hundreds of those files, the XNB payload itself was identical after decompression even though the compressed byte stream differed.

Mutation tests were used to verify that these comparisons were capable of detecting deliberately introduced differences.

## Why can two correct pipelines produce different bytes?

Some output depends on components for which CNA deliberately uses a different implementation.

The final corpus contained **815 accepted differences**, all audited field by field.

Examples include:

- GDI+ versus FreeType glyph rasterization
- different valid DXT block-compression choices
- D3DX versus another conforming JPEG decoder
- compiler version strings embedded in effect bytecode
- XNA's mipmap-filter dithering
- Windows Media encoding
- Xbox 360 XMA encoding

These are not simply waved away as “close enough”.

The allowed fields for each category are defined and automatically checked.

A supposedly accepted difference outside those fields fails the audit.

## The corpus found real CNA bugs

This exercise was valuable because it found bugs that API-completeness tests never could.

The large XNA sample sweep found and fixed **75 framework defects**.

Examples included differences in:

- SpriteFont atlas sizing
- Windows font-family selection
- PNG `gAMA` handling
- BMP/DIB parsing
- X-file materials
- generated normals
- texture paths
- effect compiler configuration
- FBX node transforms
- FBX inheritance
- shear
- root promotion
- model vertex merging
- asset-relative path handling
- content-project logical names
- shared nested assets

The rule during this work was simple:

> An unexplained difference is treated as a CNA bug until evidence proves otherwise.

That is a much stronger development method than designing fixtures around what CNA already happens to do.

## Custom sample pipelines are the largest remaining corpus gap

The biggest number left in the sample corpus is:

**1,797 custom pipeline gaps.**

This does not mean CNA is missing 1,797 built-in XNA features.

Many official XNA samples contain **their own custom C# importers or processors**.

Examples include custom terrain processors, animation processors and sample-specific content transformations.

XNA loads those from the sample's own .NET pipeline assembly.

CNA cannot execute arbitrary C# pipeline assemblies inside its native C++ content compiler.

To build those exact assets, the sample-specific pipeline component has to be ported to C++ and registered with CNA.

That work belongs to the individual sample port rather than to the generic XNA pipeline implementation unless it exposes a reusable missing framework feature.

## What CNA still does not reproduce perfectly

Despite the very high compatibility level, there are still real boundaries.

### Automatic CLR reflection

CNA does not provide a CLR or general-purpose C++ runtime reflection system.

Reflection-dependent behavior is replaced with explicit descriptors and builders.

For runtime XNB reflective content this means `ReflectiveTypeReaderBuilder`.

For IntermediateSerializer it means `DescribeContent()`.

For pipeline components it means explicit registration.

The resulting behavior can match XNA, but the mechanism is deliberately native C++.

### Dynamic pipeline assembly loading

XNA can discover custom pipeline components inside .NET assemblies.

CNA does not load arbitrary C# pipeline DLLs.

Custom components are ported to C++ and linked into a content compiler instead.

### Xbox 360 output

Writing an `X` into the XNB platform byte is easy.

Producing a genuinely correct Xbox 360 asset is not.

Xbox 360 content involves big-endian and platform-specific payload rules.

CNA therefore refuses to claim normal Xbox XNB compatibility rather than placing Windows-form payloads behind an Xbox header.

There is an explicit override intended for experimentation, but this is not considered qualified Xbox support.

### Windows Phone qualification

The Windows Phone XNB platform identifier can be written, but the complete result has not been verified against a real Windows Phone XNA runtime.

### XMA

The Xbox XMA audio encoder is not publicly available in a form CNA can simply reproduce.

CNA therefore does not ship one.

### Effect source compilation

CNA can read and write compiled effect content, but it does not embed a proprietary HLSL/Effect compiler.

Building original `.fx` source into XNA Effect Framework bytecode requires a compatible external compiler, historically Microsoft's legacy `fxc`.

### Some EffectMaterial arrays

Array-valued EffectMaterial parameters remain a documented writer gap because the exact XNA reader shape has not been established strongly enough to justify guessing.

### Arbitrary generic reader combinations

CNA can implement them, but C++ cannot manufacture every possible CLR generic instantiation automatically from a managed type string.

Unusual closed combinations therefore need explicit registration.

## XNB and CNB are different goals

CNA also has its own compiled content format, **CNB**.

The two should not be confused.

```text
XNB
    ↓
XNA compatibility

CNB
    ↓
CNA-native compiled content
```

The interesting part is that CNA's modern Content Pipeline can share much of the earlier workflow:

```text
source
  ↓
Importer
  ↓
Processor
  ↓
          ┌── XNB writer
          │
          └── CNB writer
```

The importer and processor do not need to be duplicated just because the final container is different.

This keeps XNA compatibility and CNA's native future connected without making them the same format.

## How close is CNA to the XNA Content Pipeline?

There are several different answers depending on what “complete” means.

### API surface

For the measured XNA Game Studio 4.0 Refresh Content Pipeline API:

**essentially complete.**

The current parity inventory reports:

```text
128 / 128 types
705 / 705 members
27 / 27 enum values

10 / 10 importers
12 / 12 processors
47 / 47 processor properties
18 / 18 source extensions
```

with no missing rows.

### Normal XNB runtime loading

For ordinary XNA game content:

**very broad and already practical.**

Textures, fonts, audio, models, effects, shared resources, custom readers and reflective content are all covered.

### XNB generation

For normal Windows XNA content:

**strong enough to reproduce thousands of Microsoft's own sample outputs exactly.**

The large Windows 7 reference sweep is much stronger evidence than a handful of hand-built test assets.

### Every XNA project ever written

Not yet.

A game can contain its own C# pipeline code, depend on proprietary Microsoft encoders, target Xbox-specific formats, or use unusual custom reader graphs.

Those require project-specific work or externally unavailable technology.

## More than file-format compatibility

The goal of this work was never simply:

> CNA can open an XNB.

The stronger goal is:

> An XNA content project should be understandable to CNA, its source assets should pass through familiar importer/processor/writer concepts, the resulting XNB should reproduce Microsoft's behavior as closely as the native environment permits, and the game should then load that XNB through the familiar ContentManager model.

That requires compatibility at several layers:

```text
.contentproj
      ↓
importers
      ↓
processors
      ↓
processor parameters
      ↓
ContentTypeWriters
      ↓
XNB container
      ↓
ContentTypeReaders
      ↓
shared resources
      ↓
ContentManager
      ↓
runtime objects
```

CNA now implements that chain to a level where it can be measured against the original pipeline rather than merely compared conceptually.

## The original pipeline remains the oracle

The most important design principle behind the compatibility work is that CNA's own output is not treated as the definition of correctness.

For XNA compatibility, the oracle is XNA.

The original Microsoft sample sources, original `.contentproj` files, genuine XNA-generated XNB files and genuine XNA runtime behavior provide the reference.

CNA's job is to explain every difference.

That is why the Windows 7 corpus was so useful.

Instead of asking:

> Does this look like a reasonable implementation?

the test could ask:

> Here is the exact asset Microsoft shipped and the exact XNB Microsoft XNA 4.0 produced from it. What does CNA produce?

That is a much harder test.

It is also a much more useful one.

And today, across the complete measured corpus, the number of unexplained differences is:

**zero.**

---

**CNA:** [github.com/libcna/cna](https://github.com/libcna/cna)
**xna4-spec:** [github.com/libcna/xna4-spec](https://github.com/libcna/xna4-spec)
**CNA Bible:** [github.com/libcna/bible.libcna.com](https://github.com/libcna/bible.libcna.com)
