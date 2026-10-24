---
title: Frame Pacing, Input Latency and Present Modes in CNA
date: 2028-09-21T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Diagnose smoothness beyond average FPS by measuring CNA frame pacing, queueing, presentation, input age and capability-dependent display policy.
author: Robert Vokac
categories: [Development]
tags: [CNA, Frame Pacing, Latency, VSync, Performance]
draft: false
---

A game can average 60 FPS and still feel uneven. Ten fast frames followed by one long frame have the same average as a stable cadence, but motion exposes the hitch. Input can also feel delayed while rendering appears smooth because commands wait through simulation and queued frames before reaching the display.

CNA gives a game timing and presentation controls through its XNA-compatible surface and platform/renderer extensions. Exact present modes vary by platform and backend, so build policy from advertised capabilities and measured behavior rather than renderer names.

## Instrument one frame as a timeline

Record monotonic timestamps for input sample, update begin/end, render preparation, submission, present request and—where the platform exposes reliable feedback—presentation completion. CPU timestamps cannot prove the exact scanout time, but they still reveal queueing and stalls.

```cpp
struct FrameTrace {
    std::uint64_t frameId;
    TimePoint inputSample;
    TimePoint updateBegin, updateEnd;
    TimePoint submitBegin, submitEnd;
    TimePoint presentReturn;
    std::uint32_t simulationTicks;
    PresentPolicy policy;
};
```

Plot frame intervals and percentiles. Report 50th, 95th, 99th and worst representative values, plus missed refresh intervals. FPS hides whether a 22 ms frame on a 60 Hz display becomes one irregular present or a repeated frame.

Keep diagnostics low overhead and buffered. Writing a log file synchronously each frame creates the hitch being measured.

## VSync and presentation choices

Synchronized presentation avoids visible tearing by aligning swaps with display refresh, but can add waiting and queue depth. Unsynchronized presentation can reduce latency but tears. Adaptive or mailbox-like behaviors, when truly available, make different trade-offs.

Offer only modes the current platform/renderer supports and describe them in player-facing terms such as VSync, frame limit and low-latency mode. The internal mapping can change by backend. If a requested mode cannot be created, select a documented fallback and expose the reason in diagnostics.

Presentation mode often requires swap-chain/device recreation rather than a live flag. Apply it at a safe boundary, keep the previous valid configuration until the candidate succeeds and test rollback.

## Frame limiters

A frame limiter can reduce power use and stabilize work below refresh. Sleeping for the entire remaining interval tends to overshoot because scheduler precision varies. A practical limiter sleeps most of the time, then optionally performs a short bounded spin/yield phase. Do not busy-wait for milliseconds on battery-powered devices.

Use a monotonic clock and carry timing error forward rather than scheduling every next frame from “now,” which accumulates drift. Coordinate the limiter with fixed-step simulation and VSync; two independent limiters can beat against each other.

Background/unfocused policy should lower render frequency or suspend expensive presentation while continuing only required networking, audio and lifecycle work. Resume resets timing accumulators so the game does not attempt minutes of catch-up.

## Where latency accumulates

End-to-end latency includes device sampling, wait until update, simulation, render preparation, GPU queue, present queue and scanout. Optimize the longest and most variable segments first.

Sample input at a deliberate point. Sampling immediately before the simulation tick usually reduces command age, while UI/platform event pumping still must happen correctly. Late-latching camera presentation can reduce visual aim latency, but authoritative gameplay uses the normal tick input to preserve reproducibility.

Avoid building several CPU frames ahead unless throughput requires it. Bound frames in flight and expose queue depth. A CPU that races far ahead can show excellent submit time and poor response. GPU fences/readbacks inserted for measurement can themselves serialize work, so use sparse probes.

## Smooth simulation and smooth presentation

Fixed timestep produces stable rules; interpolation produces smooth render transforms between ticks. A high-refresh display may draw multiple frames between simulation updates. Variable refresh displays reduce some cadence artifacts but do not repair an inconsistent CPU/GPU workload.

Camera motion is an excellent pacing probe because it produces screen-wide coherent motion. Test a constant-speed pan with a fixed scene, not only chaotic gameplay. Disable random effects when comparing traces.

Long frames should carry reason markers: shader/material first use, content upload, screenshot, garbage/cache growth, OS focus event, resolution change or known capture. Correlation turns a graph into an actionable diagnosis.

## Settings and fallback policy

Define coherent presets rather than every combination. A quality mode may prefer stable VSync and high visual settings; a latency mode may lower queued frames and expensive post-processing; a battery mode may cap at 30 FPS. Do not change simulation rate when changing render cap.

Persist requested settings separately from active settings. On startup, report display refresh, active resolution, scaling, presentation policy, fallback reason and frame cap. Safe mode should recover from an invalid fullscreen/present configuration.

## Qualification

Test 60, 90, 120 and 144 Hz where hardware exists, plus variable refresh, windowed/fullscreen transitions, focus loss, resize and multi-monitor movement. Automated tests validate policy selection and timing accumulators; physical high-speed camera or external latency equipment is needed for strong end-to-end claims.

Release captures include steady camera pan, CPU-bound scene, GPU-bound scene, streaming and split-screen. Compare interval histograms, queue depth, input age estimates and missed refreshes. Frame pacing is finished when the game explains an uneven frame and retains a stable fallback on every CNA platform—not when the FPS counter displays a large number.
