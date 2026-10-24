---
title: Text Rendering, SpriteFont and Localization in CNA
date: 2027-11-18T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Build readable localized CNA interfaces with SpriteFont measurement, glyph coverage, wrapping, scaling and robust fallback policies.
author: Robert Vokac
categories: [Development]
tags: [CNA, SpriteFont, Text, Localization, UI]
draft: false
---

Text is rendered through the 2D pipeline, but it is not merely a row of ordinary sprites. Glyph coverage, kerning/layout behavior, baseline, wrapping, Unicode, localization and display density all affect whether an interface remains readable.

```cpp
const std::string label = localization.Get("menu.continue");
const Vector2 size = font->MeasureString(label);
const Vector2 position(panelCenter.X - size.X * 0.5f, panelTop + 24.0f);

spriteBatch.DrawString(*font, label, position, Color::White);
```

Use the string and pointer types of the CNA revision. Measure with the same font, scale and text that will be drawn. Do not center an English placeholder and later substitute another language without relayout.

## Glyph coverage is a content contract

A built font contains a defined character region. Inventory every shipped locale plus player-entered text requirements. Missing glyphs should use a deliberate fallback marker or font, not disappear. Include accented Latin, Cyrillic, Greek, CJK or other required scripts according to the product's actual language scope.

Unicode code points are not always one visible glyph. Combining marks, emoji sequences, bidirectional scripts and contextual shaping require more than byte-by-byte iteration. State what CNA/SpriteFont path supports today and select a shaping/fallback solution for languages outside it. Do not claim “Unicode support” because UTF-8 bytes can be stored.

## Layout in constrained space

Create a layout function that receives available width, text scale and style, then returns lines and bounds. Wrap on appropriate boundaries, retain explicit newlines and handle a single word wider than the box. Truncation uses an ellipsis only when the design allows lost information.

```cpp
TextLayout layout = textLayout.Layout(
    *bodyFont, message, availableWidth, accessibility.textScale);
for (const TextLine& line : layout.lines)
    spriteBatch.DrawString(*bodyFont, line.text, origin + line.offset, color);
```

Cache layout by text, font, width, scale and locale. Invalidate when any changes. Never cache only by localization key; the same key appears at different widths.

Align using baseline and line metrics rather than the visible pixels of one string. Buttons in a row should not move vertically because one contains `g` and another contains capitals. Reserve icon/text spacing using measured logical units.

## Resolution and readability

UI may be authored in virtual units, but final glyphs need sufficient physical pixels. Scaling a low-resolution bitmap font creates blur; point sampling can create uneven strokes at fractional scales. Provide suitable font assets or a rendering strategy for supported density tiers.

Text outline or shadow improves contrast only when sized with the glyph and display scale. A large drop shadow can reduce readability. For captions, use an adjustable background and line limit. Test light, dark and visually busy scenes.

## Localization changes layout

Do not concatenate translated fragments such as `count + " items"`; grammar and order vary. Use parameterized localized messages. Keep UI actions as semantic identifiers and let each locale select wording.

Pseudo-localization is an effective test: expand strings, add accents and mark boundaries. Run it automatically through menus and capture overflow. Also test right-to-left direction when in product scope, longest real translations, zero/large numeric values and missing keys.

Player names and chat are untrusted text. Bound length in code points/bytes according to the chosen representation, reject or replace unsupported control characters, and never interpret text as markup unless a safe parser explicitly supports it.

## Testing text

Build a gallery containing every font/style, required glyph ranges, multiline paragraphs, punctuation, numbers, controller glyph labels and captions. Render at minimum/maximum UI scale and narrow/wide viewports. Check atlas page boundaries and repeated load/unload.

Automated layout tests can assert bounds remain inside panels, focus rectangles enclose labels and line count stays within policy. Golden images catch baseline and sampling changes. Manual review by native speakers remains necessary for meaning and typography.

Treat text as structured localized content with measurable layout. Once glyph scope, fallback, scale and overflow policies are explicit, `SpriteFont` becomes a dependable foundation rather than a system that works only for the original English menu.

## Input, selection and dynamic text

Rendered labels and editable text are different systems. Text input receives composed Unicode through platform text/IME events, not keycodes. Store caret/selection in the chosen string unit carefully; byte offset into UTF-8 is not automatically a user-perceived character boundary. Clipboard operations need availability/privacy/length policy.

Chat/player names are bounded and escaped as plain text. If rich markup is supported, parse an allowlist into styled runs and ensure measurement/wrapping matches drawing. Never concatenate untrusted markup directly.

Rapidly changing counters/timers may avoid full layout caching, while stable paragraphs should cache. Profile glyph draw/batch/page switches and layout time separately. Prewarm only known fonts/glyph pages needed for first scene; missing runtime glyph fallback must not stall unpredictably.

## Release matrix

For each locale render title/menu/settings/tutorial/captions plus longest strings at min/max UI scale, narrow/wide/high-DPI and controller/keyboard glyph mode. Pseudo-localization runs in CI. Native review confirms grammar and line breaks.

Test missing localization key/glyph, malformed UTF-8 policy, right-to-left/shaping scope, combining marks, zero/huge numbers, font unload/reload and device recreation. The release should document languages/scripts genuinely supported rather than claiming all Unicode from storage encoding alone.
