---
title: Fixed Timestep, Variable Timestep and Deterministic Simulation
date: 2028-06-29T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Choose and test CNA game timing deliberately, including fixed simulation ticks, interpolation, overload policy, pause and realistic determinism guarantees.
author: Robert Vokac
categories: [Development]
tags: [CNA, GameTime, Simulation, Determinism, Performance]
draft: false
---

Time is part of a game's rules. If movement, cooldowns or animation advance from whatever duration the last rendered frame happened to take, the game is delegating design to the scheduler. CNA exposes XNA-compatible fixed-step and variable-step game timing; the application still has to decide which state follows which clock.

Fixed update is a strong default for gameplay. A target of 60 updates per second gives each simulation tick the same duration. Rendering may happen more or less frequently, but authoritative mechanics advance in discrete steps. Variable update can be appropriate for simple presentation tools or applications where simulation stability is not important.

## The clocks a game actually needs

Do not force every subsystem onto one time value. A practical game distinguishes:

- simulation time, paused and advanced by fixed ticks;
- presentation time, used for visual interpolation and cosmetic effects;
- real monotonic time, used for diagnostics and network timeouts;
- media time, which may follow an audio or video stream;
- calendar time, which should never drive frame-to-frame mechanics.

Represent durations, not absolute wall-clock timestamps, in gameplay. A clock service can make ownership explicit and allow tests to advance time without sleeping.

```cpp
struct SimulationClock {
    std::uint64_t tick = 0;
    double fixedSeconds = 1.0 / 60.0;
    bool paused = false;
};

void Simulate(World& world, SimulationClock& clock, const Commands& input) {
    if (clock.paused) return;
    world.Step(input, clock.fixedSeconds);
    ++clock.tick;
}
```

CNA's `GameTime` describes the framework update and draw timing. Convert it at the boundary rather than passing it into every domain object. Durable logic becomes easier to test when it receives a tick or an explicit step duration.

## Fixed-step overload

A fixed-step loop accumulates real elapsed time and performs zero or more updates until it catches up. If the process is stalled for a second and then tries to execute sixty expensive updates immediately, it may enter a spiral of death: catching up makes it fall farther behind.

Define an overload policy. Cap accepted elapsed time after breakpoints or suspension, cap catch-up ticks per rendered frame and expose when time was discarded. Competitive networking may need a stricter policy than a single-player game. Do not silently skip authoritative ticks in one place and continue timers in another.

`GameTime::IsRunningSlowly`-style information is a diagnostic signal, not a reason for entities to change their rules independently. Central policy may reduce cosmetic work, resolution or capture frequency while simulation remains consistent.

## Interpolate presentation, not authority

At render time the accumulator may contain a fraction of the next simulation step. Keep the previous and current simulation transforms and interpolate with `alpha = accumulator / fixedStep`.

```cpp
RenderTransform MakeRenderTransform(const Body& body, float alpha) {
    return {
        Vector3::Lerp(body.previousPosition, body.position, alpha),
        Quaternion::Slerp(body.previousRotation, body.rotation, alpha)
    };
}
```

The interpolated transform is presentation-only. Collision, AI and save data use the authoritative current state. Teleports need a flag that makes previous equal current, otherwise the renderer draws a fast sweep across the world. Parent-child transforms require a consistent interpolation order.

Input also needs a contract. Poll physical devices once per framework update, translate them into semantic commands and decide which simulation ticks consume edges. A `jumpPressed` event must not be lost when an update produces no simulation tick or repeated across several catch-up ticks. Queue edges until consumed; continuous axes can use the latest sampled value under a documented rule.

## Pause, slow motion and single step

Pause should stop simulation without freezing the application pump. UI, audio policy, networking and rendering may continue. Slow motion is best expressed as a simulation rate policy or a changed number of authoritative steps, not by scattering multipliers through systems.

A developer single-step mode is invaluable: while paused, advance exactly one tick using a captured command frame. Show tick number, fixed duration, queued commands and state hash. This connects timing directly to deterministic replay and multiplayer debugging.

## What determinism can promise

Fixed timestep is necessary for many deterministic systems, but it is not sufficient. Results can still change because of unordered container iteration, floating-point contraction, different math libraries, uninitialized data, data races, nondeterministic job reduction or a shared random-number stream consumed in a different order.

Define the guarantee precisely. Same executable and platform may be enough for local replays. Lockstep networking across architectures demands stronger numeric and build constraints. Some games use fixed-point arithmetic for authority; others quantize selected state and synchronize snapshots rather than promising bit identity.

Use named random streams per subsystem. Sort stable entity IDs when order affects results. Hash canonical authoritative state at selected ticks and retain the first divergence, not merely the final mismatch.

## Test the scheduler, not just the world

Feed a fake clock sequences containing tiny frames, exact step boundaries, long stalls, alternating fast/slow frames, pause, resume and time-scale changes. Assert update count, consumed input, interpolation alpha and discarded-time diagnostics. Run the same commands under different render schedules and require identical simulation state.

Measure frame-time percentiles rather than only average FPS. Record update count, catch-up count, accumulator, slow-frame reason and time spent per system. A release build should survive suspend/resume and debugger-scale pauses without launching objects through the world.

Timing is correct when gameplay follows a documented clock, rendering remains smooth, overload is visible and the same command sequence produces the promised result within the project's stated determinism boundary.
