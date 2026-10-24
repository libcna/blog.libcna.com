---
title: Car Simulator
date: 2027-02-04T12:00:00Z
updated: 2026-10-17T14:35:22Z
description: |
  Car Simulator is a CNA-based passenger-car driving experience set across a fictional Czech town, villages, countryside and forest.
author: Robert Vokac
categories:
  - Projects
  - Games
tags:
  - CNA
  - Car Simulator
  - C++23
  - 3D
  - Driving
  - Simulation
  - WebGL2
  - Online Demo
draft: false
---

**Car Simulator** is a passenger-car driving experience set in a fictional Czech landscape and built on CNA's XNA 4.0-compatible API.

It has no missions, deliveries or economy. The purpose is driving itself: start the fictional Lipan 1.2, leave the town square and explore roads through villages, fields, hills and forest under changing traffic, weather and time of day.

**Source:** [https://github.com/libcnalab/car-simulator](https://github.com/libcnalab/car-simulator)

**Play online:** [https://play.libcna.com/car-simulator/car-simulator.html](https://play.libcna.com/car-simulator/car-simulator.html)

![The Lipan 1.2 in the Czech-inspired landscape](https://raw.githubusercontent.com/libcnalab/car-simulator/main/docs/screenshots/hero.jpg)

## Lipová and the roads around it

The 6.4 by 7.6 kilometre map centers on **Lipová**, a small town with a square, church, residential streets, shops, bus stops, filling station and a signal-controlled junction.

Roads continue through Březí, Podhájí, Nové Město and Kamenice, into farmland and forest, and up a long gravel approach to Hrad Lipník. The complete network contains about 27 kilometres of roads and uses Czech signs and markings.

Ambient traffic follows lanes, obeys junction rules and signals, reacts to the player and includes cars, buses and lorries. Pedestrians use pavements and crossings, while parked vehicles and street objects remain physical obstacles.

![Driving through the main square in Lipová](https://raw.githubusercontent.com/libcnalab/car-simulator/main/docs/screenshots/square.jpg)

## A data-driven map

The region is not hard-coded as one enormous renderer source file. Its data is split by responsibility:

```text
map identity and global settings
terrain and land-use regions
roads, lanes and junctions
buildings, vegetation and street objects
traffic routes, signals and spawn rules
```

Generation tools turn the authoritative source data into the runtime map and perform structural checks. Road edges, markings, terrain cuts, settlement placement and traffic lanes therefore agree instead of being maintained as unrelated copies.

The map also provides named spawn points and routes. A developer can begin on the square, in the forest, near a village or at the castle approach, then repeat the same drive after a rendering or physics change.

Traffic is based on the lane graph. Vehicles keep distance, observe priorities, yield and stop rules, react to traffic lights and wait for oncoming traffic when a bus or lorry needs more space. Some cars overtake a stopped bus or slow vehicle only when the opposing lane is clear.

The intent is not to reproduce every edge case of Czech road law. It is to provide enough coherent traffic behavior that the player drives through a living road network rather than around decorative moving cars.

![Road traffic sharing the simulator's lane network](https://raw.githubusercontent.com/libcnalab/car-simulator/main/docs/screenshots/traffic.jpg)

## A simulated car rather than a moving camera

The Lipan 1.2 has a project-owned rigid-body, suspension, tyre, engine, clutch, gearbox, fuel, thermal and electrical simulation.

Players can use a manual or automatic gearbox, drive from the cockpit or an exterior camera, inspect live instruments and mirrors, and experience different grip on wet or snowy roads.

Weather includes clear sky, cloud, overcast, rain, fog and snow. The world adds street lighting, building windows and headlamps after dark, together with windscreen rain and working wipers.

![A rainy night drive](https://raw.githubusercontent.com/libcnalab/car-simulator/main/docs/screenshots/rainynight.jpg)

## Vehicle physics

The car simulation uses metres, kilograms, seconds and radians consistently. A rigid body tracks position, orientation and momentum while forces from gravity, suspension, tyres and driveline update it.

Each wheel has suspension travel and a contact state. The tyre model responds to longitudinal and lateral slip instead of moving the body directly from key input. Wheel rotation, braking and the driveline are integrated with stability limits suited to the simulator's time step.

The powertrain includes:

- starter and engine state;
- throttle and RPM response;
- clutch engagement;
- manual and automatic gearboxes;
- differential behavior;
- fuel use and temperature;
- electrical and lamp state;
- odometer and trip distance.

This is a project-owned driving model, not a claim of manufacturer-grade engineering simulation. It is detailed enough for starting, stalling, shifting, traction changes and collisions to matter during ordinary play.

Wet roads reduce grip, snow reduces it further, and hard impacts can deform the body and break lights. Resetting places the vehicle back on the road in a repaired state so a mistake does not end the session.

## Cockpit, mirrors and cameras

The cockpit has a live speedometer and engine instruments, rotating steering wheel, rear-view mirror and wing mirrors. The exterior camera follows the body rather than replacing its motion with a fixed animation.

Mirrors are additional render views, so their update frequency is configurable. This provides a direct performance lever without removing them from the scene. An on-foot first-person camera lets the player leave a stopped car and inspect the same world at pedestrian height.

The simulator can also enter fixed inspection views for screenshots. Those paths make it possible to review a mirror, wheel, light beam or cockpit detail without reproducing an exact manual camera move.

![The working cockpit, instruments and mirror](https://raw.githubusercontent.com/libcnalab/car-simulator/main/docs/screenshots/cockpit.jpg)

## Sound driven by simulation

Engine audio blends licensed CC0 recordings with RPM-driven synthesis. Starter, idle and load states transition according to the real simulated engine rather than a separate visual timer.

Tyre noise responds to road surface and slip. Wind grows with speed, impacts and controls have their own sounds, nearby traffic contributes spatial engines, and the interior/exterior camera changes the mix. The helicopter mode uses a separate rotor and turbine layer.

Audio tests verify routing, buffers, transitions and signal levels, while listening packs are retained for subjective review. A passing waveform check is not described as proof that a mix sounds good on every speaker.

## Controls

The default keyboard layout exposes the simulated systems instead of reducing driving to four keys.

| Input | Action |
| --- | --- |
| `W` / `S` | Accelerate and brake |
| `A` / `D` | Steer |
| `E` | Start or stop the engine |
| `T` | Switch manual and automatic transmission |
| `Left Shift` / `Left Ctrl` | Shift up or down |
| `Space` | Handbrake |
| `C` | Switch cockpit and exterior camera |
| `L` / `K` | Lights and high beam |
| `I` | Cycle wiper modes |
| `F4` | Change weather |
| `M` | Show the map |
| `G` | Leave or re-enter a stopped car |

Gamepads and steering wheels are supported as input devices, with bindings and sensitivity stored in the profile. The in-game `F1` overlay shows the active mapping rather than assuming the defaults were never changed.

## More than the ordinary drive

The normal passenger car remains the baseline, but the project also includes intentionally exaggerated turbo modes, an on-foot exploration mode and a helicopter mode.

The simulator can drive named routes automatically for repeatable performance measurements. Headless scripts capture the screenshot gallery and benchmark clear, rainy, daytime and nighttime scenes from cockpit and exterior cameras.

The helicopter is intentionally an extra mode rather than the core identity of the project. It provides another way to inspect the complete terrain and settlements, with climb, turning and a controllable searchlight.

Walking mode uses first-person collision and footsteps. Traffic recognizes a person in its path, so leaving the vehicle does not turn the pedestrian into an invisible camera.

The exaggerated turbo settings are similarly explicit options. They do not replace the ordinary Lipan 1.2 baseline used for validation and normal driving.

![Wet-road rendering in changing weather](https://raw.githubusercontent.com/libcnalab/car-simulator/main/docs/screenshots/wetroad.jpg)

## CNA without renderer-specific game code

The runtime application is written against CNA and Sharp Runtime rather than calling OpenGL or SDL graphics directly.

The boundary is enforced so map, vehicle, UI and rendering code cannot quietly depend on one backend. Buffers, effects, textures, render targets, input, audio and storage go through the framework's public API.

This turns Car Simulator into a substantial compatibility consumer. Traffic, weather, mirrors, transparent effects, a large streamed map, continuous audio and persistent settings all run together for much longer than a focused graphics sample.

The renderer can still expose different performance and capability characteristics. The project records conformance results per backend instead of assuming source compatibility alone guarantees identical pixels.

![Traffic signals at a road junction](https://raw.githubusercontent.com/libcnalab/car-simulator/main/docs/screenshots/signals.jpg)

## Testing and performance evidence

The test suite covers vehicle physics, map validity, traffic rules, weather, save data, audio and rendering helpers. Deterministic simulation traces make acceleration, braking, shifting and route behavior comparable after a change.

Named autopilot routes drive through the ordinary physics and lane network; the car is not teleported between benchmark points. The benchmark suite runs clear day, rain, clear night and rainy night from both exterior and cockpit views.

The diagnostic overlay reports frame time, worst-one-percent behavior, update and draw stages, mirror cost, weather, culling counts and live audio inputs. Recorded hardware figures identify the GPU and configuration used rather than presenting one machine as a universal requirement.

Headless gallery captures use Xvfb and Mesa's software OpenGL ES path. They prove the scene renders reproducibly without hiding behind a hand-selected frame, but they are not hardware-GPU performance measurements.

Sanitizer presets and install checks cover memory and packaging separately. This layered approach distinguishes physics correctness, clean execution, visual output and real-hardware performance.

## Browser build and videos

Car Simulator has a playable WebGL 2 edition on `play.libcna.com`. It is one of the projects in this series that is already publicly deployed rather than merely planned.

Two videos are available on the official CNA YouTube channel:

- [CNA Car Simulator](https://www.youtube.com/watch?v=asNrr1IR1MQ)
- [CNA Car Simulator #2 — Helicopter was added](https://www.youtube.com/watch?v=bvENJr9gwgw)

The web edition runs the same driving systems through CNA's browser platform and WebGL 2 renderer. Browser input and audio activation still follow web security rules, so the first interaction is important for capturing the pointer and starting sound.

Car Simulator is one of the projects in this article series that already has both source and a public playable deployment. The screenshots and videos remain useful even so: they show more locations, weather conditions and controls than a visitor is likely to discover in a short first browser session.

The source is licensed under the MIT License. Audio and other third-party assets retain the licenses documented in the repository.
