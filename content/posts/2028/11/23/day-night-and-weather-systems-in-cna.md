---
title: Day, Night and Weather Systems in CNA
date: 2028-11-23T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Coordinate CNA lighting, sky, fog, particles, audio and gameplay through a deterministic world-time and weather state model with scalable rendering tiers.
author: Robert Vokac
categories: [Development]
tags: [CNA, Weather, Lighting, Particles, Audio]
draft: false
---

A day–night cycle is not a color lerp applied to the sky. Weather is not only a rain emitter. Both are world state consumed by lighting, fog, materials, particles, audio, AI and gameplay. Build one authoritative environment model, then let presentation derive coherent parameters.

CNA provides rendering, audio, content and timing primitives. The environment controller and its artistic profiles belong to the game.

## World time as durable state

Represent time with a stable day index and normalized/integer time-of-day, advanced by fixed simulation ticks. Do not use the computer clock for ordinary progression. Calendar-based events, if desired, are a separate explicit service with offline/cheat implications.

```cpp
struct WorldTime {
    std::int64_t day;
    std::uint32_t tickOfDay;
    std::uint32_t ticksPerDay;
};
```

Pause, sleep/skip and time scale operate through commands. Skipping hours should evaluate scheduled gameplay events deliberately rather than emitting thousands of missed presentation updates. Save time plus environment-controller version.

Solar direction can come from a simple authored curve or geographic model. Most games benefit from art-directed sunrise/sunset duration and maximum elevation. The moon may be coupled or independent. Whatever model is chosen, lighting and sky sample the same sun/moon state.

## Profiles and continuous parameters

Define environment profiles with curves/gradients for sky colors, sun color/intensity, ambient contribution, fog color/density, exposure and stars. Sample them by time-of-day, then blend weather modifications.

```cpp
struct EnvironmentFrame {
    Vector3 sunDirection;
    Color sunColor;
    float sunIntensity;
    Color fogColor;
    float fogDensity;
    float cloudCover;
    float precipitation;
    float windSpeed;
};
```

This is immutable presentation data for one frame. Materials and passes consume it; they do not independently calculate “night.” Centralization prevents water reflecting a noon sky while terrain uses dusk light.

Curve domains and color spaces must be explicit. Interpolate lighting colors in the project's selected linear workflow. Clamp physical-looking values only where the art contract requires it.

## Weather as a state machine

Weather types—clear, cloudy, rain, storm, snow, fog—are not instantaneous booleans. A controller chooses a target profile and transition duration, then blends continuous parameters. Hysteresis prevents rapidly toggling effects around thresholds.

Author transition constraints: a storm may pass through cloudy; snow requires a temperature/biome rule; indoor regions suppress precipitation presentation without changing outdoor world weather. Use named random streams and versioned schedules if forecasts must reproduce.

Lightning is an event with seed, world position/direction, flash curve, thunder delay and gameplay flags. Visual flash is immediate; thunder timing follows distance under an authored speed-of-sound scale. Do not randomly flash separately in sky, light and audio systems.

## Rendering the sky and atmosphere

Quality tiers can range from gradient sky and directional light to cubemap blending, procedural atmosphere and volumetric clouds. Select by capability and budget. Every tier receives the same `EnvironmentFrame` and should preserve direction, day phase and weather identity.

Fog must match depth conventions and world scale. Height fog can improve landscapes but needs camera-height behavior and an underwater override. Stars fade by sun elevation/cloud cover. Cloud shadows and reflections are optional expensive consumers with update-rate budgets.

Shadow maps change dramatically as the sun moves. Avoid updating an expensive cascade for microscopic angular change, but do not let shadows visibly lag. Night may switch to moon or local lights through a deliberate shadow policy.

## Precipitation around the player

Rain/snow usually simulates in a volume around each camera rather than over the entire world. Spawn in world-relative cells or reposition a presentation volume without obvious popping. Test split-screen: each view may need a local emitter while audio/gameplay rain remains shared.

Depth collision can prevent rain drawing through roofs where available; gameplay volumes can mark indoor/outdoor zones more reliably. Ground splashes and wetness sample surface/material data. Accumulation such as snow or puddles is persistent world state only if gameplay/content actually supports it.

Wind drives particles, vegetation, audio and possibly projectiles, but high-frequency visual gusts should not silently alter authority. Publish simulation wind separately from presentation noise.

## Audio and gameplay consumers

Crossfade weather loops with bounded voices. Thunder events spatialize from their world source. Interior filters and shelter volumes modify mix; they do not start unrelated clocks. Night ambience, animals and music can subscribe to broad environment phases with cooldowns.

Gameplay may change visibility, traction, temperature or NPC schedules. Sample authoritative environment at fixed ticks and record commands/events for replay/networking. Cosmetic particle count never influences wetness or AI.

## Testing and capture

An environment inspector scrubs time/weather, freezes transitions and shows every derived parameter and consuming system. Capture a matrix of dawn/noon/dusk/night × clear/rain/storm/fog across CNA renderers and quality tiers.

Tests cover day wrap, large time skip, save/load mid-transition, deterministic forecast, indoor boundaries, split-screen, pause, device recovery and missing optional resources. Performance reports shadow/sky/cloud/particle/reflection costs separately.

The system works when one saved world state produces a coherent scene and soundscape, quality fallback preserves the same weather story and no subsystem invents its own incompatible clock.
