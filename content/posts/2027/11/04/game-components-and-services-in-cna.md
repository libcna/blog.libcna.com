---
title: Game Components and Services in CNA
date: 2027-11-04T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Structure reusable CNA systems with game components, drawable components and explicit services without hiding ownership or update order.
author: Robert Vokac
categories: [Development]
tags: [CNA, GameComponent, Services, Architecture, Game Loop]
draft: false
---

CNA preserves the XNA-shaped component and service model. It is useful for systems that share the game's lifecycle—diagnostics, input aggregation, screen management or developer overlays—but it is not a license to place every object in a global service locator.

A component participates in initialization and update. A drawable component additionally participates in drawing and can expose enabled, visible and ordering properties. The game owns the collection and determines when mutations become visible.

```cpp
class WeatherComponent final : public DrawableGameComponent
{
public:
    explicit WeatherComponent(Game& game) : DrawableGameComponent(game) {}

    void Initialize() override
    {
        wind_ = Vector2(1.0f, 0.0f);
        DrawableGameComponent::Initialize();
    }

    void Update(const GameTime& time) override
    {
        simulation_.Advance(time.getElapsedGameTimeProperty(), wind_);
    }

    void Draw(const GameTime& time) override
    {
        renderer_.Draw(simulation_, time);
    }
};
```

Adapt constructor and getter spelling to the CNA revision in use. Keep lifecycle calls to the base class where its contract requires them.

## Ordering is a dependency

If input aggregation must update before gameplay, or a world must draw before an overlay, state that order explicitly. Avoid “it was added first” as architecture. When two components require a strict relationship, document it and test the configured order.

Do not add or remove components while iterating the collection unless the API explicitly defines that behavior. Queue mutations for the end of the frame. A component disabling itself during `Update` should have predictable behavior for the current and next iteration.

Enabled and visible are not ownership. Disabling update does not cancel a worker, unregister a callback or release a texture. Components with asynchronous work need a separate cancellation and shutdown path.

## Services with narrow contracts

Game services allow systems to find a shared contract. Register interfaces owned elsewhere rather than large mutable concrete objects:

```cpp
class IGameClock
{
public:
    virtual ~IGameClock() = default;
    virtual std::chrono::nanoseconds SimulationTime() const = 0;
    virtual bool IsPaused() const = 0;
};

clock_ = std::make_unique<GameClock>();
getServicesProperty().AddService<IGameClock>(clock_.get());
```

The owner remains the game or component. Remove the registration before destroying the object. A service collection holding a raw/non-owning pointer must never outlive its provider.

Consumers should request required services during initialization and fail with a useful name when absent. Optional services expose capability explicitly. Repeatedly asking for services in a hot inner loop is both unnecessary and hides dependencies; resolve once and retain a non-owning reference for the provider's documented lifetime.

## Components versus screens and entities

Components are appropriate for a small number of lifecycle systems. Thousands of enemies should not become thousands of game components: entity/world ownership and tight iteration suit them better. A screen manager may itself be a component, while its screens remain a separate state machine.

Similarly, platform and renderer backends are not components. They sit below the game lifecycle and may be required before components initialize. Keep layers clear: platform produces events, input service creates frame state, gameplay consumes actions, and presentation draws results.

## Testing components

Construct components with fake narrow services. Feed known `GameTime`, call lifecycle methods in valid order and assert outputs. Tests should include disabled state, order changes, repeated initialization refusal where applicable and shutdown with pending work.

For integration, log one frame as:

```text
Update: Input(0) -> Screens(100) -> Weather(200) -> Diagnostics(1000)
Draw:   World(0) -> Weather(100) -> UI(500) -> Overlay(1000)
```

Then verify changes to ordering emit the expected events or invalidate the correct cached list. Run component add/remove churn under sanitizers or leak checks, and confirm service registrations are empty before game destruction.

The component model succeeds when it makes lifecycle and order easier to see. If a system needs hidden global access, mutates other components during iteration and leaves callbacks after removal, placing it in `GameComponent` has not made it modular—it has only given the coupling an XNA-shaped name.

## Failure and teardown order

Initialization can stop after component N. Track successfully initialized components and unwind them in reverse dependency order. A service registered during initialization must unregister even when later initialization fails. Avoid destructors invoking virtual/service behavior after providers have disappeared.

For async components, shutdown becomes: mark stopping, unsubscribe event producers, request cancellation, join/drain bounded work, release device resources, unregister service. Put deadlines around network/background workers where the host requires timely exit.

## A useful component contract test

Create a fake game/service container and trace calls:

```text
Initialize A, Initialize B
Update A, Update B
B requests removal A
Draw B
Shutdown B, Shutdown A
```

Assert removal becomes visible at the defined boundary and no callback reaches A afterward. Vary `UpdateOrder`/`DrawOrder`, enabled/visible state and component insertion during callbacks. Raise service replacement/removal and verify consumers react according to contract.

At release, inventory components, services they provide/consume, owner and order. Cycles or “must be global” dependencies deserve redesign. The model scales through a small predictable lifecycle graph—not by converting every system/entity into a component.
