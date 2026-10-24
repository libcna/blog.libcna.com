---
title: Local Multiplayer and Split-screen in CNA
date: 2028-07-27T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build local CNA multiplayer with deliberate device assignment, viewport layouts, per-player cameras, shared simulation and readable split-screen UI.
author: Robert Vokac
categories: [Development]
tags: [CNA, Local Multiplayer, Split-screen, GamePad, Viewport]
draft: false
---

Local multiplayer is more than drawing the world twice. It combines device ownership, player join and leave flow, one authoritative simulation, multiple cameras and viewports, per-player UI, shared overlays, audio-listener policy and a performance budget that changes with player count.

Begin with a distinction between a person, a local player slot, an input device and a gameplay entity. They often correspond, but they are not the same object. A controller can disconnect while the player slot and character remain. Two people may temporarily share a keyboard. A profile can exist before a world entity is spawned.

```cpp
struct LocalPlayer {
    LocalPlayerId id;
    std::optional<DeviceId> device;
    PlayerProfile profile;
    std::optional<EntityId> pawn;
    ViewId view;
    JoinState state;
};
```

Use stable IDs and generation-aware device handles. Never assume controller array index permanently belongs to player one.

## Join, assignment and disconnect

At the join screen, unassigned devices may emit a Join action. Once assigned, their input routes only to that player's action map, except deliberately global actions such as opening a system dialog. Confirm profile and accessibility settings before entering the match.

Define duplicate and shared-device rules. If keyboard can control only one player, reject a second assignment visibly. If it is split across key groups, prevent binding conflicts. A controller reconnect should reclaim its reserved slot only when identity is sufficiently reliable; otherwise ask rather than silently taking another player's character.

On disconnect, clear held input immediately and stop haptics. A cooperative game may pause and show “Player 2 controller disconnected.” A competitive game may neutralize that player's commands while continuing. Test disconnect during loading, pause, results screens and active vibration.

## One simulation, several views

Run gameplay once per simulation tick. Do not create one world per viewport. After update, build a render snapshot shared by all views. Each view supplies camera, viewport rectangle, visibility results and view-specific effects.

```cpp
for (const PlayerView& view : layout.ActiveViews()) {
    graphics.SetViewport(view.viewport);
    graphics.SetScissorRectangle(view.viewport);
    renderer.DrawWorld(snapshot, view.camera);
    ui.DrawPlayerHud(view.player, view.viewport);
}
ui.DrawSharedOverlay(layout.FullViewport());
```

The snippet is architectural; use the exact property/accessor spelling from the CNA version in the project. Restore viewport, scissor and render targets between passes. Clear policies matter: clearing depth for each view is normally required, while color clearing can happen once or per region depending on layout.

## Layout policy

Two players may use a vertical or horizontal split chosen from aspect ratio or user preference. Three players need a deliberate fourth region: shared map, status panel or asymmetrical large view—not an accidental black rectangle. Four players form a grid. Account for separator thickness and safe areas before deriving camera aspect ratios.

Camera projection must use each viewport's aspect ratio. Reusing the full-window projection stretches geometry. Screen-space effects and render targets may need per-view dimensions. HUD layout uses viewport-local logical coordinates, then maps them to the actual rectangle.

Text that is readable full-screen may fail at quarter-screen. Provide compact HUD variants rather than uniformly shrinking everything. Shared information—pause menu, match timer, results—belongs to a full-window overlay with explicit input ownership.

## Dynamic split and camera sharing

Some cooperative games merge into one camera when players are close and split when distance grows. Use hysteresis so the layout does not flicker around one threshold. During transition, preserve player orientation, HUD identity and input. A line connecting off-screen partners can be cheaper and clearer than a constantly changing split.

Dynamic cameras must never change simulation. They consume player positions and presentation time. If a transition is interrupted by death, teleport or pause, snap to a defined valid layout.

## Audio and haptics

Most audio APIs expose one listener, while split-screen has several viewpoints. Choose a product rule: listener at camera centroid, focus player, nearest local player per sound or a custom mix prepared above the audio layer. Document it and test extreme separation. Critical gameplay sounds need non-spatial reinforcement if spatial policy can make them inaudible.

Haptic events route to player, then to the currently assigned device. On reassignment, old device vibration stops before the new device receives future events. Each profile retains its own intensity/accessibility settings.

## Performance multiplies selectively

Simulation cost should remain almost constant, but visibility, draw submission, pixels and post-processing can multiply. Reuse shadow maps or view-independent preparation where visually valid. Scale per-view effects deliberately, not by surprising global quality changes. UI and render-target allocations should be reused when layout is stable.

Profile one through four players separately. Report CPU simulation, culling and submission per view, GPU pass time, transient memory and render-target bytes. A four-player test at the target display resolution belongs in the release gate.

## Testing the whole flow

Automate device traces for join order, duplicate join, disconnect/reconnect and remapping. Render golden images for every layout and aspect ratio. Verify camera projection, scissor containment, HUD ownership and full-screen overlays. Exercise pause authority: which player can pause, who can navigate, and what happens when that device disconnects.

Local multiplayer feels reliable when players understand which device and view are theirs, the world stays authoritative once, and adding a viewport changes presentation cost without changing gameplay results.
