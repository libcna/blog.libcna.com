---
title: CNA Application Lifecycle
date: 2027-08-12T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Follow a CNA Game from construction and initialization through content loading, update, drawing, suspension and ordered teardown.
author: Robert Vokac
categories: [Development]
tags: [CNA, Game Loop, Lifecycle, Architecture]
draft: false
---

A CNA executable constructs a class derived from `Game` and calls `Run()`. CNA does not hide an engine-owned `main()`. This makes ownership visible, but application code must respect when platform, window, graphics and content services become valid.

Construction should establish ordinary C++ state. `Initialize` creates game services and world structures that depend on the framework. `LoadContent` loads device-owned resources. `Update` advances input and simulation; `Draw` submits the frame. `UnloadContent`, disposal and destructors release resources in reverse ownership order.

`GraphicsDeviceManager` negotiates presentation before drawing begins. Device resets or surface recreation can invalidate assumptions made during initial loading, so resources should have a defined recreate path rather than depending on process lifetime.

## Time and activation

Use `GameTime` rather than wall-clock queries scattered through gameplay. Fixed-step simulation improves repeatability, but catch-up must be bounded after a breakpoint or suspended application. When focus is lost, release relative input and decide whether simulation pauses; do not allow stuck keys from the old focus state.

Mobile and web targets reshape the lifecycle. A browser schedules callbacks instead of yielding to a blocking loop. A phone may suspend without a final desktop-style exit. Save critical progress on deactivation, pause audio and exclude suspension duration from simulation.

Shutdown must stop worker threads and networking before their platform services disappear, dispose graphics resources before the device, and restore terminal state where applicable. Exceptions during initialization need the same partial-order cleanup.

Lifecycle tests should cover normal exit, failure during loading, resize, focus loss, suspend/resume and repeated construction in one process. The goal is not merely to reach the first frame; it is to leave every owned subsystem in a valid state after every permitted exit path.

## Components and background loading

Register services before dependent components and remove callbacks before destroying their targets. Framework lifecycle order does not replace a dependency policy between game-owned components.

Workers may decode CPU data, but device resources belong on the permitted thread. Propagate cancellation and errors to the main loop so failed loading unwinds a screen instead of leaving half-active state.

## Make ownership visible

Treat initialization as a stack of acquired resources. If audio starts but graphics creation fails, unwind audio before returning the error. Objects created in `LoadContent` should have a single owner and be released before the service or device they depend on. Content shared across screens belongs to a longer-lived owner than either screen.

Separate application lifetime from gameplay state. Suspending should pause clocks, stop or reduce audio according to policy, checkpoint safe progress and release resources the platform may revoke. Resuming must re-query window, drawable, input and device state; it cannot assume the process merely skipped a few frames. Reset accumulated time so one long background interval does not trigger thousands of update steps.

## Screens, transitions and failure

A screen manager should make transitions explicit: request, load, activate, deactivate and unload. Load CPU-heavy data on workers when useful, then create GPU objects on the correct thread. Hold the old screen until the new one is ready or show a dedicated loading state. Cancellation must free partially loaded data.

Exercise lifecycle with scripted tests: normal exit, exception during initialization, content failure, minimize/restore, surface loss, repeated device creation and shutdown while loading. Log state transitions with timestamps and stable names. The final test is an idempotent cleanup path—calling shutdown after partial initialization should be safe and should leave no callbacks capable of touching destroyed services.

## Lifecycle review questions

For every service, ask who creates it, who may call it, which thread owns it, what cancels outstanding work and what must be destroyed first. For every application state, define allowed transitions and repeated notifications. Then test initialization failure after each acquired dependency. This review prevents the common design in which normal startup is clear but resume and partial shutdown depend on accidental object order. Lifecycle correctness is ownership made visible over time.

Also verify that diagnostic logging itself remains available during early startup and late shutdown; otherwise the failures that most need context are precisely the ones that leave no useful record.

## Worked example: explicit screen states

Avoid a boolean pair such as `loaded` and `active`; invalid combinations proliferate. Model allowed states and transitions:

```cpp
enum class ScreenState { Created, Loading, Ready, Active, Unloading, Dead, Failed };

void ScreenHost::Activate(Screen& screen)
{
    Require(screen.state == ScreenState::Ready);
    screen.OnActivated();
    screen.state = ScreenState::Active;
}

void ScreenHost::FinishLoading(Screen& screen, CpuAssets assets)
{
    Require(screen.state == ScreenState::Loading);
    screen.CreateDeviceResources(std::move(assets)); // graphics thread
    screen.state = ScreenState::Ready;
}
```

Decode CPU data on a worker, but enqueue device creation to the graphics thread. The loading job owns its temporary output until handoff. If cancellation wins, discard it without touching a dead screen. If creation fails, move to `Failed`, release everything acquired so far and present a recoverable error screen.

## Suspend and resume

On suspend, stop accepting new asynchronous work, checkpoint coherent state, pause audio and record whether the current screen can be reconstructed. On resume, refresh window/drawable metrics, clear held input, recreate revoked resources and reset accumulated time. Resume can occur without a preceding clean suspend after platform recovery, so handlers must tolerate repeated notifications.

Build a fault-injection table: fail platform start, graphics device, audio, first content file, worker handoff and target recreation. For each row assert which destructors or `Dispose` calls occur and that later callbacks cannot fire. Then loop start/load/activate/unload/shutdown hundreds of times under leak detection. Lifecycle design is proven by abnormal paths, not by one normal run.

## Component ordering and time

Components need deterministic initialization, update and draw order. Defer additions/removals during iteration to a safe boundary. Express service dependencies rather than relying on constructor order. A component disabled for update must not silently continue through an independent worker.

Use a monotonic clock and bound fixed-step catch-up. Pause, debugger breaks and resume must not produce a giant elapsed interval. Async progress crosses a thread-safe queue; rendering never reads half-mutated loader state.

Exceptions need a policy. Catch at a boundary that can still log, clean up and show or return a useful failure. Do not catch every update exception and continue in a potentially corrupted world. Recover only into a state whose ownership is known.

## Definition of done

Trace normal startup, partial failure, screen replacement, suspend, resume, low memory, surface/device recreation, user exit and forced shutdown. For every trace list live owners and pending callbacks. Tests should assert final worker count, open handles where measurable, registered callbacks and graphics resources. Lifecycle is ready when every transition is intentional and diagnosable—not inferred from which destructor happened to run.
