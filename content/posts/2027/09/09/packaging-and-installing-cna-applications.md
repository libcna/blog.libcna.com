---
title: Packaging and Installing CNA Applications
date: 2027-09-09T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Turn a working CNA build into a relocatable application with content, runtime dependencies, platform metadata and reproducible release checks.
author: Robert Vokac
categories: [Development]
tags: [CNA, Packaging, CMake, Deployment]
draft: false
---

A binary that runs from its build directory is not yet a package. A CNA application also needs content, renderer and platform libraries, licenses, icons, metadata and a predictable way to find its files after installation.

Use CMake install rules and the installed CNA C++ SDK rather than copying build-tree include paths. CNA's SDK exports relocatable targets and a version contract for downstream `find_package` consumers. Pin or record the CNA revision used for a release.

Keep immutable content beside the application or in the platform bundle and write user data only through storage APIs. Test from a clean install directory with no source tree present; accidental relative paths often survive development unnoticed.

## Platform packages

Desktop delivery may be an archive, installer or distribution package. Include only the chosen renderer's required shared libraries and preserve their legal notices. Linux portability depends on the targeted ABI and graphics stack, not only the executable bit. Windows packaging must account for the runtime and DLL search layout. macOS needs an application bundle, signing and possibly notarization.

Android and iOS own their manifests, identifiers, icons, orientations, permissions, signing and store metadata. Web deployment ships HTML, JavaScript, Wasm and asset data with correct MIME, compression and security headers. Threaded Wasm additionally requires cross-origin isolation.

Create packages in CI from a clean tagged source checkout. Smoke-test installation, startup, content loading, save location and uninstall behavior. Generate checksums and preserve symbol files separately for crash analysis.

Do not package every optional backend “just in case.” A smaller, declared configuration is easier to test and support. A release artifact should say which platform, architecture, renderer and CNA version it contains, making the installed result as reproducible as the source build.

## Release contents and upgrades

Generate a manifest with executable and asset hashes, licenses and build identity. Verify it after packaging and sign the final artifact where supported. Test download and installation through the same channel users receive.

Upgrades must preserve saves while replacing immutable content. Test installation over the previous release and clean uninstall behavior; never remove shared runtime files or user data merely because one package stopped referencing them.

## Produce a release manifest

Start from a clean staging directory and copy only declared outputs: executable, CNA libraries, renderer and platform dependencies, content packages, licenses and configuration intended for users. Generate a manifest with version, architecture and hashes. A build should fail when a required library is missing or an unexpected developer file appears; packaging the working tree recursively is not a release process.

Choose whether dependencies are bundled or documented prerequisites and keep the choice consistent per platform. Test on a clean machine without compilers, SDKs or environment variables. Verify that dynamic libraries resolve from intended locations and that optional renderer modules fail with a useful message rather than preventing the whole application from starting.

## Signing, updates and rollback

Sign the final artifact after all transformations. Keep symbols separately under the same build identifier so crash reports can be decoded without shipping debug data. Publish checksums over HTTPS and make version metadata visible from the executable and logs.

An updater downloads to a temporary location, verifies identity and integrity, closes running files safely, and installs atomically or with a recoverable transaction. Retain a rollback route when migration permits it. Test interrupted download, insufficient space, read-only destination, antivirus delay and launch after reboot. Treat save migration separately from program rollback: once a save is upgraded, an older executable may no longer understand it.

## The clean-machine gate

Before publishing, install the exact artifact into a fresh user account or disposable machine. Launch it without a network connection, create and reload a save, exercise each packaged renderer, then uninstall or update it through the supported route. Inspect leftover program files separately from intentionally retained user data. Archive the manifest, symbols, toolchain identifiers and signed artifact together. If the release cannot be reproduced and diagnosed later, packaging is not finished even when installation succeeds today.

## Worked example: make installation part of CMake

Declare files rather than copying the whole build directory:

```cmake
install(TARGETS island_game
    RUNTIME DESTINATION bin
    BUNDLE DESTINATION .)

install(DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/Content/"
    DESTINATION share/island-game/Content
    FILES_MATCHING PATTERN "*.cnb" PATTERN "*.json")

install(FILES LICENSES/CNA.txt LICENSES/third-party.txt
    DESTINATION share/island-game/licenses)

set(CPACK_PACKAGE_NAME "IslandGame")
set(CPACK_PACKAGE_VERSION "1.4.0")
include(CPack)
```

Renderer libraries and platform runtime dependencies need equivalent explicit rules. Use install-time runtime dependency discovery only when its results are reviewed and filtered; accidentally bundling a system library can be as harmful as omitting a required one.

Install into a staging prefix and produce a manifest:

```bash
cmake --install build --prefix stage
find stage -type f -print0 | sort -z | xargs -0 sha256sum > stage.manifest
cpack --config build/CPackConfig.cmake
```

Generate the manifest before signing only if signing changes files; otherwise hash the final signed bytes. Archive symbols separately under the same immutable build ID. Print that ID in crash logs and the About screen.

## Upgrade and rollback test

Automate this sequence: install version N, create a save and settings, install N+1 over it, load and resave, uninstall application files, verify the documented user-data policy, then reinstall N+1. Also interrupt the updater after download, verification and partial replacement. The executable and content package must move as one compatible set.

Run the test without compilers, SDKs or developer environment variables. Exercise offline startup and an unavailable optional renderer. A useful error names the missing module and fallback; a loader dialog about an unknown library is a packaging defect.

## Platform-specific deliverables

On Windows, choose archive versus installer and user versus machine scope, and keep runtime-library search in trusted application locations. On Linux, state whether the product is a distribution package or portable archive and test the oldest supported environment. On Apple/mobile, bundle layout, identity, entitlements and notarization/store validation are part of the executable contract.

Web packages require MIME, compression and cache headers. Servers require immutable files separated from configuration/writable state, supervision and health endpoints. The manifest principle remains the same.

Generate third-party notices from actually linked/bundled dependencies, then review them; package-manager metadata can omit fetched or statically linked code. Preserve source-offer obligations when applicable.

## Reproducibility and provenance

Record compiler, linker, CNA revision, options, content compiler and dependency locks. Build in a clean environment and compare manifests. If signed timestamps prevent byte identity, explain and compare normalized contents.

Promote the exact tested artifact between channels. Do not manually reassemble a “release” afterward. Checksums, signatures and uploads all refer to that single artifact; otherwise CI verified something users never received.
