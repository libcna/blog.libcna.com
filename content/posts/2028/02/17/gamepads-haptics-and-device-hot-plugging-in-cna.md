---
title: Gamepads, Haptics and Device Hot-plugging in CNA
date: 2028-02-17T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build action-based CNA controller input with dead zones, reconnect policy, player assignment and bounded haptic feedback.
author: Robert Vokac
categories: [Development]
tags: [CNA, GamePad, Haptics, Input, Controllers]
draft: false
---

Controller support begins above physical button numbers. Gameplay consumes actions; a binding layer maps keyboard and each gamepad family into those actions.

```cpp
InputFrame frame;
const GamePadState pad = GamePad::GetState(PlayerIndex::One);
frame.move = ApplyRadialDeadZone({pad.ThumbSticks.Left.X,
                                  pad.ThumbSticks.Left.Y}, 0.18f);
frame.jump = PressedNow(pad.Buttons.A, previous.Buttons.A);
```

Use current CNA property spelling. Store previous/current snapshots at frame boundaries so edge events are deterministic.

## Dead zones and assignment

Radial dead zones preserve stick direction; independent axial zones can distort diagonals. Clamp/renormalize the remaining range. Triggers need their own threshold/hysteresis. Expose calibration only when the product can explain it.

Assign devices by stable session identity where available, not array slot alone. On disconnect, pause or degrade according to game type, clear held state and show which player lost input. Reconnect should not silently control another profile.

## Haptics

Treat vibration as a mixed, bounded signal: low/high motor intents from gameplay combine under master intensity and accessibility settings. Stop it on pause, focus loss, disconnect and shutdown.

```cpp
haptics.Submit(player, HapticEvent{.low=0.7f, .high=0.2f,
                                    .duration=120ms, .priority=Impact});
```

Unsupported haptics is normal. No gameplay fact may be communicated only through vibration.

Test hotplug during menus/gameplay, two identical devices, reassignment, focus loss, dead-zone boundaries, simultaneous keyboard/controller and haptic stop. Record device IDs without private data and expose active mapping in diagnostics. Reliable controller support is ownership and recovery, not one successful `A` button read.

## Normalize into an action frame

Poll devices once per update and create an immutable frame. Gameplay should not poll again halfway through the tick, because edge transitions would depend on call order. Preserve current/previous state for buttons and raw plus processed values for diagnostics.

```cpp
struct PlayerActions {
    Vector2 move;
    Vector2 look;
    bool jumpPressed;
    bool pausePressed;
    InputSource lastUsed;
};
```

Switch on-screen prompts only after meaningful device input so stick noise does not flicker keyboard/controller glyphs. A controller can remain assigned while keyboard is also allowed according to local-player policy.

## Dead-zone implementation

For radial dead zone `d`, calculate magnitude. Return zero below `d`; otherwise remap `(m-d)/(1-d)` and multiply by normalized direction. Protect zero and clamp values. Test axes/diagonals just below/above threshold and full scale. Apply response curves only after dead zone and expose them as explicit accessibility/control settings.

## Hot-plug state machine

Track Connected, Assigned, DisconnectedWaiting and Removed. A temporary disconnect can reserve the player slot; a different device requires confirmation. Clear held/edge state immediately and stop vibration. Reconnect must generate no phantom presses from comparing against stale state.

Controller identity strings may be unstable/private across platforms. Store user bindings in CNA's portable action vocabulary plus sufficiently stable device profile only where documented; always provide a reset/rebind route.

## Haptic mixing and limits

Mix events by priority and maximum/combined policy, clamp motors and apply user master scale. Every event has duration; no effect can vibrate forever if its stop callback is lost. Send hardware updates only when value changes or at bounded rate.

Test unsupported motors, disconnect during vibration, overlapping explosion/UI effects, pause and application shutdown. Automated fake-device traces plus physical qualification are both needed: fake tests prove state logic, hardware proves mapping and actual haptic behavior.

## Remapping and glyphs

Bindings operate on semantic `Action` and physical controls with context (gameplay/menu/vehicle). Detect conflicts within relevant context, allow multiple bindings and always retain navigation path/reset. Save globally with schema/device-profile policy; unknown disconnected control remains editable/removable.

Prompt glyphs come from last meaningful source plus controller layout/profile, with text fallback. Never assume south button always means one printed letter. Localize action description, not hardware glyph.

## Qualification matrix

Use fake traces for every button/axis/trigger, dead-zone and connect ordering. Physical set includes representative layouts/wired/wireless where claimed. Test multiple local players, reconnect/reorder, sleep/wake, low battery events if exposed, focus loss and renderer/platform restart.

Record raw/processed state and mapping in input inspector. Do not log unique serials. Release gate confirms all essential actions reachable on every supported control scheme and no haptic/accessibility setting can block gameplay feedback.

Retain controller fixtures and physical device-matrix results with build/platform identity so later backend changes can be compared rather than retested from memory.
