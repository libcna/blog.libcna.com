---
title: Building a Small 2D Platformer with CNA
date: 2029-01-18T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Assemble a compact CNA platformer vertical slice with fixed-step movement, tile collision, camera, animation, collectibles, UI, audio and tests.
author: Robert Vokac
categories: [Development]
tags: [CNA, Platformer, 2D, SpriteBatch, Tutorial]
draft: false
---

A small platformer is an excellent CNA vertical slice. It exercises content loading, `SpriteBatch`, input, fixed timing, collision, animation, audio, screens, save data and packaging without requiring a large engine layer. The goal here is not a framework hidden above CNA; it is one playable level whose boundaries remain understandable.

![The Platformer sample running through CNA with a jungle level, gems and an exit](/media/2027/91-xna-samples-ported-to-cpp-with-cna/platformer.png)

## Define the slice

Keep the first milestone narrow:

- title screen and one level;
- run, jump and fall;
- solid tiles plus one-way platforms;
- collectibles and exit;
- death/restart and completion time;
- keyboard and gamepad;
- music, jump/collect/death sounds;
- deterministic headless movement tests.

Use placeholder art until the loop is correct. A content-heavy project can hide movement bugs behind weeks of asset work.

## Game structure

Derive the application from CNA's `Game`, create `GraphicsDeviceManager`, load shared title assets, then let a small screen stack own title, gameplay and results. The gameplay screen owns a level content scope and a plain `World`.

```cpp
class PlatformerGame final : public Game {
    std::unique_ptr<GraphicsDeviceManager> graphics_;
    ScreenStack screens_;
protected:
    void Initialize() override;
    void LoadContent() override;
    void Update(const GameTime& time) override;
    void Draw(const GameTime& time) override;
};
```

Exact constructors/accessor spelling should follow the CNA version used by the project. Keep CNA calls at application/render/content boundaries; world tests should not require a graphics device.

Use fixed simulation ticks. Poll CNA keyboard/gamepad once per framework update, map physical controls to `Move`, `Jump`, `Pause` and `Restart`, then queue edge actions until consumed by a tick.

## Level data and collision

Store visible tile ID separately from collision kind. The player should not become blocked because an artist changed a decorative tile. Compile a small authored map into a versioned runtime level containing layers, spawn, exit, collectibles and collision cells.

For an axis-aligned player box, integrate horizontal and vertical movement separately. Sweep or resolve only cells overlapping the proposed bounds. Horizontal motion resolves left/right faces; vertical motion resolves floor/ceiling and sets grounded state. Iterate deterministic cell order.

```cpp
void Player::Step(const PlayerActions& input, const LevelCollision& level,
                  float dt) {
    velocity.x = Approach(velocity.x, input.moveX * maxSpeed, acceleration * dt);
    if (input.jumpPressed && CanJump()) velocity.y = -jumpSpeed;
    velocity.y = std::min(velocity.y + gravity * dt, maxFallSpeed);
    MoveHorizontal(level, velocity.x * dt);
    MoveVertical(level, velocity.y * dt);
}
```

Decide coordinate signs once; this example assumes screen/world Y grows downward. Add coyote time and buffered jump as integer ticks. One-way platforms collide only while descending from above, with a small previous-position tolerance. A drop-through action temporarily disables the specific supporting platform.

## Animation and rendering

Choose animation from authoritative state: idle/run from horizontal speed, rise/fall from vertical velocity, dead from game state. Each clip advances on presentation or fixed time under an explicit policy and selects a source rectangle in the sprite sheet. Flip with SpriteBatch effects instead of duplicating frames.

The camera follows the player inside level bounds. Use frame-rate-independent damping or pixel-snapped fixed motion for pixel art. Render back-to-front in explicit layers: background, rear tiles, entities, foreground tiles, particles, HUD. Choose point or linear sampling to match art and scale.

Interpolate the player's render position between fixed states, but collision and collectible tests use current authoritative position. Teleport/restart resets interpolation history.

Tile rendering visits only camera-visible cells. Atlas padding prevents filtering seams. For one level, `SpriteBatch` is sufficient; a chunk cache is an optimization only after measurement.

## Gameplay objects and events

Collectibles have stable level IDs, bounds and collected state. Collision emits `Collected{id}` once; presentation plays sound/particles from that event. The exit activates when requirements are met, then queues a screen transition at the tick boundary.

Death is a state machine: Alive → Dying → Restarting. Stop accepting movement, play bounded feedback, then restore from a checkpoint snapshot. Do not destroy/recreate the screen inside the collision callback.

Save only durable progress—completed level, best time, collected persistent IDs and settings—not SpriteBatch objects, texture pointers or animation caches. Version the save.

## Audio and UI

Load short effects and music through the project's CNA audio path. Route semantic events through a mixer with music/effects volumes. Prevent repeated landing sound from noisy grounded transitions. Pause/focus policy stops or attenuates intentionally.

The HUD shows collectible count and time in a logical safe area. Pause is a modal screen with keyboard/gamepad focus. Every action is reachable without mouse, text scales, and color is not the only indicator of locked exit or damage.

## Tests and completion gate

Unit-test acceleration, jump buffer, coyote time, tile edges, ceiling, one-way approach/drop and restart from recorded action frames. Run the same commands under different render schedules and assert identical world state. Golden captures cover level start, collectible, pause and completion across CNA renderers.

Profile visible tiles, SpriteBatch submissions/flushes, update time and allocations. Package the level and assets through the real release path. The vertical slice is complete when a clean install can start, play, pause, die, finish, save progress and replay its core movement headlessly—not when the character first appears on screen.
