---
title: XACT Audio Projects in CNA
date: 2028-03-02T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Use CNA AudioEngine, WaveBank, SoundBank and Cue as an authored runtime with categories, variables and reproducible content validation.
author: Robert Vokac
categories: [Development]
tags: [CNA, XACT, AudioEngine, WaveBank, SoundBank]
draft: false
---

Direct `SoundEffect` playback is ideal for simple sounds. XACT-style content adds authored cues, wave selection, categories and runtime control while preserving the XNA-shaped `AudioEngine`, `WaveBank`, `SoundBank` and `Cue` model.

```cpp
AudioEngine engine("Content/Audio/game.xgs");
WaveBank waveBank(engine, "Content/Audio/Wave Bank.xwb");
SoundBank soundBank(engine, "Content/Audio/Sound Bank.xsb");

auto cue = soundBank.GetCue("engine_loop");
cue->SetVariable("Speed", rpmNormalized);
cue->Play();
```

Use exact ownership/types of current CNA. Keep engine/banks alive longer than cues referencing them and call the runtime update route required by its contract.

## Authoring and categories

Stable cue/category/variable names form an API between audio authoring and code. Centralize them instead of scattering strings. Categories support volume/pause/stop policy for music, dialogue, UI and effects. Persist player category volumes separately from campaign saves.

RPCs/variables can drive pitch, gain or selection without code spawning a different asset at every threshold. Clamp inputs and document units. Cue limits/stealing should prioritize important feedback and remain observable.

## Packaging and testing

Banks are compiled content with version/tool provenance. Package `.xgs/.xwb/.xsb` as one compatible set and validate missing/corrupt/mismatched files at startup. Content licenses and source projects remain part of release provenance.

Build an audio test scene listing every cue, category and variable range. Test loop stop, pause/resume, category changes, repeated instance limits, 3D application where supported and backend switch including Null audio. Log cue names and state without flooding each frame. Authored audio becomes maintainable when its names, limits and packages are treated like versioned code contracts.

## Ownership and update loop

Create the engine before banks and destroy cues/banks before engine. Centralize them in an audio service rather than allowing screens to construct banks independently. Call engine update once from the main audio/game service at the cadence required by CNA so cue transitions and notifications progress.

```cpp
class GameAudio {
public:
    void Update(const GameTime&) { engine_->Update(); }
    void SetMusicVolume(float value) {
        engine_->GetCategory("Music").SetVolume(std::clamp(value, 0.0f, 1.0f));
    }
private:
    std::unique_ptr<AudioEngine> engine_;
    std::unique_ptr<WaveBank> waves_;
    std::unique_ptr<SoundBank> sounds_;
};
```

Adapt ownership/API names to current CNA. Keep category/cue constants generated or centralized and validate them during startup/tooling.

## Cue lifecycle and variation

A cue can be Prepared, Playing, Paused, Stopped or disposed. Long-running engine/wind cues remain owned by the entity/audio service and update variables/3D state. Fire-and-forget events can be owned by a bounded active list until completion. Stop modes—immediate versus authored release—change audible behavior and shutdown time.

Random/weighted variations require deterministic authoring tests even if runtime selection intentionally varies. Log selected wave only in diagnostics, not every normal play. Instance limits and replacement rules protect the mixer; reserve important dialogue/UI categories.

## 3D and units

Listener/emitter position, velocity and orientation use one game-world scale. Apply 3D before play/update and clamp unreasonable velocity teleports. Test left/right, near/far, approach/recede and multiple listeners if supported. A Null backend still advances state for headless tests without opening hardware.

## Content and regression

Keep source audio project, bank compiler/tool version and hashes. Test mismatched XGS/XWB/XSB, absent cue/category/variable, malformed bank and platform codec restrictions. A bank inspector can list names/durations/streaming flags for package review.

Automated tests assert state/selection/category effects where deterministic; physical tests qualify final mix, latency and device recovery. Do not compare compressed waveform bytes exactly when codec variation is allowed—test event/state and bounded signal properties.

## Streaming versus resident banks

Decide WaveBank streaming/resident according to content size/latency/platform path. Streaming keeps encoded data/file access alive and needs read-ahead/underrun metrics. Resident costs decoded/encoded memory but provides predictable short-effect latency. Test installed/web/mobile package constraints rather than desktop path assumptions.

## Pause and focus policy

Game pause may pause selected categories while UI remains active; focus loss/suspend may pause/stop device differently. Centralize policy and preserve cue state only where authored runtime supports it. On resume, reset elapsed timing to avoid parameter jumps and reapply categories/device state.

## Troubleshooting

Missing cue: verify correct SoundBank/version/name/case. Silent cue: category volume/pause, wave bank availability, instance limit and backend. Wrong variation: variable/RPC range and deterministic seed expectation. Loop not stopping: cue ownership/stop mode/update cadence.

Include XACT inspector output and active cue/category/variable snapshot in bug reports. This separates content authoring from runtime/backend failure.
