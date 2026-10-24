---
title: Diagnostics, Logging and Crash Reports in CNA Games
date: 2028-03-09T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Make CNA field failures reproducible with structured logs, build identity, renderer metadata, bounded counters and matching symbols.
author: Robert Vokac
categories: [Development]
tags: [CNA, Diagnostics, Logging, Crash Reports, Debugging]
draft: false
---

A report saying “black screen” needs build, platform, renderer, adapter, display, lifecycle and last successful phase. Capture this automatically without collecting secrets.

Emit structured events with monotonic time, severity, subsystem, stable event name and fields:

```cpp
log.Info("graphics.device.created", {
    {"renderer", diagnostics.RendererName()},
    {"adapter", diagnostics.AdapterName()},
    {"drawable", FormatSize(width, height)},
    {"build", BuildId}
});
```

Never assemble unbounded user/network text into logs. Redact tokens, paths containing personal names and chat. Rotate files and cap memory buffers.

## Build identity and symbols

Generate one immutable build ID from source revision/configuration and embed it in executable, package manifest and log header. Archive exact native symbols/source mappings under that ID. A crash address without matching optimized symbols is usually unusable.

Preserve breadcrumbs for startup, platform, device, content load, screen transition, suspend/resume and shutdown. Flush critical records carefully, but do not turn every frame into synchronous disk I/O.

## Runtime counters

Expose frame percentiles, update/draw time, memory estimates, draws, targets, audio voices, input devices and active quality tier in a protected overlay/export. A copied report should include capability profile and recent errors.

## Failure handling

Catch only at boundaries capable of safe cleanup/reporting. Continuing after an unknown update exception can corrupt saves. On crash, write minimal robust metadata and let the platform handler produce a dump where supported.

Test crash-report symbolication using an intentional non-production crash, full disk, read-only logs, early startup and late shutdown. Document user consent/upload policy. Good diagnostics reduce the distance between a player's observation and a reproducible fixture without turning telemetry into surveillance.

## Event schema and context

Define stable event names/fields so tools can aggregate versions. Severity means action: trace/debug for development, info for lifecycle, warning for recovered degradation, error for failed operation, fatal for unsafe continuation. Do not log the same handled failure at every layer.

Use scoped context for match/screen/asset/request IDs:

```cpp
auto scope = log.With({{"screen", "Island"}, {"load_id", loadId}});
scope.Info("content.load.begin", {{"asset", logicalName}});
```

Paths should be logical/redacted. Hash or omit device/account identifiers unless truly necessary and consented.

## Ring buffer and report bundle

Keep a bounded in-memory ring of recent structured events, then flush/export around fatal errors. A report bundle can contain build/platform/renderer/capability/display, recent events, settings relevant to graphics, and optional screenshot/save/replay only with explicit user choice.

Never include tokens, chat, full home paths or arbitrary process environment. Publish size/retention limits. Export must work offline.

## Native and gameplay failures

Native crash handlers have severe safety constraints: avoid allocation/locks where unsafe, write minimal dump/marker, symbolize later. Managed/script exceptions capture their own stack and context. A caught recoverable asset error is not a native crash; keep categories distinct.

For device loss, audio removal or network disconnect, log requested/actual state, fallback and final outcome. One correlation ID links the sequence instead of repeated unrelated errors.

## Operational validation

Maintain a symbolication test per platform: crash a known function in a non-production fixture, upload/store symbols, and verify file/line/function. Test rotated logs, concurrent writers, Unicode, full disk and user opt-out. Ensure logs remain available during early startup and late shutdown.

Measure logging overhead with verbose categories disabled/enabled. Hot loops use counters/aggregates, not one log per sprite/packet. Diagnostics must help performance problems without creating them.

## User-facing error identifiers

When operation fails, show concise localized message plus stable incident/error ID that maps to detailed local log context. Do not display raw native stack or paths by default. Copy-report action gathers approved fields and explains destination/privacy.

Recoverable warnings should not spam dialogs. Aggregate repeated device/network/content errors with counts and state change. Fatal path attempts safe checkpoint only when world/save coherence is known; otherwise preserve old save and exit.

## Release integration

CI checks build ID nonempty, symbols archived and intentional crash symbolicates. Package smoke verifies writable log/report path and opt-out. Version diagnostics appear in menu/CLI/headless startup.

Run a privacy review of fields and retention, including backups/third-party crash service. Support runbook explains locating build/symbols and converting report into minimized reproduction. The value is not collection volume but complete chain from incident ID to exact code/config and actionable subsystem evidence.
