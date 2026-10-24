---
title: "Linux Native Platforms: X11, Wayland and ALSA"
date: 2028-05-04T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Understand CNA native Linux window, event, presentation and audio choices and qualify them beyond an SDL desktop path.
author: Robert Vokac
categories: [Development]
tags: [CNA, Linux, X11, Wayland, ALSA]
draft: false
---

Linux is several contracts, not one target. X11 and Wayland differ in window/input/clipboard semantics; ALSA provides low-level audio devices often reached through PipeWire/Pulse compatibility in real desktops. CNA capability profiles must describe the selected combination.

X11 applications manage windows, event queues, selections/clipboard, keyboard mapping and renderer surface handles. Wayland clients cooperate with compositor configure events and cannot assume global window position or unrestricted pointer behavior. Translate both into CNA events without leaking native structs.

Drawable and logical sizes can diverge. Apply compositor/window configure at a frame boundary, recreate presentation resources safely and convert input through the active viewport. Text input is not reconstructed from physical keys.

ALSA playback/capture uses negotiated device formats, bounded buffers and recovery from underrun/removal. CNA's ALSA selection variables and documented mixer path should be logged. Never open capture during tests without explicit intent; use Null/file devices.

Qualify native builds under real X11 and Wayland sessions, fractional scaling, resize/minimize, clipboard/IME, controller hotplug, audio through common desktop stacks and clean shutdown. Inspect packaged dependencies. “Works on my Linux” becomes meaningful only when session, compositor, GPU/driver, audio device and backend versions are recorded.

## Qualification matrix

Test X11 and Wayland independently; XWayland is not native Wayland evidence. Include several compositors, fractional scaling, multiple monitors, fullscreen, pointer lock and text composition. Record available protocol extensions and fallback when absent.

Test default/explicit audio device, negotiated format, underrun recovery, removal and capture. Log requested/opened device without treating one workstation's list as universal. Package/run from a clean account without development libraries and record session, compositor, driver and audio stack.

Stop event/audio threads before display/device teardown and repeat create/destroy. Native Linux support is a maintained matrix, not one successful compile.

## X11 lifecycle details

Own display connection, windows, selections and input contexts inside the backend. Translate close protocol into CNA quit request. Resize/configure events may arrive rapidly; publish coherent logical/drawable state at frame boundary. Clipboard selection is asynchronous and requires serving requests while running.

Physical keys, layout text and IME are separate. Preserve repeat policy and never derive composed text from keys alone. Relative pointer/grabs need focus-loss recovery. Renderer surface handles remain borrowed for window lifetime; renderer never owns event pump.

## Wayland lifecycle details

Compositor configures size/state; acknowledge before drawing. Do not assume global coordinates or top-level positioning. Scale/buffer size follows outputs/protocol, including exact input mapping. Relative pointer, constraints, decorations, clipboard and text input may depend on optional protocols: report capability and remain usable when absent.

## ALSA operation

Request desired format then honor negotiated rate/channels/sample format. Use bounded periods/queue and recover XRUN deliberately. Capture retains bounded recent audio and stops thread/device on removal/shutdown. Support CNA device selection variables and log actual device.

Automation uses null/file devices; manual qualification covers common PipeWire/Pulse/physical routes. Never record the test room unintentionally.

## Packaging/debugging

Diagnostics include session type, backend, scaling, adapter/driver and ALSA negotiation. Package libraries intentionally and run clean account without development packages. Failures name Wayland/X11 connection or ALSA open plus attempted fallback.

Test no display/audio server, fractional multi-monitor, IME, clipboard, relative mouse, fullscreen, repeated create/destroy and orderly host termination. This evidence defines the supported Linux matrix.

## Presentation, input and CI

Renderer receives only documented borrowed X11/Wayland handle descriptor and destroys presentation before window/connection. Test every renderer pair independently through resize/minimize/zero drawable/surface recreation; platform success does not qualify all renderers.

Input matrix covers physical/logical/text/IME/repeat, absolute/relative/wheel/grab, touch if supported and controller/haptics/focus clear. Compare with SDL shared fixtures only where semantics overlap.

Measure idle pump, event burst, resize allocation, present timing and audio underrun under load. CI virtual compositor/X/ALSA-null is useful, but real compositor/GPU/audio evidence remains separate. Troubleshooting should name missing socket/protocol/permission/driver/device.

## Release checklist

Build/install standalone consumer for each supported stack, inspect linked libraries and run outside repository. Verify X11 and Wayland native identity rather than accidental XWayland, plus audio selected backend/device. Exercise startup with only X11, only Wayland and no display; refusal/fallback must be explicit.

Record distribution/kernel/session/compositor/protocol versions, architecture, GPU/driver, renderer and audio stack/device. Repeat fullscreen/resize/focus/IME/clipboard/relative pointer/audio playback/capture and shutdown after hours, not only smoke. Publish unimplemented protocol/service gaps so application can choose fallback. Native Linux becomes sustainable when CI catches build boundary while a small real-hardware/session matrix qualifies behavior each release.
