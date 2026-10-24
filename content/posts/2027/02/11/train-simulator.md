---
title: Train Simulator
date: 2027-02-11T12:00:00Z
updated: 2026-10-17T14:35:22Z
description: |
  Train Simulator is a first-person passenger experience following a six-car electric train across a deterministic 286.4-kilometre railway.
author: Robert Vokac
categories:
  - Projects
  - Games
tags:
  - CNA
  - Train Simulator
  - C++23
  - 3D
  - Railways
  - Simulation
  - WebGL2
  - Avatars
draft: false
---

**Train Simulator** is a first-person passenger experience built with C++23 and CNA.

It follows the fictional **Northern Valley Express** over a deterministic 286.4-kilometre railway. The player can walk through a six-car electric train, sit by the window, inspect passenger information, use the accessible toilet and watch stations and countryside pass outside.

**Source:** [https://github.com/libcna/train-simulator](https://github.com/libcna/train-simulator)

**Web status:** Train Simulator has a WebGL 2 build, but it is not yet published on `play.libcna.com`. A playable web version is being prepared.

![Passengers aboard the Northern Valley Express](https://raw.githubusercontent.com/libcna/train-simulator/develop/docs/screenshots/passenger-saloon.png)

## Life inside the train

The six connected cars contain seats, tables, luggage areas, gangways, working passenger doors, information displays, signage, vestibules and an accessible toilet.

Thirty-four CNA avatar passengers share the service with the player. They occupy seats, walk through the train, read, use handheld devices, converse, visit the toilet, board and leave. A conductor performs passenger-area inspections while a driver occupies the active cab.

The player remains in a stable train-relative first-person space even while the complete train accelerates, brakes and follows curves.

## Six cars with distinct roles

The consist is not one repeated empty carriage. Cars can be identified as standard, quiet, work/table, accessible, family or luggage accommodation, with matching signs, upholstery accents and details.

Seats have separate cushions, backs, armrests, headrest covers and support structures. Facing bays include tables, cup recesses and power outlets. Luggage racks, grab poles, suspended handles, ventilation, emergency equipment and route literature make the saloons readable as passenger spaces.

Vestibules connect the train through glazed sensor doors, bellows and bridge plates. Passenger doors slide into real openings at stations. Their interlock is shared with passenger movement, so an avatar cannot walk through a closed or only partly opened leaf.

The accessible toilet is also a usable room. It contains a toilet, sink, mirror approximation, support rail, alarm cord, dispensers, ventilation and an occupied indicator. Both player and NPC use participate in the same availability state.

The driving cabs are visible but remain staff-only. A driver occupies the active end, and the controls change with the current direction of travel.

## Passenger behavior

CNA avatars supply identities and skeletal rendering, while the simulator owns train-specific behavior.

Passengers sit in assigned places, stand, walk through the aisle, read, check handheld devices, look outside and hold short conversations. Seated poses are blended onto the avatar skeleton, and walking adds a lightweight gait with ankle and toe motion.

Station activity is connected to the service. Waiting passengers board through the correct platform-side doors, find a place and later alight. The conductor moves through passenger areas and performs visible inspection stops using a handheld terminal.

These are bounded behaviors rather than a claim of human-level crowd simulation. Their purpose is to make the train inhabited while exercising animation, navigation, ownership of seats and moving-reference-frame logic.

## First-person movement on a moving vehicle

The player walks in train-relative coordinates. Acceleration, braking, suspension sway, curve lean and vibration affect the view without allowing numerical drift to pull the player through a carriage.

Collision covers seats, walls, doors, tables, vestibules and platform transitions. At a stop, retractable bridge plates span the designed horizontal gap to the platform. Context prompts allow the player to sit, inspect information or use facilities.

The camera can transition smoothly into a seat. From there, the passing world is framed by the actual window bay instead of a separate cinematic scene.

Mouse capture is reconciled with CNA's relative mode, application focus and overlays every frame. Opening the map, help or pause menu releases the cursor deliberately; a click reacquires it when play resumes.

## A railway that keeps moving

The route has twelve stations and a 135-minute timetable. Trains accelerate, cruise, brake, stop on the correct platform side and reverse at terminals so the service can continue indefinitely.

The streamed landscape includes towns, industry, farmland, woodland, tunnels, rivers, bridges, roads, level crossings, catenary, signals and other trains. Day, night and weather conditions change the view without changing the route itself.

![The view across Lakehurst from a passenger seat](https://raw.githubusercontent.com/libcna/train-simulator/develop/docs/screenshots/lakehurst-window.png)

![A passenger-information display inside the train](https://raw.githubusercontent.com/libcna/train-simulator/develop/docs/screenshots/passenger-information.png)

## Timetable and train movement

The twelve-station service has an authored 135-minute timetable in both directions. Speed limits vary by segment, and the simulation predicts arrival time and whether the train is early or late.

Acceleration and braking are smooth rather than instant, while station state chooses the correct doors and platform side. At a terminal, the service reverses and can continue indefinitely.

Passenger displays update with destination, next stop, speed, estimated arrival and following calls. A larger interactive route view shows all twelve stations and the train's current position without pausing the journey.

The world can be accelerated for testing, but the player can also ride at normal time and treat the project as a passenger journey rather than a control-cab simulator.

![The route map showing the service and its stations](https://raw.githubusercontent.com/libcna/train-simulator/develop/docs/screenshots/route-map.png)

## Streaming 286 kilometres

The route is deterministic but not kept in memory as one continuous high-detail scene.

A bounded streamer maintains geometry around the moving train in 250-metre chunks. Terrain, buildings, vegetation, track equipment and traffic are generated from route position and seed. Distant layers use simpler forms, while closer areas add fences, signs, vegetation and building details.

Railway infrastructure includes double track, catenary, block signals, speed boards, kilometre posts, level crossings, point equipment, cabinets and stations. Special landmarks such as Lakehurst, tunnels, a river crossing and a dry-valley viaduct prevent the long route from becoming one repeated corridor.

Road traffic and several opposing train types add motion outside. These remain lightweight systems intended for the passenger view, not independent road or railway dispatch simulations.

## Day, weather and sound

Time of day changes sunlight, sky and artificial lighting. Weather can introduce cloud, rain, fog and snow, altering both the distant landscape and what the passenger sees close to the window.

The audio scene combines rail movement, traction, doors, announcements, interior ambience and location-sensitive events. Surface-aware footsteps distinguish passenger areas and vestibules.

Like the visuals, audio is evaluated at several levels: code and signal tests can prove that a source was produced, while subjective balance still requires listening.

## Built as a tested CNA application

Train Simulator is described by its repository as an early but playable showcase foundation, not a finished commercial game. Its interaction, simulation, streaming, rendering, UI and audio systems work together, while visual realism remains an active area of development.

The committed screenshot views are produced from scripted launches. The capture process waits for avatar loading, checks the output and retries incomplete readbacks, making the gallery part of the project's validation evidence.

The visual audit records more than a hundred identified scene issues and their before-and-after evidence. It covers repeated geometry, lineside vegetation, station composition, building variety, interiors and train details.

Closing a numbered audit list does not declare the graphics finished. The repository still describes repetitive geometry and stylized avatars as visible limitations, and it keeps visual realism separate from whether automated tests pass.

Simulation and application tests cover route state, doors, timetable behavior, streaming boundaries, interaction and generated content. Install verification builds a relocatable Linux tree with the required CNA and SDL libraries, launches it from outside the repository and checks that origin-relative loading works.

Fixed inspection modes and command-line starts can choose a station, route kilometre, travel direction, carriage, quality tier and overlay. This allows one reported scene to be recreated without waiting through the complete timetable.

## Controls and passenger tools

The main interaction model is first-person exploration rather than train driving.

`W A S D` and mouse look move through the consist. Context interaction opens doors, uses a seat or inspects a display. Help, route map, pause and accessibility settings are available as overlays, and quality options can be selected without rewriting the saved preferences used for ordinary play.

Command-line options also support unobstructed screenshots, a passenger-view preset, fixed frame counts and scheduled exits. These are development tools, but they reuse the real application rather than a separate scene renderer.

![The train stopped at Stonebridge platform](https://raw.githubusercontent.com/libcna/train-simulator/develop/docs/screenshots/stonebridge-platform.png)

## Native and browser editions

The native target uses CNA's OpenGL 3.3 renderer. The Emscripten edition uses WebGL 2 and packages the same runtime assets into HTML, JavaScript, WebAssembly and data files.

That browser build exists today, but its public home on `play.libcna.com` is still being prepared.

The web package is single-threaded and does not require cross-origin isolation. Its canvas scales with the page while preserving the game's 16:9 backing view. Pointer-lock movement applies a browser correction, and the in-game sensitivity control remains available.

The browser version still needs an HTTP server because browsers cannot load its WebAssembly and preloaded data correctly from a local `file://` URL. The repository produces the HTML, JavaScript, WebAssembly and data files together as one deployable set.

Mobile platforms, platform-specific macOS work, Vulkan and DirectX are outside the present project scope. The article's portability claim is therefore limited to the verified OpenGL 3.3 desktop and WebGL 2 paths.

## What Train Simulator contributes to CNA

The project combines a long streamed route with a moving interior reference frame, animated CNA avatars, user interaction, schedule simulation, audio and browser packaging.

It is a different workload from a driving game or static building. Most of the world is observed through windows, while small errors in door state, seat alignment, avatar pose or train-relative movement remain close to the player for a long time.

That makes Train Simulator useful both as a playable passenger experience and as a demanding CNA integration project whose limitations remain visible in its own documentation.

Train Simulator is licensed under the MIT License, with asset and audio credits documented in the repository.
