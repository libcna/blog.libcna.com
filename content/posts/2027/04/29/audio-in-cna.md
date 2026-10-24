---
title: Audio in CNA
date: 2027-04-29T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: CNA provides XNA-style sound effects, instances, music, microphones and 3D audio across SDL3, ALSA and silent test backends.
author: Robert Vokac
categories: [Development]
tags: [CNA, Audio, XNA, SDL3, ALSA]
draft: false
---

CNA implements substantially more than a function that sends a WAV file to the speakers. Its audio surface follows XNA 4.0 from short sound effects and controllable instances through positional sound, dynamic streaming, microphones, XACT wave and sound banks, songs, playlists and visualization data. Beneath that public API, a selected audio platform opens the real device and a mixer turns all active voices into the final stream.

This separation is important. Game code deals in `SoundEffect`, `Cue` or `Song`; it does not call SDL or ALSA. A headless server can use the same gameplay code with silent audio, while a Linux build without SDL can select CNA's own mixer and ALSA device.

## SoundEffect: decoded, reusable audio

`SoundEffect` represents audio held for repeated low-latency playback. Loading through `ContentManager` gives the resource the same ownership behavior as other content:

```cpp
using Microsoft::Xna::Framework::Audio::SoundEffect;

SoundEffect* jumpSound = nullptr;

void MyGame::LoadContent()
{
    jumpSound = Content.Load<SoundEffect>("Audio/Jump");
}

void MyGame::OnJump()
{
    if (!jumpSound->Play(0.85f, 0.0f, 0.0f))
    {
        // The voice limit was reached. Gameplay must continue normally.
    }
}
```

The overload accepts volume, pitch and pan. Pan ranges from `-1` on the left to `1` on the right; pitch uses XNA's `-1` to `1` range. `Play()` returns `false` when a new instance cannot be started, which should normally drop a non-essential effect rather than interrupt gameplay.

Files are recognized by their contents rather than their extension. CNA decodes WAV containing PCM, IEEE float, Microsoft ADPCM or IMA ADPCM. Ogg Vorbis, MP3 and FLAC are also supported. Ogg Opus, WMA/xWMA and XMA are not decoded and fail explicitly instead of playing incorrect bytes.

The raw-buffer constructor has a narrower contract: it expects headerless, little-endian signed 16-bit PCM. Passing an entire WAV file to it includes the RIFF header as if it were sample data and produces noise. Load encoded files through a path, stream or content asset; use the buffer constructor only when the application really generated PCM samples.

`SoundEffect` is move-only. Instances retain the underlying audio data they need, and disposing the effect cascades correctly to its tracked live instances. This makes resource ownership unambiguous in C++ rather than pretending that a copied wrapper is a second independent sound.

## SoundEffectInstance: explicit playback state

Create an instance when the game needs to pause, resume, stop, loop or change a sound after starting it:

```cpp
auto engineLoop = engineSound->CreateInstance();
engineLoop.setIsLoopedProperty(true);
engineLoop.setVolumeProperty(0.55f);
engineLoop.setPitchProperty(-0.1f);
engineLoop.Play();

// Later, during Update:
engineLoop.setPitchProperty(rpmToPitch(currentRpm));
engineLoop.setVolumeProperty(loadToVolume(engineLoad));
```

The instance exposes `Playing`, `Paused` and `Stopped` state. Repeated `Play()` while already playing does not create a second voice. `Stop()` can end immediately or follow the supported XNA stop behavior, and `Dispose()` releases the track safely.

Avoid creating a new instance for every frame of a continuous sound. A vehicle engine, wind loop or machine hum should have a stable instance whose parameters change. Short, overlapping effects such as footsteps can use a bounded pool. The pool size is a game decision: reserve voices for important UI and player feedback instead of allowing a dense particle effect to consume everything.

Global `SoundEffect::MasterVolume` affects sound effects, while individual instance volume remains useful for categories owned by the game. A typical audio service stores music, effects, dialogue and ambience levels, then combines a category value with the per-event value. Persist those settings and provide mute behavior without destroying every loaded resource.

## Real positional audio through Apply3D

`AudioListener` describes the player or camera, while `AudioEmitter` describes a source. Both include position, velocity and orientation. `SoundEffectInstance::Apply3D()` calculates attenuation, stereo placement and Doppler pitch using CNA's XNA-compatible parameters.

```cpp
AudioListener listener;
listener.setPositionProperty(cameraPosition);
listener.setForwardProperty(cameraForward);
listener.setUpProperty(cameraUp);
listener.setVelocityProperty(playerVelocity);

AudioEmitter emitter;
emitter.setPositionProperty(trainPosition);
emitter.setVelocityProperty(trainVelocity);

trainLoop.Apply3D(listener, emitter);
```

Choose one world-unit convention. `DistanceScale`, `SpeedOfSound` and the velocities must describe the same scale or attenuation and Doppler will feel wrong. Teleports should not be represented as enormous physical velocities. After loading a save, respawning or resuming from pause, reset the velocity used for audio before applying 3D again.

Plain pan and 3D spatialization are distinct modes. Once playback has submitted audio in one mode, switching incompatibly is refused until the instance is stopped and can be configured again. This preserves the behavior applications expect from XNA instead of silently combining unrelated controls.

## DynamicSoundEffectInstance

`DynamicSoundEffectInstance` is for audio produced over time: a synthesizer, voice chat decoder, procedural engine, emulator or another streaming source. The application submits PCM buffers and responds to buffer-needed notifications before the queue becomes empty.

Keep a small bounded queue ahead of playback. Too little data causes gaps when one frame is late; too much adds latency. Generate or decode on a worker when appropriate, but marshal event state safely and never let an unlimited producer queue grow behind the device. A stream that temporarily has no buffer waits silently for more data rather than becoming an ordinary stopped one-shot track.

The sample rate and channel layout are fixed when the dynamic instance is created. Submitted data must match that contract. Reuse byte buffers where possible and validate sample alignment; a stereo 16-bit frame contains two signed samples, not two bytes.

## XACT: AudioEngine, WaveBank, SoundBank and Cue

CNA also implements the XNA/XACT runtime surface. `AudioEngine` loads the global settings, `WaveBank` makes wave data available, `SoundBank` exposes authored sounds, and `Cue` controls one selected sound:

```cpp
AudioEngine audioEngine("Content/Audio/GameAudio.xgs");
WaveBank waveBank(audioEngine, "Content/Audio/Wave Bank.xwb");
SoundBank soundBank(audioEngine, "Content/Audio/Sound Bank.xsb");

auto cue = soundBank.GetCue("Explosion");
cue.Play();

// Call regularly so categories, cues and deferred work advance.
audioEngine.Update();
```

Categories provide authored volume, pause, resume and stop control. Cues can contain variations, loop regions and per-track processing rather than being simple aliases for a single file. Keep the engine and banks alive longer than their cues and update the engine from the game loop.

XACT is valuable when porting an original XNA title because it preserves the project's authored organization. A new small game may prefer a direct `SoundEffect` service, but it should not flatten an existing bank into unrelated files unless it is prepared to reproduce categories, variations and loop semantics itself.

## Songs and MediaPlayer

Long music belongs to `Song` and the static `MediaPlayer`. Unlike short sound effects, supported Vorbis, MP3 and FLAC songs are decoded while they play, so a long track does not occupy its fully decoded size in memory.

```cpp
Song* theme = Content.Load<Song>("Music/Theme");
MediaPlayer::setVolumeProperty(0.65f);
MediaPlayer::setIsRepeatingProperty(true);
MediaPlayer::Play(theme);
```

`MediaPlayer` maintains a queue, supports repeat and shuffle, exposes play position and state, and raises active-song and media-state events. Visualization can provide current frequency and sample data when enabled. Enable it only when used because analysis is additional work.

Looping a streamed song from its beginning is cheap. Seeking to an unusual loop point inside a long compressed stream may require the decoder to search through the file and can cause a one-time underrun. Measure authored loop behavior on the intended backend.

## Recording with Microphone

`Microphone::getAllProperty()` enumerates actual capture devices. An empty collection means that none is available; CNA does not invent a default microphone. Select a device, choose a valid buffer duration, subscribe to buffer-ready notification, start capture and retrieve queued bytes with a buffer sized through `GetSampleSizeInBytes()`.

Capture is permission-sensitive on mobile and web targets. Losing a USB microphone is also normal runtime behavior. Stop capture when leaving the relevant screen and never record merely because enumeration succeeded. The application must explain why it needs input and handle denial without blocking the rest of the game.

The ALSA capture path reads ten-millisecond chunks on its own thread and retains at most eight seconds. If the game stops polling, it receives recent audio rather than an unbounded history. Tests use ALSA's silent or file devices; they never record the developer's room.

## Selecting an audio platform

Audio selection is independent of the CNA window platform:

| `CNA_AUDIO_PLATFORM` | Intended use |
| --- | --- |
| `SDL3` | Portable default for normal desktop and supported platform builds |
| `ALSA` | Linux playback and capture through CNA's own mixer, including SDL-free builds |
| `NULL` | Silent servers, CI and tests that must not open hardware |

An SDL-free Linux server with real audio can use:

```bash
cmake -S . -B build-alsa -G Ninja \
  -DCNA_ENABLE_SDL=OFF \
  -DCNA_PLATFORM=HEADLESS \
  -DCNA_GRAPHICS_RENDERER=HEADLESS \
  -DCNA_AUDIO_PLATFORM=ALSA
```

ALSA needs development headers when building. At runtime CNA loads `libasound.so.2`; if it is missing or the selected device cannot open, the XNA layer reports `NoAudioHardwareException`. `CNA_AUDIO_DEVICE` selects a playback PCM, and `CNA_AUDIO_RECORDING_DEVICE` selects capture. The `null` ALSA device is useful for timing tests, while its file device can record the exact mixed stream.

CNA requests float stereo at 44.1 kHz and negotiates what the device supports. Its ALSA thread works in roughly ten-millisecond periods with four periods buffered, recovers from underruns and suspension, and does not wait indefinitely during shutdown. PipeWire and PulseAudio desktops are normally reached through their ALSA compatibility plugin; CNA does not maintain redundant native backends merely to reach the same default device.

The CNA mixer converts each track to the output rate, applies pitch, gain, per-track filtering and pan, then adds it at master gain. Mono is duplicated into both channels. Resampling uses linear interpolation, matching FAudio/FNA behavior more closely than SDL's windowed-sinc route; therefore a strongly pitched sound can differ slightly between SDL3 and ALSA builds.

## Performance, diagnostics and testing

Audio problems are often lifetime or scheduling problems rather than decoder problems. Watch allocated voices and voice creations in CNA diagnostics. A rising creation count during a stable loop suggests that the game is recreating instances. Unexpected voice growth can reveal a missing stop or disposal path.

Test at three levels:

- unit-test category math, queues and game-owned audio policy with the Null backend;
- test decoding, duration, channel order, loop points and mixer output against known samples;
- manually qualify a real device for latency, unplug behavior, suspend/resume and routing.

Do not make a screenshot test depend on audible completion. Drive gameplay from simulation events, and let audio observe them. Likewise, a missing device must not prevent a dedicated server from starting.

The ALSA implementation has extensive sample-exact tests against silent and file devices, including gain order, pitch interpolation, loops, streams, capture and MediaPlayer completion. That evidence does not automatically prove every PipeWire, PulseAudio or physical sound-card configuration. Real-hardware qualification remains a separate step and should be reported as such.

## A maintainable game audio layer

Keep loaded assets in a cache, long-running instances in stable owners, and short effects behind a bounded voice allocator. Centralize category volumes and pause rules. Separate music queues from effect voices, and isolate microphone permission and capture from ordinary playback.

Most importantly, preserve the XNA-level contract above the backend. The same game can then use SDL3 on a desktop, CNA's mixer with ALSA on an SDL-free Linux system, and Null audio in CI without filling gameplay code with platform branches. That is the real purpose of Audio in CNA: not one playback call, but a portable and testable audio system from authored XACT content to the final device buffer.

## Worked example: bounded sound-effect voices

A real game should not create an unlimited instance for every collision. This small owner pre-allocates voices, reuses stopped instances and refuses excess playback instead of growing mixer work without limit. Exact pointer aliases depend on the CNA revision, but the ownership pattern is the important part:

```cpp
class SoundPool
{
public:
    SoundPool(std::shared_ptr<SoundEffect> effect, std::size_t count)
        : effect_(std::move(effect))
    {
        for (std::size_t i = 0; i < count; ++i)
            voices_.push_back(effect_->CreateInstance());
    }

    bool Play(float volume, float pitch, float pan)
    {
        for (auto& voice : voices_)
        {
            if (voice->getStateProperty() != SoundState::Playing)
            {
                voice->setVolumeProperty(std::clamp(volume, 0.0f, 1.0f));
                voice->setPitchProperty(std::clamp(pitch, -1.0f, 1.0f));
                voice->setPanProperty(std::clamp(pan, -1.0f, 1.0f));
                voice->Play();
                return true;
            }
        }
        return false;
    }

private:
    std::shared_ptr<SoundEffect> effect_;
    std::vector<std::unique_ptr<SoundEffectInstance>> voices_;
};
```

Create pools for important and disposable categories. A UI confirmation might reserve two voices, weapon fire sixteen, while ambient sounds can accept dropping the oldest quiet voice. Count rejected plays in diagnostics. If the counter spikes, change the design or pool size based on evidence.

For 3D sound, update the listener once per simulation frame and apply emitter state before playback. Keep world-to-audio scale consistent: if one game unit is one metre, velocity and Doppler calculations must use the same convention. Test an emitter left, center and right at fixed distance, then moving toward and away from a stationary listener.

## A streaming producer without underruns

`DynamicSoundEffectInstance` works best when the producer owns a bounded PCM queue. Generate or decode on a worker, submit complete buffers from the permitted thread, and maintain a small target latency:

```cpp
void StreamPlayer::Update()
{
    while (instance_->getPendingBufferCountProperty() < targetBuffers_)
    {
        auto pcm = decoded_.TryPop();
        if (!pcm)
        {
            ++underruns_;
            pcm = MakeSilence(framesPerBuffer_, channels_);
        }
        instance_->SubmitBuffer(pcm->data(), 0, pcm->size());
    }
}
```

Do not decode inside an audio callback if decoding can block or allocate. Bound the queue so a fast worker cannot buffer an entire movie. Track pending buffers, underruns and decode time. Test with artificial stalls longer than one buffer to prove recovery does not repeat stale data or lose channel alignment. Microphone capture follows the same discipline in reverse: bound retained audio, stop capture when inactive, and treat permission denial or device removal as ordinary feature states.
