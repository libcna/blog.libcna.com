---
title: Device Extensions in CNA
date: 2027-04-15T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  CNA::Devices adds portable access to power, locale, clipboard, URLs, display information, native dialogs, tray icons, message boxes and cameras without extending the XNA namespace.
author: Robert Vokac
categories:
  - Development
tags:
  - CNA
  - C++23
  - Devices
  - Platform
  - Camera
  - Clipboard
draft: false
---

XNA 4.0 provides a focused game API, but modern applications often need a few services outside that historical surface: opening a URL, respecting a safe area, selecting a file, reading the battery or acquiring a camera frame. CNA keeps those facilities in the optional `CNA::Devices` namespace instead of presenting them as original XNA APIs.

The complete module is disabled by default:

```bash
cmake -S . -B build -DCNA_DEVICES=ON
cmake --build build
```

Consumers link `CNA::DevicesExt`. Every public header under `CNA/Devices/` is guarded by the `CNA_DEVICES` definition, so a build that does not opt in does not accidentally depend on the extension.

**Capability reference:** [docs/devices-ext.md](https://github.com/libcna/cna/blob/next/docs/devices-ext.md)

## One portable layer, honest support

Device extensions call CNA's platform contracts. The module itself includes no SDL headers and links no native toolkit. SDL3 is the normal implementation behind the contract, while headless, terminal and test platforms can provide different services.

Every optional facility exposes a support query. Unsupported platforms report `false`, an empty result or a documented state; they do not show a fake dialog or manufacture camera data. This makes fallback code straightforward:

```cpp
if (CNA::Devices::MessageBox::getIsSupportedProperty())
{
    CNA::Devices::MessageBox::ShowSimple(
        "Saved", "Your progress has been saved.");
}
```

Tests install canned platform implementations, so an automated run never launches a real file picker, touches the user's clipboard or waits for a tray host.

## Organizing optional features

Treat device capabilities as additions to the game rather than prerequisites for starting it. Ask support when constructing the relevant screen or service, hide commands that cannot work, and still handle a later operation failure. A support query describes the selected platform implementation; permissions, disconnected hardware and the current desktop session can change the result of an actual request.

A small application-owned adapter is often useful. It can translate an empty dialog result into the game's `Cancelled` state, turn platform exceptions into a notification, and keep platform calls on the main thread where required. Game logic then depends on meaningful outcomes instead of scattering operating-system conditions throughout menus and scenes.

Headless tests should exercise both supported and unsupported paths. For example, a canned camera can transition through `Opening`, `Ready` and `Lost`, while another reports `Denied`. This verifies the application's state machine without asking CI for a webcam or permission prompt.

## Small system queries

`PowerInfo` reports whether the host is on battery, charging, charged or has no battery, plus remaining percentage and seconds when the platform knows them. Unknown numeric values are `-1` rather than plausible-looking estimates.

`Locale` returns the user's preferred locales in order. `SystemInfo` reports logical CPU cores and installed RAM in megabytes. It deliberately avoids a growing list of architecture-specific feature flags.

`DisplayInfo` is tied to the game's existing `GameWindow`. It provides content scale and safe area without enumerating or creating windows. This is enough for UI layout around phone cutouts and platform insets while keeping orientation and client bounds in their established XNA locations.

## Clipboard and external URLs

`CNA::Devices::Clipboard` offers UTF-8 text get, set and presence operations. Calls belong on the main thread. Browser clipboard access is permission- and user-gesture-sensitive, so web code must be ready for a failed write or empty read.

`UrlLauncher::Open` asks the platform to hand an external URL to the desktop shell, mobile intent system or browser. It returns `false` when no handler is available. That return value is preferable to assuming that launching always succeeds.

## Native dialogs and tray integration

`FileDialog` asynchronously opens a file picker, save picker or folder picker. Windows, Linux, macOS and Android are supported; iOS and Web are not. Cancellation and provider failure both produce an empty result, so the callback should treat “no selection” as the normal non-success path.

The asynchronous interface also means that the screen which requested a dialog may no longer exist when its result arrives. Capture durable state, not a raw pointer to a temporary menu. Pause conflicting input while the native picker is open and validate the returned path as untrusted external input before loading it.

`SystemTray` owns one desktop tray icon and a flat menu. Its support query indicates that the selected platform has a tray service, not that a particular Linux desktop currently runs a notification-area host. Construction can still fail, and an optional tray integration should catch that platform exception and continue.

`MessageBox` provides a simple form and a custom-button form. It is synchronous and blocks the caller, which makes it appropriate for rare decisions rather than moment-to-moment UI. Desktop, mobile and browser providers can support it; headless and terminal platforms correctly report that they cannot.

## Camera capture

The `Camera` extension enumerates available cameras, opens one asynchronously and exposes an explicit lifecycle:

```text
NotSupported / Closed → Opening → Ready
                         ↓       ↓
                       Denied   Lost
```

While ready, `TryAcquireFrame` polls an RGBA8 frame into a `Texture2D`. Polling once per game frame fits CNA's update loop and avoids invoking rendering objects from an arbitrary camera callback thread.

On the web, camera capture requires HTTPS and normally a user gesture. Permission denial is a first-class state rather than an exception disguised as “no frame.” Applications should also handle a `Lost` camera—for example when a USB device is disconnected—and allow the user to reopen another device.

Camera frames are ordinary graphics resources after acquisition, so they can be drawn by `SpriteBatch`, copied into another target or processed by a custom effect. Avoid retaining every returned frame: reuse or release textures according to the provider contract, and perform expensive recognition or encoding outside the render-critical path. A preview that only needs the newest image should drop stale work rather than build a queue behind a live camera.

Privacy belongs in the application flow. Enumerating a camera is not permission to start it. Explain why capture is needed, begin from a user action, show when it is active and close it when the feature ends. Those rules improve desktop behavior and are required by stricter mobile and browser environments.

## Deliberate boundaries

This module does not try to become a universal operating-system wrapper. Storage remains in XNA's `StorageDevice` and `TitleContainer`; microphone and touch remain in their existing APIs. GPS, Bluetooth, NFC, biometrics, contacts, push notifications, raw HID, process management and dynamic-library loading were rejected because they require large platform-specific subsystems or do not belong in this layer.

That restraint is the main design advantage. `CNA::Devices` covers a compact set of capabilities that games and tools repeatedly need, routes them through one testable platform boundary, and lets every target say exactly what it can provide.

When shipping on several targets, keep a short capability checklist beside the release configuration. Test the real clipboard, dialog and camera provider at least once on each claimed platform; canned tests prove application behavior, not the host integration. The fallback path deserves the same review, especially on headless, terminal and browser builds where an unavailable native feature is expected rather than exceptional.
