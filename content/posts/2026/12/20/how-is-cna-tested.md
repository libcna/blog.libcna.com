---
title: How is CNA Tested
date: 2026-12-20T18:39:17Z
updated: 2026-09-13T18:45:33Z
description: |
  CNA is a large compatibility and graphics project.
author: Robert Vokac
categories:
  - Development
tags:
  - Testing
  - glTF
  - XNA
  - CTest
  - GoogleTest
  - Graphics Testing
  - Renderer Testing
  - Pixel Tests
  - Golden Images
  - Conformance
  - Sanitizers
  - Fuzzing
  - CI
originalUrl: https://blog.libcna.com/2026/12/20/how-is-cna-tested/
classicpressId: 130
classicpressStatus: future
draft: false
---

CNA is a large compatibility and graphics project.

Testing it therefore requires more than checking whether:

```text
the project compiles
```

or even whether:

```text
thousands of unit tests pass
```

A framework can compile successfully while drawing the wrong pixels.

A renderer can return success while ignoring a texture.

A content importer can produce structurally valid data while interpreting a scene incorrectly.

An API can have every expected method while behaving differently from XNA 4.0.

For that reason, CNA uses several independent levels of verification.

The overall philosophy is approximately:

```text
source and API checks
        │
        ▼
unit tests
        │
        ▼
integration tests
        │
        ▼
real renderer execution
        │
        ▼
pixel readback
        │
        ▼
cross-renderer comparison
        │
        ▼
reference / oracle comparison
        │
        ▼
sanitizers and fuzzing
        │
        ▼
real application workloads
```

No single layer proves that CNA is correct.

Together they provide much stronger evidence than one large test counter.

---

## The normal test command

For a normal CNA development build, testing begins with CMake and CTest.

For example:

```bash
cmake -S . -B build \
    -DCNA_GRAPHICS_RENDERER=OPENGLES3

cmake --build build --target CnaTests

ctest --test-dir build --output-on-failure
```

`CnaTests` contains the large shared GoogleTest-based test corpus.

But CTest also registers many additional standalone tests, especially for graphics renderers, tools, integration tests and platform-specific functionality.

This distinction matters:

```text
CnaTests
    one large shared test executable

CTest
    orchestrates CnaTests
    + renderer-specific executables
    + integration tests
    + tools
    + scripts
    + platform tests
```

So running only the `CnaTests` binary is not necessarily equivalent to running the full CNA test configuration.

---

## CNA has thousands of tests

The exact number of tests changes frequently because CNA is still under heavy development.

Current large configurations can contain **roughly nine thousand CTest-registered tests and checks**.

But CNA intentionally does not treat:

```text
9232 tests
```

or any other exact number as a permanent project-quality metric.

The count depends on:

- selected renderer;
- enabled modules;
- platform;
- optional dependencies;
- test executables included in that build;
- new regression tests added during development.

A much more useful question is:

> What properties do those tests prove?

That is how CNA's testing strategy is organized.

---

## Unit tests

The lowest major layer is conventional unit testing.

These tests cover individual framework components such as:

```text
Vector2
Vector3
Vector4
Matrix
Quaternion

BoundingBox
BoundingSphere
BoundingFrustum
Ray
Plane

Color
Rectangle
MathHelper
Curve
```

as well as much larger areas including:

```text
Graphics
Input
Audio
Content
Storage
Networking
GamerServices
Devices
C API
```

A math test can verify something simple and deterministic:

```cpp
Vector3 result = Vector3::Cross(a, b);

EXPECT_EQ(result, expected);
```

Other tests validate state transitions, exception behavior, serialization or object lifetime.

These tests are fast and useful, but they are only the first layer.

A passing `Matrix` test tells us nothing about whether Vulkan renders a textured triangle correctly.

---

## API compatibility tests

CNA is a reimplementation of the XNA 4.0 programming model.

That means testing also has to answer:

> Does CNA expose the API that an XNA-style program expects?

The project therefore performs API-surface audits and compatibility checks against the known XNA/FNA surface.

The current CNA source tracks the presence of public types across areas such as:

```text
Framework
Graphics
Input
Audio
Media
Content
Storage
Net
GamerServices
```

This catches a different category of problem.

For example:

```text
implementation works
```

is not enough if:

```text
the public method has the wrong name
the enum value is wrong
the overload is missing
the constructor has the wrong signature
```

A compatibility framework has to test both:

```text
API shape
```

and:

```text
runtime behavior
```

---

## Header and compile-contract tests

Some API defects can be found before anything runs.

CNA contains compile-oriented tests that verify things such as:

```text
public headers compile independently

expected symbols exist

enums have the required numeric values

C API structures keep their ABI layout

public declarations do not accidentally expose
private implementation dependencies
```

This is especially important for CNA's public C API.

An ABI can be broken even when every source file inside the CNA repository still compiles.

For example:

```text
struct field reordered
```

may look harmless internally while breaking every already-compiled external program using that ABI.

CNA therefore maintains dedicated ABI and compatibility gates.

---

## Behavioral compatibility

Having the correct API surface is not enough.

Consider:

```cpp
RasterizerState::CullCounterClockwise
```

The type may exist.

The value may compile.

But if the renderer interprets winding in the opposite direction, an XNA game may suddenly lose half of its geometry.

CNA therefore also performs behavioral compatibility testing.

This includes areas such as:

```text
culling
depth
stencil
blending
sampler state
SpriteBatch behavior
effect parameters
render targets
resource lifetime
content loading
input state
```

Some of these tests were built specifically after differences between CNA and the original framework were discovered.

A compatibility bug is not considered solved merely because the source code appears mathematically reasonable.

The resulting behavior has to be measured.

---

## Testing against real XNA 4.0

One of CNA's strongest compatibility techniques is the use of **reference output produced by the real Microsoft XNA 4.0 runtime**.

This is especially valuable for graphics.

For example, CNA's Direct3D 9 renderer has a dedicated XNA pixel-oracle corpus.

The idea is simple:

```text
same scene
   │
   ├────────► Microsoft XNA 4.0
   │                │
   │                ▼
   │         reference pixels
   │
   └────────► CNA DirectX 9
                    │
                    ▼
               CNA pixels

                       │
                       ▼
                    compare
```

The current DirectX 9 oracle contains **31 scenes**.

At the current verified state:

```text
0 / 31 scenes diverge
```

when compared at:

```text
tolerance = 0
```

That means the compared pixels are expected to match exactly.

This is much stronger evidence than saying:

> CNA's implementation looks similar to XNA's source-level design.

The actual Microsoft runtime rendered one image.

CNA rendered another.

The images were compared.

---

## Why exact reference images matter

Graphics bugs can be extremely subtle.

For example:

```text
one blend factor reversed
one half-pixel convention wrong
wrong culling orientation
incorrect depth range
incorrect alpha test
wrong texture coordinate
wrong fog equation
```

may produce output that still looks plausible.

A human reviewer might not notice.

A pixel oracle does.

This is why CNA contains compatibility investigations around issues such as:

```text
XNA culling behavior
XNA depth behavior
XNA occlusion behavior
stock Effect behavior
```

with captured images and independently measured reference output.

---

## Renderer-specific tests

CNA has many graphics renderers.

Each renderer therefore has its own dedicated tests.

Examples include suites for:

```text
EasyGL
Vulkan

OpenGL 1
OpenGL 2
OpenGL 4
OpenGL ES 1
OpenGL ES 2

DirectX 1-12

WebGPU
Software
TinyGL
PortableGL
SDL Renderer
and others
```

The scope depends on what the renderer is supposed to support.

For a full 3D renderer, tests may cover:

```text
Texture2D
Texture3D
TextureCube

VertexBuffer
IndexBuffer

BasicEffect
AlphaTestEffect
DualTextureEffect
EnvironmentMapEffect
SkinnedEffect

PbrEffect

RenderTarget2D
RenderTargetCube
MRT

MSAA
OcclusionQuery

BlendState
RasterizerState
DepthStencilState
SamplerState

SpriteBatch
SpriteFont

custom ShaderEffect
instancing
```

A 2D-only renderer is not expected to pass 3D tests by pretending to support those operations.

Unsupported features are expected to be reported explicitly.

---

## Real rendering, not only mocks

Many CNA graphics tests actually create a renderer and render pixels.

For example:

```text
create graphics device
        │
        ▼
upload vertex data
        │
        ▼
draw triangle
        │
        ▼
read framebuffer
        │
        ▼
inspect pixel
```

A test may ask:

```text
Did the center pixel become red?
```

or:

```text
Did this side of the triangle remain the clear colour?
```

This sounds simple, but it proves a large stack simultaneously:

```text
vertex upload
shader
pipeline state
draw command
rasterization
render target
readback
```

If one of those components is silently broken, the pixel normally exposes it.

---

## Pixel readback tests

Pixel-readback testing is heavily used throughout CNA's renderer work.

A typical test might render:

```text
red triangle
```

over:

```text
blue background
```

and then read several carefully selected pixels.

Those pixels can prove very specific properties.

For example:

```text
center is red
    triangle was drawn

outside is blue
    geometry did not cover everything

back-facing triangle is blue
    culling worked

half-transparent pixel has expected value
    blending worked
```

This is often considerably stronger than testing whether:

```cpp
renderer.Draw(...)
```

returned without throwing.

A renderer can successfully accept a command and still implement it incorrectly.

---

## Negative tests matter too

CNA also deliberately tests unsupported behavior.

For example, if a renderer cannot support:

```text
Texture3D
```

the correct result may be:

```text
explicit NotSupportedException
```

rather than silently allocating some unrelated 2D texture.

This makes capability boundaries testable.

A successful failure is sometimes the correct result.

This is especially important because CNA contains unusual renderers with very different capabilities.

---

## Shared cross-renderer tests

Renderer-specific tests prove that one backend works.

They do not prove that different renderers interpret CNA's API consistently.

CNA therefore also uses **shared cross-renderer test fixtures**.

Conceptually:

```text
same test scene
      │
      ├── EasyGL
      ├── Vulkan
      ├── Software
      ├── TinyGL
      └── other renderer
              │
              ▼
         compare behavior
```

This can test properties such as:

```text
clear colour
triangle orientation
SpriteBatch placement
texture sampling
wireframe
blend behavior
```

A shared test has an important advantage.

If four renderers pass and one does not, the failing implementation becomes easier to isolate.

---

## Golden image testing

Some renderer tests use committed **golden images**.

A known-good renderer produces a reference frame.

Another renderer produces the same scene.

The outputs are compared.

For example:

```text
reference renderer
       │
       ▼
  golden.png

tested renderer
       │
       ▼
  actual.png

       │
       ▼
     compare
```

Golden images are especially useful for renderers where individual pixel probes would not capture the complete visual contract.

CNA's cross-renderer corpus includes deliberately small scenes whose expected output is stable and understandable.

---

## A golden image should not become unquestionable truth

Golden-image testing has an obvious danger.

If the reference itself is wrong, every renderer can faithfully reproduce the same bug.

CNA therefore tries to use independent evidence where practical.

This can mean comparing against:

```text
real XNA 4.0

another CNA renderer

Khronos glTF Sample Viewer/reference renderer

hand-derived expected values

an independently written oracle
```

The more independent the reference is from the implementation under test, the stronger the evidence.

---

## glTF has its own conformance campaign

CNA's glTF support uses an unusually deep verification system.

It is not tested only by:

```text
load file
no exception
```

The importer is checked at multiple levels.

Conceptually:

```text
L0
source validity

L1
parsed structure

L2
decoded accessors

L3
semantic primitives

L4
world-space geometry

L5
exact GPU-oriented bytes

L6
runtime behavior

L7
final rendered pixels
```

Different bugs become visible at different layers.

---

## L2: decoded accessor values

A glTF accessor may involve:

```text
buffer offsets
strides
normalization
sparse data
integer formats
quantization
```

The importer therefore records and compares decoded values.

If:

```text
POSITION accessor
```

should decode to:

```text
(1, 2, 3)
```

but CNA produces:

```text
(1, 3, 2)
```

there is no need to wait for a screenshot to reveal the problem.

The structural layer catches it first.

---

## L4: world geometry

A glTF file also contains scene transforms.

Correct local vertex values are therefore not enough.

CNA tests independently computed world-space geometry.

This catches errors involving:

```text
parent/child transform order
matrix layout
quaternion interpretation
scene selection
node hierarchy
```

A cube with correct local coordinates can still appear in the wrong place if its node hierarchy is interpreted incorrectly.

---

## L5: exact vertex and index bytes

CNA's glTF oracle infrastructure can also compare the exact bytes that reach the later rendering stages.

For example:

```text
vertex buffer bytes
index buffer bytes
```

are represented deterministically.

This catches differences that may be visually hidden in one particular camera view.

---

## L7: the production viewer

The final glTF layer deliberately goes through:

**cna-gltf-viewer**

rather than through a synthetic testing renderer.

The viewer is a normal CNA application.

The test therefore exercises:

```text
glTF importer
     │
     ▼
ContentManager
     │
     ▼
Model
     │
     ▼
Effects
     │
     ▼
CNA renderer
     │
     ▼
real framebuffer
```

The viewer can run twice in independent processes and produce deterministic captures.

For renderable corpus cases, those images can be required to be byte-identical between runs.

---

## Comparison with Khronos

CNA's glTF work also compares selected output with an independent Khronos reference renderer.

Conceptually:

```text
                   same glTF
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
 cna-gltf-viewer          Khronos renderer
          │                       │
          ▼                       ▼
       CNA PNG              reference PNG
          │                       │
          └───────────┬───────────┘
                      ▼
                   compare
```

The camera configuration is controlled so both renderers view the same scene from the same presentation setup.

This catches high-level semantic mistakes such as:

```text
wrong material
wrong UV set
incorrect normal map
bad animation pose
wrong transform
incorrect alpha
wrong camera
```

that lower-level tests may miss.

---

## Determinism is tested

For many CNA systems, producing correct output once is not enough.

The result should also be reproducible.

This matters especially for:

```text
content compilation
glTF conversion
CNB files
golden images
test fixtures
generated manifests
```

A deterministic converter should not produce different bytes because:

```text
temporary directory changed

process ID changed

thread order changed

current timestamp changed

memory address changed
```

CNA therefore contains tests that regenerate assets and verify that they are **byte-identical** to the expected result.

This makes test failures reproducible instead of probabilistic.

---

## The Content Pipeline is tested as a build system

The CNA Content Pipeline has a different test surface from the renderer.

It needs to prove things such as:

```text
source asset imported correctly

processor receives correct data

CNB output is deterministic

dependencies are tracked

incremental build skips unchanged content

changed dependency rebuilds dependents

manifest remains correct

clean removes only owned files

parallel workers produce the same result

atomic publication does not expose half-written assets
```

This is why testing the content pipeline is not equivalent to testing `ContentManager`.

One runs at build time.

The other runs inside the application.

Both need independent coverage.

---

## CNB binary tests

CNB is CNA's native binary content format.

Its tests include validation of properties such as:

```text
header layout
little-endian encoding
chunk table
asset IDs
schema versions
CRC-32C
compression
external references
invalid offsets
truncated input
```

Golden binary vectors are particularly useful here.

If a stable CNB encoder suddenly changes bytes unexpectedly, the tests can detect it.

That protects long-term content compatibility.

---

## Input testing without hardware

Input is another area where naïve tests are insufficient.

A test machine may not have:

```text
gamepad
touchscreen
sensor
IME
haptic device
```

CNA therefore separates the problem.

The translation logic can be tested with synthetic platform implementations.

For example:

```text
fake IPlatformGamepad
        │
        ▼
public GamePad API
        │
        ▼
expected GamePadState
```

This can verify:

```text
button mapping
axis mapping
slot assignment
capabilities
GUID formatting
hot-plug bookkeeping
```

without requiring a physical controller for every CI run.

---

## But physical hardware still matters

A fake gamepad can prove that:

```text
rumble command reaches the platform interface
```

It cannot prove that:

```text
the motor in a real controller actually spins
```

Likewise, synthetic sensor values cannot prove that a real phone's accelerometer behaves correctly.

CNA therefore explicitly records areas that remain hardware-gated.

Examples include:

```text
real gamepad rumble

real trigger haptics

live device sensors

real controller hot-plug

real IME composition

some OS-specific pointer behavior
```

This distinction is important.

A test suite should not claim evidence it does not have.

---

## Platform testing

CNA's Platform API is tested separately from individual graphics renderers.

Current platform implementations include:

```text
SDL3
SDL2
Headless
Terminal
```

Tests cover platform-neutral contracts such as:

```text
window state
events
input
display behavior
lifecycle
native handles
capabilities
```

There are also source-level architecture gates that ensure platform abstraction rules remain intact.

For example, scripts audit direct SDL use so new code cannot quietly bypass `IPlatform`.

This is an unusual but important class of test:

```text
architecture itself
```

is being tested.

---

## Headless testing

The Headless platform is particularly valuable in CI.

It can run without:

```text
DISPLAY
WAYLAND_DISPLAY
real graphics window
```

This makes it useful for verifying framework logic in environments where a desktop session is unavailable.

It is also used as a control configuration for features such as runtime renderer selection.

---

## Terminal testing

The Terminal platform is exercised through a pseudo-terminal.

That means CNA can test real terminal behavior instead of merely calling methods on a mock object.

For example, integration tests can verify:

```text
terminal frame presentation
keyboard event handling
terminal lifecycle
```

inside an actual pseudo-TTY environment.

---

## Runtime renderer selection tests

CNA can also build multiple renderers into one executable.

That creates another test requirement:

```text
Was every requested renderer actually compiled in?

Can every one be selected?

Does environment-variable selection work?

Did enabling this mode break normal single-renderer builds?
```

The multi-renderer CI therefore builds a controlled set such as:

```text
HEADLESS
SOFTWARE
STUB
```

and explicitly launches the selection demo with each renderer.

It also builds a normal single-renderer control configuration and runs the same shared suite.

This protects backward compatibility of the traditional build mode.

---

## Windows renderer testing from Linux

Many CNA DirectX renderers are developed from a Linux workstation.

That does not mean they are only compile-tested.

The project uses combinations including:

```text
MinGW-w64
Wine
DXVK
vkd3d-proton
```

to execute actual Windows graphics code.

For example:

```text
CNA Direct3D 11
       │
       ▼
     Wine
       │
       ▼
     DXVK
       │
       ▼
    Vulkan
       │
       ▼
  real GPU / driver
```

This allows real Direct3D calls and real rendered pixels to be exercised without requiring the entire development loop to move to Windows.

---

## DirectX 12 testing

The same principle extends to Direct3D 12 through:

```text
Wine
+
vkd3d-proton
```

CNA's current DirectX 12 testing includes real device, command-list, barrier, pipeline and off-screen rendering work.

Where presentation cannot be validated reliably in that environment, the limitation is documented instead of being converted into a fake success.

Again:

```text
tested
```

and:

```text
theoretically supported
```

are deliberately kept separate.

---

## WebAssembly testing

CNA also has dedicated Emscripten CI.

A WebAssembly configuration can prove:

```text
C++ compiles under Emscripten

all requested renderer archives link

generated registry contains every renderer

JavaScript-facing renderer selection exports exist

WASM artifact is produced
```

Some browser-oriented CNA tests are also executed in a real browser, for example through Chromium for specific DOM renderers.

But not every Web renderer is currently pixel-tested in a browser.

The CI comments explicitly distinguish:

```text
bundle successfully built
```

from:

```text
runtime behavior verified in a real browser
```

That is an important recurring principle in CNA.

---

## macOS and iOS

CNA's source tree contains Apple-specific infrastructure and tests intended for future Apple-platform qualification.

However, macOS and iOS/iPadOS have not yet received the same practical real-platform verification as CNA's main development targets.

They should therefore not be considered fully tested merely because:

```text
Apple-specific source exists
```

or:

```text
a cross-platform test can compile that code path
```

Practical testing on actual Apple environments remains planned.

---

## Sanitizers

Functional tests answer:

> Did this produce the expected result?

They do not necessarily answer:

> Did it invoke undefined behavior while doing so?

CNA therefore also uses sanitizers.

A particularly important example is the glTF import path.

It is tested under:

```text
AddressSanitizer
+
UndefinedBehaviorSanitizer
```

with both Draco-enabled and Draco-disabled configurations.

This has already found real problems.

One example involved a misaligned floating-point load triggered by malformed sparse glTF fixture data.

The normal functional path could appear to work.

UBSan exposed the invalid memory behavior.

The importer validation was then strengthened so malformed input is rejected before reaching that operation.

---

## Why sanitizer suites are scoped

An interesting property of CNA's sanitizer CI is that some jobs are deliberately narrow.

For example:

```text
glTF importer under ASan + UBSan
```

is expected to be fully green.

The project does not simply run an enormous sanitizer build and then maintain a giant allow-list of unrelated warnings.

Why?

Because:

```text
sanitizer warning
      +
allow-list
      +
another warning
      +
another allow-list
```

eventually produces a sanitizer job that everyone ignores.

A narrow fully-green sanitizer gate gives a much stronger signal.

---

## Fuzz testing

CNA also contains fuzz testing.

The C API is particularly suitable for this because it accepts untrusted raw data through a relatively small number of parsing boundaries.

The project uses two complementary approaches.

---

## Exhaustive UTF-8 testing

For short strings, CNA does not merely sample random inputs.

It enumerates them.

The C API UTF-8 oracle test runs **every byte sequence of length one, two and three**.

That is:

```text
16,843,008 input sequences
```

tested under both embedded-NUL policies.

This covers difficult UTF-8 cases such as:

```text
invalid continuation bytes
truncation
overlong sequences
surrogates
invalid lead bytes
out-of-range code points
```

The space is small enough that random fuzzing would be weaker than exhaustive enumeration.

So CNA simply tests the entire space.

---

## Independent oracle

The UTF-8 test does not compare the implementation with another copy of the same algorithm.

That would reproduce the same mistakes.

Instead the production implementation and test oracle use different approaches.

Conceptually:

```text
production validator
    checks byte structure

independent oracle
    reconstructs code point
    and validates Unicode value
```

If both agree for millions of inputs, that is stronger evidence than testing one implementation against itself.

---

## libFuzzer

For larger and more complicated input spaces, exhaustive enumeration becomes impossible.

CNA therefore also contains a coverage-guided:

```text
libFuzzer
```

target.

It is normally run with:

```text
AddressSanitizer
```

and can explore longer or unexpected input structures.

Unlike the finite UTF-8 sweep, a fuzzer has no natural completion point.

For that reason it is not treated as a normal CTest that must terminate on every commit.

The target is kept buildable so it does not silently rot between dedicated fuzzing campaigns.

---

## Mutation testing as evidence

CNA development also frequently uses **mutation tests** during difficult renderer work.

This is not one global automated mutation-testing framework.

Instead, when a regression test is introduced, the implementation may temporarily be deliberately broken to prove that the new test actually detects the defect.

For example:

```text
correct implementation
        │
        ▼
test passes

intentionally disable texture binding
        │
        ▼
test must fail

restore implementation
        │
        ▼
test passes again
```

This answers an important question:

> Does this test actually distinguish correct behavior from the bug it claims to prevent?

A green test that also stays green when the implementation is deliberately broken is not a useful regression test.

Several CNA renderer campaigns explicitly record this mutation evidence.

---

## Test order independence

Some errors appear only when tests run after other tests.

Typical causes include:

```text
global state
resource leaks
unreleased SDL subsystem references
allocator corruption
singleton state
incorrect teardown
```

CNA therefore also uses:

```text
shuffle
repeat
isolated reruns
parallel vs. serial comparison
```

for selected areas.

This has found cases where:

```text
test passes alone
```

but:

```text
fails after hundreds of other tests
```

which is often evidence of a much more serious lifetime problem.

---

## Parallel failures are investigated, not automatically ignored

Large suites can expose timing-dependent failures.

For example:

```text
audio timing
networking
window lifecycle
```

may behave differently under:

```text
ctest -j2
```

than:

```text
ctest -j1
```

CNA development records this distinction.

If a test fails in parallel but passes reliably when isolated, that is useful evidence.

But the failure is not automatically reclassified as:

```text
does not matter
```

Instead the underlying contention or environmental dependency can be tracked separately.

---

## Known failures are named

A large project inevitably accumulates temporarily known failures.

CNA's CI tries to avoid a dangerous pattern:

```text
ignore the usual 16 failures
```

without knowing what those failures actually are.

Where allow-lists are required, tests are named.

The full suite still runs.

Classification happens afterwards.

Conceptually:

```text
run everything
      │
      ▼
collect failures
      │
      ├── exact known failure
      │       tracked separately
      │
      └── anything else
              │
              ▼
             FAIL CI
```

This is important because a new failure should not disappear inside a familiar failure count.

In fact, CNA development has already found renderer defects that had been incorrectly assumed to belong to the standing unrelated failure set.

Naming failures exposed them.

---

## Source and architecture gates

Not every useful test needs to execute the game.

CNA contains many Python and CMake gates that verify architectural rules.

Examples include checking:

```text
renderer registry consistency

renderer identity uniqueness

valid renderer combinations

descriptor syntax

runtime-renderer discipline

platform abstraction discipline

direct SDL use

C API documentation coverage

ABI baseline

test-coverage budgets

asset provenance
```

These protect things that ordinary runtime tests may never notice.

For example, a new source file could directly call SDL and still pass every visible application test.

A platform-architecture gate can reject it because it bypasses `IPlatform`.

---

## Renderer capability tests

CNA supports many renderers with intentionally different capabilities.

The project therefore tests not only:

```text
does feature X work?
```

but also:

```text
does renderer correctly report whether feature X works?
```

That distinction is critical.

Suppose a renderer says:

```text
SupportsTexture3D = true
```

but its `Texture3D` implementation actually does nothing.

An application may select an unsupported path based on the false capability.

So capability reports themselves form part of the public contract.

---

## Testing fallback paths

CNA often provides fallbacks when a renderer lacks an optional feature.

Those fallbacks are also tested.

For example, a system might choose between:

```text
native GPU implementation
```

and:

```text
CPU or simpler fallback
```

depending on renderer capabilities.

A test must verify both branches where practical.

Otherwise the fallback may remain unused for months and fail exactly on the machine that needs it.

---

## C API release gates

CNA's native C API has especially strict testing requirements because ABI mistakes are difficult to repair once software has shipped against them.

Its tests cover areas including:

```text
ABI versioning

structure prefixes

handle validation

ownership

callbacks

threading rules

string views

buffer arithmetic

graphics resources

content

audio

networking

devices
```

Dedicated release gates ensure documentation, exported symbols, compatibility matrices and implementation routes remain synchronized.

This is a different kind of quality requirement from ordinary C++ source compatibility.

---

## Real applications are another test layer

Small tests are excellent at finding small defects.

They are poor at proving that many systems work together.

CNA therefore also benefits from larger applications built on the framework.

Examples include projects such as:

```text
cna-gltf-viewer
cna-street
house-simulator
```

These are not replacements for CNA's formal test suite.

They are integration workloads.

For example, `cna-street` simultaneously exercises:

```text
ContentManager

glTF

PBR

skinning

HDR

cascaded shadows

SSAO

bloom

fog

reflection probes

IBL

instancing

GPU timing

large numbers of draw calls
```

A scene like that can expose scaling and interaction problems that an isolated unit test cannot.

---

## A real scene can find different bugs

Suppose all individual tests prove:

```text
PbrEffect works

shadow map works

RenderPipeline works

glTF works

instancing works
```

That still does not prove:

```text
PbrEffect + shadows + imported glTF +
reflection probes + instancing +
transparent glass
```

works correctly in one frame.

Large demonstration applications therefore provide another kind of evidence:

```text
systems coexist
```

and:

```text
the architecture scales to a non-trivial workload
```

---

## Performance testing

Correctness is the first requirement.

But a rendering framework can be perfectly correct and unusably slow.

CNA therefore also performs performance measurements.

Relevant metrics include:

```text
CPU frame time

GPU frame time

draw calls

shadow draw calls

triangle counts

texture memory

geometry memory

content build time

startup time
```

Performance results are generally treated as measurements rather than universal guarantees because they depend strongly on:

```text
GPU
CPU
driver
OS
renderer
scene
resolution
```

Still, repeatable benchmarks can detect regressions inside a controlled environment.

---

## Build performance is measured too

CNA's CI also records build-performance information.

This matters because a large C++ project can become unpleasant to develop even if its runtime performance remains excellent.

The build report can track things such as:

```text
configure time
build time
memory consumption
```

so significant regressions become visible.

Build scalability is part of framework usability.

---

## CI matrices

CNA's GitHub Actions configuration contains many dedicated workflows rather than one enormous universal job.

Examples cover areas such as:

```text
general tests

multi-renderer builds

platform abstraction

Windows Direct3D

GDI

content pipeline on Windows

Emscripten renderers

HTML DOM

input

devices

glTF renderer conformance

glTF sanitizers

C API ABI

C API compatibility

C API coverage

C API release gates
```

This decomposition is intentional.

A failure can immediately indicate which subsystem and environment changed.

It also allows specialized environments to use the correct dependencies without making every ordinary CI job enormous.

---

## Why one giant CI configuration would be worse

CNA contains too many combinations for one build to prove everything.

Consider:

```text
platform
×
renderer
×
compiler
×
build mode
×
optional library
×
feature configuration
```

The complete Cartesian product would be enormous.

Instead CNA uses representative matrices.

For example:

```text
one renderer may prove XNA behavior

another proves Vulkan-specific execution

STUB may exercise importer sanitizers

HEADLESS may exercise platform logic

real browser CI may prove DOM integration

Wine + DXVK may prove Direct3D execution
```

Different jobs answer different questions.

---

## Build success is not runtime success

CNA documentation repeatedly distinguishes these states:

```text
source exists

compiles

links

starts

runs tests

renders pixels

matches reference

runs on real hardware
```

They are not equivalent.

For example:

```text
renderer compiles
```

does not prove:

```text
renderer creates a device
```

and:

```text
device is created
```

does not prove:

```text
triangle is correct
```

and:

```text
triangle is correct
```

does not prove:

```text
whole XNA graphics contract is correct
```

This vocabulary is important when CNA describes an experimental backend.

---

## Testing honesty

One of the recurring CNA testing principles is to document what **cannot yet be proven**.

Examples include:

```text
real physical gamepad haptics

some real mobile sensors

some browser paths

native Windows driver-specific behavior

macOS / iOS real-platform behavior

future console targets
```

The appropriate result is not to invent a test.

It is to say:

```text
not yet verified
```

and define what would be required to verify it.

That makes test results more useful.

---

## A renderer can pass tests and still have limitations

Another important point:

```text
all renderer tests pass
```

does not necessarily mean:

```text
renderer supports every CNA feature
```

A renderer may correctly report many features as unsupported.

Its tests then prove:

```text
supported features work

unsupported features are rejected correctly
```

That is a successful renderer.

For example, a deliberately 2D renderer should not fail its qualification merely because:

```text
SkinnedEffect
```

does not exist there.

It should fail only if it falsely claims to support it or handles the unsupported call incorrectly.

---

## Regression tests come from real bugs

Many CNA tests were added because a real defect was discovered.

A typical cycle is:

```text
bug discovered
      │
      ▼
minimal reproducer
      │
      ▼
test that fails
      │
      ▼
fix implementation
      │
      ▼
test passes
      │
      ▼
regression test remains forever
```

This gives the suite historical value.

Every unusual test may represent a bug that should never return.

Examples from CNA development have included problems involving:

```text
culling

depth

instancing

vertex declarations

texture sampling

shader selection

content mipmaps

glTF sparse data

resource lifetime

renderer capability reporting
```

---

## Why tests are often very specific

A useful regression test should identify one property.

For example, suppose an instanced textured draw is white.

Possible causes include:

```text
texture missing
UV missing
wrong shader selected
descriptor not bound
material colour wrong
vertex layout wrong
```

A strong CNA regression test may therefore contain several control legs:

```text
non-instanced + white material

non-instanced + red material

instanced + white material

instanced + red material
```

Each produces a different expected signature.

That makes the failure diagnostic rather than merely reporting:

```text
pixel mismatch
```

This style appears repeatedly in modern renderer development.

---

## The control case matters

A test that says:

```text
expected blue, got white
```

is useful.

A test that additionally proves:

```text
the same texture works in a non-instanced draw
```

is much stronger.

Now the defect is narrowed to:

```text
instancing path
```

rather than:

```text
possibly the texture itself
```

CNA renderer tests increasingly use these control cases to make failures discriminating.

---

## Independent evidence matters

Perhaps the most important theme in CNA testing is **independence**.

A weak test may ask the implementation what the answer should be and then verify that it returned that answer.

A strong test obtains the expected result elsewhere.

Examples include:

```text
Microsoft XNA 4.0
for graphics behavior

Khronos reference renderer
for glTF presentation

independent UTF-8 oracle
for C API validation

different CNA renderer
for cross-renderer parity

hand-computed pixel value
for simple rendering equations
```

The more independent the oracle, the less likely the implementation and test share the same mistake.

---

## What CNA testing does not mean

CNA has a large test infrastructure.

That does not mean:

```text
CNA is finished
```

or:

```text
every renderer is equally mature
```

or:

```text
every operating system has been tested
```

or:

```text
every XNA game will run unchanged
```

CNA is still pre-1.0.

Testing is used partly because the framework is changing rapidly.

It is how the project tries to keep that change controlled.

---

## Current practical test hierarchy

A useful simplified hierarchy is:

```text
LEVEL 1
Compile and static contracts
    headers
    ABI
    registry
    architecture rules

LEVEL 2
Unit tests
    math
    state
    parsing
    framework logic

LEVEL 3
Integration tests
    ContentManager
    platform implementations
    renderer resources
    content pipeline

LEVEL 4
Real graphics execution
    actual renderer
    actual shaders
    actual framebuffer

LEVEL 5
Pixel tests
    selected pixel values
    golden images

LEVEL 6
Cross-implementation tests
    EasyGL vs Vulkan
    renderer vs renderer

LEVEL 7
External oracles
    Microsoft XNA 4.0
    Khronos reference renderer
    independent parsers/oracles

LEVEL 8
Robustness testing
    ASan
    UBSan
    fuzzing
    exhaustive input sweeps

LEVEL 9
Real-world applications
    cna-gltf-viewer
    cna-street
    larger CNA projects

LEVEL 10
Real hardware qualification
    OS / GPU / input device / mobile hardware
```

Not every CNA subsystem reaches all ten levels yet.

The level reached is itself part of the project's documented maturity.

---

## Source code

The main CNA repository is:

[https://github.com/libcna/cna](https://github.com/libcna/cna)

The primary shared tests are distributed throughout the modules, for example:

```text
modules/*/tests/
tests/
```

Renderer-specific test applications and fixtures appear throughout areas such as:

```text
examples/
tests/
modules/graphics/
```

CI workflows are under:

```text
.github/workflows/
```

and include specialized jobs such as:

```text
general-tests-ci.yml
multi-renderer-ci.yml
platform-ci.yml
gltf-sanitizers-ci.yml
gltf-renderer-stride-ci.yml
emscripten-multi-renderer-ci.yml
d3d-windows-ci.yml
input-ci.yml
```

Important testing and compatibility documentation includes:

```text
docs/graphics-compatibility-report.md
docs/xna-4-api-coverage.md
docs/cross-renderer-parity-fixtures.md

docs/gltf-conformance.md
docs/gltf-reference-comparison.json
docs/gltf-l7-corpus-report.json

docs/input-build-and-test.md

docs/c-api/FUZZING.md
docs/c-api/RELEASE_GATE.md

docs/platform-abstraction.md
docs/releasing.md
```

Many individual renderer documents also contain their own qualification evidence.

Examples include:

```text
docs/vulkan-renderer.md
docs/directx9-renderer.md
docs/directx11-renderer.md
docs/directx12-renderer.md
docs/opengl1-renderer.md
docs/opengl2-renderer.md
docs/opengl4-renderer.md
docs/webgpu-renderer.md
docs/software-renderer.md
```

---

## Conclusion

CNA is not tested by one giant assertion that says:

```text
CNA works.
```

It is tested by attempting to prove smaller, independently measurable statements.

For example:

```text
this API exists

this method behaves like XNA

this renderer draws the expected pixel

this second renderer produces the same result

the real XNA 4.0 runtime produced the same reference image

the glTF reference renderer agrees with CNA

the content compiler produces identical bytes twice

malformed input is rejected under UBSan

millions of invalid UTF-8 sequences are handled correctly

a complex real application can combine the systems successfully
```

The strongest parts of CNA's test strategy deliberately go beyond conventional unit testing.

They use:

```text
real graphics contexts

framebuffer readback

golden images

cross-renderer comparisons

Microsoft XNA 4.0 reference output

Khronos glTF reference output

deterministic binary fixtures

sanitizers

exhaustive input spaces

fuzzing

real application workloads
```

because those methods catch different classes of bugs.

The goal is not to make the test count as large as possible.

The goal is to make a claim such as:

> this CNA behavior matches XNA

or:

> this renderer supports this feature

mean that there is measurable evidence behind it.

That distinction is especially important for CNA because the project combines three difficult problems at once:

```text
XNA compatibility

cross-platform systems programming

many independent graphics renderers
```

A framework with that scope cannot be tested convincingly by asking only whether it compiled.

It has to test what actually happened.
