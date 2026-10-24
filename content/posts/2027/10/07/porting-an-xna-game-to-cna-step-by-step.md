---
title: Porting an XNA Game to CNA Step by Step
date: 2027-10-07T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: A staged checklist for translating an original XNA 4.0 game to CNA while preserving behavior and producing evidence after every milestone.
author: Robert Vokac
categories: [Development]
tags: [CNA, XNA 4.0, Porting, C++23]
draft: false
---

An original XNA game is CNA's clearest migration target, but C# and C++ still differ. Port in observable stages rather than translating every file and hoping the final build explains all failures.

1. Record the original game: screenshots, controls, save files, frame timing and representative scenarios.
2. Create a CNA executable with the same window and logical resolution.
3. Translate the `Game` lifecycle and one empty update/draw loop.
4. Port input and timing before gameplay.
5. Convert a minimal content set through CNA's pipeline.
6. Reproduce one 2D or 3D scene on a single renderer.
7. Add audio, storage and remaining screens.
8. Qualify additional renderers and platforms last.

## Mechanical translation

Namespaces remain recognizable, while C# properties become methods such as `getViewportProperty()`. Replace managed ownership explicitly and avoid raw owning pointers. Convert events with attention to subscriber lifetime. Use CNAEXT only when the game needs functionality outside strict XNA.

Content deserves its own milestone. Keep original assets, processor settings and expected output. Model orientation, sprite-font metrics, premultiplied alpha and compiled effects can change the picture even when gameplay code is correct.

Use deterministic commands to reach the same scene in both versions. Compare images, numeric state and save round-trips. Fix the smallest divergence before adding more content. Consult CNA's compatibility matrices for known gaps instead of compensating inside the game.

Preserve the original branch and record intentional deviations. A successful port is not just “playable”: it has a repeatable build, documented dependencies, verified representative scenes and a clear list of behavior that could not or should not remain identical.

## Closing the port

Test a clean machine, optimized build and packaged content. Run save cycles, device loss, repeated screen transitions and voice reuse; compare memory after returning to the title with the initial baseline.

Keep a ledger of source version, CNA revision, renderer, completed scenarios and accepted differences. Future upgrades then become controlled requalification rather than archaeology.

## Port in vertical slices

First make the original game reproducible and archive its screenshots, saves and content sources. Create a minimal CNA entry point, initialize services, clear the screen and exit cleanly. Next bring across one playable vertical slice: input, a world scene, essential audio and a small content set. This proves architecture before hundreds of assets obscure a lifecycle mistake.

Translate project and platform glue while leaving pure gameplay code unchanged where possible. Replace direct storage, window and device assumptions with narrow services. Rebuild content through the supported pipeline and fix case sensitivity, shader dialects and unsupported formats at their source. Maintain a table of every temporary stub so missing music or a no-op service cannot silently ship.

## Qualify behavior, then optimize

Compare fixed-step timing, pause behavior, controller dead zones, sprite blending, 3D winding, audio instance limits and save round trips against the captured XNA baseline. For visual checks, use matching camera state and deterministic scenes. Accepted differences should state why they are safe; unexplained differences stay open.

Only optimize after correctness. Profile crowded representative scenes, inspect draw and state counts, and confirm content memory. A compatibility workaround that allocates every frame may be acceptable during bring-up but needs an owner and removal deadline.

Finally test packaged builds on clean targets, including upgrade of real old saves and recovery from missing optional hardware. Preserve attribution and third-party licenses from the original project. The completed port should have a documented toolchain, repeatable build and regression suite so it can evolve as a CNA game rather than remain a fragile historical demonstration.

## Definition of done

The port must start, play, pause, save, load and exit through the same supported scenarios as the reference. All content comes from reproducible sources, no required subsystem remains a silent stub, and accepted visual or behavioral differences are recorded. Performance meets an explicit target on representative hardware. A clean package installs without developer tools. Finally, another maintainer can follow the build instructions from scratch—arguably the strongest proof that the port is complete rather than merely working on its author's machine.

## Step 1: preserve the XNA-shaped game

Do not rewrite gameplay while changing frameworks. Translate the entry point and ownership first. A typical XNA class maps directly to CNA's C++ API shape:

```cpp
class MyGame final : public Game
{
public:
    MyGame()
        : graphics_(std::make_unique<GraphicsDeviceManager>(*this)) {}

protected:
    void Initialize() override { Game::Initialize(); }

    void LoadContent() override
    {
        spriteBatch_ = std::make_unique<SpriteBatch>(getGraphicsDeviceProperty());
        player_ = getContentProperty().Load<std::shared_ptr<Texture2D>>("player");
    }

    void Update(const GameTime& time) override
    {
        if (GamePad::GetState(PlayerIndex::One).Buttons.Back == ButtonState::Pressed)
            Exit();
        world_.Update(time);
        Game::Update(time);
    }

    void Draw(const GameTime& time) override
    {
        getGraphicsDeviceProperty().Clear(Color::CornflowerBlue);
        spriteBatch_->Begin();
        spriteBatch_->Draw(*player_, playerPosition_, Color::White);
        spriteBatch_->End();
        Game::Draw(time);
    }
};
```

Adjust getter names and content pointer types to the current CNA API, but keep the vertical slice recognizable. Once a clear, one texture, input and exit work, add one real level before bulk content.

## Step 2: close one subsystem at a time

Create a checklist for build, content, input, 2D/3D graphics, audio, persistence and platform services. For each, capture old behavior, port, compare and close. Rebuild `.xnb`/source content through supported readers or CNA pipeline outputs; never disguise MonoGame `MGFX` as XNA Effect bytecode.

Use old save files as immutable fixtures. Replay input through both builds. Capture the same camera and random seed. Only after parity profile crowded scenes and eliminate temporary allocations or compatibility paths.

## Step 3: prove the package

Build from a fresh clone using documented commands, stage only declared runtime files and launch on a clean target. Upgrade a real save, disconnect controllers, deny optional permissions and quit during loading. Archive source revision, CNA revision, content compiler version, renderer and accepted differences. That ledger turns the next CNA upgrade into requalification rather than another archaeological port.

## A concrete port order

1. Archive a known-good XNA build, screenshots, saves and content sources.
2. Create the CNA executable and reach a clean clear/exit loop.
3. Port one input action and render one known texture.
4. Reproduce fixed-step timing and one playable vertical slice.
5. Bring across audio and a versioned save round trip.
6. Convert remaining 2D/3D content and custom effects from source.
7. Restore platform services behind game-owned interfaces.
8. Compare complete scenarios, profile and package.

Commit these as reviewable stages. Avoid combining mass namespace edits with behavioral fixes; otherwise a regression cannot be bisected. Keep a list of placeholders, because a silent music stub or always-success service can survive long after the title screen works.

## Typical porting failures

Black custom-shader output usually means incompatible bytecode or a binding/matrix convention mismatch. Dark sprite fringes indicate alpha-processing disagreement. Missing files on Linux/Android often mean case mismatch. Fast/slow gameplay points to timing assumptions. Wrong controller feel points to dead-zone semantics. Saves written beside the executable reveal a desktop path assumption.

Diagnose each at its boundary and add a regression fixture. Do not correct a content-pipeline error by special-casing one renderer or repair timing with arbitrary speed constants. The port should end with fewer hidden assumptions than the original, not a new layer of per-platform exceptions.
