---
title: Creating a New CNA Platform Backend
date: 2027-09-16T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Implement CNA's platform contracts for lifecycle, windows, events and optional host services without leaking native APIs into framework modules.
author: Robert Vokac
categories: [Development]
tags: [CNA, Platform API, Porting, Architecture]
draft: false
---

A CNA platform backend connects the runtime to an operating environment. It owns lifecycle, windows, event batches and optional services such as clipboard, dialogs, cameras and input devices. It must not become a shortcut for native calls throughout framework code.

Start with `docs/platform-abstraction.md`. Register a canonical platform identity in CMake, define its capabilities and implement the smallest viable `IPlatform` contract. Unsupported services should remain unavailable; returning a dummy object that silently succeeds makes capability reporting false.

Events are delivered in batches at the frame boundary. Translate native keyboard, mouse, touch, text, resize, focus and quit messages into CNA-owned data. Preserve device identity and units, and document where the environment cannot provide exact held-key or pixel-accurate mouse state.

## Ownership and teardown

The platform owns native resources and lends stable identifiers or handles through the contract. Define which thread may call each service. Stop callbacks and workers before destroying the window or platform object. Test failure halfway through initialization as carefully as normal shutdown.

Presentation belongs at the platform-renderer boundary. A native window should expose only the handles required by a selected renderer; CPU platforms can implement a surface presenter. Do not let a renderer initialize the whole operating-system event layer.

Add canned service tests, lifecycle tests and at least one real smoke application. Cover multiple windows only if the capability claims them, plus resize, focus, text input and repeated create/destroy. Use the platform hot-path lint and ratchet to prevent new direct SDL coupling outside the backend.

A new backend is complete when ordinary CNA code runs without platform conditionals, unsupported features are reported honestly, and shutdown restores the host even after errors—not when the first window merely appears.

## Qualification record

Document toolchain, host, hardware and exact tests. Implementation is not qualification: clipboard code is not evidence until exercised on a real target. Measure an empty pump and event bursts, and keep native calls out of hot renderer loops. Add CI only after dependencies and failure modes are understood.

## A practical implementation order

Begin with identity, monotonic time, logging and a minimal event loop. Add one window with correct logical and drawable sizes, then quit, focus and resize events. Only after lifecycle is stable should input, clipboard, dialogs and optional devices arrive. This order keeps early failures small and allows a smoke program to remain useful throughout development.

Normalize native events at the boundary. Key codes, text input, wheel units, touch identifiers and timestamps must enter CNA's vocabulary once. Preserve information needed by higher layers but do not expose native structures whose lifetime ends after polling. Queue ownership and capacity should be explicit; event storms must not allocate without limit.

## Renderer cooperation and qualification

Define how the platform supplies native window or surface handles without knowing renderer internals. Support surface destruction and recreation, zero-sized windows and renderer initialization failure. If a service is optional, its capability must be queryable before use and remain truthful throughout the process lifetime.

Create a conformance application that displays sizes, events, focus and service availability while exercising repeated create/destroy cycles. Automate what can be deterministic, then maintain a manual checklist for clipboard, IME, dialogs, cameras and real device behavior. Test normal exit, host-requested exit and failure during each initialization stage.

Review dependencies and licensing before calling the backend distributable. Record compiler, SDK, OS version, architecture and hardware in qualification results. The backend is ready when ordinary CNA applications contain no target-specific branch, lifecycle failure is recoverable and every advertised capability has evidence on a real system.

## Keep the boundary healthy

After integration, audit framework code for new native headers, conditional compilation and direct host calls outside the backend. Add a small architecture test or lint rule where practical. Review capability additions as public contracts: once games depend on a service, changing its units, threading or lifetime becomes compatibility work. A backend is easiest to maintain when operating-system evolution changes one adapter rather than spreading new exceptions throughout CNA.

## Worked example: event translation at one boundary

Native event types should disappear inside the adapter. A simplified pump has this shape:

```cpp
void MyPlatform::PumpEvents(EventBatch& output)
{
    NativeEvent native;
    while (PollNativeEvent(native))
    {
        switch (native.type)
        {
        case NativeEvent::Quit:
            output.Add(QuitEvent{});
            break;
        case NativeEvent::WindowResized:
            output.Add(WindowSizeEvent{
                native.windowId,
                native.logicalWidth, native.logicalHeight,
                QueryDrawableWidth(native.windowId),
                QueryDrawableHeight(native.windowId)});
            break;
        case NativeEvent::TextInput:
            output.Add(TextInputEvent{DecodeUtf8(native.text)});
            break;
        }
    }
}
```

Use the actual `IPlatform` and event types in CNA; the example illustrates ownership. Copy text and transient data before the native event expires. Use a monotonic timestamp normalized to CNA's units. Keyboard physical keys and text input are separate—layout-aware characters must not be reconstructed from key codes.

## Bring-up sequence

Make one conformance application progress through: log and time, create/destroy platform, create window, report logical/drawable size, receive quit/focus/resize, then keyboard/text/mouse/touch. Only afterward add clipboard, dialogs, cameras or controllers. Print every advertised capability and provide an interactive button that proves optional services.

Test initialization failure after each native acquisition. Stop event callbacks and workers before destroying windows. Surface recreation must not require reinitializing the whole event layer. Run one thousand window create/destroy cycles, flood the event queue, minimize to zero drawable size and terminate during a callback.

Finally audit for native headers or calls outside the backend and document thread affinity for every method. Platform completion means ordinary CNA code has no target-specific branch and every claimed service has real-device evidence.

## Input and text details

Keyboard held state and composed text are separate. IME composition may carry marked text, selection and commit; never reconstruct characters from keydown. Mouse position needs a stated logical/drawable space. Wheel units and natural scrolling normalize at the adapter.

Touch IDs live from down through up/cancel. Controller hotplug must not leave a stale object later referring to another device. Where exact held state is unavailable, document it instead of fabricating state from a lossy event stream.

Clipboard/dialog calls may block or require main-thread dispatch. Express that behavior and keep availability truthful. Camera/microphone add permission states and removal.

## Timing and host cooperation

Use monotonic time. Convert native event timestamps only when clock domains are known. Bound event queues: resize may coalesce, but text commits and quit cannot disappear.

Some hosts own the outer loop; desktop CNA may own it. Separate one pump/update/present iteration from “run forever”. Native callbacks should enqueue data, not reenter game update.

Qualification includes idle CPU, burst latency, surface recreation and restoration after failure. Archive SDK, OS and device evidence used to enable every capability.
