---
title: Tamagotchi CNA
date: 2026-10-19T12:00:00Z
updated: 2026-10-17T14:06:31Z
description: |
  Tamagotchi CNA is an unfinished, independent C++ reimplementation of the international 1997 P1 virtual-pet program, presented through CNA.
author: Robert Vokac
categories:
  - Projects
  - Games
tags:
  - CNA
  - Tamagotchi CNA
  - C++23
  - Virtual pet
  - Simulation
  - Persistence
  - WebAssembly
  - CNA Cemetery
draft: false
---

**Tamagotchi CNA** is an independent C++ fan reimplementation of the international 1997 Generation 1 virtual-pet program, commonly called **P1**.

**Preserved source:** [https://github.com/libcna/cna-cemetery/tree/main/tamagotchi-cna](https://github.com/libcna/cna-cemetery/tree/main/tamagotchi-cna)

**Try the browser prototype:** [https://play.libcna.com/tamagotchi-cna/TamagotchiCna.html](https://play.libcna.com/tamagotchi-cna/TamagotchiCna.html)

![Tamagotchi CNA device](https://github.com/libcna/cna-cemetery/raw/main/tamagotchi-cna/screenshot.png)

It is an unofficial preservation project. It is not made by, endorsed by or affiliated with Bandai.

The repository is also explicit about status:

> These systems are foundations, not a complete P1 implementation yet.

---

## One deliberately narrow target

The project targets one historical program:

~~~text
international P1
released in 1997
one creature at a time
three buttons
32 × 16 monochrome game LCD
eight care indicators
~~~

It does not combine P1 with P2, later Connection devices, color models, online systems or the 2017 reissue.

That narrow target matters because superficially similar Tamagotchi generations use different characters, food, games, evolution rules and timing.

Tamagotchi CNA aims to reproduce one coherent program rather than inventing a hybrid.

---

## Not a ROM emulator

The project is a behavioral reimplementation.

It does not:

- embed an original ROM;
- load or execute a ROM supplied by the player;
- include TamaLIB or another emulation core;
- translate original program code.

Instead it reconstructs behavior from public documentation, observed rules, deterministic traces and independently written tests.

The architecture is:

~~~text
CNA application, input and renderer
                │
                ▼
session controller and event scheduler
                │
                ├────────► JSON save repository
                │
                ▼
CNA-independent P1 domain
                │
                ▼
32 × 16 one-bit display model
~~~

Keeping the domain independent of CNA allows care rules and time progression to be tested without opening a window.

---

## The device presentation

The application renders an egg-shaped virtual device with:

- a permanent 32×16 logical game bitmap;
- four icon cells above the game area;
- four icon cells below it;
- three physical A, B and C buttons;
- a recessed reset control;
- integer nearest-neighbor scaling;
- one-bit LCD pixels with no gray anti-aliasing.

Five shell families can be selected as presentation-only variants. The chosen shell is saved independently from the pet state.

Mouse and touch input press the same three virtual controls as the keyboard. Resizing the window does not change their logical hit areas.

---

## The three-button model

The historical interaction is deliberately retained:

| Button | Role | Desktop input |
| --- | --- | --- |
| A | Move through icons or choices | A or Right |
| B | Open, confirm or perform | B, Enter or Space |
| C | Cancel or go back | C, Backspace or Escape |

Button combinations also matter.

On the clock screen, A+C enters time setting. On the home screen, A+C toggles sound. At the end screen, the same pair starts a new egg without resetting the established device clock.

The clock's **SET** state implements the classic pause workaround. While it is active, needs, growth, calls, animation and device time remain frozen, including across application restarts.

The reset pinhole requires a sustained press and a desktop confirmation before replacing the active pet.

---

## The eight P1 functions

The icon bands expose the original functional families:

| Function | Current intent |
| --- | --- |
| Food | Bread for hunger, candy for happiness and weight |
| Light | Turn the light off after the creature sleeps |
| Game | Play the five-round Character guessing game |
| Medicine | Treat an ill creature |
| Clean | Remove waste |
| Status | Inspect age, weight, discipline and hearts |
| Discipline | Answer false attention calls |
| Attention | Automatic indicator, not a selectable action |

Icons remain part of the LCD rather than becoming modern independent UI buttons.

This constraint keeps the interaction close to the original device: the player navigates with A, confirms with B and cancels with C.

---

## What the preserved prototype implements

The imported CNA Cemetery snapshot includes a meaningful P1 foundation:

- clock setup and a pulsating egg;
- Babytchi and Marutchi states;
- P1 bread and candy;
- hunger, happiness, discipline, age and weight data;
- waste and the Toilet action;
- early illness and two-dose medicine;
- sleep and lights-out behavior;
- the five-round Character game;
- attention windows for genuine needs and false discipline calls;
- data-driven growth decisions for the documented teen and adult branches;
- the qualified international Bill path;
- the clock-based pause state;
- an angel end-screen presentation;
- versioned JSON persistence and offline catch-up.

Marutchi has measured waking, sleeping and medicine animations. Other characters still rely partly on provisional one-bit placeholders.

---

## What remains unfinished

The prototype must not be described as a complete P1 recreation.

Open work recorded in the repository includes:

- final sprites and animations for later forms;
- later illness behavior;
- complete natural lifespan and death timing;
- the transition that reaches the existing angel screen;
- P1-faithful sound output;
- save-slot selection and further schema migration;
- broader play validation of the complete life cycle.

The current offline simulation also retains a twelve-hour development clamp. The intended final design is to jump efficiently between meaningful scheduled events rather than limiting long absences or iterating minute by minute.

These gaps are visible project tasks, not silently filled with invented behavior.

---

## Time and persistence

A virtual pet must continue to exist while the application is closed.

Tamagotchi CNA stores a UTC simulation anchor and processes missed events when the save is loaded:

~~~text
save closes at UTC time A
        │
        ▼
application opens at UTC time B
        │
        ▼
scheduled events between A and B are applied
        │
        ▼
current P1 state is rendered
~~~

Moving the computer clock backward does not create free care time. Sub-minute time is retained so quick restarts do not slowly alter the simulation.

Writes use a temporary file and preserve a backup before replacing an existing save. If the active file is corrupt but the backup is readable, the LCD offers recovery. Beginning again archives the damaged file instead of silently destroying it.

The application also prefers an existing historical save location, allowing upgrades to keep the current pet after the product-directory rename.

---

## Desktop and browser

The native application uses CNA for:

~~~text
the Game lifecycle
keyboard, mouse and touch input
window presentation
the scaled one-bit display
future audio output
platform data locations
~~~

The repository also defines an Emscripten build that produces HTML, JavaScript, WebAssembly and preloaded assets.

The browser demo is useful for exploring the device presentation and current care loop, but it should be read as a prototype snapshot rather than as an archivally exact finished P1.

---

## Legal and release boundary

P1 names, character designs, game rules and branding belong to their respective rightsholders.

The source describes itself as an independent, unofficial fan project and says that public release of a faithful clone requires appropriate permission.

The preserved snapshot also contains no license file yet.

Those facts are as important as the technical progress. A working prototype does not automatically grant permission to redistribute protected characters or branding.

---

## Why the project is in CNA Cemetery

Tamagotchi CNA is one of the five standalone projects preserved in [CNA Cemetery](/2026/10/29/cna-cemetery/).

The subtree was imported with its source history rather than copied as a final directory. Its design decisions, implementation steps and unfinished backlog therefore remain available for study or possible continuation.

The cemetery location should not be confused with completion.

It means the project has a preserved home, with its actual status intact.

---

## Conclusion

Tamagotchi CNA explores a very different CNA workload from a renderer demo or action game.

Its hard problems are long-running state, deterministic time, recoverable persistence, tiny one-bit presentation and the fidelity of many interacting care rules.

The current prototype already demonstrates that architecture:

~~~text
testable simulation
        +
careful persistence
        +
CNA presentation
~~~

What it does not yet demonstrate is a complete, licensed P1 replacement.

Keeping both sides of that statement visible is the most accurate way to present Tamagotchi CNA today.
