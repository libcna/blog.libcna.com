---
title: Bringing a CNA Game to the Web
date: 2027-05-27T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Move a CNA game to Emscripten with WebGL 2 or WebGPU while adapting its loop, assets, storage, audio and input to browser rules.
author: Robert Vokac
categories: [Development]
tags: [CNA, WebAssembly, Emscripten, WebGL2, WebGPU]
draft: false
---

A CNA web build is the same game compiled to WebAssembly, but the browser is not a desktop operating system hidden behind a canvas. It owns the main loop, restricts blocking operations, gates audio and clipboard access behind user gestures, and serves packaged assets through web storage.

Use Emscripten's toolchain and select the verified WebGL 2 route first:

```bash
emcmake cmake -S . -B build-web \
  -DCNA_GRAPHICS_RENDERER=WEBGL2
cmake --build build-web
```

WebGPU is a separate renderer with its own availability requirements. Do not silently fall back between shader languages; select a supported build and report the active renderer.

## Adapt the lifecycle

The browser calls frames through Emscripten's main loop. `Game::Run()` must yield rather than own a blocking native loop, and object lifetime must extend until cancellation. Avoid stack-owned application objects that disappear after registering the callback.

Package only required content. Large preload archives delay first play, so compress assets appropriately, stream optional data and display honest loading progress. Persistent saves require browser-backed synchronization; a write visible in memory is not automatically durable after the tab closes.

Start audio, fullscreen and pointer lock from a user action. Handle focus loss by releasing held controls and pausing relative mouse capture. Clipboard, sensors and camera calls may fail even when an API exists because browser permission policy is contextual.

Threaded Wasm requires the correct Emscripten option plus cross-origin isolation headers. Maintain a non-threaded path unless every deployment host can provide those headers. Test the actual hosted build, not only local files: MIME types, caching, compression and security headers are part of the application.

WebGL 2 has limits that differ from desktop OpenGL, including formats and state combinations. Use CNA's capability reporting and web graphics notes, then verify render targets, readback and shader precision on real browsers. A successful compilation proves only that the port begins.

## Loading and deployment details

Serve `.wasm` with the correct MIME type and enable Brotli or gzip without recompressing already compressed assets. Use content hashes so a new executable cannot read an old data package from cache. If a service worker is added, its cache and rollback policy become part of the release.

Memory growth can cause visible pauses and is constrained by the Wasm configuration. Budget decoded textures, audio and temporary content separately from download size. Test a clean first load, a warm cached load and a low-memory mobile browser.

Escape may release pointer lock, browser shortcuts remain reserved, touch can scroll the page and gamepads may appear only after interaction. Use a start screen to acquire audio and input deliberately. Test every browser claimed by the release; Emscripten compilation is not a compatibility matrix.

## Build a web application, not only Wasm

The deliverable includes executable code and the page that loads it. Keep the shell small, show real loading progress, and surface initialization errors instead of leaving a blank canvas. Cache versioned assets for a long time but keep the entry document refreshable so it can discover a new release. Test rollback because a service worker can otherwise preserve a broken combination of old code and new data.

Budget peak memory before shipping. Browsers may temporarily hold downloaded, decompressed and uploaded forms together. Audit large textures, music and models, split optional packs into later downloads, and measure scene transitions rather than only steady state. Browser storage is asynchronous and may be cleared; isolate it behind the same save service used by native builds and report when persistence is unavailable.

## Interaction and release testing

Handle focus loss, visibility change and restoration deliberately. Clear held input after focus returns, and decide whether simulation pauses or continues. Fullscreen, pointer lock and audio often require a user gesture, so the first interaction should acquire them with useful fallback instructions. Prevent page scrolling over the play surface without trapping keyboard or touch navigation elsewhere.

Test the deployed HTTPS URL on every claimed engine, including a touch device and a throttled first load. Inspect console warnings, resize behavior, save persistence, controller reconnect and recovery after a sleeping tab. Native and web content can share sources while using different compression and memory budgets; portability means preserving game semantics while respecting the browser's delivery and security model.

## A reproducible Emscripten build

Use one checked-in preset or documented command. A representative configuration looks like this; use the exact options exposed by your CNA revision:

```bash
emcmake cmake -S . -B build \
  -DCMAKE_BUILD_TYPE=Release \
  -DCNA_PLATFORM=EMSCRIPTEN \
  -DCNA_RENDERER=WEBGPU
cmake --build build --parallel 8
```

Treat generated `.html`, `.js`, `.wasm` and data as one versioned release. Never test by opening `file://`; serve the output over HTTP. Production must send `application/wasm`, correct JavaScript types and a real 404 for absent assets. Returning the application's HTML for a missing `.wasm` produces a successful request followed by a confusing compile error.

## Make startup observable

Show separate states for executable download, content download, CNA initialization and ready. The first user gesture can resume audio and request fullscreen or pointer lock:

```javascript
startButton.addEventListener("click", async () => {
  try {
    await Module.cnaStart(); // your generated integration entry point
    startPanel.hidden = true;
    canvas.focus();
  } catch (error) {
    errorPanel.textContent = String(error);
    errorPanel.hidden = false;
  }
});
```

Use hashed immutable names such as `game.a81f2.wasm`, but revalidate entry HTML. A service worker must update code and content atomically. For saves, expose asynchronous completion and never display “Saved” until browser storage has synchronized. Simulate quota denial and private mode.

Measure cold transfer, decompressed bytes, peak Wasm memory and time to interaction on a throttled network. Then test focus loss, tab sleep, high-DPI resize, touch scrolling and controller activation. The deployment URL—not the local compiler result—is the product.

## Debugging a failed web start

If the page is blank, work outward from the network panel. Confirm the entry JavaScript loads, the `.wasm` request returns 200 with Wasm bytes rather than HTML, the content bundle exists, and console exceptions are surfaced. Disable the service worker and clear site data once to distinguish current-server failure from stale-cache failure. Do not tell users to clear caches as the permanent update design.

If startup succeeds but rendering is blank, log the selected renderer, drawable dimensions and capability profile. Check that canvas CSS size and backing-store pixel size are both nonzero. A high-DPI canvas needs backing pixels scaled deliberately; changing CSS alone makes it blurry, while changing only backing size breaks input coordinates.

If audio is silent, confirm a user gesture resumed the browser audio context. If input sticks after switching tabs, clear held state on blur/visibility change. If saves disappear, wait for asynchronous persistence completion and display whether durable storage was actually available.

## Deployment checklist

- Serve through HTTPS in production and test the exact public path, including a subdirectory deployment.
- Hash executable and data filenames, but keep entry HTML revalidated.
- Configure cross-origin isolation only when the chosen Wasm/threading features require it, and verify every dependent resource carries compatible headers.
- Provide keyboard navigation and visible focus around the start/fullscreen controls outside the canvas.
- Test offline or partial-network behavior according to the promises made by the game.
- Retain source maps or symbol maps privately for the exact release.

Finally compare web and native saves, screenshots and input replays for shared scenarios. The browser version may use different quality settings, but those differences should be declared and tested rather than discovered by players.
