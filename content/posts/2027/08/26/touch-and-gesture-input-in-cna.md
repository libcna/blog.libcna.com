---
title: Touch and Gesture Input in CNA
date: 2027-08-26T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Use CNA TouchPanel snapshots and gesture recognition for mobile and browser controls while preserving identity, coordinates and frame semantics.
author: Robert Vokac
categories: [Development]
tags: [CNA, Touch, Gestures, Input, Mobile]
draft: false
---

`TouchPanel::GetState()` returns the current touch collection. Each contact has an identity, position and state such as pressed, moved or released. Track by identity rather than array index: fingers can arrive and leave in any order.

Convert positions through the same virtual-resolution transform used to draw controls. A button rendered inside a letterboxed game must not test raw drawable coordinates. Recalculate that mapping after rotation, resize or safe-area change.

Enable only the gestures the game consumes, call `TouchPanel::Update()` at the intended frame boundary, and drain available `GestureSample` values. Taps, drags, flicks and pinches represent interpreted interaction; raw touches remain appropriate for custom controls and drawing.

## Design beyond a mouse substitute

Touch has no hover and often obscures the content under a finger. Make targets large, keep important action away from system edges, provide visible pressed feedback and allow a drag to cancel. Do not require three simultaneous controls on devices that may report fewer contacts.

Gestures can conflict. A short drag may also resemble a tap until thresholds resolve. Decide which recognizer owns a region and avoid changing enabled gestures mid-contact without a clear cancellation policy.

When the application loses focus, cancel active contacts and gestures. Do not preserve a virtual joystick direction across suspension. Mouse emulation can help desktop testing but does not prove multi-touch identity, pressure, rotation or mobile edge behavior.

Test one finger, several fingers, reordered contacts, quick release, interrupted gesture, rotated display and touches outside the virtual viewport. Physical devices remain essential: latency, finger occlusion and operating-system navigation gestures are experiential properties a unit test cannot reproduce.

## Virtual controls

Capture a virtual stick's initiating finger by identity and ignore other fingers until release. Apply a radial dead zone, normalize displacement and handle cancellation. Buttons need independent press and release ownership so sliding one finger cannot trigger several actions.

Offer left-handed placement, scale and opacity where practical. A development overlay showing raw contacts and safe areas reveals conversion and lost-contact bugs immediately.

## Build gestures from contact ownership

Assign every new contact a stable identifier and an owner: UI control, camera gesture or gameplay surface. Once a button captures a finger, movement outside its bounds should not suddenly become a camera pan. Release ownership on up, cancellation, focus loss or suspend. This simple rule eliminates many stuck-button and accidental-pinch defects.

Recognizers need thresholds expressed in physical or logical units, not arbitrary framebuffer pixels. A tap has maximum movement and duration; a drag begins only after a threshold; a pinch uses two owned contacts and a stable initial distance. Define which combinations may coexist. For example, a two-finger camera gesture may cancel a pending one-finger tap, but should not steal a finger already controlling movement.

## Testability and alternatives

Convert raw platform events into a frame snapshot, then feed that snapshot to deterministic recognizers. Unit tests can replay exact contact sequences including cancellation, reordered events, rotation and a second finger arriving late. Integration tests should verify the inverse viewport transform so contacts still match content under letterboxing and high DPI.

Touch is one input method, not the game design. Provide keyboard, controller or switch-compatible alternatives where appropriate, and avoid interactions that require several simultaneous fingers. Ensure controls remain usable near notches and system gesture zones. Haptics should reinforce an action, never be the only confirmation, and must respect the player's intensity or disable setting.

## Device test matrix

Exercise one-, two- and several-contact sequences on small and large screens, with both orientations and interrupted focus. Test fingers leaving the surface, an OS gesture stealing a contact, rotation during a drag and a second contact arriving on a UI button. Repeat under frame drops because event batches may contain several transitions at once. Record raw and transformed coordinates in the overlay; without both, a gesture bug and a viewport-mapping bug look identical.

Keep recordings as regression fixtures so future platform backends must interpret the same contact lifetime, cancellation and coordinate rules.

## Worked example: contact capture

Represent contacts independently of frame-local array positions:

```cpp
struct Contact {
    std::int64_t id;
    Vector2 position;
    TouchPhase phase;
};

void VirtualButton::Process(const Contact& c)
{
    if (c.phase == TouchPhase::Pressed && bounds_.Contains(c.position)
        && !capturedId_) {
        capturedId_ = c.id;
        pressed_ = true;
    }
    if (capturedId_ == c.id) {
        pressed_ = c.phase != TouchPhase::Released
                && c.phase != TouchPhase::Cancelled;
        if (!pressed_) capturedId_.reset();
    }
}
```

The control keeps ownership even when the finger moves outside, then releases on up or cancellation. Camera recognition must not steal that identifier. Clear all capture on focus loss and suspend.

Build tap, drag and pinch recognizers from the same per-frame snapshot. Express distance thresholds in logical or physical units and time in a monotonic duration. A tap becomes impossible once movement crosses the drag threshold. A pinch stores two IDs and their initial distance; if either cancels, the gesture ends rather than silently substituting a third finger.

Record input fixtures as timestamped contacts with ID, raw position, transformed position and phase. Replay a normal tap, slow drag, two-finger pinch, second finger arriving late, OS cancellation and rotation mid-gesture. Run the same fixture through every backend. A screen overlay showing raw contacts, owners, safe area and gesture state makes a lost cancellation immediately visible.

## Virtual sticks and buttons

A virtual stick captures one contact, computes displacement from its center, applies a dead zone and clamps magnitude. Decide whether center is fixed or follows the initial touch. A floating center must remain within safe bounds. Always return to zero on cancellation.

Buttons need adequate physical size and spacing, not merely pixels. Support left-handed layout, opacity and scale when possible. When controls overlap, define priority; container iteration order is not interaction design. Provide visual plus optional haptic/audio response, but never make haptics the only confirmation.

Write an arbitration table: UI capture wins over world pan; established drag cancels pending tap; a second unowned contact may begin pinch; system cancellation ends each recognizer owning that contact. This table prevents recognizers from stealing fingers unpredictably.

## Accessibility and parity

Every essential touch action needs an alternative appropriate to supported devices. Avoid mandatory multi-finger chords and gestures differentiated only by speed. Test long taps, imperfect paths and accidental extra contacts. Touch quality is not the number of gestures; it is predictable ownership, forgiving thresholds and reliable cancellation.
