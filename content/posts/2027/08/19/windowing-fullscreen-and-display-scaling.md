---
title: Windowing, Fullscreen and Display Scaling
date: 2027-08-19T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Manage CNA windows, backbuffers, fullscreen transitions, virtual resolution and high-density displays without mixing logical and drawable units.
author: Robert Vokac
categories: [Development]
tags: [CNA, Windowing, Fullscreen, Scaling, HiDPI]
draft: false
---

A CNA window has several related sizes: logical client bounds, drawable pixels, backbuffer dimensions and possibly a virtual game resolution. Treating them as one integer pair works until a high-density display, browser canvas or mobile rotation appears.

Configure preferred backbuffer size and fullscreen through `GraphicsDeviceManager`, apply changes at a controlled point, then read the resulting viewport rather than assuming the request was granted exactly. Window managers and mobile platforms may constrain the result.

Fullscreen can mean an exclusive display mode or a borderless desktop window depending on platform and renderer. Preserve the previous windowed bounds and make transitions idempotent. A failed mode request should leave a usable window.

## Scaling policy

A virtual resolution gives gameplay and UI a stable coordinate system. Fit it into the actual backbuffer with letterboxing, integer scaling or stretch according to the game's needs. Convert pointer and touch coordinates through the same transform, including offsets introduced by bars.

Pixel art usually prefers integer scaling and point sampling. Vector-like UI benefits from content scale and larger font resources. Safe areas further constrain mobile layout; they are not equivalent to the full viewport.

On resize, recreate size-dependent render targets only after dimensions stabilize and avoid holding references to the old buffers. Update camera projection, scissor rectangles and post-processing targets together. Zero-sized or hidden windows should skip presentation safely.

Test drag resizing, maximize, repeated fullscreen toggles, DPI movement between monitors, unusual aspect ratios, browser canvas resizing and device rotation. The picture, input mapping and UI must agree. Correct scaling is not only a graphics feature—it is a coordinate contract shared by rendering and input.

## Presentation failure and persistence

Store a preference, not a blindly trusted display mode. Validate it against current adapters and fall back to a safe window; a monitor may have disappeared since the previous run.

Debounce target recreation during continuous resize. Log requested and actual logical, drawable and backbuffer dimensions together—this single record makes DPI and letterbox failures reproducible.

## A single mapping for rendering and input

Choose a virtual game resolution, calculate the largest destination rectangle with the desired aspect ratio, and derive one transform from virtual coordinates to the viewport. Rendering uses that transform; mouse and touch use its inverse. Reject or specially handle input in letterbox bars. Keeping both directions together prevents buttons from drifting away from their pictures on high-DPI displays.

Pixel-art games may require an integer scale and nearest sampling. When the window is too small, select a documented fallback instead of silently switching filters. Vector-like UI can scale continuously but still needs minimum physical target sizes and readable fonts. Test fractional desktop scaling such as 125% and 150%, not only integer Retina-style ratios.

## Changing display mode safely

Distinguish windowed, borderless fullscreen and exclusive fullscreen in settings and capability checks. Save the last known-good mode, apply a change temporarily, and revert after a timeout unless the player confirms. If the requested monitor or mode disappears, recover to a visible window on an available display.

A resize can invalidate swap-chain state and size-dependent render targets. Queue one coherent recreation at a frame boundary, then notify cameras and UI layout. Test dragging between monitors with different scale factors, minimizing to zero drawable size, alt-tab from fullscreen and reconnecting a display. Diagnostics should record monitor, mode, refresh rate, logical size, pixel size, viewport and active scaling policy.

## Configuration checklist

Test the smallest supported window, common laptop and desktop resolutions, ultrawide, portrait and every available scale factor. Verify pointer mapping at all four viewport corners and in letterbox bars. Change mode repeatedly while audio and input remain active, then restart and confirm the saved choice recovers safely. Screenshots should include diagnostic dimensions so a scaling defect can be reproduced without guessing which of several coordinate spaces was wrong.

Include multi-window behavior only when the platform advertises it, and state clearly which window owns fullscreen, input focus and presentation timing.

## Worked example: letterboxed virtual resolution

For a 320×180 game inside an arbitrary drawable, choose one scale and centered viewport:

```cpp
ViewportLayout Fit(int drawableW, int drawableH, int virtualW, int virtualH)
{
    const float scale = std::min(
        drawableW / static_cast<float>(virtualW),
        drawableH / static_cast<float>(virtualH));
    const int w = static_cast<int>(std::floor(virtualW * scale));
    const int h = static_cast<int>(std::floor(virtualH * scale));
    return {{(drawableW - w) / 2, (drawableH - h) / 2, w, h}, scale};
}

std::optional<Vector2> ToVirtual(Vector2 pixel, const ViewportLayout& v)
{
    if (!v.rectangle.Contains(pixel)) return std::nullopt;
    return Vector2((pixel.X - v.rectangle.X) / v.scale,
                   (pixel.Y - v.rectangle.Y) / v.scale);
}
```

Use drawable pixels for viewport math and logical coordinates only after converting through platform scale. Pixel-art mode can floor `scale` to an integer when it is at least one. Define what happens below native size—downscale with point sampling, allow fractional linear sampling or require a minimum window—and expose that as policy.

## Safe fullscreen changes

Keep the last confirmed mode. Apply a requested monitor, dimensions and mode temporarily, display a countdown, and revert unless confirmed. If the monitor disappears or creation fails, recover to a conservative visible window. Persist the confirmed choice only.

Recreate size-dependent targets once at a frame boundary after resize. Minimized windows may report zero drawable area; skip presentation rather than allocating zero-sized targets. Test dragging between displays with different DPI, repeated alt-tab, exclusive-mode failure and startup with a disconnected saved monitor. Log logical size, drawable size, scale, viewport, monitor and refresh rate in one record.

## Fonts, cameras and capture

The 3D camera aspect ratio uses the render viewport, not necessarily the whole window. A letterboxed 16:9 game in an ultrawide window still projects at 16:9. UI may use virtual units while font selection chooses assets appropriate for actual density. Scaling a tiny bitmap font after layout is not equivalent to a readable high-density font.

Screenshots also need policy: whether capture includes letterbox bars, post-processing and system-space UI. Read the correct completed target and store its dimensions. Otherwise reports differ from what the player saw because capture happened before final composite.

Refresh rate and presentation interval are not the simulation tick. Refresh display information after monitor/mode changes, but keep gameplay time independent. Expose adaptive presentation through capabilities rather than renderer-name assumptions.

## Failure symptoms

Blur usually means content was rendered and filtered at unintended sizes. Misplaced input means coordinate transforms disagree. UI jumping across monitors indicates delayed DPI updates. Black after alt-tab points to presentation or target recreation. Log all coordinate spaces together and reproduce one transition at a time; random backbuffer changes merely mask the contract error.
