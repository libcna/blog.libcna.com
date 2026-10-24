---
title: Island Simulator
date: 2027-02-18T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: |
  Island Simulator is a first-person tropical island exploration, swimming and driving experience built with CNA.
author: Robert Vokac
categories:
  - Projects
  - Games
tags:
  - CNA
  - Island Simulator
  - C++23
  - 3D
  - Procedural Generation
  - Exploration
  - WebGL2
  - Android
draft: false
---

**Island Simulator** is a first-person tropical island walking, swimming and driving experience built with C++23 and CNA.

The current playable slice centers on a deterministic island roughly 500 metres across. It is an exploration environment rather than a survival game: there are no combat systems, quests or resource meters.

**Source:** [https://github.com/libcnalab/island-simulator](https://github.com/libcnalab/island-simulator)

**Web status:** Island Simulator has a tested WebGL 2 path, but it is not yet deployed on `demos.libcna.com`. A playable web version is being prepared.

![The complete procedural tropical island](https://raw.githubusercontent.com/libcnalab/island-simulator/develop/assets/presentation/island-overview.png)

## A dense procedural landscape

The island combines beaches, jungle, clearings, hills, a stream, shallow water and an animated ocean. Procedural materials distinguish dry sand, wet shoreline, soil, rock and vegetation while keeping the scene portable across CNA targets.

Thousands of placed plants and environmental details build the landscape from shared meshes and bounded rendering systems. Coconut palms, broadleaf trees, ferns, bushes, grass, rocks, fallen logs, driftwood, shells and reef outcrops all use distance reduction and culling.

The shoreline includes shallow-water color, underwater sand, waves, foam and player ripples. A changing sky, distant islets, occasional offshore traffic and wildlife extend the view beyond the walkable land.

## Terrain and biomes

The land surface is deterministic, so authored paths, clearings and landmarks remain in reproducible locations. Procedural material inputs vary dry beach, wet edge, soil, slope and jungle-floor color without requiring a unique texture for every metre.

Close terrain adds filtered detail such as sand granulation, pebbles, shells, leaf litter, soil relief and pores. Those fine layers fade with distance and pixel footprint so they do not turn into noise or shimmer across the whole island.

Vegetation placement also follows shared environmental fields. Canopy light, moisture, drainage and reserved travel corridors influence which plants appear. This keeps the paths and clearings walkable instead of scattering foliage independently over important routes.

Several levels of detail preserve the silhouette while reducing distant geometry. Near grass uses curved blades and seed stems; distant grass retains a simpler shape. Palms, broadleaf trees, rocks and fallen wood switch between shared meshes at staggered distances so an entire grid cell does not change at once.

Frustum and distance culling operate on real instance positions. The simulator therefore avoids drawing every tree on the island merely because one part of its placement cell is near the camera.

![The island stream running through the jungle toward the beach](/wp-content/uploads/2027/02/island-simulator-stream.png)

## Ocean and shoreline

The water is more than a flat transparent plane.

A shared wave spectrum combines broad displacement with shorter crossing waves. Normals, ripple crests and grazing reflection bands vary with view direction, while filtering reduces repetition and aliasing at distance.

The sea floor remains visible in the lagoon and becomes more strongly tinted with depth. A shore-following foam ribbon advances and fades along the exact coastline instead of drawing one uniform white border.

Entering or leaving the water creates short player ripple rings. Near the surface, a depth-responsive veil changes with swimming depth, and the outer current gradually pushes the player back toward land instead of exposing an endless empty ocean.

Underwater and shoreline props include rocks, reef outcrops, wreck pieces, shells, driftwood and crabs. They share the same terrain or seabed support rules used for visible placement.

## Places to discover

The environment now includes a large set of authored landmarks inside the procedural setting:

- a raised timber hut;
- a campfire clearing;
- a carved stream flowing into a sheltered bay;
- an enterable headland cave;
- a rock-concealed research bunker;
- a grounded sailing-ship wreck;
- a stationary, enterable utility helicopter;
- a climbable lighthouse and its ruined keeper's cottage;
- a Second World War fighter wreck being reclaimed by the jungle;
- a jetty with a canoe and a stranded whale skeleton;
- a weathered stone god with offerings and a castaway's `HELP ME` sign and signal fire;
- a grounded 30-metre coastal coaster with an explorable deck, hold and mess;
- an old lantern-lit mine ending in a glowing crystal chamber;
- a small active volcano with fumaroles, lava spatter and a live flow;
- a ruined medieval castle;
- and a crashed flying saucer with its surviving alien visitor.

These locations do not introduce objectives. They give the island recognizable destinations and provide varied material, lighting, collision and interior-rendering workloads.

The cave replaces part of the headland terrain with a connected interior shell and collision volume. The hut stands on terrain-fitted posts with a veranda, steps, windows, shutters and palm-fibre roof. The campfire combines animated flame, embers, smoke, light and positional crackling.

![The raised timber hut in dense tropical vegetation](/wp-content/uploads/2027/02/island-simulator-hut.png)

The bunker descends beneath an inland ridge into a reinforced corridor, computer room, service workshop and fictional reactor-generator chamber. Its terrain suppression is local, so the island still covers the buried structure from above.

The shipwreck is a large broken sailing vessel rather than a small decorative boat. Hull sections, ribs, deck fragments, broken mast, rigging and a debris trail create a coastal landmark while conservative collision keeps the main structure solid and the smaller fragments traversal-friendly.

![The broken sailing ship at the island's coastline](/wp-content/uploads/2027/02/island-simulator-shipwreck.png)

The helicopter cannot fly. It is a grounded environmental object with open doors, walkable cabin, seats, cockpit controls and stationary rotor. Keeping it non-operational avoids turning a peaceful walking project into a second vehicle simulator.

![The stationary utility helicopter in its clearing](/wp-content/uploads/2027/02/island-simulator-helicopter.png)

The newer sites broaden the island's history without turning it into a quest game. The lighthouse can be entered and climbed by its spiral stair to the lantern and outside gallery; after dark its twin beams sweep the sea. The mine runs beneath the main mountain past rails, abandoned tools, crates, puddles and bats to a chamber of cyan and violet crystals. Elsewhere, an ash cone steams above a churning lava lake, while a roofless medieval keep, four damaged corner towers, a breached curtain wall, a well and scattered rubble form the castle ruin.

![New places: the climbable lighthouse, mine crystal chamber, stranded whale skeleton and stone god](/wp-content/uploads/2027/02/island-simulator-new-places-collage.png)

The strangest discovery is a flying saucer driven into a clearing. A scorched furrow, torn pieces of hull skin and cables mark its arrival. A grey alien walks around the wreck, examines loose plates, feels the hull, points toward the dome, watches the player and runs away if approached too closely. Like the castle, bunker, lighthouse, mine and wrecks, it contributes to subtle environmental storytelling rather than starting an objective.

![New mysteries and landmarks: the crashed saucer, its alien, a ruined castle and the volcano's lava crater](/wp-content/uploads/2027/02/island-simulator-new-mysteries-collage.png)

The two wrecked ships tell very different stories. The earlier wooden sailing ship is broken apart in shallow water. The newer steel coaster **MARIA K** has been driven onto the beach with its accommodation ladder lowered. The player can walk across its weathered deck, enter the dim hold and mess, and find five sailor skeletons still aboard. A capsized lifeboat, oars and a life ring lie nearby, gulls perch on the rails and surf breaks around the stern.

Not every moving machine belongs to the player. A coastal freighter occasionally passes far offshore and shows navigation lights at night. A brightly striped hot-air balloon follows a slow figure-eight route over the island and sea, firing its burner in bursts and casting a moving soft shadow. The grounded helicopter and fighter remain scenery, but the red utility quad beside the hut is fully drivable.

![Island transport and wrecks: hot-air balloon, drivable quad, fighter wreck, grounded coaster and one of its skeleton crew](/wp-content/uploads/2027/02/island-simulator-transport-collage.png)

## A much larger living island

Birds move above the island, while boars and other animals occupy bounded habitats. A resident follows a deterministic inland route and yields to the player. Wildlife is designed as part of the environment rather than as an enemy system.

The project combines procedural geometry, animated creatures, positional sound, first-person collision, swimming, touch controls and persistent preferences in one CNA application. Its land animals include monkeys, a bear, wild boars, goats and small rodents.

![Island Simulator wildlife: monkeys, a bear, a boar, a rat and goats](/wp-content/uploads/2027/02/island-simulator-wildlife-collage.png)

Most wildlife avoids or observes the player rather than attacking. The island nevertheless has more dramatic inhabitants now, so “peaceful” describes the lack of combat systems rather than every encounter.

Water habitats range from the mangrove estuary to the outer reef. Crocodiles occupy the shallows, while dolphins, a shark, octopuses and stingrays follow their own bounded marine routes.

![Aquatic wildlife: a crocodile, dolphin, shark, octopus and stingray](/wp-content/uploads/2027/02/island-simulator-aquatic-wildlife-collage.png)

Smaller wildlife brings movement to the jungle floor, clearings and sky. Spiders and flies remain close to the ground, butterflies and dragonflies use bounded habitats, and birds follow coastal, canopy and high-altitude route families.

![Small wildlife: a spider, fly, tropical bird, butterfly and dragonfly](/wp-content/uploads/2027/02/island-simulator-small-wildlife-collage.png)

The shoreline has several distinct scales of life. Sea turtles and reef fish move through the shallow water, while beach crabs, coconut crabs and hermit crabs occupy different parts of the sand and coastal vegetation.

![Shore wildlife: a sea turtle, reef fish and three kinds of crab](/wp-content/uploads/2027/02/island-simulator-shore-wildlife-collage.png)

Other inland habitats add deer, bats, snakes, frogs and geckos. These animals are not interchangeable decorations: their silhouettes, movement and preferred terrain make each group readable during exploration.

![Forest wildlife: a deer, bat, snake, frog and gecko](/wp-content/uploads/2027/02/island-simulator-forest-wildlife-collage.png)

The largest new animals are an Asian bull elephant and a full-size Tyrannosaurus rex. The elephant roams the coastal flats on terrain-fitted legs, leaving round prints while it grazes, dusts itself, drinks, watches the player, trumpets, moves away and dozes at night. During the day it also walks into the sea to bathe, showers its back with its trunk, lies in the water and emerges visibly wet.

The tyrannosaur patrols the beaches and leaves three-toed tracks. It can watch and follow the player, drink, roar, produce heavy footfalls and settle down at night; nearby animals scatter from it. Its current model is a continuously posed, smoothly lit body with scaled and folded hide, a detailed skull and mouth, massive thighs and padded toes. There is still no combat, damage or survival loop—the animal is a spectacular moving presence to observe and avoid.

Several smaller species fill previously quiet habitats. Mudskippers hop across wet mangrove mud, raise their dorsal fins and retreat toward the water. Village weavers build hanging nests in shore palms; yellow males display upside down and fetch grass while the nests sway with the fronds. Brown boobies nest on a guano-whitened rocky islet and plunge into the surrounding sea. After rain on dark evenings, thousands of red land crabs migrate from the forest to the water, while winged termites emerge at dusk and attract hunting bats and geckos. Offshore, flying fish break the surface and an occasional humpback breaches.

![New wildlife: an elephant bathing, a roaring tyrannosaur, a mudskipper and village weavers with their nests](/wp-content/uploads/2027/02/island-simulator-new-wildlife-collage.png)

Animals use bounded habitats and distance-aware animation rather than a global ecosystem simulation. Their feet or bodies sample the rendered terrain where appropriate, and contact shadows help ground nearby forms.

The single resident follows a deterministic 688-metre inland tour with pauses and yields to the player. Like the animals, the resident exists to make exploration less empty, not to provide quests, dialogue trees or combat.

![The island resident pausing beside the campfire](/wp-content/uploads/2027/02/island-simulator-resident.png)

## Walking, swimming, driving and collision

Desktop controls use `W A S D` or arrow keys, with the mouse controlling the view. `Shift` toggles the retained walk or run mode. Movement follows terrain height, prevents passage through solid landmarks and transitions into swimming near shore.

Jumping is intentionally absent. The game is not a platformer, and flight is confined to a debug inspection camera rather than ordinary play.

Pressing `F` mounts or dismounts the utility quad. `W` and `S` control throttle, brake and reverse, `A` and `D` steer, `Space` applies the handbrake and `Backspace` rights a rolled vehicle. The quad has a chase camera, a governed top speed of 80 km/h, engine and tyre audio, exhaust smoke, working headlights, suspension and surface-dependent grip. Its wheels leave temporary ruts on sand and soil and throw dust or water spray. Landmark collision keeps it out of structures while still allowing routes such as the old mine.

The `F1` panel exposes controls and live information. `F2` shows the developer world view, `F4` copies deterministic seed data where the platform clipboard permits it, `B` can disable camera motion for comfort and `N` opens the persistent discovery journal. The journal records places and creatures the player has approached and observed, but does not prescribe an order or turn them into objectives. User settings retain walk/run choice, camera motion, mute state and look sensitivity.

## Time, weather and a changing shore

The island now runs a complete day in 24 real minutes. Sunsets give way to a star field that turns around the celestial pole, the moon follows its monthly phase and practical lights become useful: the lighthouse sweeps the horizon, the quad's lamps illuminate the ground and the player can switch on a hand torch with `H`.

Weather moves between clear, partly cloudy, overcast, showers and thunderstorms. Rain darkens the ground, adds wet reflections and can leave puddles; when sunlight returns, exposed wet ground steams. Thunder, wind, rain on vegetation and changes in the soundscape accompany the visual transition. These systems are environmental rather than hazards.

A slow deterministic tide is shared by the rendered ocean, wet shoreline and habitat logic. It gradually exposes and covers mudflats and shallow edges around the mangroves, jetty and wrecks, and changes the behavior space used by crocodiles, mudskippers, crabs and turtles without trapping the walker or quad. Erosion rills, rock shelves, dune ridges and clearer transitions between beach, wetland and hillside also make the underlying terrain less uniform.

Audio uses a bounded number of active sources. Shore, stream, wildlife, footsteps, swimming and landmark sounds are selected by relevance instead of keeping every island sound playing at once.

## Rendering budgets

The scene relies heavily on batching and shared procedural meshes. Large populations of grass, palms and other plants would be impractical as independent draw objects.

Near and far tiers change geometry cost while preserving identity. Fine material detail fades before a mesh transition. Static terrain sampling and cached contact data avoid rebuilding expensive support information every frame.

The developer overlay reports frame timing, renderer identity, player and current state, visible terrain and vegetation cells, LOD populations, draw counts and active audio sources. Those figures help distinguish a visually dense scene from an uncontrolled resource budget.

The project still describes many materials and animals as stylized or in need of artistic refinement. A bounded implementation is not presented as photorealism.

## Linux, web and Android

The complete scene has run on Linux with OpenGL 3.3, in Chromium through WebGL 2 and in a GPU-accelerated Android emulator through OpenGL ES 3.

Those platforms do not all carry the same qualification. In particular, native AMD GPU hardware testing is suspended after a recorded GPUVM fault and desktop-session loss; current visual work uses software rendering until that incident is understood.

That explicit limitation is important. Island Simulator demonstrates a broad portable scene, while its project records distinguish successful software or browser evidence from unresolved hardware safety work.

## Browser input and persistence

The WebGL 2 edition uses the same keyboard movement and relative mouse view as desktop. Browser security requires a real click before pointer lock and audio can begin. Escape releases the pointer without closing the application, and a later click captures it again.

Automated Chrome and Firefox runs use real browser input events to verify movement, Shift transitions, simultaneous movement and look, focus changes, shoreline entry, resize behavior and pointer-lock release and reacquisition.

Normal web launches persist user preferences through CNA's origin-scoped browser storage. A validation run changes a setting, closes the runtime and requires a second launch on the same origin to restore it.

The current packaged browser data is only a few compressed megabytes because most of the island is generated at runtime. That size is evidence for the tested package, not a permanent guarantee as the project evolves.

## Android controls

Android uses two simultaneous touch zones:

| Touch | Action |
| --- | --- |
| Drag in the left half | Move with a floating analog stick |
| Drag in the right half | Look relative to the previous position |
| Tap the top-right control | Cycle look sensitivity |

Pointer ownership remains stable even if a finger crosses the screen center. Dead zones, clamping and invalid-coordinate checks prevent a lost touch from leaving the player moving or turning.

Pushing the movement stick near its outer range selects running, with hysteresis so the pace does not chatter at the threshold. Swimming keeps its own slower speed.

The touch UI and lifecycle were exercised in a GPU-accelerated Android API 35 emulator, including background and foreground transitions and a cold restart that restored settings. Physical-device ergonomics, long suspension and real audio focus remain separate work.

## Validation after a GPU incident

The repository records a confirmed AMDGPU GPUVM fault that ended the desktop session during hardware qualification. Because the cause is unresolved, successful software rendering is not described as a hardware fix.

Current visual work uses isolated llvmpipe, pixman and browser SwiftShader paths with checks around kernel messages and device visibility. These runs can validate geometry, shader behavior, WebGL context health and screenshots without exposing the affected host GPU.

Browser tests cover focused scenes as well as broader input and lifecycle matrices. Android assemble and emulator evidence is recorded separately. Each report states whether it proves a stationary picture, moving input, context stability, package construction or physical hardware behavior.

This unusually explicit evidence boundary is part of the project's engineering value. A screenshot that looks correct in software does not erase a real hardware crash, and a passing Android build does not prove performance on a phone.

## Present scope

Island Simulator remains an active long-form development and polish project. It already contains a substantial island, water, wildlife, landmarks, audio and three platform paths, but many visual details continue to evolve.

There is no survival loop, crafting system, combat, inventory or objective chain. The intended experience is to walk, swim, observe and use the island as a demanding portable CNA scene.

The public browser deployment is still being prepared. Source, build instructions, validation records and the current presentation screenshot are available in the GitHub repository.
