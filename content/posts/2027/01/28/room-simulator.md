---
title: Room Simulator
date: 2027-01-28T12:00:00Z
updated: 2026-10-17T14:35:22Z
description: |
  Room Simulator is a CNA reference scene that combines a furnished living room, an exterior street, changing daylight, weather and reflections.
author: Robert Vokac
categories:
  - Projects
tags:
  - CNA
  - Room Simulator
  - C++23
  - 3D
  - WebGL2
  - Lighting
  - Reflections
  - Weather
  - Online Demo
draft: false
---

**Room Simulator** is an explorable 3D reference scene built with CNA.

It concentrates on one furnished living room and the street outside its windows, then observes that scene under changing light and weather. This smaller scale makes it possible to spend more attention on materials, reflections, shadows and the relationship between an interior and its exterior.

**Source:** [https://github.com/libcnalab/room-simulator](https://github.com/libcnalab/room-simulator)

**Play online:** [https://demos.libcna.com/room-simulator/room-simulator.html](https://demos.libcna.com/room-simulator/room-simulator.html)

![Room Simulator during the day](https://raw.githubusercontent.com/libcnalab/room-simulator/develop/docs/screenshots/m9-entrance-day.png)

## One scene, many conditions

The room contains sofas, tables, shelving, lights, plants, kitchen fittings, a television and smaller decorative objects. Windows and doors connect the interior visually to a generated street.

The environment changes with:

- time of day;
- sunlight direction and intensity;
- interior illumination;
- cloud and weather state;
- wet exterior surfaces;
- reflections and post-processing.

Because the arrangement remains familiar, lighting and renderer changes are easier to notice than they would be in a constantly changing world.

![Sunlight entering the room through its street-facing windows](https://raw.githubusercontent.com/libcnalab/room-simulator/develop/docs/screenshots/m9-sun-window.png)

![Wet street reflections at night](https://raw.githubusercontent.com/libcnalab/room-simulator/develop/docs/screenshots/m9-wet-street-night.png)

## The room and the street belong together

The scene is designed to be observed from both sides of its windows.

Inside, furniture, lamps, kitchen surfaces, shelving, glass and smaller props create a dense material test. Outside, the street provides buildings, vegetation, road surfaces and sky illumination. Sunlight can enter through the windows, while interior light, glass and reflections affect what is visible after dark.

That relationship creates harder cases than a closed room:

- exposure must cope with a bright window and darker interior at the same time;
- transparent panes must preserve the street while receiving reflection cues;
- the mirror and planar reflections need a coherent secondary view;
- rain changes exterior materials without wetting the room;
- the sun and artificial lamps must remain plausible at different hours.

The result is deliberately a reference scene rather than a large game world. A rendering change can be compared against a known sofa, window, lamp or street corner instead of being hidden by procedural variation.

## Rendering pipeline

The executable is a CNA `Game` subclass. `RoomApplication` owns the camera, clock, weather, asset libraries, scene and renderer. `RoomScene` creates procedural architecture, places imported furniture and registers renderable items.

`SceneRenderer` then organizes the frame into several stages:

```text
shadow preparation
environment and reflection probes
planar reflections
opaque geometry
transparent geometry
HDR post-processing
exposure and presentation
```

The application uses PBR materials, imported glTF models and generated textures. A material library keeps those resources consistent across the room and exterior. Imported furniture remains owned by the model library, while procedural meshes belong to the scene; that explicit lifetime boundary matters when render targets or device resources are recreated.

Some effects were adapted from CNA's retired engine and retain their Ms-PL notices. They are application code now, not a hidden second engine on which the room depends.

![Night reflections across the street outside the room](https://raw.githubusercontent.com/libcnalab/room-simulator/develop/docs/screenshots/m9-reflections-street-night.png)

## Image-based exposure

Moving from a bright street to a darker interior is also an exposure problem.

Room Simulator measures the rendered HDR image rather than estimating brightness only from the clock. After the scene target is complete, a shader samples it into a 64 by 36 luminance target. Each cell stores a packed logarithmic Rec.709 luminance value that can be read through CNA's ordinary texture-data API.

The CPU then calculates a center-weighted geometric mean while rejecting extreme highlights. Auto exposure adapts toward that measurement over time.

This path is useful because it exercises render targets, custom shader packages, data readback and HDR processing together. If a renderer cannot execute the required shader source, the simulator reports that limitation instead of pretending image-based exposure ran.

![The room entrance after the scene changes to night](https://raw.githubusercontent.com/libcnalab/room-simulator/develop/docs/screenshots/m9-entrance-night.png)

## Time and weather

The simulation owns a solar clock and weather transitions independently of the renderer.

A deterministic launch can specify the viewpoint, time and weather:

```text
room-simulator --view entrance --time 12:00 --weather cloudy
room-simulator --view entrance --time 22:00 --weather rain --hold-weather
```

Holding the weather prevents a review capture from transitioning to another state before the target frame. Fixed views cover the entrance, furniture groupings, sunlit window, stove, street, wet road and nighttime reflections.

This makes the same scene useful for checking daylight balance, lamp intensity, wet materials and exposure adaptation without manual setup.

## A practical CNA reference application

Room Simulator uses CNA for the application loop, input, content, geometry, effects and presentation. Its own code organizes the room, exterior, simulation and rendering passes.

The renderer includes planar and environment-probe work, material preparation, shadows and post-processing. Imported furniture can be added through the repository's asset scripts, while procedural geometry keeps the application usable without the optional external models.

Deterministic command-line views can render the same camera, time and weather repeatedly. The project uses those views for screenshot review and render smoke tests.

![The kitchen stove and nearby furnishings under night lighting](https://raw.githubusercontent.com/libcnalab/room-simulator/develop/docs/screenshots/m9-stove-night.png)

## Assets and procedural fallback

The full presentation uses externally sourced furniture with documented Creative Commons licenses. Fetch and extraction scripts verify the downloaded archives against a manifest before preparing the models.

Those assets are not required for the executable to start. Without them, the simulator falls back to its procedural room geometry. This is useful for development and build verification, although the resulting image is not equivalent to the curated gallery.

Optional compilation can convert prepared content into CNA's `.cnb` format for faster loading. The loose-source path remains available, so the same application also exercises the runtime import route.

## Visual testing

The checked-in screenshots are a curated human-reviewed gallery rather than exact cross-machine golden images.

A quick review captures four representative cases covering:

1. ordinary daylight;
2. night lighting;
3. direct sunlight through the room;
4. rainy exterior reflections.

The full set contains 28 views. A contact sheet makes missing objects, severe clipping, black regions, broken glass, incorrect shadows and reflection mistakes easier to spot together.

The automated render smoke uses a smaller 320 by 180 frame and verifies that the application produced a real, non-black PNG. That proves the rendering path ran, but it does not replace inspection of the full-resolution scene.

Unit tests separately cover solar and weather simulation, texture baking, reflection math and cube calculations. Graphics changes still need a real render because ownership and draw-order failures cannot be established by CPU tests alone.

## Desktop and web

The maintained native baseline uses CNA's OPENGLES3 renderer. A WebGL 2 build brings the same scene to modern browsers, and a packaged version is already available on `demos.libcna.com`.

The repository also records an important qualification: the browser path should be rebuilt and checked whenever its pinned dependency baseline changes. A deployed build proves a usable web edition exists, not that every newer native revision has automatically received the same validation.

The native baseline is Linux with CNA's OPENGLES3 renderer. Exact dependency revisions are kept in `dependencies.lock`, allowing a visual result to be associated with a specific CNA, Sharp Runtime, EasyGL and Meta-GL combination.

The WebGL 2 build packages HTML, JavaScript, WebAssembly and a data bundle. For static hosting, the project can split the large data file into 64 MiB parts and include the code and asset license records beside it.

## Known boundaries

The project documents unresolved work rather than hiding it behind the gallery.

The maintained renderer baseline remains OPENGLES3; OPENGL33, WebGL2 and other CNA renderer families require their own fresh checks after dependency changes. The small automated render only proves that a non-black frame exists, and CI currently emphasizes the CPU suite.

A finite-HDR cleanup pass also remains enabled because the locked baseline can produce non-finite intermediate pixels before bloom. Contact shadows are disabled because their current pass creates visible rims, and motion blur is wired but has not received a full visual evaluation.

These qualifications make Room Simulator more useful as a reference: it records both what the scene demonstrates and which conclusions its current evidence does not support.

Room Simulator is source-available under the MIT License, with separate attribution for its imported Creative Commons models.
