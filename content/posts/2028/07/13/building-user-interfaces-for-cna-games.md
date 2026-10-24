---
title: Building User Interfaces for CNA Games
date: 2028-07-13T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build a retained game UI above CNA with layout, focus, input routing, scaling, accessibility and predictable SpriteBatch rendering.
author: Robert Vokac
categories: [Development]
tags: [CNA, User Interface, SpriteBatch, Input, Accessibility]
draft: false
---

CNA supplies drawing, text, input and game lifecycle primitives. It does not force a particular widget toolkit on every game. A title screen, HUD and inventory therefore need a game-owned UI layer whose policies are explicit: layout, focus, navigation, input capture, visual state and accessibility.

The simplest successful architecture is retained mode. The game keeps a tree of elements, measures and arranges that tree when inputs change, routes semantic UI actions, then emits drawing commands. Immediate-mode developer tools can coexist, but shipping menus benefit from stable element identity and focus.

## Separate model, layout and drawing

Do not let a button own game progress or directly load a level. The element exposes an action; the screen/controller handles it. That makes UI testable without a graphics device and prevents a reused widget from accumulating application policy.

```cpp
class UiElement {
public:
    virtual Vector2 Measure(const UiConstraints&) = 0;
    virtual void Arrange(const Rectangle& finalRect) = 0;
    virtual UiReply Handle(const UiEvent&) = 0;
    virtual void Paint(UiDrawList&) const = 0;
};
```

`Measure` computes desired size under constraints. `Arrange` assigns final rectangles. `Paint` records sprites, text and clipping rather than immediately changing arbitrary render state. A draw-list renderer can batch compatible work while preserving necessary order.

Keep layout units logical. Convert to pixels from a reference resolution, DPI policy, user UI scale and safe area. Snap final text baselines or pixel-art panels when fractional placement would blur them. Test ultrawide, portrait, tiny window, high DPI and enlarged text rather than designing only at 1920×1080.

## Layout primitives

A small set covers most game interfaces: stack, row/column grid, overlay, scroll view, spacer and anchored canvas for HUD elements. Each container owns predictable rules for padding, alignment, minimum/maximum size and overflow. Avoid absolute coordinates except where the visual design truly demands them.

Text determines layout, so measurement must use the same font, scale, wrapping width and localization as drawing. Never truncate silently. Provide wrap, ellipsis, scrolling or redesigned layout. Languages expand differently, and right-to-left support requires more than reversing a final string.

Style data should be separate from widget logic: colors, textures, font roles, spacing, focus indicators and sound cues. Resolve a style once per state and theme. A disabled button is not merely gray; it must refuse activation and explain its state accessibly where appropriate.

## Input becomes UI actions

Route physical keyboard, gamepad, mouse and touch through semantic actions such as Navigate, Accept, Cancel, TabNext and PointerActivate. This keeps menu behavior stable under remapping and lets accessibility settings provide alternate bindings.

Only one focus scope should own navigation at a time. Modal dialogs trap focus until closed. When a focused element disappears, choose a documented neighbor or restore the invoking control—not an arbitrary first element. Remember focus per screen when it improves return navigation.

Pointer hit-testing walks visual order from front to back and accounts for clipping and transforms. Capture a pointer after press if a drag/slider requires it; release capture on pointer up, cancellation, focus loss or element destruction. Decide whether hover changes input-glyph mode; tiny mouse motion should not make controller prompts flicker.

```cpp
UiEvent e = input.ToUiEvent();
UiReply reply = focusScope.Route(e);
if (reply.action) screenCommands.Enqueue(*reply.action);
```

Queue screen commands until input routing finishes. Destroying the button that is currently handling an event is a classic source of use-after-free and inconsistent focus.

## SpriteBatch rendering and clipping

Render UI in deliberate layers: screen background, panels, contents, overlays, focus/help and modal dimmer. Keep blend, sampler, depth and rasterizer choices explicit. Point sampling fits pixel art; linear sampling fits scalable art. Premultiplied-alpha assets must use the matching blend policy.

Nested clipping may require scissor rectangles and rasterizer state. Intersect child clips with parent clips and restore state reliably. If the renderer flushes batches around clip or shader changes, group content without violating visual order. A UI profiler should show draw items, batch breaks, glyph count and overdraw.

Animations run on presentation time and never become the sole signal of state. Reduced-motion mode can shorten or replace transitions. If a screen starts accepting input before its entrance animation completes, define that deliberately.

## Accessibility is structural

Every interactive control needs a stable accessible name, role, value/state and enabled reason. Strong focus indicators, scalable text, color-independent meaning, remapping and controller-only completion should be built into widgets rather than patched into individual screens.

For screen-reader integration where the platform supports it, expose a semantic tree separate from pixels. Announce meaningful changes at a controlled rate. Subtitles and captions need speaker/effect context, background treatment and timing policy.

## Test without looking, then qualify visually

Unit-test measure/arrange, directional focus, modal routing, scroll visibility and action emission using fake fonts/input. Snapshot semantic trees and draw lists. Visual golden images then catch clipping, alignment and state regressions across representative resolutions and renderers.

Run every menu with mouse only, keyboard only, one gamepad only and touch where supported. Test disconnect, focus loss, localization expansion, huge UI scale, no save data, network failure and rapid repeated activation. A robust CNA UI is not a collection of rectangles; it is a deterministic interaction system whose pixels are one output.
