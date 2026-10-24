---
title: School Simulator
date: 2027-01-14T12:00:00Z
updated: 2026-10-17T14:35:22Z
description: |
  School Simulator is a large first-person CNA school with 748 rooms, a full timetable and up to thousands of simulated occupants.
author: Robert Vokac
categories:
  - Projects
tags:
  - CNA
  - School Simulator
  - C++23
  - 3D
  - Simulation
  - NPCs
  - WebGL2
draft: false
---

**School Simulator** is a walkable six-level school whose day continues around the player.

It combines a large 3D building with timetables, lessons, breaks, lunch waves, clubs, staff duties and fire drills. Depending on the selected population preset, the simulation can manage anything from an empty campus to a few thousand people.

**Source:** [https://github.com/libcnalab/school-simulator](https://github.com/libcnalab/school-simulator)

**Web status:** The repository contains a working browser build, but School Simulator is not yet deployed on `play.libcna.com`. A playable web version is being prepared.

![The main entrance before lessons](https://raw.githubusercontent.com/libcnalab/school-simulator/main/docs/images/entrance.jpg)

## A complete campus

The building has four main wings around a courtyard, together with sports and community blocks, a basement and outdoor grounds.

Across the campus are **748 rooms**, **855 doors**, ten staircases and two elevators. Classrooms, laboratories, offices, workshops, music rooms, a library, gym, auditorium, cafeteria and service spaces have their own furniture and places for simulated occupants.

Outside are plazas, a playground, running track, football field, car park, bicycle area and fire-drill assembly points.

![The campus map and its connected wings](https://raw.githubusercontent.com/libcnalab/school-simulator/main/docs/images/campus-map.jpg)

## A school day in motion

Students follow a weekly timetable. Teachers, administrators, cooks, librarians, security staff, janitors and other roles have their own destinations and schedules.

The simulation uses several levels of detail:

```text
abstract simulation for distant people
reduced simulation around the active area
full walking and local avoidance near the player
```

Routes pass through rooms, corridors, doors, stairs and working elevators. Door throughput, elevator capacity and lunch queues matter when a large population moves at once.

![The cafeteria during the first lunch wave](https://raw.githubusercontent.com/libcnalab/school-simulator/main/docs/images/cafeteria.jpg)

## More than students and classrooms

The population contains several kinds of people with different responsibilities. Students move between lessons, lunch and clubs. Teachers follow their classes, while reception, administration, nursing, counselling, IT, security, catering, library and maintenance roles have their own work areas.

The building responds to the simulated schedule. Bells announce transitions, whiteboards show the lesson in progress, room lights follow occupation and daylight, and digital signs display current information. Corridor ambience grows around crowds instead of playing as one constant sound everywhere.

The time scale is adjustable. A player can observe an ordinary day, accelerate it, jump to the next lesson or trigger a fire drill. During a drill, occupants leave their normal activities, route toward the outside and gather at assigned assembly points.

This makes the school useful as a systems experiment. A visually simple crowd can still expose congestion at a door, an invalid staircase connection, an elevator capacity problem or disagreement between the abstract and full simulations.

![A fire drill sending the school population to outdoor assembly points](https://raw.githubusercontent.com/libcnalab/school-simulator/main/docs/images/fire-drill.jpg)

## Navigation at several scales

The navigation system is hierarchical.

At the largest scale, a room graph connects destinations through doors, corridors, stairs and elevators. Inside a loaded room, waypoints describe aisles, desks, queue lanes and usable positions. Local separation keeps nearby walkers from occupying exactly the same path.

Agents use three fidelity levels:

| Fidelity | Purpose |
| --- | --- |
| Abstract | Advance a distant person's schedule without simulating every footstep |
| Reduced | Preserve movement around the active part of the campus at lower cost |
| Full | Walk through local waypoints, doors and obstacles near the player |

The transition between those representations must preserve identity, destination and schedule. Tests compare full and abstract outcomes so an optimization cannot quietly send people to different lessons.

Door gates limit throughput. Elevators model calls, cab movement, capacity, boarding and the preferences of occupants who choose the lift. Stuck detection gives the test suite evidence when a route or crowded transition stops making progress.

## Rooms as active spaces

The forty room types are not only labels on a floor plan. Their layouts define furniture, occupation points and specialized activity.

![A furnished classroom ready for a scheduled lesson](https://raw.githubusercontent.com/libcnalab/school-simulator/main/docs/images/classroom.jpg)

A classroom provides desks and a board. Laboratories add benches and animated demonstrations. The computer room has live displays, the physics lab has its own apparatus, the gym includes hoops and scoreboards, and the auditorium supplies a stage and seating. The cafeteria includes serving and queue lanes that become important during lunch.

Security cameras render selected views into textures for the CCTV wall. Diagnostic screens appear in the server room. These features exercise CNA render targets and UI rendering inside the larger scene rather than as isolated test programs.

![Live security-camera views on the school's CCTV wall](https://raw.githubusercontent.com/libcnalab/school-simulator/main/docs/images/cctv.jpg)

## Streaming a 748-room building

Keeping every interior resident on the GPU would be wasteful. The application therefore builds and retains room meshes around the player, with smaller bubbles around secondary cameras.

The facade, roof and grounds are built once so the school remains complete when viewed from outside. Interior rooms are streamed by level and distance, with a limited number built per frame. Doors and elevator cabs remain separate because they move.

People are culled by distance, view and room availability, then batched into a dynamic buffer. Their visual detail drops from ten boxes to three or two as distance grows. CCTV, signage and other screens update at reduced rates, while audio keeps only the nearest occupied room ambiences.

The frame is organized deliberately:

```text
input and elevators
        │
        ▼
player movement and collision
        │
        ▼
schedule and population simulation
        │
        ▼
room streaming, doors and interaction
        │
        ▼
offscreen screens, world, people, weather and UI
```

These budgets let the large plan remain explorable without pretending that all 748 rooms need full rendering every frame.

## An explorable CNA stress test

School Simulator renders room interiors lazily around the player. It also handles animated doors, elevator cabs, weather, day and night lighting, CCTV render targets, digital signs, lesson boards and room-aware sound.

The project separates the framework-independent simulation from the CNA application. Headless tools can run complete days and verify scheduling, navigation and determinism without creating a window, while the first-person application renders the same school through CNA.

Its automated checks cover plan structure, navigation, room geometry, timetables, elevators, fire drills and long simulation runs. Screenshot tours provide another layer of visual evidence.

The headless `school-sim-cli` can validate the blueprint, print statistics, run a complete day or perform a multi-day extreme-population soak. Because it does not include CNA, failures in scheduling or navigation can be separated from rendering and platform failures.

The graphical application then adds millions of geometry and collision checks across the rooms. Scripted screenshot tours move to named places, set weather and time, wait for the simulation and record the resulting frame.

This separation is valuable for CNA as well. A renderer bug should not be diagnosed as a timetable bug, and a simulation invariant should not require a working display server to test.

## Controls and observation tools

Ordinary play uses `W A S D`, mouse look and `Shift` to run. `E` interacts with doors, people, elevators and light switches. `Tab` opens the full campus map and `M` toggles the minimap.

Several keys turn the application into an observation tool:

- `1` through `5` choose the clock speed;
- `Space` pauses the school clock;
- `N` moves to the next lesson;
- `B` rings the bell;
- `F` begins a fire drill;
- `O` changes the weather;
- `F3` shows performance and population statistics;
- `F4` visualizes paths, fidelity regions, bounds and collision.

Free flight is available for inspection, but ordinary first-person movement uses the same stairs, elevators and collision as the spaces being tested.

## Native and browser builds

The main development target is Linux, but the same application also builds for WebGL 2 through Emscripten. The repository reports a browser download of roughly 6 MB and a tested busy-cafeteria scene.

The public deployment on `play.libcna.com` is still being prepared. Until then, the repository contains the build instructions, source and its complete screenshot gallery.

The browser edition is the same application, simulation and content running through CNA's WebGL 2 renderer and SDL3's browser platform path. Application-specific web code is limited mainly to locating the preloaded content.

The packaged build is single-threaded and does not need cross-origin isolation. URL arguments can choose a population preset, time or scripted scene, which makes the browser version useful for repeatable tests as well as interactive play.

Headless Chrome validation has loaded the school, captured pointer lock, walked with real key events, opened the statistics display and rendered a busy cafeteria. The documented run showed 525 people in that room, 413 drawn and 89 draw calls at the observed frame.

The browser work also exposed practical integration problems: fixed-step frame pacing, accelerated pointer-lock input, first-use shader stalls and expensive on-demand door-plate rendering. CNA and the application were adjusted so variable-step games receive one update per browser frame, relative input retains fractional motion, textures and shader variants warm up, and door plates are packed into atlases.

That evidence is narrower than universal browser support. Physical-GPU browsers, Safari, touch controls and audible output still need separate qualification.

## What the project demonstrates

School Simulator asks whether CNA can host a large application in which rendering is only one part of the workload.

At the same time, it runs a schedule, streams geometry, manages thousands of identities, plays spatial audio, updates offscreen displays, processes first-person input and keeps navigation deterministic. It is therefore both a virtual school and a practical integration test for long-running CNA applications.

School Simulator is licensed under the MIT License.
