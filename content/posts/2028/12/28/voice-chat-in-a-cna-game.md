---
title: Voice Chat in a CNA Game
date: 2028-12-28T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Integrate voice chat beside CNA with capture, encoding, jitter buffering, spatial playback, moderation, accessibility and strict privacy controls.
author: Robert Vokac
categories: [Development]
tags: [CNA, Voice Chat, Audio, Networking, Accessibility]
draft: false
---

Voice chat crosses audio capture, low-latency networking, playback, identity, privacy and moderation. CNA's normal game audio APIs are only part of the solution; microphone access and codecs may come from platform services or a dedicated library. Treat voice as an integration layer beside CNA, not as a feature the framework magically provides.

Before implementation, define product modes: party, team, proximity, push-to-talk or voice-activated; supported ages/regions; recording policy; block/mute/report behavior; and whether a platform-provided service is mandatory. These decisions shape architecture more than codec tuning.

## Capture and device lifecycle

Enumerate permitted input devices through the selected platform/audio layer, respect OS permission flow and retain a stable user choice when possible. Permission denied is a normal state with a clear route to settings—not a fatal error.

Capture fixed-size PCM frames in a real-time callback or dedicated thread. That path must not allocate unpredictably, lock the game world, write files or call rendering APIs. Push bounded frames into a lock-free or carefully synchronized queue; on overflow, drop according to policy and increment diagnostics.

```cpp
struct VoicePcmFrame {
    VoiceSequence sequence;
    MonotonicTime capturedAt;
    std::array<std::int16_t, SamplesPerFrame> mono;
};
```

Resample/channel-convert once to the codec's required format. Handle device removal/default-device change and app suspend. Stop capture immediately when the user disables voice or permission is revoked.

## Voice activation and push-to-talk

Push-to-talk maps through semantic input and has visible state. Avoid a binding that conflicts with accessibility or gameplay; allow toggle mode where appropriate.

Voice activation estimates noise floor, uses threshold plus hysteresis and keeps short pre-roll so initial consonants are not lost. Provide sensitivity/test feedback without uploading audio. Automatic gain control, echo cancellation and noise suppression should use proven platform/library components and expose when unavailable.

Never imply the mic is off when it is transmitting. The local UI shows capture, encoding/transmission and muted/blocked state distinctly.

## Encode and packetize

Use a maintained real-time speech codec rather than inventing one. Configure frame duration, bitrate, complexity, packet-loss concealment and forward-error correction for product/network conditions. Codec license and platform support are release requirements.

Voice packets carry authenticated session/speaker identity from transport, sequence, stream generation, timestamp and encoded payload with strict size limits. Do not trust a speaker ID inside unauthenticated data. Encryption/integrity and routing follow the service threat model.

Do not make voice reliable and head-of-line blocked like a file transfer. Late speech is usually worthless. Redundancy/FEC can recover limited loss; acknowledgements may inform quality adaptation but should not retransmit old conversation indefinitely.

Rate-limit packets/bytes and validate codec frame sizes before decode. Decoder failures isolate one stream and cannot crash a match.

## Jitter buffer and playout

Packets arrive unevenly. A per-speaker jitter buffer reorders a bounded window and schedules playout after a small adaptive delay. Too little delay causes gaps; too much makes conversation sluggish. Missing frames use codec concealment; very late frames are dropped.

Estimate network jitter from monotonic timestamps/sequence, not wall-clock equality. Reset a stream on reconnect/generation change so old packets cannot play after a new speaker session.

Decode on audio/worker infrastructure, then feed bounded PCM to the playback system. Never block the CNA game thread waiting for voice. Apply per-speaker volume/mute before mix and hard-limit total active decoders/voices.

## Spatial and group routing

Party/team chat may be non-spatial. Proximity chat maps speaker world position into attenuation/panning through the game's audio scene. The server decides who may hear whom based on authoritative team/distance/occlusion policy; clients still apply local mute.

Do not transmit precise world position as unnecessary voice metadata if the game already synchronizes it. Limit audible speakers by priority, distance and group while keeping speaking indicators understandable. Split-screen needs an explicit listener and privacy policy for multiple local users sharing one output/microphone.

## Safety, moderation and accessibility

Mute and block must take effect quickly and persist according to account/profile policy. Reporting uses bounded evidence only with consent and legal review; never secretly record all voice “just in case.” Publish retention, region and operator access rules.

Parental controls and platform privileges can disable capture, receiving or communication with specific groups. The server enforces routing privilege; hiding a UI button alone is insufficient.

Speaking indicators, mic test, push-to-talk state and text chat alternatives improve accessibility. Speech-to-text or moderation transcription involves sensitive processing and requires explicit disclosure, consent, accuracy and data-handling policy.

## Quality and failure testing

Inject loss, jitter, reordering, bandwidth changes, burst talkers and reconnect. Test device unplug, permission revoke, suspend/resume, Bluetooth route changes where relevant, background policy and rapid mute/block. Measure capture-to-playout latency externally as well as queue estimates.

Diagnostics expose codec settings, packets/bytes, jitter-buffer depth, late/lost/concealed frames and queue overflow without retaining audio content. Security tests fuzz packet and decoder boundaries. Voice chat is ready only when the user controls it, failure is bounded and private audio cannot leak through ambiguous lifecycle state.
