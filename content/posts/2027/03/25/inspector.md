---
title: Inspector
date: 2027-03-25T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  CNA Inspector connects an authenticated browser-based diagnostics UI to a running CNA game while keeping the game, transport bridge and interface in separate processes.
author: Robert Vokac
categories:
  - Development
tags:
  - CNA
  - C++23
  - Inspector
  - Profiling
  - Diagnostics
  - Developer Tools
draft: false
---

The CNA profiler deliberately has no user interface. **CNA Inspector** is the optional development tool that turns its snapshots, events and resource metadata into a live browser view of a running game.

It is an observer, not a remote editor. The Inspector does not modify scenes, execute scripts, inject input or expose arbitrary process memory. Keeping that boundary narrow makes its behavior easier to understand and its network surface easier to secure.

**Documentation:** [docs/inspector.md](https://github.com/libcna/cna/blob/next/docs/inspector.md)

## Three cooperating pieces

The system separates responsibilities:

```text
CNA game + diagnostics provider
             |
       Inspector Agent
      authenticated TCP
             |
      cna-inspector bridge
       loopback HTTP only
             |
        browser interface
```

The linked `CNA::Inspector` agent owns one background thread and answers protocol requests. The separate `cna-inspector` executable translates them for an offline browser application. A web server is therefore not embedded into every observed game, and the game never needs to render its own diagnostic panels.

Build a full setup with:

```bash
cmake -S . -B build-inspector \
  -DCNA_DIAGNOSTICS=FULL \
  -DCNA_BUILD_INSPECTOR=ON
cmake --build build-inspector --target cna-inspector
```

`STATS` is sufficient for frame graphs, metrics and resources. `FULL` is required for CPU zones, markers and the detailed event timeline.

## Start the agent explicitly

Inspector support never opens a port merely because it was linked. The application chooses when to start it:

```cpp
#include <CNA/Inspector/Agent.hpp>

CNA::Inspector::AgentConfig config;
config.applicationName = "My CNA Game";

CNA::Inspector::Agent agent(diagnosticsProvider, config);
agent.Start();
```

The agent reports its loopback port and a freshly generated authentication token. Pass them to the bridge, preferably through the environment or a protected token file:

```bash
CNA_INSPECTOR_TOKEN="the-agent-token" \
  ./build-inspector/cna-inspector --agent-port 43191 --http-port 8081
```

Open the printed loopback URL. The repository also includes `cna_inspector_demo`, a convenient known workload for verifying the complete path.

Keep the `Agent` alive for as long as inspection is allowed and stop it as part of application shutdown. A developer-only command-line flag is a good activation mechanism: it keeps normal launches closed while making an inspected run reproducible in scripts. Do not place tokens in source code or commit them to configuration files; they are session credentials, not application settings.

## What the interface shows

The Session page identifies the target, negotiated protocol and capabilities. Performance shows the 240-frame history and live engine metrics. CPU Profiler reconstructs nested zones from `FULL` events. Graphics summarizes calls and state changes, Resources lists tracked objects, Audio reports voice activity, and Events provides the recent marker and lifecycle stream.

The bridge normally requests an overview and up to 512 recent events twice per second. Its browser-side event list is capped at 1,000 entries. Bounded histories keep a forgotten Inspector tab from becoming an unbounded recorder.

Resource previews are a separate, opt-in capability. Metadata alone never authorizes reading texture contents. An application that supplies a preview provider can answer asynchronous requests subject to dimension, byte, concurrency and cooldown limits. The default ceiling is 1024×1024, the hard ceiling is 4096×4096, responses are limited to 4 MiB, at most four requests may be pending, and repeated requests are throttled.

## Reading a session effectively

Begin with the frame graph instead of the event list. A stable but slow frame suggests sustained load; isolated peaks suggest streaming, allocation or an unusual game event. Compare update and draw first, then use the metrics to decide whether to open CPU zones, graphics state changes, resources or audio.

The CPU view is hierarchical, so a parent zone includes its children. A large parent does not automatically identify the leaf that should be optimized. Compare siblings, look for work that moved between frames, and check whether a discontinuity marker means that the event buffer overflowed. Missing records must not be interpreted as idle time.

Resource metadata is particularly helpful when a scene is correct but unexpectedly expensive. Repeated creation and destruction can reveal cache churn, while changing texture dimensions or buffer byte counts can explain a memory trend. Preview an object only after its metadata makes it relevant: readback itself can be costly and may synchronize graphics work.

For repeatable investigations, pair Inspector observations with a deterministic game scenario. Record the scene, camera path, build type, renderer and diagnostics mode. The live UI is excellent for discovering a problem; a saved trace or benchmark is better for proving that a change fixed it.

## Security model

The default is off. When started normally, the agent binds to loopback and requires a 256-bit token created with a secure random source. The protocol permits a single authenticated client at a time and uses bounded messages, with an 8 MiB payload limit and a default rate limit of 64 requests per second.

The browser bridge also binds to loopback. It validates the HTTP `Host`, sets a restrictive Content Security Policy, does not enable CORS, and uses a per-process request header. The protocol carries structured diagnostics requests; it is not a general file, memory or command interface.

The TCP protocol is authenticated but not encrypted. If remote inspection is explicitly enabled, use a trusted tunnel or VPN rather than exposing the port directly. The bridge itself should remain local.

If a connection fails, check the simple boundaries in order: the game must have been built with diagnostics, the agent must have been started, the bridge must use the printed agent port, and its token must match the current run. A restarted game creates a new session and token. Keeping these failures explicit is safer than silently reconnecting to an unintended process.

## A versioned protocol

Agent and client communicate through protocol 1.0, whose fixed little-endian header is 24 bytes. Capability bits make feature negotiation explicit: snapshots, events, resource metadata, CPU zones, accuracy/discontinuity information and previews can evolve without guessing what the peer supports.

This also permits other clients. The shipped browser UI is the primary tool, but a test runner or studio dashboard can use the public client and protocol libraries without scraping HTML.

## Platform and cost

Linux and Windows have end-to-end coverage. The macOS runtime path is implemented but still awaiting the same qualification evidence. Web, Android and iOS are not Inspector targets: the current design assumes a native game process and local TCP bridge.

Benchmarking confirms that the explicit lifecycle matters. In the documented setup, merely linking an inactive agent made no meaningful difference and caused zero provider calls. A live overview request took about 71 µs, a 512-event request about 121 µs, and transporting an already available 1 MiB preview about 1.39 ms. Preview generation or GPU readback is separate work and must not be hidden inside that transport number.

CNA Inspector is therefore suitable for leaving in a developer build: it remains inert until deliberately started, reads the same bounded data as other diagnostics consumers, and turns it into a practical view without coupling game rendering to the tooling UI.
