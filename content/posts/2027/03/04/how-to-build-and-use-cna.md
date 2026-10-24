---
title: How to Build CNA and Use It in Your Own Projects
date: 2027-03-04T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  A practical guide to building CNA, integrating it into a C++23 project, selecting graphics renderers, handling content, and targeting Linux, Windows, macOS, the Web, Android and iOS.
author: Robert Vokac
categories:
  - Development
tags:
  - CNA
  - C++23
  - CMake
  - Linux
  - Windows
  - macOS
  - WebAssembly
  - Android
  - iOS
  - Renderers
  - Game Development
draft: false
---

CNA is a C++23 implementation of the XNA 4.0 programming model. It provides familiar types such as `Game`, `GraphicsDeviceManager`, `SpriteBatch`, `Texture2D`, `ContentManager`, `Keyboard` and `GamePad`, while running on a modern platform layer and a choice of graphics renderers.

This guide shows how to build CNA itself and how to use it in a new game. It covers the six main target platforms—Linux, Windows, macOS, the Web, Android and iOS/iPadOS—along with content deployment, compile-time and runtime renderer selection, optional subsystems and common build problems.

The commands follow CNA's current 0.1.x build layout. CNA is still pre-1.0, so always consult the repository's [README](https://github.com/libcna/cna/blob/next/README.md), [changelog](https://github.com/libcna/cna/blob/next/CHANGELOG.md) and platform documents when upgrading.

## What you need

Every CNA build needs:

- CMake 3.20 or newer;
- a C++23-capable compiler;
- the CNA and Sharp Runtime repositories;
- CNA's vendored Git submodules;
- the dependencies required by the selected platform and renderer.

The OpenGL-family renderers also use the sibling `easy-gl` and `meta-gl` repositories. A convenient workspace layout is:

```text
workspace/
├── cna/
├── sharp-runtime/
├── easy-gl/
├── meta-gl/
└── my-game/
```

Clone the active development branches when following CNA development:

```bash
git clone --branch next https://github.com/libcna/cna.git
git clone --branch next https://github.com/libcna/sharp-runtime.git
git clone https://github.com/libcna/easy-gl.git
git clone https://github.com/libcna/meta-gl.git

cd cna
git submodule update --init
```

Do not use `--recursive` here. CNA directly initializes the SDL3, SDL3_mixer, Draco and GoogleTest submodules it needs; their own nested test or codec repositories are not part of the normal build.

For a released CNA version, use the matching release tags of CNA and its sibling repositories. CMake checks their declared versions and stops when an incompatible combination is detected.

## Build CNA on Linux first

Linux with `OPENGLES3` is the simplest reference configuration and a useful way to verify the workspace before embedding CNA in a game.

On Debian 13, install the baseline packages:

```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential cmake ninja-build git pkg-config ccache \
  libcurl4-openssl-dev nlohmann-json3-dev \
  libx11-dev libxext-dev libxcursor-dev libxi-dev libxfixes-dev \
  libxrandr-dev libxss-dev libxtst-dev \
  libgl-dev libegl-dev libasound2-dev libpulse-dev
```

Then configure and build CNA:

```bash
cd cna
cmake -S . -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCNA_GRAPHICS_RENDERER=OPENGLES3
cmake --build build --parallel 8
```

SDL3 and SDL3_mixer are built from CNA's vendored submodules by default. You do not need system SDL packages. If you deliberately prefer system packages, add `-DCNA_USE_SYSTEM_SDL=ON`; CMake will then require discoverable SDL3 and SDL3_mixer installations.

For a development build with CNA's tests:

```bash
cmake -S . -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCNA_GRAPHICS_RENDERER=OPENGLES3 \
  -DCNA_BUILD_TESTS=ON
cmake --build build --target CnaTests --parallel 8
tools/platform/run_gpu_tests_private.sh build --output-on-failure
```

The private test runner avoids opening test windows on your normal desktop. Application projects normally set `CNA_BUILD_TESTS=OFF` and `CNA_BUILD_EXAMPLES=OFF` so they build only what they consume.

## Add CNA directly to a CMake project

The normal development workflow uses `add_subdirectory()`. This keeps CNA, Sharp Runtime and the selected renderer in the same CMake graph as the game.

A minimal project can use this `CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyCnaGame LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Do not build CNA's own development products inside the game build.
set(CNA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(CNA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(SHARP_RUNTIME_BUILD_TESTS OFF CACHE BOOL "" FORCE)

# These paths remain overridable from the CMake command line.
set(CNA_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../cna"
    CACHE PATH "Path to CNA")
set(CNA_SHARP_RUNTIME_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../sharp-runtime"
    CACHE PATH "Path to Sharp Runtime")

add_subdirectory("${CNA_ROOT}" cna-build)

add_executable(my_game src/main.cpp)
target_link_libraries(my_game PRIVATE CNA)

# Copy any renderer runtime libraries required by this configuration.
if(COMMAND cna_copy_renderer_runtime)
    cna_copy_renderer_runtime(my_game)
endif()

if(WIN32)
    set_target_properties(my_game PROPERTIES WIN32_EXECUTABLE TRUE)
    if(COMMAND cna_copy_sdl_runtime)
        cna_copy_sdl_runtime(my_game)
    endif()
    if(COMMAND cna_copy_mingw_cxx_runtime)
        cna_copy_mingw_cxx_runtime(my_game)
    endif()
endif()
```

`CNA` is the public aggregate target. It supplies the selected framework modules, platform implementation, renderer and required Sharp Runtime closure. Avoid adding CNA's internal include directories or linking its private implementation targets directly.

## Write a minimal game

The following program creates a window, initializes a graphics device and clears every frame to XNA's familiar cornflower blue:

```cpp
#include "CNA/Platform/Entrypoint.hpp"

#include "Microsoft/Xna/Framework/Color.hpp"
#include "Microsoft/Xna/Framework/Game.hpp"
#include "Microsoft/Xna/Framework/GraphicsDeviceManager.hpp"

#include <memory>

using namespace Microsoft::Xna::Framework;

class MyGame final : public Game
{
public:
    MyGame()
        : graphics_(std::make_unique<GraphicsDeviceManager>(this))
    {
        graphics_->setPreferredBackBufferWidthProperty(1280);
        graphics_->setPreferredBackBufferHeightProperty(720);
        getContentProperty().setRootDirectoryProperty("Content");
    }

protected:
    void Update(GameTime& gameTime) override
    {
        // Update input, simulation and game state here.
        Game::Update(gameTime);
    }

    void Draw(const GameTime& gameTime) override
    {
        getGraphicsDeviceProperty().Clear(Color::CornflowerBlue);
        Game::Draw(gameTime);
    }

private:
    std::unique_ptr<GraphicsDeviceManager> graphics_;
};

int main()
{
#if defined(__EMSCRIPTEN__)
    // The browser main loop continues after main() unwinds.
    auto* game = new MyGame();
    game->Run();
#else
    MyGame game;
    game.Run();
#endif
    return 0;
}
```

Include `CNA/Platform/Entrypoint.hpp` in the translation unit that defines `main()`. It is harmless on ordinary desktop builds and provides the SDL entry-point bridge required by Android and iOS.

`Game` owns the update/draw loop and presents the frame. Do not add a second platform loop around `Game::Run()`.

## Add content

Create a `Content` directory beside your source and copy it beside the native executable:

```cmake
add_custom_target(my_game_content
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_CURRENT_SOURCE_DIR}/Content"
        "$<TARGET_FILE_DIR:my_game>/Content")
add_dependencies(my_game my_game_content)
```

Load content through `ContentManager` rather than opening deployed files by hand:

```cpp
#include "Microsoft/Xna/Framework/Graphics/Texture2D.hpp"

using Microsoft::Xna::Framework::Graphics::Texture2D;

void LoadContent() override
{
    logo_ = std::make_unique<Texture2D>(
        getContentProperty().Load<Texture2D>("logo"));
}
```

CNA can consume XNA-compatible compiled content and its own CNB/CNJ formats. It can also load glTF 2.0 `.gltf` and `.glb` models directly. For a production asset pipeline, read the current [content-pipeline guide](https://github.com/libcna/cna/blob/next/docs/content-pipeline.md), [XNB interoperability notes](https://github.com/libcna/cna/blob/next/docs/xnb-interoperability.md) and [glTF limitations](https://github.com/libcna/cna/blob/next/docs/gltf-limitations.md) before deciding which format becomes authoritative.

## Build for the six platforms

The high-level game code can stay the same, but every platform has its own compiler, packaging and deployment requirements.

| Platform | Default renderer | Current qualification boundary |
| --- | --- | --- |
| Linux | `OPENGLES3` | Primary native development and test platform |
| Windows | `SDL_GPU` | MSVC builds exist; some renderer evidence comes from cross-builds and Wine |
| macOS | `SDL_GPU` | Apple-silicon native builds and tests; renderer-specific limits apply |
| Web | `WEBGL2` | Emscripten builds run in browsers through WebAssembly and WebGL 2 |
| Android | `OPENGLES3` | NDK build and emulator execution verified; physical-device qualification remains open |
| iOS/iPadOS | `SDL_GPU` | Experimental; use `SOFTWARE` for the currently verified smoke-build path |

### Linux

Configure the game normally. CNA selects `OPENGLES3` by default on Linux, but naming it explicitly makes build scripts easier to read:

```bash
cmake -S . -B build/linux -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCNA_GRAPHICS_RENDERER=OPENGLES3
cmake --build build/linux --target my_game --parallel 8
./build/linux/my_game
```

`OPENGL33`, `SDL_GPU`, `WEBGPU`, `FNA3D` and the non-GPU renderers are useful alternatives on Linux. Create a separate build directory for each configuration; renderer selection changes the build graph.

### Windows

With Visual Studio 2022 and a Developer Command Prompt:

```powershell
cmake -S . -B build/windows -A x64 `
  -DCNA_GRAPHICS_RENDERER=SDL_GPU
cmake --build build/windows --config Release --target my_game
```

`SDL_GPU` lets SDL choose its Direct3D 12 path on Windows. CNA also provides the Windows-only `DIRECTX9` renderer for XNA-oriented compatibility work. It is not a generic synonym for modern DirectX, and it must be selected in a Windows toolchain:

```powershell
cmake -S . -B build/windows-d3d9 -A x64 `
  -DCNA_GRAPHICS_RENDERER=DIRECTX9
cmake --build build/windows-d3d9 --config Release --target my_game
```

MinGW-w64 cross-compilation from Linux is also supported. Gamer Services and networking require a libcurl built for the Windows target; if the game does not use them, disable both modules rather than accidentally linking host libraries:

```bash
cmake -S . -B build/windows-mingw -G Ninja \
  -DCMAKE_TOOLCHAIN_FILE=../cna/cmake/toolchains/mingw-w64.cmake \
  -DCNA_GRAPHICS_RENDERER=SDL_GPU \
  -DCNA_ENABLE_NET=OFF \
  -DCNA_ENABLE_GAMER_SERVICES=OFF
cmake --build build/windows-mingw --target my_game --parallel 8
```

### macOS

Install the native tools, configure the SDL_GPU renderer and optionally ask CNA to turn the executable into an application bundle:

```bash
brew install cmake ccache

cmake -S . -B build/macos -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCNA_GRAPHICS_RENDERER=SDL_GPU \
  -DCNA_APPLE_BUNDLE_MACOS_EXECUTABLES=ON
cmake --build build/macos --target my_game --parallel 4
```

Add the bundle helper after defining the executable:

```cmake
if(APPLE AND COMMAND cna_apple_configure_bundle)
    cna_apple_configure_bundle(my_game)
endif()
```

The supported deployment floor is controlled by `CNA_MACOS_DEPLOYMENT_TARGET`, currently defaulting to macOS 13.3. Optional Homebrew libraries such as FFmpeg may have a newer deployment requirement than the game; disable video with `-DCNA_ENABLE_VIDEO=OFF` when producing a binary for an older system unless you provide compatible media libraries.

### WebAssembly and WebGL 2

Install and activate the Emscripten SDK, then configure through `emcmake`:

```bash
source "$HOME/emsdk/emsdk_env.sh"

emcmake cmake -S . -B build/web -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCNA_GRAPHICS_RENDERER=WEBGL2 \
  -DCNA_BUILD_TESTS=OFF
cmake --build build/web --target my_game --parallel 8
```

The final executable needs browser-specific options:

```cmake
if(EMSCRIPTEN)
    set_target_properties(my_game PROPERTIES SUFFIX ".html")
    target_link_libraries(my_game PRIVATE CNA::EmscriptenAsyncify)
    target_link_options(my_game PRIVATE
        -sALLOW_MEMORY_GROWTH=1
        -sFORCE_FILESYSTEM=1
        "-sMIN_WEBGL_VERSION=2"
        "-sMAX_WEBGL_VERSION=2"
        --preload-file "${CMAKE_CURRENT_SOURCE_DIR}/Content@/Content")
endif()
```

Serve the resulting `.html`, `.js`, `.wasm` and `.data` files over HTTP. Opening the HTML directly through `file://` is not a valid browser deployment test.

Most games should keep Emscripten threads disabled. If the game genuinely loads content or performs other work on `System.Threading.Thread`, configure with `-DCNA_ENABLE_EMSCRIPTEN_THREADS=ON`. The server must then provide cross-origin isolation headers including `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`; without them the browser cannot expose `SharedArrayBuffer`.

### Android

An Android build requires the Android SDK, NDK, Java and Gradle. The NDK can first verify that the C++ graph cross-compiles:

```bash
cmake -S . -B build/android -G Ninja \
  -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake" \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-24 \
  -DCNA_GRAPHICS_RENDERER=OPENGLES3 \
  -DCNA_BUILD_TESTS=OFF \
  -DCNA_BUILD_EXAMPLES=OFF
cmake --build build/android --parallel 8
```

That command builds native libraries; it does not create an APK by itself. Package the game through an Android Gradle project based on SDL's Android template. Its JNI CMake project should add the game's root project, build the application as SDL's `main` shared library, and link it against `CNA`, `SHARP_RUNTIME` and `SDL3::SDL3`. Because the source containing `main()` includes `CNA/Platform/Entrypoint.hpp`, SDL's Java activity can find the required `SDL_main` symbol.

CNA's `cna_demo_devices` Android project is a working reference for this wiring. It builds with:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
./gradlew -PBUILD_WITH_CMAKE assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Android currently uses `OPENGLES3` as its validated renderer. Emulator execution is established, but a broad physical-device GPU, touch, audio and performance matrix has not yet been completed.

### iOS and iPadOS

iOS cross-compilation requires macOS and Xcode. Use CNA's toolchain file and the Xcode generator when you intend to sign or deploy:

```bash
cmake -S . -B build/ios -G Xcode \
  -DCMAKE_TOOLCHAIN_FILE=../cna/cmake/toolchains/ios.cmake \
  -DCNA_GRAPHICS_RENDERER=SOFTWARE \
  -DCNA_ENABLE_NET=OFF \
  -DCNA_BUILD_TESTS=OFF \
  -DCNA_BUILD_EXAMPLES=OFF \
  -DCNA_APPLE_DEVELOPMENT_TEAM=YOUR_TEAM_ID
cmake --build build/ios --config Release --target my_game
```

For the simulator, use a separate build directory and add `-DCNA_IOS_SIMULATOR=ON`. Networking is disabled because CNA's current iOS configuration does not supply target-native libcurl. `SDL_GPU` is CNA's designated iOS renderer and the platform default, but it remains unqualified there; replace `SOFTWARE` with `SDL_GPU` only when deliberately testing that experimental path.

Every iOS executable must call `cna_apple_configure_bundle(my_game)` and include `CNA/Platform/Entrypoint.hpp` in the file defining `main()`. CNA generates the `.app` structure and `Info.plist`, but it does not create App Store metadata, an asset catalog or an `.ipa` distribution workflow.

iOS support remains experimental. A final-linked device app and a simulator smoke path exist, but CNA does not yet claim physical-device pixel correctness, touch, audio, persistence, lifecycle or performance qualification.

## Choose a renderer

CNA exposes ten public renderer identities:

| Renderer | Best use |
| --- | --- |
| `OPENGLES3` | Mature GL-family path for Linux and Android |
| `OPENGL33` | Desktop OpenGL 3.3 core profile |
| `WEBGL2` | Browser rendering through Emscripten |
| `SDL_GPU` | Modern native path through SDL's Vulkan, Direct3D 12 or Metal implementation |
| `WEBGPU` | Native wgpu and browser WebGPU experiments and applications |
| `DIRECTX9` | Windows-only XNA/D3D9 compatibility work |
| `FNA3D` | XNA-shaped graphics through FNA3D's runtime-selected native driver |
| `SOFTWARE` | Deterministic CPU rendering without requiring a GPU |
| `HEADLESS` | Windowless validation and non-pixel workloads |
| `STUB` | No-op renderer for the narrowest non-rendering scenarios |

The default is `WEBGL2` under Emscripten, `SDL_GPU` on Windows and Apple platforms, and `OPENGLES3` elsewhere. An explicit configuration is preferable in reproducible builds:

```bash
cmake -S . -B build/opengl33 -DCNA_GRAPHICS_RENDERER=OPENGL33
```

Renderer names select CNA implementations, not necessarily the final native API below an abstraction. For example, `SDL_GPU` may use Vulkan on Linux, Direct3D 12 on Windows or Metal on Apple platforms. Those are SDL backends, not separate CNA renderer names.

Consult the [renderer registry](https://github.com/libcna/cna/blob/next/docs/renderer-registry.md) and [feature matrix](https://github.com/libcna/cna/blob/next/docs/graphics-renderer-feature-matrix.md) before relying on a specialized capability. Do not assume that every renderer supports occlusion queries, custom shaders, every texture format or compiled XNA effects merely because it can clear a window and draw sprites.

## Compile several renderers into one game

A normal build contains one renderer. This produces the smallest binary and is the recommended release configuration.

For diagnostics, compatibility testing or a user-selectable graphics menu, compile several compatible renderers into one binary:

```bash
cmake -S . -B build/multi -G Ninja \
  -DCNA_GRAPHICS_RENDERER=OPENGLES3 \
  -DCNA_GRAPHICS_RENDERERS="OPENGLES3;OPENGL33;SDL_GPU;WEBGPU;SOFTWARE"
```

`CNA_GRAPHICS_RENDERER` is the default and must appear in `CNA_GRAPHICS_RENDERERS`. Select a compiled renderer before constructing the first `GraphicsDevice`:

```cpp
#include "CNA/GraphicsRendererSelection.hpp"

int main()
{
    CNA::GraphicsRendererSelection::SetPreferred(
        CNA::GraphicsRendererType::SdlGpu);

    MyGame game;
    game.Run();
}
```

The environment variable provides another route:

```bash
CNA_GRAPHICS_RENDERER=WEBGPU ./my_game
```

Selection precedence is an explicit `SetPreferred()` call, then the environment variable, then the build default. Asking for a renderer that was not compiled in throws an error. CNA never silently replaces the requested renderer.

Fallback is opt-in:

```cpp
CNA::GraphicsRendererSelection::SetPreferred(
    CNA::GraphicsRendererType::SdlGpu);
CNA::GraphicsRendererSelection::SetFallbackChain({
    CNA::GraphicsRendererType::OpenGLES3,
    CNA::GraphicsRendererType::Software,
});
```

Configure selection and fallback before creating the game. Once the first graphics device exists, renderer selection is latched and attempts to change it throw.

## Optional modules worth deciding early

CNA's default configuration is broad. A focused game can reduce dependencies and build time by deciding which optional systems it actually needs:

```bash
cmake -S . -B build/game -G Ninja \
  -DCNA_GRAPHICS_RENDERER=OPENGLES3 \
  -DCNA_BUILD_TESTS=OFF \
  -DCNA_BUILD_EXAMPLES=OFF \
  -DCNA_ENABLE_NET=OFF \
  -DCNA_ENABLE_GAMER_SERVICES=OFF \
  -DCNA_ENABLE_VIDEO=OFF
```

Important switches include:

- `CNA_ENABLE_NET` for XNA-style sessions through ENet and CNA services;
- `CNA_ENABLE_GAMER_SERVICES` for Guide, profiles, achievements, leaderboards and avatars;
- `CNA_ENABLE_VIDEO=OFF|AUTO|ON` for FFmpeg-backed video;
- `CNA_CNAEXT=ON` for CNA's optional graphics extensions;
- `CNA_DEVICES=ON` for camera, clipboard, display, file-dialog, locale, power and related device extensions;
- `CNA_DIAGNOSTICS=OFF|STATS|FULL` for renderer-independent instrumentation;
- `CNA_BUILD_INSPECTOR=ON` for the separate local Inspector agent and browser bridge.

If networking is enabled, Gamer Services must also be enabled because XNA network sessions contain signed-in gamers. CMake rejects an inconsistent combination instead of producing an incomplete runtime.

Compiled XNA effects are separate opt-ins for renderers that support them. Examples include `CNA_EASYGL_COMPILED_EFFECTS`, `CNA_SDL_GPU_COMPILED_EFFECTS`, `CNA_WEBGPU_COMPILED_EFFECTS`, `CNA_SOFTWARE_COMPILED_EFFECTS` and `CNA_DIRECTX9_COMPILED_EFFECTS`. Enable the one belonging to the selected renderer only when the game consumes XNA Effect bytecode, and check that renderer's documented restrictions.

## Install and consume CNA as an SDK

`add_subdirectory()` is convenient while CNA and the game evolve together. For a separate binary C++ SDK, configure CNA with `CNA_INSTALL_CXX=ON`:

```bash
cd cna
cmake -S . -B build-sdk -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCNA_GRAPHICS_RENDERER=OPENGLES3 \
  -DCNA_INSTALL_CXX=ON \
  -DCNA_BUILD_TESTS=OFF \
  -DCNA_BUILD_EXAMPLES=OFF
cmake --build build-sdk --target cna_cpp_sdk --parallel 8

cmake --install build-sdk --prefix "$PWD/sdk" --component SharpRuntime
cmake --install build-sdk --prefix "$PWD/sdk" --component CNACpp
```

The consumer can then use the installed CMake package:

```cmake
find_package(CNA CONFIG REQUIRED COMPONENTS
    Core Math Input GraphicsCore Content Runtime Audio)

add_executable(my_game src/main.cpp)
target_link_libraries(my_game PRIVATE
    CNA::Core
    CNA::Math
    CNA::Input
    CNA::GraphicsCore
    CNA::Content
    CNA::Runtime
    CNA::Audio)
```

Configure the game with `-DCMAKE_PREFIX_PATH=/path/to/cna/sdk`. `CNA::CNA` is the installed umbrella target when the game prefers the complete configured SDK.

An installed C++ SDK preserves the producer's platform, renderer and module selection. It is not one universal binary that can be moved between operating systems, CPU architectures, compilers and incompatible C++ standard libraries. Build one SDK configuration for each delivery target.

## Debugging build problems

Most initial failures fall into a few categories:

**CMake cannot find Sharp Runtime.** Keep `sharp-runtime` beside CNA or set `CNA_SHARP_RUNTIME_ROOT` to its absolute path.

**CMake cannot find EasyGL or MetaGL.** `OPENGLES3`, `OPENGL33` and `WEBGL2` require `easy-gl`; `meta-gl` must sit beside that checkout. Override CNA's EasyGL path with `CNA_EASYGL_ROOT` when using another workspace layout.

**The SDL submodule is empty.** Run `git submodule update --init` from the CNA repository. GitHub source ZIP files do not contain submodule contents.

**A Linux configure enables fewer SDL drivers than expected.** Install X11, Wayland, OpenGL/EGL and audio development headers before the first configure. CNA caches the vendored SDL build by platform configuration.

**The game builds but cannot find content.** Keep `ContentManager.RootDirectory` and the deployed directory name identical, including case on Linux and the Web. Package browser content with `--preload-file`.

**The web page is blank when opened from disk.** Serve it through HTTP and inspect the browser console. Threaded builds additionally require cross-origin isolation.

**The Android application starts and immediately exits.** Ensure the source defining `main()` includes `CNA/Platform/Entrypoint.hpp` and that the Gradle/JNI target exports SDL's expected entry point.

**An iOS build links but cannot be installed.** A device build needs the Xcode generator, an Apple development team, valid signing and a correctly configured `.app` bundle. A simulator build does not prove device signing.

**Changing a renderer appears to do nothing.** Use a separate build directory or reconfigure the existing one explicitly. `CNA_GRAPHICS_RENDERER` is a cached CMake variable.

## A sensible starting configuration

For a new desktop game, start narrowly:

```bash
cmake -S . -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCNA_GRAPHICS_RENDERER=OPENGLES3 \
  -DCNA_BUILD_TESTS=OFF \
  -DCNA_BUILD_EXAMPLES=OFF \
  -DCNA_ENABLE_NET=OFF \
  -DCNA_ENABLE_GAMER_SERVICES=OFF \
  -DCNA_ENABLE_VIDEO=OFF
cmake --build build --target my_game --parallel 8
```

Get the game loop, input, content and one renderer working first. Add platform packaging next, then enable optional services only when the game uses them. A multi-renderer build is excellent for development and comparison, but a single known renderer is easier to package and diagnose for the first release.

The best working references are [CNA Examples](https://github.com/libcna/cna-examples) for focused API usage, [CNA Samples](https://github.com/libcna/cna-samples) for complete XNA ports, and the playable [CNA Samples gallery](https://samples.libcna.com/) for browser results. Together they show the same framework at three useful scales: isolated concepts, original applications and deployed WebAssembly products.
