---
title: Building an In-game Developer Console in CNA
date: 2028-11-30T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Add a safe CNA developer console with typed commands, completion, history, structured output, permission boundaries and test automation.
author: Robert Vokac
categories: [Development]
tags: [CNA, Developer Console, Debugging, Tools, Security]
draft: false
---

An in-game console turns diagnostics and development actions into a discoverable interface. It can change render modes, inspect entities, load test scenes or reproduce a command sequence without adding temporary keys throughout the codebase. It can also become a security and support problem if arbitrary commands ship to players without boundaries.

Build the console as a game-owned service over CNA text/input/rendering. Commands call typed application APIs; the console is not a shell and should never pass text to an operating-system command interpreter.

## Typed command registry

A command definition includes name, help, typed arguments, execution domain and required permission. Registration returns a token owned by the module so unloading removes commands safely.

```cpp
CommandToken token = console.Register(CommandSpec{
    .name = "render.wireframe",
    .summary = "Enable or disable wireframe debug rendering",
    .arguments = { BoolArgument{"enabled"} },
    .permission = ConsolePermission::Developer,
    .thread = CommandThread::Game,
    .handler = SetWireframe
});
```

Parse quoting, escapes, booleans, numbers, enums, entity/asset IDs and optional/default values through reusable argument types. Validation reports the argument and expected form. Handlers receive parsed values, never reparse raw strings.

Namespaces such as `render.*`, `world.*`, `audio.*` and `net.*` improve completion and ownership. `help render.wireframe` should show syntax, description, permission and examples generated from the same specification.

## Input, text and focus

Opening the console pushes a UI/input focus scope. It captures text entry, editing keys, history navigation, autocomplete and scrolling while normal gameplay actions are suppressed according to pause policy. Closing it restores previous focus and clears held edges to prevent the closing key from triggering gameplay.

Use platform text-input events where available rather than assuming every character maps from a physical key. Handle Unicode storage/rendering, clipboard policy and IME composition if the platform layer exposes it. The existing CNA UI/text articles provide the rendering foundation.

History stores submitted commands with a size bound. Sensitive values such as authentication tokens must never enter history or logs; ideally such commands do not accept secrets through the console at all.

## Structured output

Handlers return output records with severity, category, timestamp/frame and optional fields/table rows. The UI formats them, while tests or remote tools can consume structured data.

```cpp
struct ConsoleResult {
    CommandStatus status;
    String message;
    std::vector<Field> fields;
};
```

Bound output lines/bytes and coalesce spam. A command that lists 100,000 entities must paginate or filter. Rendering should virtualize visible lines rather than laying out the entire history each frame.

Long work returns a job/request ID and streams bounded progress through the console service. Never block the game thread waiting for I/O or a worker whose completion requires that thread. Cancellation is an explicit command/action.

## Variables and transactions

Developer variables can expose render toggles and tuning values, but they need type, range, current/default, persistence and change callback. Apply changes at safe boundaries. A resolution or renderer switch is a transaction with rollback, not a raw integer assignment.

Separate temporary session overrides from saved user settings and authoritative gameplay values. Multiplayer clients cannot change server rules merely because a local console variable exists.

Cheat commands should use semantic APIs such as `player.give_item item_id count`; those APIs validate state, record audit/replay events where appropriate and work through the authority boundary.

## Build and permission policy

Define build tiers: public safe diagnostics, developer commands and automation/test-only commands. Compile-time exclusion can remove dangerous handlers from shipping builds, while runtime permissions protect development/network sessions.

A remote console is a separate security product: authenticated encrypted transport, bind-address policy, rate limits, session permissions and audit logs. Do not expose the local parser on a network port by default. Never include filesystem escape or arbitrary native-code execution as convenience features.

Mod/script commands live in a sandbox namespace and receive only allowed capabilities. Name conflicts and unloading must be deterministic.

## Automation and reproducibility

The same registry can drive test scripts without rendering the console UI. Commands return completion status and structured values so CI does not scrape colored text. A scenario can load a fixture, set a debug mode, advance ticks and capture diagnostics.

Record command name, normalized non-secret arguments, issuer/domain and result. When a command changes authoritative state, include it in replay/debug artifacts or mark the session non-reproducible. Alias/macros expand visibly and have recursion/length limits.

## Tests and diagnostics

Unit-test tokenizer/parser edge cases, Unicode, ranges, unknown commands, completion ranking, registration lifetime and permission denial. Scenario tests open/close during gameplay, disconnect a controller, execute asynchronous commands, unload the registering scene and flood output.

The console can inspect itself: registered counts by permission/module, active jobs, output bytes and dropped messages. A developer console is successful when it replaces ad-hoc debug shortcuts with discoverable, testable commands while remaining incapable of accidentally becoming an unrestricted shell.
