---
title: CNA Content Pipeline and the format CNB
date: 2026-11-29T17:28:18Z
updated: 2026-09-13T17:36:57Z
description: |
  Games rarely use their original source assets exactly as artists created them.
author: Robert Vokac
categories:
  - Development
tags:
  - Content Pipeline
  - glTF
  - XNB
  - ContentManager
  - CNJ
  - CNB
  - Assets
originalUrl: https://blog.libcna.com/2026/11/29/cna-content-pipeline-and-the-format-cnb/
classicpressId: 106
classicpressStatus: future
draft: false
---

Games rarely use their original source assets exactly as artists created them.

A texture may begin as a PNG. A 3D model may arrive as glTF. Audio may be stored as WAV, FLAC or Ogg. A font may be described by a `.spritefont` file. Before these assets reach a running game, they often need to be validated, transformed, optimized and compiled into a representation designed for the runtime.

That is the job of the **CNA Content Pipeline**.

CNA also has its own compiled binary content format for the resulting assets:

**CNB — CNA Binary Content.**

The two concepts are closely related, but they are not the same thing:

```text
CNA Content Pipeline
    = the build system that processes assets

CNB
    = CNA's native compiled runtime asset format

ContentManager
    = the runtime system that loads those assets
```

Understanding this distinction is important because the Content Pipeline can produce more than CNB, and CNB can be produced by several CNA tools.

---

## The basic idea

A typical CNA project may contain authoring assets like these:

```text
ContentSource/
├── Models/
│   └── robot.gltf
├── Textures/
│   └── wall.png
├── Fonts/
│   └── ui.spritefont
├── Sounds/
│   └── explosion.wav
└── Music/
    └── theme.ogg
```

The CNA Content Pipeline compiles them:

```bash
cna-content build ContentSource -o Content
```

The result may look like:

```text
Content/
├── .cna-content.lock
├── .cna-content-manifest.json
├── Models/
│   └── robot.cnb
├── Textures/
│   └── wall.cnb
├── Fonts/
│   └── ui.cnb
├── Sounds/
│   └── explosion.cnb
└── Music/
    ├── theme.cnb
    └── theme.ogg
```

The game continues to use the familiar XNA-style API:

```cpp
auto robot =
    Content.Load<Model>("Models/robot");

auto wall =
    Content.Load<Texture2D>("Textures/wall");

auto font =
    Content.Load<SpriteFont>("Fonts/ui");

auto sound =
    Content.Load<SoundEffect>("Sounds/explosion");
```

The application does not need to know how the source file was imported.

At runtime it deals with compiled content.

---

## Architecture of the Content Pipeline

CNA's Content Pipeline is inspired by the architecture of the **XNA 4.0 Content Pipeline**.

Its central model is:

```text
Importer
   ↓
Processor
   ↓
Writer
```

In CNA the complete path is approximately:

```text
                         BUILD TIME

source asset
    │
    ▼
ContentImporter
    │
    ▼
source-oriented imported representation
    │
    ▼
ContentProcessor
    │
    ▼
runtime-oriented processed representation
    │
    ▼
ContentTypeWriter
    │
    ▼
CNB codec
    │
    ▼
*.cnb
    │
    ▼
atomic publication

                         RUNTIME

*.cnb
    │
    ▼
CNB decoder
    │
    ▼
CnbLoaderRegistry
    │
    ▼
ContentManager
    │
    ▼
Texture2D / Model / SpriteFont / ...
```

These stages deliberately have different responsibilities.

---

## Importers

An importer understands an **authoring format**.

For example:

```text
PNG
JPEG
WAV
glTF
GLB
CNJ
XNB
.spritefont
```

An image importer answers a question roughly equivalent to:

> What image data exists in this file?

It does not decide every detail about how that image should eventually be stored as a CNA `Texture2D`.

That comes later.

Some current built-in routes include:

| Source | Importer |
| --- | --- |
| PNG, JPEG, BMP, TGA, GIF, PSD, HDR, PNM | CNA.ImageImporter |
| WAV | CNA.WavImporter |
| MP3, Ogg, FLAC, Opus, AAC and others | CNA.SongImporter |
| MP4, WebM, MKV, AVI, MOV and others | CNA.VideoImporter |
| glTF / GLB | CNA.GltfImporter |
| CNJ | CNA.CnjImporter |
| supported XNB | CNA.XnbImporter |
| .spritefont | CNA.FontDescriptionImporter |

The important point is that an importer produces an intermediate C++ representation rather than a runtime graphics object.

---

## Processors

A processor transforms imported data into the representation that CNA actually wants to serialize.

For example:

```text
ImageImporter
      │
      ▼
ImportedImage
      │
      ▼
TextureProcessor
      │
      ▼
processed Texture2D data
```

The processor is where operations such as these may happen:

- resizing;
- color keying;
- premultiplying alpha;
- creating mipmaps;
- validating dimensions;
- converting formats;
- processing model data;
- generating SpriteFont atlases;
- preparing runtime-oriented metadata.

This is very similar conceptually to XNA.

The source format and runtime format remain separate concerns.

That means a PNG and a CNJ Texture2D can converge onto the same processor:

```text
wall.png
   │
   └── ImageImporter ───────┐
                            │
wall.cnj                    ▼
   │                  ImportedImage
   └── CnjImporter ─────────┘
                            │
                            ▼
                     TextureProcessor
                            │
                            ▼
                  Texture2DContentWriter
```

Once both inputs represent the same semantics, there is no reason to maintain two independent compilation implementations.

---

## Content Type Writers

The final build-time stage is the writer.

For native CNA output, built-in writers are deliberately thin adapters around CNA's authoritative CNB encoders.

Examples include:

```text
Texture2DContentWriter
    -> EncodeTexture2DToCnb()

SoundEffectContentWriter
    -> EncodeSoundEffectToCnb()

SpriteFontContentWriter
    -> EncodeSpriteFontToCnb()

CurveContentWriter
    -> EncodeCurveToCnb()

AnimationClipContentWriter
    -> EncodeAnimationClipToCnb()

ModelContentWriter
    -> EncodeModelToCnb()
       or EncodeModelV2ToCnb()
```

This is an important architectural choice.

There is not one implementation of the Model format in the pipeline and another unrelated implementation somewhere in the runtime.

The pipeline ultimately uses the same authoritative CNB format definitions and codecs.

That helps prevent:

```text
writer implementation
        ≠
reader implementation
```

which is one of the easiest ways for a custom binary format to become unreliable.

---

## Headless compilation

The Content Pipeline is designed as a **build-time system**.

It does not need to create the game environment merely to compile a model or texture.

In particular, pipeline components do not need to:

- create a window;
- initialize a renderer;
- create a `GraphicsDevice`;
- upload textures to a GPU;
- create GPU vertex buffers;
- read data back from graphics hardware;
- open an audio device.

Model processing operates on CPU-side representations.

This separation is important for:

```text
CI
build servers
headless Linux machines
asset farms
cross-platform development
automated testing
```

Content compilation should not require the game itself to run.

---

## What is CNB?

**CNB is CNA's native compiled binary content format.**

Its file extension is:

```text
.cnb
```

CNB exists to provide a runtime-oriented counterpart to formats such as CNJ.

CNJ is intended to be readable and editable.

A sophisticated model represented through CNJ may consist of many files:

```text
robot.cnj
robot_vertices.bin
robot_indices.bin
robot_skeleton.bin
walk.cnj
run.cnj
...
```

That is useful during authoring and inspection.

It is less attractive as the final runtime representation.

CNB can compile one logical asset into one binary asset:

```text
robot.cnj
+ geometry sidecars
+ skeleton data
+ internal animation data
        │
        ▼
     robot.cnb
```

Resources that are genuinely shared can remain separate.

---

## CNB is not an archive

This distinction is deliberate.

A `.cnb` file represents **one logical asset**.

It is not CNA's equivalent of:

```text
ZIP
PAK
WAD
VPK
```

CNB does not attempt to bundle the entire game's Content directory into one gigantic file.

For example:

```text
Models/house.cnb
Textures/wall.cnb
Textures/roof.cnb
Fonts/ui.cnb
```

remain individual assets.

A future asset-packaging format would be a different layer.

---

## CNB is not an interchange format

CNB is also not intended to replace formats such as glTF, PNG or WAV.

The roles are different:

```text
glTF / PNG / WAV
    authoring and interchange

CNJ
    readable CNA representation

CNB
    compiled CNA runtime representation
```

An artist does not need to export a model from Blender as CNB.

glTF remains an appropriate interchange format.

CNB is what CNA may create afterwards.

---

## CNB versus XNB

XNA uses the `.xnb` compiled content format.

CNA supports XNB extensively for compatibility, but CNB was intentionally designed as a separate format.

CNB does **not** simply put a CNA header around XNB.

There is no hidden:

```text
CNB
└── XNB payload
```

for ordinary native content.

CNB has its own:

- header;
- type identifiers;
- schema versions;
- chunk system;
- checksums;
- external-reference representation;
- binary codecs;
- loader registry.

It also deliberately avoids several concepts inherited from .NET and XNA's serialization architecture.

CNB has no need for:

```text
assembly-qualified .NET type names
CLR reflection
XNB ContentTypeReader tables
.NET generic reader identities
platform identifier bytes
shared-resource fixup protocol from XNB
```

CNB is a native CNA format rather than an imitation of XNB.

---

## But the pipeline can also produce XNB

CNB is the default Content Pipeline output, but it is not the only output.

The current pipeline supports:

```text
--format cnb
```

and:

```text
--format xnb
```

This means the architecture is really:

```text
                 ┌──────────► CNB serializer ──► .cnb
source
  │              │
  ▼              │
Importer ─► Processor
                 │
                 └──────────► XNB serializer ──► .xnb
```

The importer and processor can remain the same.

Only the serialization side changes.

This is particularly useful because CNA is simultaneously:

- an XNA-compatible framework;
- a modern native C++ framework;
- and an ecosystem with its own content technology.

---

## XNB can also be a source

There is another interesting direction.

Supported existing XNB files can themselves enter the CNA Content Pipeline.

For example:

```text
legacy_texture.xnb
        │
        ▼
    XnbImporter
        │
        ▼
canonical CPU representation
        │
        ▼
existing processor
        │
        ▼
native CNB writer
        │
        ▼
legacy_texture.cnb
```

The resulting CNB does not contain the original XNB.

The supported asset is decoded and converted into CNA's native representation.

This provides a path from legacy XNA content toward native CNA content without making CNB permanently dependent on the XNB format.

---

## The CNB container

CNB 1.0 uses a deliberately explicit binary layout.

Every file begins with a fixed **64-byte header**.

The first bytes are:

```text
43 4E 42 1A
 C  N  B
```

The header contains information including:

```text
container version
asset type ID
asset schema version
chunk count
file size
table-of-contents offset
table-of-contents checksum
header checksum
```

All multi-byte values use a defined **little-endian encoding**.

The format does not serialize C++ structures directly with something like:

```cpp
file.write(
    reinterpret_cast<char*>(&object),
    sizeof(object));
```

That would make the format dependent on compiler ABI, padding and host representation.

CNB instead explicitly writes each primitive value.

Consequently CNB does not depend on:

```text
sizeof(runtime object)
C++ struct padding
compiler ABI
std::type_index
pointer size
memory addresses
```

That is essential for a format intended to survive across builds and platforms.

---

## CNB is chunk based

After the header is a table describing the chunks contained in the asset.

A chunk has information including:

```text
type
flags
offset
stored size
uncompressed size
checksum
compression codec
alignment
```

Chunk identifiers are four printable ASCII characters.

For example, different asset schemas define identifiers for their own structures.

This makes CNB closer to a structured container than one enormous serialized C++ object.

Conceptually:

```text
CNB file
├── Header
├── Table of Contents
├── CMET
├── XREF
├── asset-specific chunk
├── asset-specific chunk
└── asset-specific chunk
```

Not every file contains every chunk.

The required chunks depend on its asset schema.

---

## CMET — content metadata

CNB defines a container-level chunk named:

```text
CMET
```

It stores metadata such as:

```text
canonical asset type name
logical content name
```

For CNA's built-in asset types this information is primarily diagnostic because their numeric IDs are controlled and frozen by CNA.

For custom asset types, however, the canonical name becomes part of safe type identification.

---

## XREF — external references

Another important container-level chunk is:

```text
XREF
```

It represents references from one compiled asset to another.

For example, a Model might refer to:

```text
Textures/robot_albedo
```

rather than embedding another independent copy of that texture.

Conceptually:

```text
robot.cnb
    │
    ├── geometry
    ├── hierarchy
    └── XREF ───────► Textures/robot_albedo.cnb
```

An XREF can also carry an expected asset type.

The logical names are validated so that a compiled file cannot simply inject arbitrary filesystem traversal such as:

```text
../../../../something
```

into ContentManager.

---

## Asset type IDs

Every CNB file declares an asset type.

The current built-in IDs include:

| ID | Asset |
| --- | --- |
| 1 | Texture2D |
| 2 | Texture3D |
| 3 | TextureCube |
| 4 | SpriteFont |
| 5 | Model |
| 6 | AnimationClip |
| 7 | Curve |
| 8 | SoundEffect |
| 9 | Song |
| 10 | Video |
| 11 | Effect — reserved |

`Model` currently has both schema 1 and schema 2.

The container version and asset schema version are deliberately independent.

For example:

```text
CNB container 1.0
    +
Model schema 2
```

does not imply that the entire CNB container had to become version 2.

This allows individual asset formats to evolve independently.

---

## Why is Effect only reserved?

The absence of a native CNB Effect schema is deliberate.

XNA Effect content fundamentally revolves around Direct3D 9-era compiled Effect Framework bytecode.

Putting that bytecode inside a supposedly renderer-independent CNA binary format would create an obvious portability problem:

```text
Effect.cnb
    containing D3D9-specific bytecode

           ↓

OpenGL renderer?
Vulkan renderer?
SDL_GPU renderer?
other CNA renderers?
```

For that reason the current Content Pipeline's `.fx` and `.fxb` routes target XNB when producing XNA-compatible compiled effects.

The CNB Effect type ID exists, but no native portable Effect schema is currently defined.

This is an example of CNA refusing to pretend that a problem is solved merely by wrapping platform-specific data in a new container.

---

## Custom CNB types

CNB is not limited to CNA's built-in asset types.

The custom range is:

```text
0x80000000 - 0xFFFFFFFF
```

Custom IDs are derived from the canonical type name.

Because a 31-bit hash can theoretically collide, CNA does not rely solely on the integer.

For custom assets, the canonical name stored in `CMET` is also checked against the registered runtime loader.

This gives CNB several layers of protection against accidental type collisions.

Custom runtime types can be connected to ContentManager through the CNA extension mechanism, including:

```cpp
ContentManager::RegisterCnbLoaderEXT<T>()
```

The low-level `CnbWriter` is also available for custom schemas.

This means games and tools can build their own compiled asset formats on top of the same CNB container instead of inventing another binary container from scratch.

---

## Deterministic builds

A major Content Pipeline goal is **determinism**.

The same inputs should produce the same compiled bytes.

CNB output therefore avoids incorporating things such as:

```text
timestamps
process IDs
random values
temporary directory names
memory addresses
absolute temporary paths
pointer values
RTTI identifiers
```

Directory discovery and component selection are also ordered deterministically.

This matters for several reasons:

```text
reproducible builds
Git/LFS storage
build caching
CI validation
binary comparison
long-term format testing
```

CNA even maintains golden CNB vectors whose bytes are checked by the test suite.

For a binary format, byte-level regression testing is extremely valuable.

---

## Incremental builds

Compiling every asset after every source change would be wasteful.

The pipeline therefore stores an incremental-build manifest:

```text
.cna-content-manifest.json
```

The manifest tracks information such as:

- source identity;
- dependencies;
- relevant configuration;
- component identities;
- processor parameters;
- content hashes;
- produced files;
- runtime references;
- deployment files.

A later invocation can determine that an asset has not changed and report:

```text
SKIP
```

instead of rebuilding it.

To inspect why the pipeline decided to build or skip something:

```bash
cna-content build ContentSource -o Content --explain
```

This produces deterministic reason lines explaining the decision.

That is much more useful than a build cache that simply says:

> something changed.

---

## Dependency tracking

The pipeline distinguishes several concepts that are easy to confuse.

Consider:

```text
robot.gltf
robot.bin
robot_albedo.png
```

During the build, these may all be source dependencies.

But the compiled Model may use a runtime reference:

```text
Textures/robot_albedo
```

Those are not the same thing.

CNA therefore separates:

```text
build dependencies
runtime XREFs
deployment-support files
```

Changing a source dependency can trigger recompilation.

An XREF tells the runtime which other content asset is required.

A deployment file tells the build system that some external data needs to be copied alongside the output.

Keeping these concepts separate makes the build graph considerably more precise.

---

## Song and Video are intentionally different

Large streaming media is not blindly embedded into CNB.

For `Song` and `Video`, CNB stores portable metadata and an external runtime reference.

The actual media remains a separately deployed file.

Conceptually:

```text
theme.cnb
    └── reference ─────► theme.ogg
```

rather than:

```text
theme.cnb
    └── entire 100 MB audio stream
```

The Content Pipeline still tracks, fingerprints and deploys the external media.

It simply recognizes that streaming content has different runtime requirements from something like a Curve or a small texture.

---

## Safe publication

Writing a compiled asset directly over the old one would be dangerous.

A crash halfway through could leave:

```text
half old asset
+
half new asset
=
corrupt content
```

The pipeline instead uses atomic publication machinery.

New outputs are prepared separately and only replace their final destination once complete.

The manifest is also part of the ownership model.

This becomes especially important when one build step produces several outputs.

---

## Safe clean

The command:

```bash
cna-content clean Content
```

does not simply search for every `.cnb` file and delete it.

That would be dangerous because a developer might have placed unrelated files in the same directory.

Instead CNA uses the valid previous manifest to establish which files the Content Pipeline actually owns.

Only outputs proven to belong to the pipeline are eligible for removal.

Manual files are preserved.

This fits a broader rule used throughout the system:

> do not claim ownership of something merely because its filename looks familiar.

---

## Parallel content builds

Build execution is serial by default.

For larger projects, independent graph nodes can be processed in parallel:

```bash
cna-content build ContentSource -o Content --workers 4
```

Supported worker counts are bounded.

Dependencies are still honored:

```text
Texture A ─────┐
               │
Texture B ─────┼──► Model
               │
Skeleton ──────┘
```

The Model cannot become ready until its required build dependencies have completed.

Shared dependencies execute once.

The pipeline is tested to ensure that different worker counts do not change the resulting content tree or compiled bytes.

So parallelism is an execution optimization, not part of asset identity.

---

## Cross-process locking

Worker threads are not the only possible source of races.

Two independent instances of `cna-content` could theoretically target the same output directory.

CNA therefore uses:

```text
.cna-content.lock
```

for output-root coordination.

A concurrent build or clean operation against an already active output root is rejected rather than being allowed to race the existing operation.

This protects:

```text
manifest state
compiled files
clean operations
staging
publication
```

across processes as well as within one process.

---

## Optional configuration

The simple convention-based workflow requires no project file:

```bash
cna-content build ContentSource -o Content
```

But projects can add a strict `.cna-content.json` configuration when explicit choices are needed.

For example:

```json
{
  "format": "CNA.ContentPipeline.Config",
  "version": 1,
  "assets": {
    "Textures/wall.png": {
      "logicalName": "Environment/stone",
      "importer": "CNA.ImageImporter",
      "processor": "CNA.TextureProcessor",
      "writer": "CNA.Texture2DContentWriter",
      "parameters": {
        "colorKey": {
          "type": "string",
          "value": "255,0,255"
        }
      }
    }
  }
}
```

This can control things such as:

```text
logical content names
importer selection
processor selection
writer selection
processor parameters
additional named source roots
```

But CNA deliberately does not require a large MSBuild-style content project merely to compile a directory.

---

## CMake integration

CNA also provides a CMake helper:

```cmake
cna_add_content(
    TARGET MyGameContent
    SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/ContentSource"
    OUTPUT_DIR "${CMAKE_CURRENT_BINARY_DIR}/Content"
)

add_dependencies(MyGame MyGameContent)
```

A configured build can use:

```cmake
cna_add_content(
    TARGET MyGameContent
    SOURCE_DIR ContentSource
    OUTPUT_DIR Content
    CONFIG_FILE ContentSource/pipeline.json
    WORKERS 4
)
```

CMake does not reimplement CNA's incremental-build logic.

It invokes the content tool, while the Content Pipeline's own manifest decides which individual assets actually need rebuilding.

That keeps the content build rules centralized in one system.

---

## CNB checksums and validation

CNB was designed with hostile or corrupted input in mind.

The header contains a CRC-32C checksum.

The table of contents also has a checksum.

Individual chunks have their own CRC-32C values.

The parser validates sizes, ranges, alignments and relationships before trusting them.

This is not cryptographic security.

A person capable of deliberately modifying a CNB can also recompute CRC-32C.

The purpose is instead to detect things such as:

```text
damaged files
truncated files
invalid offsets
accidental corruption
malformed generated content
```

CNB does not claim to provide authenticity or digital signatures.

---

## Compression

CNB supports compression on a **per-chunk** basis rather than forcing an entire file through one compression stream.

The current format assigns:

```text
0 = none
1 = LZ4, reserved
2 = Zstandard
3 = Deflate, reserved
```

Zstandard support is implemented when CNA is built with the corresponding support.

Compression is opt-in and uncompressed storage remains the default.

Importantly, a chunk is only stored compressed when compression actually makes it smaller.

This means a CNB can conceptually contain:

```text
small metadata chunk       uncompressed
large texture chunk        Zstandard
small lookup table         uncompressed
large geometry chunk       Zstandard
```

rather than requiring one policy for every byte in the asset.

The checksum covers the stored bytes so corruption is detected before compressed input reaches the decompressor.

---

## Why not compress everything?

Because smaller files do not automatically mean faster loading.

For some data, decompression can save enough disk I/O to improve loading.

On a very fast NVMe SSD, the extra CPU decompression work can instead make loading slower.

That is why CNB treats compression as a policy decision rather than an unquestionable requirement.

This is another useful distinction between:

```text
storage size optimization
```

and:

```text
runtime performance optimization
```

They are related, but they are not the same problem.

---

## Compatibility and evolution

CNB separates:

```text
container version
```

from:

```text
asset schema version
```

This gives CNA room to evolve.

Unknown optional chunks can be ignored.

Unknown mandatory chunks cause a clear rejection.

A reader can therefore distinguish between:

> I do not understand this information, but I do not need it.

and:

> I do not understand this information, and loading without it would be incorrect.

That is a much safer evolution model than simply attempting to parse whatever bytes happen to be present.

---

## CNJ, CNB and XNB together

The three formats now have distinct roles in CNA.

| Format | Main role |
| --- | --- |
| CNJ | Human-readable CNA content |
| CNB | Native compiled CNA runtime content |
| XNB | XNA-compatible compiled content |

They can also participate in conversion paths.

For example:

```text
PNG
 │
 ▼
CNA Content Pipeline
 │
 └────────────► CNB
```

or:

```text
CNJ
 │
 ▼
CNA Content Pipeline
 │
 └────────────► CNB
```

or:

```text
glTF
 │
 ▼
CNA Content Pipeline
 │
 └────────────► CNB
```

or even:

```text
supported XNB
 │
 ▼
XnbImporter
 │
 ▼
canonical CNA data
 │
 ▼
CNB
```

And when XNA-compatible output is required:

```text
source
 │
 ▼
CNA Content Pipeline
 │
 └────────────► XNB
```

This is significantly more flexible than treating content compilation as a one-way converter tied permanently to one binary format.

---

## Why CNA needs its own Content Pipeline

CNA could theoretically rely forever on loose source assets and XNB.

But that would make the framework dependent on formats and assumptions designed elsewhere.

A native pipeline allows CNA to control:

- validation;
- deterministic compilation;
- dependency tracking;
- incremental builds;
- asset schemas;
- custom asset types;
- runtime references;
- publication;
- content tooling;
- long-term format evolution.

At the same time, CNA does not abandon existing standards.

It can ingest formats such as:

```text
PNG
JPEG
WAV
Ogg
FLAC
glTF
GLB
XNB
CNJ
```

and convert them into the representation appropriate for the project.

This follows the same architectural philosophy found elsewhere in CNA:

> support external ecosystems, but do not make CNA's internal architecture permanently dependent on them.

---

## CNB and long-term portability

CNB also fits CNA's broader portability goals.

The format does not serialize raw C++ layouts.

It does not depend on CLR reflection.

It does not encode runtime pointer values.

It does not bind a Model file to one graphics renderer.

It does not contain a platform byte that decides which renderer is allowed to load it.

The pipeline produces CPU-defined content, while renderer selection remains a runtime concern.

That separation matters if CNA is expected to survive changes in graphics APIs, operating systems and hardware over many years.

A texture asset should not become unreadable merely because the framework later gains another renderer.

---

## Current stability

In the current CNA source tree, **CNB container 1.0 is implemented and treated as a stable format**.

The existing built-in schema-1 binary contracts, asset IDs, chunk IDs and CRC behavior are frozen.

Model schema 2 has its own separately versioned wire contract.

The public custom C++ Content Pipeline component interfaces remain more experimental than the existing built-in CNB wire formats.

This distinction is healthy.

It is much easier to evolve a C++ build API than to change bytes that games may already have shipped.

---

## Source code

The CNA repository is available at:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

The principal documentation is:

```text
docs/content-pipeline.md
docs/cnb-format.md
docs/xnb-interoperability.md
docs/cnb-compression-measurements.md
docs/content-pipeline-benchmark.md
```

The CNA-native Content Pipeline interfaces and implementation are primarily under:

```text
modules/content/include/CNA/Content/Pipeline/
modules/content/src/Pipeline/
```

The broader XNA-compatible build-time API is under:

```text
modules/content-pipeline/
```

CNB itself is implemented under:

```text
modules/content/include/CNA/Content/Cnb/
modules/content/src/Cnb/
```

Important CNB components include:

```text
CnbFormat
CnbDocument
CnbWriter
CnbLoaderRegistry
CnbByteReader
CnbByteWriter
CnbChunkCompression

CnbTextureCodec
CnbSpriteFontCodec
CnbModelCodec
CnbModelV2Codec
CnbAnimationClipCodec
CnbCurveCodec
CnbSoundEffectCodec
CnbMediaCodec
```

The command-line Content Pipeline lives under:

```text
tools/content/
```

and CNA also contains specialized content tools such as:

```text
tools/cnb_info/
tools/cnj_to_cnb/
tools/gltf_to_cnb/
tools/source_to_cnb/
```

Together these pieces form CNA's native build-time content ecosystem.

---

## Conclusion

The CNA Content Pipeline is much more than a file converter.

It is the layer responsible for turning heterogeneous authoring assets into validated, deterministic runtime content while tracking dependencies, supporting incremental compilation, managing build graphs and publishing outputs safely.

CNB is the native binary format that complements that system.

The relationship can be summarized simply:

```text
                CNA CONTENT PIPELINE

PNG ─────┐
WAV ─────┤
glTF ────┤
CNJ ─────┤──► Import ─► Process ─► Write ─► CNB
XNB ─────┤
... ─────┘

                         RUNTIME

CNB ─► ContentManager ─► CNA runtime object
```

CNJ gives CNA an inspectable content representation.

The Content Pipeline gives CNA a controlled build process.

CNB gives CNA a deterministic native runtime format.

And XNB remains available where XNA compatibility matters.

Together they allow CNA to support the old XNA content ecosystem without making that ecosystem the permanent limit of what CNA's content system can become.
