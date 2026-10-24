---
title: CNA on Android and iOS
date: 2027-06-03T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Mobile CNA games must integrate lifecycle, touch, orientation, safe areas, storage and permissions in addition to cross-compiling C++.
author: Robert Vokac
categories: [Development]
tags: [CNA, Android, iOS, Mobile, Touch]
draft: false
---

Android and iOS builds use the same CNA game code, but mobile delivery is more than choosing a compiler. The application can be suspended at any moment, windows and surfaces can be recreated, orientation changes reshape the drawable area, and access to sensors or cameras is governed by runtime permissions.

Android uses the NDK and SDL3 platform route. CNA includes real device and sensor wiring plus an example Gradle project, but projects must still own their package name, SDK levels, signing, icons and store configuration. Do not describe Android as qualified solely because a desktop cross-build succeeds; test an APK on physical hardware.

iOS uses CNA's Apple toolchain support. Device and simulator builds require separate directories, and deployment to hardware needs an Xcode generator and development team:

```bash
cmake -S . -B build-ios \
  -DCMAKE_TOOLCHAIN_FILE=cmake/toolchains/ios.cmake \
  -G Xcode \
  -DCNA_APPLE_DEVELOPMENT_TEAM=TEAMID
```

## Design for interruption

Save small critical state when the app deactivates instead of waiting for a graceful desktop exit. Release or pause resources that cannot survive backgrounding and rebuild presentation after a surface change. Keep simulation time from jumping forward by the entire suspension interval.

Use `TouchPanel` and gestures for gameplay, not emulated mouse assumptions. Query display bounds, orientation and safe area when laying out controls. Test notches, rounded corners, rotation and high-density screens with actual device metrics.

Camera, clipboard and sensors may require manifest declarations, permission prompts, HTTPS-like trust rules or a user gesture. An unavailable capability is a normal state. Explain the request before opening the system prompt and keep a usable fallback.

Mobile performance is constrained by heat and battery as well as peak speed. Limit overdraw, render-target size, sustained audio work and background activity. Test long sessions on device: a scene that runs for one minute may throttle after twenty.

Finally, automate what can be automated while documenting the evidence boundary. Simulator tests catch lifecycle and layout bugs; only real phones prove touch feel, sensor axes, audio routing, camera permission and thermal behavior.

## Assets, packaging and debugging

Mobile packages do not share a desktop working directory. Resolve shipped content through CNA's title path and saves through storage containers. Keep filename case exact: an error hidden on Windows becomes a missing Android asset.

Declare only permissions the application uses. Camera and microphone access affect store disclosure as well as runtime prompts. Denial should disable one feature, not trap the user in a repeated prompt loop.

Log recognizable lifecycle milestones—startup, surface creation, load, suspend and resume—without printing secrets. Preserve native symbols for crash analysis. Test optimized signed packages as well as debug builds, and record a device matrix with OS, architecture, GPU, renderer and physical-versus-simulator evidence.

## Frame pacing, heat and memory

Mobile performance is limited by sustained power, not a short benchmark. A scene that is fast for two minutes can throttle after twenty. Choose an intentional frame-rate target, stop unnecessary work while suspended and measure long sessions. Stable 30 or 60 Hz usually feels better than constant oscillation.

Memory pressure may terminate the application abruptly. Size targets from the real drawable, release reconstructible caches after a warning and avoid retaining decoded content after upload. Measure transitions, where old and new scenes overlap. Recompute projection and touch mapping after rotation from the actual viewport; window points and framebuffer pixels are not interchangeable.

## Native services and release discipline

Achievements, purchases, notifications, sharing and sign-in belong behind narrow asynchronous interfaces. Return explicit unavailable, denied and cancelled results. Gameplay should remain testable with a fake service and must not depend directly on Java, Objective-C or lifecycle callbacks.

Before release, verify icons, launch screens, privacy declarations, permissions, signing, version numbers and required architectures. Ask for sensitive access only when the feature is invoked and explain why. Test both fresh and upgrade installs: saves must survive, interrupted downloads must recover, background audio policy must hold and crash reports must match retained symbols. These are platform contracts, not store-week cleanup.

## Mobile release checklist

Run the final signed package without a debugger. Verify cold start, rotation during loading, home-and-return, an incoming audio interruption, controller and headset changes, low storage and offline launch. Capture memory after several scene cycles to expose caches that only grow. Finally, repeat the store install path on the oldest supported OS and confirm that every permission denial has a usable fallback. A desktop-successful build is evidence about shared code, not evidence that the mobile product is ready.

## Worked example: a lifecycle-safe game service

Do not let native callbacks mutate the world directly. Convert them into commands consumed at a frame boundary:

```cpp
enum class AppEvent { Suspend, Resume, LowMemory, SurfaceChanged };

void MobileGame::ProcessPlatformEvents()
{
    AppEvent event;
    while (events_.TryPop(event))
    {
        switch (event)
        {
        case AppEvent::Suspend:
            clock_.Pause();
            saves_.CheckpointIfSafe();
            audio_.Suspend();
            break;
        case AppEvent::Resume:
            display_.RefreshMetrics();
            input_.ClearHeldState();
            audio_.Resume();
            clock_.ResumeWithoutCatchUp();
            break;
        case AppEvent::LowMemory:
            cache_.ReleaseReconstructibleData();
            break;
        case AppEvent::SurfaceChanged:
            graphics_.RecreateSizeDependentResources();
            break;
        }
    }
}
```

The queue must be bounded and preserve required ordering. Coalesce repeated surface changes, but never discard suspend/resume order. `ResumeWithoutCatchUp` is crucial: background time must not become thousands of simulation updates.

## Layout and device evidence

Read logical window size, drawable pixels and safe insets separately. Build one viewport transform and use its inverse for touch. Recompute after rotation, split-screen resizing or scale-factor change. Test all four corners, not just the center. UI anchors use safe bounds; scenery may extend under a notch, but critical controls should not.

For every supported family, record device, OS, CPU architecture, GPU, renderer, drawable size and signed/debug status. Run a 30-minute representative scene and record throttling, peak memory and slow-frame percentiles. Repeat suspend/resume during loading, gameplay, saving and audio interruption. Only physical hardware proves driver behavior, touch latency, heat and memory pressure.

## Packaging assets and native integration

Keep content names case-correct and use CNA's title/content path rather than a desktop working directory. On Android, an asset may live inside the application package and not behave like a normal seekable file. On Apple systems, bundled read-only content and writable application support/storage are different roots. Put this distinction behind content and save services.

Native services are asynchronous. A purchase, sign-in, file picker or permission request can suspend the activity and return much later—or never return because the app was killed. Store enough request identity to resume safely, ignore duplicate callbacks, and never keep a raw pointer to a screen that may have been destroyed.

Graphics surfaces can disappear independently of the C++ game object. Separate reconstructible GPU resources from durable CPU state. When a surface returns, refresh dimensions and recreate targets before the next draw. If full device recovery is unsupported on a particular backend, report and test that boundary rather than continuing with stale handles.

Release evidence should cover a fresh install, upgrade from the previous store build, offline launch, denied permissions, low storage, background termination and restoration from a durable checkpoint. Verify symbol upload for the signed optimized artifact. Keep privacy disclosures synchronized with actual camera, microphone, network and analytics usage; unused permissions should be removed from both package and code.
