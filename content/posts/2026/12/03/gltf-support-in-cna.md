---
title: glTF support in CNA
date: 2026-12-03T17:37:52Z
updated: 2026-09-13T17:52:35Z
description: |
  glTF 2.0 is one of the most important modern interchange formats for real-time 3D content.
author: Robert Vokac
categories:
  - Development
tags:
  - Graphics
  - 3D
  - Content Pipeline
  - glTF
  - ContentManager
  - CNJ
  - CNB
  - GLB
  - PBR
  - cna-gltf-viewer
  - Models
  - Animation
originalUrl: https://blog.libcna.com/2026/12/03/gltf-support-in-cna/
classicpressId: 109
classicpressStatus: future
draft: false
---

**glTF 2.0** is one of the most important modern interchange formats for real-time 3D content.

A glTF asset can describe much more than a triangle mesh. It can contain a complete scene with:

- meshes;
- materials;
- textures;
- node hierarchies;
- skeletal skins;
- animations;
- morph targets;
- cameras;
- lights;
- multiple scenes;
- sampler state;
- PBR material parameters;
- and standardized extensions.

CNA has extensive native support for **glTF 2.0**, including both textual `.gltf` files and binary `.glb` files.

And glTF support in CNA is not limited to one offline converter.

The same import architecture participates in several paths:

```text
                    glTF / GLB
                        │
          ┌─────────────┼──────────────┐
          │             │              │
          ▼             ▼              ▼
   direct runtime     CNJ path       Content Pipeline
       loading        conversion          │
          │             │                 ▼
          │             ▼                CNB
          │            CNJ                │
          │             │                 │
          └─────────────┴─────────────────┘
                        │
                        ▼
                       Model
```

This makes glTF both a convenient authoring/interchange format and a first-class input into CNA's own content ecosystem.

---

## What is glTF?

glTF stands for **GL Transmission Format**.

It is an open specification maintained by the Khronos Group and is designed specifically for efficient transmission and runtime use of 3D scenes.

The two forms most developers encounter are:

```text
model.gltf
```

and:

```text
model.glb
```

A `.gltf` file is JSON and may reference external binary buffers and images:

```text
Robot.gltf
Robot.bin
Robot_BaseColor.png
Robot_Normal.png
Robot_MetallicRoughness.png
```

A `.glb` file can package the JSON and binary data into one binary container:

```text
Robot.glb
```

For game development, `.glb` is often particularly convenient because a complex model can be distributed as a single file.

---

## Direct glTF loading

CNA can load glTF models directly through `ContentManager`.

For example:

```cpp
auto model = Content.Load<Model>("Models/Robot");
```

If the resolved source is:

```text
Models/Robot.glb
```

or:

```text
Models/Robot.gltf
```

CNA can import it directly at runtime.

The important part is that no intermediate CNJ file is required:

```text
Robot.glb
    │
    ▼
ContentManager
    │
    ▼
glTF importer
    │
    ▼
CNA Model
```

This is a CNA extension to the XNA content model.

XNA 4.0 itself did not provide runtime glTF loading, but CNA can expose the result through the familiar XNA-style `Model` object.

---

## The shared glTF importer

CNA deliberately avoids implementing separate glTF interpretations for every tool.

The core implementation lives around:

```text
CNA::Internal::GltfImport
```

with the main shared importer implemented in:

```text
modules/content/include/CNA/Internal/GltfImport/
modules/content/src/GltfImport/
```

The central component is:

```text
GltfImportCore
```

The runtime loader, the CNJ converter and the Content Pipeline reuse this common interpretation.

Conceptually:

```text
                     GltfImportCore
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
 ContentManager     gltf_to_cnj      Content Pipeline
         │                │                │
         ▼                ▼                ▼
       Model             CNJ              CNB
```

This matters.

If every path had a separate glTF parser, CNA could easily reach a state where:

```text
direct loading
      ≠
glTF -> CNJ
      ≠
glTF -> CNB
```

The shared importer is intended to keep those paths semantically aligned.

---

## cgltf

CNA uses a vendored copy of **cgltf 1.15** as the low-level glTF parser.

cgltf handles the structural parsing of glTF and GLB data.

CNA then performs the higher-level work necessary to translate glTF semantics into CNA/XNA concepts.

That distinction is important:

```text
cgltf
    parses glTF structures

CNA glTF importer
    decides how those structures become CNA content
```

For example, parsing that a material contains `baseColorFactor` is only the first step.

CNA still has to decide:

- which effect represents the material;
- how textures are uploaded;
- which vertex layout is required;
- how sampler state is preserved;
- how glTF transforms map into XNA matrices;
- how animations become CNA animation data;
- how unsupported information is reported.

That is CNA's responsibility.

---

## Scene hierarchy

glTF is a scene format, not merely a collection of independent meshes.

A scene can look like:

```text
Scene
│
├── House
│   ├── Door
│   ├── Window
│   └── Roof
│
├── Tree
│   ├── Trunk
│   └── Leaves
│
└── Character
    ├── Body
    └── Skeleton
```

CNA imports the node hierarchy and preserves the relationship between mesh placement and scene nodes.

Node transforms can come from:

```text
translation
rotation
scale
```

or directly from a matrix.

Parent-child transforms are composed according to glTF rules before the data reaches the CNA model representation.

This is particularly important for real-world assets exported from Blender and other 3D applications.

A model that contains the correct vertices but ignores the node hierarchy may technically "load" while appearing completely wrong.

---

## Meshes and primitives

A glTF mesh can contain multiple primitives.

Those primitives may have different:

- materials;
- topologies;
- vertex layouts;
- textures;
- morph targets.

CNA handles glTF primitive topology rather than assuming that every file consists only of indexed triangle lists.

The glTF ecosystem includes:

```text
POINTS
LINES
LINE_LOOP
LINE_STRIP
TRIANGLES
TRIANGLE_STRIP
TRIANGLE_FAN
```

Where necessary, CNA converts a representation into a form suitable for its graphics architecture.

Non-indexed glTF primitives are also supported.

When a source primitive has no index accessor, CNA materializes a sequential index buffer rather than maintaining an entirely separate runtime path:

```text
0, 1, 2, 3, ...
```

This helps keep later model processing consistent.

---

## Accessors and buffer layouts

Real glTF assets do not always use tightly packed arrays of floats.

CNA's importer therefore handles cases such as:

- byte offsets;
- buffer-view offsets;
- padded strides;
- interleaved attributes;
- normalized integer attributes;
- sparse accessors;
- 8-bit indices;
- 16-bit indices;
- 32-bit indices;
- quantized attributes.

This is an important part of practical glTF compatibility.

A loader that only handles:

```text
float POSITION
float NORMAL
float TEXCOORD_0
uint16 indices
```

can open simple demonstration files but will fail on a large part of the real glTF ecosystem.

---

## Vertex attributes

CNA imports the major vertex semantics needed by real-time models, including:

```text
POSITION
NORMAL
TANGENT
TEXCOORD_0
TEXCOORD_1
COLOR_0
JOINTS_0
WEIGHTS_0
```

The importer then maps the available semantics into CNA's supported vertex layouts.

Where data cannot be represented exactly, CNA attempts to report the loss rather than silently pretending that nothing happened.

For example, CNA's current layouts cannot carry an unlimited number of colour or UV channels.

This distinction between:

```text
supported exactly
approximated
dropped with a diagnostic
unsupported
```

is a major part of CNA's glTF design.

---

## Normals and tangents

Not every glTF model contains normals or tangents.

CNA includes handling for missing data where generating it is meaningful.

This is particularly relevant for PBR models because normal mapping requires a tangent basis.

The importer also accounts for mirrored transforms and tangent handedness.

These details are easy to underestimate.

A model can appear mostly correct while having:

```text
inverted normal maps
incorrect mirrored lighting
broken tangent space
inside-out transforms
```

if the importer does not preserve these conventions correctly.

---

## PBR materials

glTF 2.0's core material model is based on **metallic-roughness PBR**.

CNA maps that model onto its own PBR rendering infrastructure.

A glTF material may contribute:

```text
baseColorFactor
baseColorTexture

metallicFactor
roughnessFactor
metallicRoughnessTexture

normalTexture
occlusionTexture
emissiveTexture
emissiveFactor
```

CNA carries this data into `PbrEffect`, `SkinnedPbrEffect` and the renderer-facing draw parameters.

Conceptually:

```text
glTF material
      │
      ▼
GltfImportCore
      │
      ▼
PbrEffect / SkinnedPbrEffect
      │
      ▼
GpuDrawParams
      │
      ▼
selected CNA renderer
```

The importer does not directly contain an OpenGL, Vulkan or DirectX implementation of the material.

That remains the job of the selected renderer.

---

## PBR is renderer independent at the model level

This separation is particularly important in CNA because CNA supports many renderers.

The same imported glTF model should not fundamentally become:

```text
OpenGL glTF Model
```

or:

```text
DirectX glTF Model
```

The model instead carries CNA's renderer-independent representation.

At draw time:

```text
Model
  │
  ▼
PbrEffect
  │
  ▼
CNA Graphics API
  │
  ├── EasyGL
  ├── Vulkan
  ├── DirectX
  ├── SDL GPU
  ├── Software
  └── other renderers
```

Renderer coverage still differs.

The glTF work in CNA therefore follows an important rule:

> If a renderer cannot correctly implement a glTF semantic, it should explicitly refuse that draw rather than accept it and silently render something different.

A visible failure is much safer than a renderer returning success while producing the wrong material.

---

## Textures and samplers

glTF textures contain more information than simply an image filename.

Sampler state can describe:

- wrapping;
- minification filtering;
- magnification filtering;
- mipmap filtering.

CNA imports glTF sampler information and carries per-texture state through the model.

This is important because two textures using the same image may legally use different samplers.

The glTF importer also understands that different texture roles have different colour-space semantics.

For example:

```text
base colour        sRGB-like colour data
emissive           colour data

normal             linear data
metallic/roughness linear data
occlusion          linear data
```

Treating all textures identically produces incorrect PBR results.

---

## Texture transforms

CNA implements:

```text
KHR_texture_transform
```

This extension allows an individual texture reference to apply transformations such as:

```text
offset
rotation
scale
texCoord selection
```

The important word is **individual**.

A base-colour map and a normal map can share the same underlying UV stream but still have different texture transforms.

CNA carries independent transform information for the PBR maps rather than trying to permanently bake one transform into the model's vertex coordinates.

---

## Alpha modes

glTF defines:

```text
OPAQUE
MASK
BLEND
```

CNA imports these semantics.

`MASK` includes an alpha cutoff and is handled in the shader/effect path.

`BLEND` is different because transparent rendering also requires application-level ordering and blend state.

CNA therefore preserves the material information but does not pretend that importing a file can magically solve every transparent-scene sorting problem.

The application or higher-level viewer still has responsibilities such as issuing transparent geometry in an appropriate order.

---

## Double-sided materials

glTF materials can declare:

```text
doubleSided: true
```

CNA preserves this information.

A consumer can then select the appropriate rasterizer state instead of always enabling or disabling culling globally.

Mirrored placements are also considered because mirroring changes winding orientation.

This is another example of glTF support extending beyond:

> Can CNA read the vertex positions?

Correct presentation requires preserving the state around those vertices as well.

---

## Vertex colours

CNA supports the primary glTF:

```text
COLOR_0
```

vertex-colour stream.

For a metallic-roughness material, the colour participates in the glTF base-colour product:

```text
baseColorFactor
× baseColorTexture
× COLOR_0
```

The alpha component participates as well.

This semantics has been tested across CNA's PBR renderer infrastructure.

Renderers that cannot preserve it are expected to reject the unsupported combination rather than quietly replacing the vertex colour with white.

---

## Skinning

CNA supports glTF skeletal skinning.

glTF represents skinning using concepts including:

```text
skins[]
joints[]
inverseBindMatrices
JOINTS_0
WEIGHTS_0
```

CNA translates those structures into its animation and model representation.

This includes correctly handling cases where glTF's joint array is not already ordered parent-before-child.

CNA may need to reorder the internal skeleton while remapping joint indices so that hierarchy traversal remains correct.

That is a subtle but essential requirement.

A naïve loader can appear to work on simple skeletons and then fail badly on perfectly valid files exported by another tool.

---

## Multiple skins

glTF can contain multiple independent skins in one file.

CNA's original XNA-style convention of storing one `SkinningData` object in `Model::Tag` cannot represent this alone.

CNA therefore adds an extended mapping for multiple skins while preserving compatibility with the traditional single-skin convention.

The first skin can continue to work with established XNA-style code, while CNAEXT exposes the additional skin information when a model needs it.

---

## Animations

CNA imports glTF animation channels.

The supported glTF animation targets include the important model transforms:

```text
translation
rotation
scale
weights
```

and animation interpolation includes:

```text
LINEAR
STEP
CUBICSPLINE
```

CNA supports both skeletal animation and animation of ordinary scene nodes.

That distinction matters.

Not every animation in a glTF file belongs to a skeleton.

For example:

```text
rotating fan
opening door
moving platform
animated camera
clock hand
```

may simply animate normal scene nodes.

CNA retains this rigid-node animation information rather than treating every clip as skeletal animation.

---

## Morph targets

CNA also supports glTF morph targets.

A morph target can modify attributes such as:

```text
POSITION
NORMAL
TANGENT
```

and a model can animate its morph weights.

This makes glTF usable for assets involving:

- facial expressions;
- corrective shapes;
- object deformation;
- blend-shape animation.

The current CNA implementation performs morph updates on the CPU and updates the affected vertex data.

That provides correct functionality without requiring every CNA renderer to implement a separate GPU morph-target system.

The trade-off is that highly dynamic or very large morphing models may eventually benefit from a more renderer-specific GPU path.

---

## Cameras

CNA imports glTF cameras.

Both major camera types are represented:

```text
perspective
orthographic
```

The imported camera is associated with the scene node that instances it, because the camera's placement comes from that node hierarchy.

CNA exposes imported camera information through the Model's CNA extensions.

This was added partly because a real viewer should not need to independently reverse-engineer private importer state merely to reproduce the camera framing authored in the file.

An imported camera can therefore carry information such as:

```text
projection type
field of view
near plane
far plane
aspect information
world transform
```

while the live node hierarchy can be used when the camera itself is animated.

---

## Lights

CNA recognizes:

```text
KHR_lights_punctual
```

but this is an area where glTF's lighting model and the traditional XNA stock-effect model do not match perfectly.

glTF supports:

```text
directional lights
point lights
spot lights
```

while the XNA-style lighting model available through CNA stock effects is much more limited.

CNA therefore maps what it can and **reports the approximation**.

For example, point and spot lights cannot simply become fully equivalent physical glTF lights when the destination effect exposes only directional-light concepts.

The goal is not to hide this mismatch.

It is to make the conversion explicit and diagnosable.

---

## Material variants

CNA implements:

```text
KHR_materials_variants
```

This allows one model to contain alternate material configurations.

A product model might provide:

```text
Red
Blue
Black
Chrome
```

variants without duplicating the entire mesh.

CNA preserves the source-order variant table and the sparse mapping from variants to individual primitives.

The selection is exposed through a CNAEXT API on `Model`.

Changing a variant can swap the full material-dependent state, including:

- effect;
- textures;
- sampler state;
- compatible vertex layout;
- associated material parameters.

The geometry itself does not have to be duplicated.

---

## Draco compression

CNA supports:

```text
KHR_draco_mesh_compression
```

when CNA is built with its Draco dependency available.

A Draco-compressed glTF can therefore be decoded by the same shared importer used by runtime loading and the offline conversion tools.

Support is build-dependent deliberately.

CNA does not claim support for required Draco compression in a build that does not actually contain the decoder.

Otherwise a file could be accepted even though its geometry could never be reconstructed.

---

## Other glTF extensions

The current importer has an explicit registry describing what CNA does with known glTF extensions.

Some examples are:

| Extension | CNA status |
| --- | --- |
| KHR_texture_transform | implemented |
| KHR_mesh_quantization | implemented |
| KHR_materials_emissive_strength | implemented with a named limitation |
| KHR_lights_punctual | approximated and reported |
| KHR_draco_mesh_compression | implemented when Draco is available |
| KHR_materials_unlit | implemented with a named limitation |
| KHR_materials_variants | implemented |
| KHR_materials_ior | implemented |
| KHR_materials_specular | partially renderer-limited |
| KHR_materials_transmission | approximated |
| KHR_materials_pbrSpecularGlossiness | converted approximately |
| KHR_texture_basisu | unsupported |
| EXT_texture_webp | unsupported |
| EXT_meshopt_compression | unsupported |
| EXT_mesh_gpu_instancing | unsupported |
| KHR_materials_clearcoat | parsed but currently ignored |
| KHR_materials_sheen | parsed but currently ignored |
| KHR_materials_volume | parsed but currently ignored |

CNA deliberately distinguishes between:

```text
implemented
implemented with a limitation
approximated
parsed but ignored
unsupported
not desired
```

rather than reducing everything to a misleading Boolean:

```text
supports glTF = true
```

---

## extensionsRequired matters

glTF distinguishes between:

```text
extensionsUsed
```

and:

```text
extensionsRequired
```

CNA respects that difference.

If an optional extension is used and CNA can safely fall back while reporting what was lost, loading may continue.

But when a file says an unsupported extension is **required**, CNA can reject the file by name.

That is preferable to loading it and producing a model that does not mean what the author specified.

For example:

```text
KHR_materials_transmission
```

can be approximated using alpha for some optional content.

But physical transmission involves concepts such as refraction that ordinary alpha blending does not reproduce.

A file explicitly requiring the extension is therefore making a stronger request than CNA's approximation can promise.

---

## Import diagnostics

One of the most useful parts of CNA's modern glTF support is that limitations are not supposed to disappear silently.

A glTF-loaded `Model` can expose a structured import report through CNAEXT:

```cpp
model.getGltfImportReportEXTProperty()
```

The report contains structured diagnostics.

A diagnostic can describe categories such as:

```text
information
generated data
invalid source data
approximation
dropped data
unsupported feature
```

and uses a stable diagnostic code.

This means a tool can do more than print:

```text
Warning: something was ignored.
```

It can programmatically inspect what happened.

Conceptually:

```text
glTF file
    │
    ▼
GltfImportCore
    │
    ├── Model
    │
    └── GltfImportReportEXT
            │
            ├── generated normal information
            ├── material approximation
            ├── unsupported extension
            ├── dropped attribute
            └── other diagnostics
```

The same report can survive the offline glTF → CNJ path as well.

That allows direct and offline loading to communicate the same losses to the application.

---

## glTF to CNJ

CNA provides the tool:

```text
cna_tool_gltf_to_cnj
```

It converts a glTF 2.0 asset into CNA's readable CNJ representation.

For example:

```text
Robot.glb
   │
   ▼
cna_tool_gltf_to_cnj
   │
   ├── Robot.cnj
   ├── vertex/index sidecars
   ├── skeleton data
   ├── morph data
   └── animation assets
```

This is useful when a project wants to import from glTF once and then work with a stable CNA-owned representation.

CNJ also makes the imported structure easier to inspect and debug.

The converter itself does not initialize a window or graphics renderer.

It is an offline content tool operating on CPU-side asset data.

---

## glTF to CNB

CNA also provides:

```text
cna_tool_gltf_to_cnb
```

for direct compilation into CNA's binary content format.

Conceptually:

```text
Robot.glb
   │
   ▼
GltfImportCore
   │
   ▼
CNB compiler
   │
   ▼
Robot.cnb
```

This avoids requiring a developer to manually preserve the intermediate CNJ files when they are not useful to the project.

The important architectural point is that this is not a second glTF parser.

It reuses CNA's shared glTF interpretation.

---

## glTF in the CNA Content Pipeline

glTF is also a normal source format for the native CNA Content Pipeline.

The pipeline route is approximately:

```text
.gltf / .glb
      │
      ▼
CNA.GltfImporter
      │
      ▼
ImportedModelDocument
      │
      ▼
CNA.ModelProcessor
      │
      ▼
ProcessedModelBundle
      │
      ▼
CNA.ModelContentWriter
      │
      ▼
.cnb
```

So a content source directory can contain:

```text
ContentSource/
└── Models/
    └── Robot.glb
```

and CNA can compile it into runtime content:

```text
Content/
└── Models/
    └── Robot.cnb
```

The game can then continue to use:

```cpp
auto robot = Content.Load<Model>("Models/Robot");
```

without needing to know whether the original authoring file was glTF, CNJ or something else supported by the pipeline.

---

## Why keep direct loading if CNB exists?

Because the two workflows solve different problems.

Direct runtime loading is convenient for:

- development;
- editors;
- model viewers;
- asset inspection;
- modding;
- tools;
- rapidly changing assets.

Compiled CNB is useful for:

- controlled builds;
- deterministic deployment;
- packaged games;
- incremental content pipelines;
- avoiding repeated source-format work at runtime.

CNA therefore does not force one workflow onto every project.

---

## What is cna-gltf-viewer ?

CNA has a separate project called:

**cna-gltf-viewer**

GitHub:

[https://github.com/libcna/cna-gltf-viewer](https://github.com/libcna/cna-gltf-viewer)

It is a desktop C++ application specifically designed to load and display glTF 2.0 assets through CNA.

It is useful for two related purposes:

```text
1. a developer-facing glTF model viewer

2. an integration/conformance tool for CNA's glTF implementation
```

This second role is particularly important.

`cna-gltf-viewer` is not just a pretty demo showing that a cube can rotate.

It exercises the actual CNA content and rendering paths used by real applications.

---

## Two viewer loading paths

The viewer has two major modes.

Its default mode converts the source through CNA's real offline converter:

```text
model.glb
    │
    ▼
cna_tool_gltf_to_cnj
    │
    ▼
temporary CNJ content
    │
    ▼
ContentManager
    │
    ▼
Model
    │
    ▼
CNA renderer
```

The viewer also supports:

```text
--direct
```

which takes the other path:

```text
model.glb
    │
    ▼
ContentManager
    │
    ▼
runtime glTF loader
    │
    ▼
Model
```

This is extremely useful for testing.

The same source asset can be viewed through both implementations and differences become visible.

If:

```text
direct glTF
```

and:

```text
glTF -> CNJ -> Model
```

produce different results, something is wrong in the content path.

---

## Using the viewer

A basic invocation is:

```bash
cna_gltf_viewer path/to/model.glb
```

or:

```bash
cna_gltf_viewer path/to/model.gltf
```

For direct loading:

```bash
cna_gltf_viewer path/to/model.glb --direct
```

When started without a model path, the current viewer can open its own file browser for `.gltf` and `.glb` files.

The normal camera controls include:

```text
Left mouse drag    orbit
Mouse wheel        zoom
R                  reset camera
O                  open another asset
Esc                exit
```

This makes it useful as a quick visual inspection tool when developing CNA applications or preparing assets.

---

## Automatic model framing

The viewer has a bounds-based orbit camera.

Rather than requiring every model to be manually positioned for inspection, it uses the imported model's bounds to determine a suitable target and camera distance.

This is one reason whole-model bounds became useful as an actual CNA model capability rather than private logic duplicated inside the viewer.

A 10-centimetre object and a 100-metre scene should both be inspectable without manually rewriting the camera for each asset.

---

## Imported cameras in the viewer

The orbit camera remains the normal default even if the glTF asset contains cameras.

An imported camera can be explicitly selected.

For example:

```text
--camera MainCamera
```

The viewer can then use the camera authored in the glTF scene.

This is particularly useful for validating scenes where composition matters.

It also helps test animated camera nodes because their placement is part of the same scene hierarchy as other animated objects.

---

## Animation in the viewer

The viewer can select and loop imported animations.

For example:

```text
--clip Run
```

It supports both:

- skeletal animation;
- rigid-node animation.

For deterministic testing, an animation can also be frozen at a specific looping time:

```text
--clip Run --animation-time 0.5
```

This may look like a small command-line feature, but it solves an important testing problem.

Without fixed time:

```text
process A captures at 0.487 seconds
process B captures at 0.514 seconds
```

and two otherwise identical renders produce different images.

With a fixed animation time, visual regression testing becomes reproducible.

---

## Viewer lighting policy

A glTF file does not necessarily contain a light.

If a light-less scene were simply rendered with a lit effect and zero lighting, a perfectly valid model could appear black.

The viewer therefore applies presentation policy on top of the imported data.

For a scene with no authored light, it can enable CNA's default lighting.

Authored unlit materials remain unlit.

This is an important architectural distinction:

```text
Importer:
    what did the glTF file say?

Viewer:
    how should an asset with no presentation environment
    be made useful to a human inspecting it?
```

The importer should not silently invent lights merely because one viewer wants them.

That belongs at the application layer.

---

## Diagnostics in cna-gltf-viewer

The viewer was also the first major consumer of CNA's structured glTF import diagnostics.

Warnings and approximations are visible while inspecting the asset and can also be printed to standard output.

So the viewer can help answer questions such as:

```text
Why does this asset look different?

Did CNA approximate an extension?

Was an attribute dropped?

Was a texture source unsupported?

Did CNA generate missing data?

Did the file request something the selected renderer cannot carry?
```

This makes it useful as an asset-debugging tool rather than merely an image viewer.

---

## Deterministic captures

`cna-gltf-viewer` can capture rendered output to PNG.

For example:

```text
--capture output.png
```

The viewer also provides:

```text
--reference-capture
```

for CNA's conformance work.

Reference capture uses a controlled presentation configuration, including a clean 512 × 512 frame without the normal diagnostics overlay.

The viewer can print the exact orbit-camera parameters used for that frame so another renderer can reproduce the same presentation.

This is how CNA can meaningfully compare:

```text
CNA output
```

against:

```text
an independent glTF reference renderer
```

instead of comparing images taken from different cameras.

---

## Why the viewer matters for testing CNA

Unit tests can prove many things:

```text
the accessor contains these numbers
the matrix equals this matrix
the material factor is 0.8
the vertex buffer has this stride
```

But none of those facts proves that the final pixels are correct.

A bug can exist later:

```text
correct importer
    │
correct Model
    │
correct effect parameters
    │
wrong renderer dispatch
    │
wrong image
```

The glTF campaign in CNA explicitly encountered this class of problem.

That is why `cna-gltf-viewer` became part of the highest visual conformance layer.

Conceptually:

```text
L0-L6
    structural and numerical evidence

L7
    actual production-viewer pixels
```

For L7 tests, CNA can launch the production viewer in independent processes, capture the same model and require deterministic output.

The captures can also be compared with a pinned Khronos glTF reference renderer.

This closes a gap that source inspection and numerical unit tests cannot close.

---

## The Khronos reference comparison

CNA's glTF validation infrastructure includes a pinned version of the Khronos sample renderer for reference comparisons.

The process is broadly:

```text
                 same glTF asset
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
 cna-gltf-viewer       Khronos reference renderer
          │                     │
          ▼                     ▼
       PNG A                  PNG B
          │                     │
          └──────────┬──────────┘
                     ▼
                  compare
```

The camera and presentation parameters are controlled so that the comparison is meaningful.

This does not mean CNA must produce mathematically identical pixels to every other renderer.

Different implementations, precision and PBR details can introduce legitimate variation.

But a reference comparison is extremely valuable for detecting large semantic errors such as:

```text
wrong transform
wrong UV channel
inverted normal map
missing material factor
wrong alpha
missing animation
wrong camera
```

---

## Multiple CNA renderers

The viewer is also valuable because it is a **CNA application** rather than a viewer tied directly to one graphics API.

The same application can be built against different CNA renderers.

That makes a comparison such as this possible:

```text
               same viewer
                   │
                   ▼
               same Model
                   │
                   ▼
               same PBR data
                   │
      ┌────────────┼─────────────┐
      │            │             │
      ▼            ▼             ▼
   EasyGL       Vulkan      DirectX11
```

If one renderer produces a different result from the others, the problem can be isolated much more effectively.

The CNA glTF work has used production-viewer capture paths for multiple renderers, including software and GPU-backed implementations.

---

## The viewer is deliberately separate from CNA

`cna-gltf-viewer` lives in its own repository rather than inside CNA core.

That separation is useful.

CNA provides:

```text
glTF import
Models
effects
graphics APIs
diagnostics
content conversion
renderers
```

The viewer is an application built on those features.

This proves that the functionality is actually consumable outside CNA's own internal unit tests.

It also keeps application-specific decisions such as:

```text
default orbit camera
file browser
fallback lighting
UI diagnostics
capture workflow
```

out of the core framework.

---

## glTF support is not the same as perfect support for every extension

glTF is a large and evolving ecosystem.

It is therefore important not to describe CNA's support merely as:

> CNA supports glTF 2.0.

without qualification.

CNA has strong core glTF 2.0 import support, but some extensions are:

- approximated;
- renderer-limited;
- unsupported;
- or deliberately not planned.

Examples include:

```text
EXT_mesh_gpu_instancing
EXT_meshopt_compression
KHR_texture_basisu
KHR_materials_clearcoat
KHR_materials_sheen
```

The important architectural point is that these limitations are tracked explicitly.

A missing feature should not silently transform into a different visual result and still be reported as success.

---

## glTF as part of the larger CNA content architecture

The resulting content architecture now looks approximately like this:

```text
                         AUTHORING

         Blender / Maya / other 3D software
                         │
                         ▼
                    glTF / GLB
                         │
       ┌─────────────────┼───────────────────┐
       │                 │                   │
       ▼                 ▼                   ▼
 direct runtime     glTF -> CNJ        Content Pipeline
       │                 │                   │
       │                 ▼                   ▼
       │                CNJ                 CNB
       │                 │                   │
       └─────────────────┼───────────────────┘
                         ▼
                        Model
                         │
                         ▼
               CNA Graphics abstraction
                         │
             ┌───────────┼────────────┐
             ▼           ▼            ▼
          EasyGL       Vulkan      DirectX ...
```

This is an important example of CNA's general philosophy.

CNA does not need to invent its own replacement for every industry format.

glTF is already a strong open format for exchanging 3D content.

CNA can embrace it at the boundary while still converting the data into CNA-owned runtime abstractions internally.

---

## Source code

The main CNA repository is:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

Important glTF areas include:

```text
modules/content/include/CNA/Internal/GltfImport/
modules/content/src/GltfImport/

modules/content/tests/CNA/Internal/GltfImport/
modules/content/tests/Microsoft/Xna/Framework/Content/
```

The main shared importer is centered around:

```text
GltfImportCore
```

glTF-related graphics API additions include areas such as:

```text
modules/graphics/include/Microsoft/Xna/Framework/Graphics/
modules/graphics-ext/include/CNA/Graphics/
```

including:

```text
GltfImportReportEXT
GltfMaterialBridge
```

The offline tools include:

```text
tools/gltf_to_cnj/
tools/gltf_to_cnb/
```

producing:

```text
cna_tool_gltf_to_cnj
cna_tool_gltf_to_cnb
```

Important documentation includes:

```text
docs/gltf-conformance.md
docs/gltf-conventions.md
docs/gltf-limitations.md
docs/gltf-api-change-review.md
docs/gltf-renderer-pbr-fallbacks.md
docs/gltf-renderer-stride-conformance.md
docs/gltf-performance.md
plans/plan_gltf.md
```

The separate viewer is:

[https://github.com/libcna/cna-gltf-viewer](https://github.com/libcna/cna-gltf-viewer)

and CNA also contains the tooling used to validate its output:

```text
scripts/gltf-l7-corpus.py
scripts/gltf-reference-renderer-compare.py
scripts/gltf-viewer-retake.py
tools/gltf_reference/
```

---

## Conclusion

glTF support in CNA has grown far beyond a simple mesh importer.

CNA can use `.gltf` and `.glb` assets through:

```text
direct ContentManager loading
glTF -> CNJ conversion
glTF -> CNB compilation
the CNA Content Pipeline
```

The importer handles substantial real-world 3D content, including:

```text
scene graphs
meshes
PBR materials
textures
samplers
skinning
animations
morph targets
cameras
lights
material variants
Draco compression
multiple glTF extensions
```

and exposes structured diagnostics when the source format contains semantics CNA cannot reproduce exactly.

`cna-gltf-viewer` then provides the other half of the story.

It is both a useful standalone model viewer and a real CNA application used to verify that imported glTF data survives all the way to the final pixels.

That distinction matters.

Reading a glTF file is relatively easy.

Reading it correctly, translating its semantics into an XNA-inspired C++ framework, preserving those semantics across many different graphics renderers and proving the result visually is a much larger problem.

That is the problem CNA's glTF subsystem is designed to solve.
