---
title: Navigation, Pathfinding and Steering in CNA Games
date: 2028-11-16T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Add navigation above CNA with grids or navmeshes, deterministic A-star, asynchronous requests, path following, local avoidance and visual diagnostics.
author: Robert Vokac
categories: [Development]
tags: [CNA, Navigation, Pathfinding, AI, Steering]
draft: false
---

CNA does not need a built-in opinion about whether a game walks on a tile grid, road graph, voxel volume or navigation mesh. It supplies math, timing, content and visualization primitives. The game builds a navigation service whose data matches its movement and collision rules.

Separate four responsibilities: navigation representation, global path search, path following and local steering/avoidance. A perfect A* route can still look terrible if a character controller cannot follow corners or agents push one another into walls.

## Choose representation from locomotion

A 2D grid is simple and works for tile games. Store walkability and traversal cost, define diagonal policy and prevent corner cutting through two blocked orthogonal neighbors. Hierarchical grids reduce long-distance search.

A waypoint/road graph fits vehicles or authored routes. A navigation mesh represents walkable polygons in 3D environments; edges/portals connect polygons. Flying or swimming may require layered grids or volumes.

Navigation data is derived from collision but not identical. A low obstacle may block a wheeled vehicle but be a step for a character. Build data per agent class or annotate clearance, slope and area type.

```cpp
struct PathRequest {
    RequestId id;
    EntityId agent;
    Generation agentGeneration;
    Vector3 start, goal;
    AgentClass agentClass;
    std::uint64_t navigationRevision;
};
```

Requests carry revision because doors, destruction and streaming can change the answer while a worker searches.

## A* with stable behavior

A* selects the open node with lowest `f = g + h`. The heuristic must not overestimate if optimality is required. Manhattan distance suits four-neighbor grids; octile distance suits eight-neighbor grids; navmeshes often use Euclidean distance.

Use integer/fixed costs where stable cross-platform ordering matters. Define tie-breaking by stable node ID, then test it. An unordered container's iteration order should not choose a different equally good corridor on another run.

Bound expanded nodes and memory. A failed budget returns Partial/TooComplex rather than freezing a frame. Reuse search storage with generation markers instead of clearing enormous arrays. Validate start/goal projection and report NoStartArea, NoGoalArea or Disconnected distinctly.

Run expensive searches on workers over an immutable navigation snapshot. Apply results on the game thread only if agent and revision remain current. Prioritize near/visible agents and coalesce superseded requests. Never block update waiting for a path.

## Smooth the path

Grid paths can remove intermediate nodes when a line-of-travel clearance test succeeds. Navmesh paths use a funnel algorithm through portals to produce corners. The smoothing query must match agent radius and collision rules; a center ray alone cuts too close to obstacles.

Store corridor/polygon identity as well as corners if the agent needs to recover after deviation. Replan when goal moves enough, corridor becomes invalid or progress watchdog detects no movement—not every frame.

Off-mesh links represent jumps, ladders, doors, elevators or teleports. They include entry/exit, required capability, cost and a gameplay action. Pathfinding selects the link; a link executor owns the traversal and can fail/replan.

## Following and steering

The follower chooses a look-ahead target on the path and produces desired velocity/facing. It then sends that intent to the character controller, which performs actual collision movement. Compare desired and actual progress to detect blockage.

Local avoidance adjusts velocity around other moving agents. Keep it bounded so it does not steer outside the valid corridor or override high-priority gameplay. Reciprocal methods can help crowds, while simple separation and priority lanes may be enough for a small game.

Avoidance is not global planning. Two agents can politely avoid forever at a narrow doorway without an ownership rule. Add reservation, priority, yielding or door capacity. Deterministic games need stable neighbor ordering and numeric policy.

## Dynamic obstacles and streaming

Small moving agents are handled by local avoidance, not navmesh rebuild. Doors or large persistent blockers can toggle links/area cost or update tiles. Destruction may rebuild affected regions asynchronously and publish a new revision at a tick boundary.

Streaming worlds keep navigation tiles with world chunks plus connectivity metadata. A long path can be hierarchical: global route through known regions and local route inside loaded data. Missing navigation is Unknown, not automatically walkable.

Pin data used by active searches/snapshots until those searches finish. Late results for unloaded cells are rejected through world generation/revision checks.

## Debug and validate

Draw nodes/polygons, neighbor edges, area types, clearance, open/closed sets, final corridor, smoothed corners, desired/actual velocity and avoidance neighbors. Selecting an agent shows request ID, revision, status, expanded count, cost and replan reason.

Unit tests use tiny graphs with known optimal cost, ties, disconnected components, blocked diagonals and budget exhaustion. Scenario tests cover doors, moving goals, off-mesh links, narrow passages, crowds, unload during search and agent destruction before completion.

Measure search latency percentiles, expanded nodes, queue age, replans, path cache hit rate and stuck events. Navigation is successful when it produces feasible intent under a budget and explains why it cannot—not merely when A* returns a list of points.
