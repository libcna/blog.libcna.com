---
title: Saving Games in CNA
date: 2027-06-10T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Use CNA storage APIs to build versioned, atomic and portable save files without depending on desktop paths.
author: Robert Vokac
categories: [Development]
tags: [CNA, Storage, Saves, Serialization]
draft: false
---

Portable saving begins by not inventing a path such as `~/.mygame`. CNA keeps XNA's storage model: obtain a `StorageDevice`, open a `StorageContainer`, and let the platform choose the correct user-specific location. `TitleContainer` is for shipped read-only content, not progress.

A good save format has an explicit version and game-owned schema:

```text
magic | format version | payload length | payload | checksum
```

Deserialize into temporary state, validate ranges and references, then replace the live game state only after the whole document succeeds. Never let a truncated file half-update a world.

## Make writes recoverable

Write a temporary file in the same container, flush and close it, then replace the primary save. Keep the previous valid file as a backup when the platform permits it. A crash between “delete old” and “rename new” is otherwise enough to lose both versions.

Version migrations should be one-way, small and tested with real historical fixtures. Preserve unknown optional data when practical, but reject a newer incompatible mandatory version with a clear message. A checksum detects corruption; it is not protection against deliberate modification.

Separate settings, profiles, checkpoints and large world data. Settings benefit from frequent small writes, while a large world snapshot may need incremental or background serialization. Do not call graphics APIs from a storage worker, and return completion to the game loop before changing UI state.

On mobile, save before suspension. On the web, synchronize the virtual filesystem to persistent browser storage and wait for completion at meaningful checkpoints. Private browsing or quota limits can still fail, so display failure and keep the in-memory session playable.

Tests should cover first run, full round-trip, old-version migration, corrupted length, wrong checksum, interrupted replacement, missing backup and an unwritable container. Storage is successful only when recovery works—not merely when one happy-path file can be read immediately after it was written.

## Schema design and synchronization

Give stable identifiers to referenced objects instead of serializing addresses or vector positions. Store enough metadata to reject an incompatible game or mod set. Validate counts before allocating collections so a corrupt length cannot request gigabytes.

Autosave must capture a coherent state. Copy serializable data at a frame boundary and encode it in the background, or pause mutation through a narrow synchronization point. A worker traversing a world while simulation changes it can create a save that never represented a real frame.

Show slot metadata from a small validated header before loading the payload. If a backup succeeds after primary corruption, tell the player and retain the bad file for diagnosis. Cloud synchronization needs an additional conflict policy: keep both divergent versions when timestamps and revision identifiers cannot establish authority.

## Separate state from representation

Build a plain save model containing only durable facts. Runtime pointers, graphics resources and caches do not belong in it. Convert between the live world and this model at an explicit boundary so the data can be validated before gameplay sees it and the serialization format can change independently.

Store a format version and migrate one version at a time. Loading version 3 into version 7 should run the same tested 3-to-4, 4-to-5, 5-to-6 and 6-to-7 transforms. Preserve fixtures from shipped releases. Use stable content identifiers rather than array positions or enum ordinals; designers will reorder data. Unknown optional fields may be ignored, while missing required content needs an actionable error.

## Writing without losing progress

Encode into memory or a temporary file, validate and flush it, then atomically replace the primary where the platform allows. Keep a known-good backup and checksum. Do not overwrite that backup until the new primary has successfully loaded.

Autosave only at coherent boundaries such as a completed level or menu transition. If encoding happens on a worker, first copy an immutable save model; never traverse a world being mutated by the update thread. Test denied access, full storage, truncated data, corrupt checksums, unknown fields and termination during replacement. A save system is complete when it protects progress during failure, not merely when a normal round trip works.

## Worked example: versioned data, not runtime objects

Define an intentionally boring model with stable identifiers and values that can be validated without constructing a level:

```cpp
struct SaveGame
{
    static constexpr int CurrentVersion = 3;
    int version = CurrentVersion;
    std::string profileId;
    std::string currentLevelId;
    std::vector<std::string> unlockedLevelIds;
    std::unordered_map<std::string, int> inventory;
    std::uint64_t playTimeSeconds = 0;
};

void Validate(const SaveGame& save)
{
    if (save.version < 1 || save.version > SaveGame::CurrentVersion)
        throw SaveError("unsupported save version");
    if (save.profileId.empty() || save.profileId.size() > 128)
        throw SaveError("invalid profile id");
    if (save.inventory.size() > 4096)
        throw SaveError("inventory is unreasonably large");
    for (const auto& [id, count] : save.inventory)
        if (id.empty() || count < 0 || count > 999999)
            throw SaveError("invalid inventory entry");
}
```

Deserialize, bound collections before allocation, migrate, validate, and only then apply to the world. Preserve one fixture per released version. Run explicit one-step migrations in a loop instead of a single sprawling old-to-current conversion.

## Atomic replacement and fault injection

Write `slot.tmp`, flush it, read and validate it, then replace `slot.sav` while retaining `slot.bak`. Platform APIs differ, so isolate replacement behind an interface and document whether rename is truly atomic. Never delete the known-good copy first.

Inject failure after open, after half the bytes, after flush and before rename. Restart after each simulated crash and assert that either new primary or previous backup loads. Also test a valid checksum with invalid semantics: integrity proves preserved bytes, not valid game state. Cloud saves should carry revision and parent revision; two children of the same parent are a conflict even when one clock is later.

## Slots, settings and user-facing recovery

Keep global settings separate from campaign saves. Accessibility, language and input mappings should be available before a campaign loads and should not vanish when a slot is deleted. A slot header can expose display name, play time, location, format version, game build and thumbnail reference without decoding the full world payload. Validate that header before showing it.

When primary load fails but backup succeeds, tell the player that recovery occurred and preserve the corrupt primary under a diagnostic name. Do not overwrite it immediately with the recovered data; developers may need the original bytes. When both fail, offer a safe route back to the menu and an export option where appropriate. “Start new game” must not be the only visible response to a transient storage error.

Compression and encryption solve different problems. Compressing reduces size; it does not prevent modification or protect secrets. A checksum detects accidental corruption but is not authentication against an attacker. Most offline games should avoid placing valuable secrets in client saves at all. If confidentiality or authenticity is a product requirement, use a reviewed platform/security design rather than a homemade XOR layer.

Test forward fields by loading a document containing unknown optional data. Test downgrade explicitly: either older builds reject a newer save without modifying it or the product guarantees compatible writes. Record save schema version separately from application version so a patch that does not change persistence need not invent a new format.
