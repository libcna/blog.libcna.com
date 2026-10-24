---
title: Video Playback and Media in CNA
date: 2028-02-24T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Integrate CNA video and media playback with asynchronous decoding, A/V timing, lifecycle handling and capability-aware fallbacks.
author: Robert Vokac
categories: [Development]
tags: [CNA, Video, Media, Streaming, Audio]
draft: false
---

Video playback combines container/demux, codecs, decoded frame formats, audio, timing and GPU upload. CNA's backend/capability documentation is the source of truth for supported paths; a file extension alone does not guarantee codec availability.

Treat playback as a state machine: unopened, preparing, playing, paused, ended, failed and disposed. Preparation may be asynchronous and failure must retain asset/backend context.

```cpp
video.Open("Movies/intro");
video.Play();
// each frame
if (auto frame = video.AcquireFrame(gameTime))
    presenter.UploadAndPresent(*frame, destination);
```

Match concrete API to current CNA; the design separates decoder timing from rendering.

## Synchronization and queues

Use media timestamps. Audio commonly acts as clock; video selects the newest frame appropriate for that clock, dropping late frames rather than growing a queue forever. Bound decoded video/audio buffers and measure underruns, dropped frames and decode latency.

Decoded YUV may be converted on CPU or sampled through multiple textures in a shader. State color matrix/range explicitly. Test a color-bar asset and odd dimensions; a wrong matrix can look merely “washed out.”

## Lifecycle and accessibility

Pause or continue on focus loss according to product policy, handle audio interruption and rebuild presentation textures after device/surface recreation. Captions should be timed structured text with scalable background, not burned-in one-language pixels. Provide skip and replay actions.

Test unsupported codec, corrupt/truncated stream, seek, pause/resume, end event, slow decode, device loss and packaged path. Keep a static-image or alternate-scene fallback for platforms without video. A cinematic is ready when failure cannot trap progress and timing remains bounded under real load.

## Ownership and worker design

One playback session owns demuxer, decoder workers, bounded audio/video queues and presentation textures. Opening a second video either creates an independent bounded session or stops the first according to policy. Dispose stops reads, joins workers, releases queued frames and only then destroys textures/audio instances.

Decoded frames carry presentation timestamp, dimensions, pixel/color metadata and owned planes. The rendering thread takes the chosen frame, uploads/reuses textures, then returns memory to a pool after submission rules permit. Never let decoder overwrite a plane still uploading.

## Clock decisions

At play, establish media-to-monotonic clock mapping. Pause freezes it; seek flushes queues/decoder state and establishes a new mapping. If audio is unavailable, use monotonic clock. Apply playback rate only when both audio/video paths support it.

Choose thresholds for early hold and late drop. Record dropped/duplicated frames and audio underruns. Do not “catch up” by unbounded decoding on the main thread.

## Presentation and color

Store source color primaries/matrix/range when available. A YUV shader samples planes and applies the correct limited/full-range matrix. Use a test file with bars, black/white levels, motion, audio sync marker and odd size. Compare decoded reference values and final screenshot.

Aspect policy fits, fills/crops or stretches; make it explicit and map subtitles into safe visible region. Rotation metadata and pixel aspect may affect display.

## Platform/package qualification

List containers/codecs actually supported per backend/build and licensing/distribution implications. Test from installed package, web server and mobile bundle—not developer filesystem. Exercise background/foreground, audio device change, seek near end, repeated open/close and missing caption track.

Diagnostics include asset, backend/codec, duration, current PTS, queue depths, drops/underruns, output size/color mode and last error. This distinguishes decode, scheduling, upload and presentation failures.

## Seeking, looping and events

Seeking requests timestamp, flushes queued decoder/audio/presentation state, seeks to appropriate keyframe and decodes forward until target. UI shows seeking rather than presenting old frame as current. Coalesce repeated scrub requests.

Loop defines exact in/out points and A/V discontinuity policy. `Ended` fires once after final samples/frame are consumed, not when file read reaches EOF. Stop/replay must reset queues/clock/events deterministically.

## Accessibility and product flow

Captions carry locale, cues/speaker/style and safe-area layout with text scale/background. Provide skip/confirm that works before video fully prepares and ensure skipped cinematic triggers required game transition/reward exactly once.

Test no audio device, muted/background policy, caption missing, decode slower/faster, variable frame rate, seek spam, loop, skip during preparing and screen destroyed mid-callback. A video failure should offer skip/fallback and never leave a required story/game state transition uncommitted.

Archive exact test-media provenance and expected timestamps/colors; otherwise codec/backend upgrades cannot distinguish intended improvement from sync or conversion regression.
