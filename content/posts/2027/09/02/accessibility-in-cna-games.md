---
title: Accessibility in CNA Games
date: 2027-09-02T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build accessibility into a CNA game's input, presentation, audio and timing policies without requiring a separate engine API.
author: Robert Vokac
categories: [Development]
tags: [CNA, Accessibility, Input, UI]
draft: false
---

Accessibility is primarily a game-design responsibility. CNA supplies the building blocks—rebindable keyboard and controller input, text input, display scaling, audio control, effects and platform capabilities—but the application decides whether critical information has alternatives.

Represent actions by meaning instead of hard-coded keys. Permit rebinding, multiple bindings and hold/toggle choices. Avoid requiring simultaneous inputs that exclude one-handed play, and display controller labels reported by the connected device.

Text and UI should scale independently of the 3D scene. Respect safe areas, maintain contrast and do not encode state by color alone. CRT, motion, flashing and camera-shake effects need intensity controls or an off switch. Draw critical captions after a heavy post-process when clarity matters.

## More than visuals

Provide separate music, effects and dialogue levels. Caption important speech and non-speech cues with direction where useful. Never make an audio cue the only warning of immediate danger.

Allow pause, adjustable difficulty and enough time to read prompts. A deterministic fixed-step simulation can support slow modes, but networked play needs rules that remain fair for every participant. Avoid rapid repeated button presses when a hold alternative is possible.

Text entry should use `TextInputEXT` and the platform IME rather than a US-keyboard translation. Touch targets need generous size and cancellation behavior. On unsupported platforms, capability checks should lead to a meaningful alternative rather than a disabled workflow with no explanation.

Test accessibility settings from first launch through saving and recovery. Make menus themselves usable before the player can enable assistance. Automated contrast and layout checks help, but reviews by people with different access needs reveal problems no API checklist can certify.

CNA does not label a game accessible. It makes portable implementation possible; the game's defaults, alternatives and evidence determine the result.

## Verification as a feature

Map critical information and actions to visual, audible and tactile channels; rows with one channel deserve review. Test increased text scale, no sound, no color distinction and keyboard-only or controller-only navigation.

Settings need previews and safe reversal. Save accessibility choices outside campaign slots so they apply before loading, and include the settings screens themselves in automated menu traversal.

## Design systems, not isolated toggles

Text size affects layout, subtitles need speaker names and background contrast, and color alternatives require icons or patterns in the game itself. Centralize these decisions in theme, typography, caption and input services so a new screen inherits them. A setting that only works in the main menu is worse than a smaller feature applied consistently.

Remapping should operate on actions rather than physical keys and must cover gameplay, menus and confirmation dialogs. Detect conflicts, support multiple bindings, and always preserve a route back to settings. Adjustable hold/toggle behavior, aim assistance, timing windows and camera motion can remove different barriers without changing the underlying rules for everyone.

## Verify with people and tools

Automated checks can find missing labels, unreachable focus targets, low contrast and text overflowing at maximum scale. They cannot establish whether combat audio conveys useful direction or whether a rapidly flashing effect is comfortable. Combine instrumentation with playtests by people who use the relevant features and compensate them for expertise.

Create test scenarios for keyboard-only navigation, controller-only navigation, no audio, grayscale display, reduced motion and maximum text size. Verify that achievements and progression remain possible. Document known limitations plainly and treat accessibility regressions like input or save regressions: owned, reproduced and fixed before release rather than postponed as optional polish.

## Include accessibility in the definition of done

Every new interaction should identify its focus order, readable label, non-color cue, remappable action and behavior under text scaling and reduced motion. Every cinematic should define captions and a skip route. Review these while the feature is still editable, not after localization and certification. Publish the implemented options in release notes and keep defaults conservative. Players should be able to reach accessibility settings before sound, flashes or difficult input are required.

When a feature cannot yet be made accessible, document the specific barrier and planned remedy instead of describing the whole game with a vague accessibility claim.

## Worked example: action-based input and presentation settings

Gameplay asks for actions, not keys:

```cpp
enum class Action { MoveLeft, MoveRight, Jump, Confirm, Cancel, Pause };

bool InputActions::Pressed(Action action) const
{
    for (const Binding& binding : bindings_.at(action))
        if (devices_.Pressed(binding)) return true;
    return false;
}
```

Allow several bindings per action, detect conflicts and keep an emergency route to navigation settings. Menus and confirmation dialogs use the same action layer as gameplay. A toggle option should transform semantics at this layer instead of teaching each mechanic to reinterpret a held button.

Centralize visual choices in a theme object:

```cpp
struct AccessibilityTheme {
    float textScale = 1.0f;
    bool highContrast = false;
    bool reduceMotion = false;
    bool distinguishWithPatterns = true;
    SubtitleMode subtitles = SubtitleMode::DialogueAndEffects;
};
```

Screens query theme values during layout; they do not cache one startup font size. Reduced motion replaces camera shake, flashes and large parallax with defined alternatives rather than merely shortening them. Color-coded teams also use shape, icon or label.

Automate menu traversal using keyboard actions only and controller actions only. Render every screen at maximum text scale and narrow aspect ratio, then detect clipped focus bounds. Run gameplay with audio muted, grayscale output and reduced motion. Automated checks do not replace players with relevant disabilities, but they prevent known requirements from regressing between those playtests.

## Captions, audio and motion

Captions identify speaker, preserve meaningful non-dialogue cues and remain readable over changing scenes. Let players adjust size and background opacity. Use timed text rather than baking one language and size into video. Test overlapping speakers, rapid lines and narrow layouts.

Important audio cues need visual or haptic alternatives that retain direction or urgency. Flashing warnings need non-flashing forms. Separate master, music, effects and dialogue volume so players can improve signal-to-noise. Test mono compatibility and useful dynamic-range modes.

Reduced motion includes shake, head bob, parallax, zoom, distortion and animated backgrounds. Replace effects instead of simply accelerating them. Avoid unsafe flashing and test combinations—two mild effects can overlap into a stronger result.

## Focus and readable UI

Maintain one visible focus, deterministic navigation and a route out of every modal. Return focus sensibly when a dialog closes. Labels describe purpose, not only a glyph. Red/green status also uses text, icon or pattern.

Test maximum text scale with longest localized strings. Reflow instead of clipping or shrinking below a readable minimum. Apply saved accessibility settings before title animation, sound or difficult input. Publish precise implemented options and known barriers in release notes so players can judge suitability without trial and error.
