---
title: Friends, Presence, Matchmaking and Avatars in CNA
date: 2028-04-13T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Integrate CNA social services through asynchronous capability-aware flows with privacy, cache and failure policies.
author: Robert Vokac
categories: [Development]
tags: [CNA, Friends, Presence, Matchmaking, Avatars]
draft: false
---

Social features are asynchronous network data, not global arrays that always exist. Sign-in can fail, privacy can hide presence, a friend may disappear during a request and avatars may arrive long after the screen closes.

Wrap each operation in a request carrying cancellation and screen/session identity:

```cpp
services.GetFriends(userId, cancelToken,
    [weakScreen](Result<FriendList> result) {
        if (auto screen = weakScreen.lock()) screen->Apply(std::move(result));
    });
```

Never retain a raw screen pointer in a service callback. Cache with expiry and display stale/offline state honestly. Default privacy to minimum disclosure; the server is authoritative about what another user may see.

Matchmaking tickets declare region, mode, party and compatibility. Support cancel, timeout, partial service failure and version rejection. Joining a session still performs protocol/content handshake—matchmaking success is not game compatibility.

Avatars are untrusted downloaded content. Bound bytes/dimensions, validate decoding, cache safely and use a local fallback. Do not block the friends list on images.

Test offline, slow responses, duplicate/out-of-order callbacks, sign-out mid-request, blocked users, empty lists, service upgrade and UI disposal. Social features are finished when every unavailable/denied state remains understandable and does not prevent ordinary offline play where promised.

## State and UX details

Presence has freshness and visibility, not just online/offline. Display unknown/stale separately and avoid revealing private activity through cached data after sign-out. Friend mutations should be idempotent and server-confirmed; optimistic UI needs rollback on rejection.

Parties keep stable membership/leadership revisions. Matchmaking ticket cancellation races with match-found responses, so compare ticket IDs/state before joining. Invite deep links must pass normal authentication, compatibility and block/privacy checks.

Cache avatars by content identity with byte/dimension limits and eviction. Decode outside UI thread, upload under graphics rules and cancel when no consumer remains. A generated initials/default portrait keeps layout usable.

Instrument request latency/error/cache hit and ticket time without exposing social graphs. Automated fake service tests cover every response ordering; staging tests cover real authentication and privacy. Never let a social screen become the only route to local/offline gameplay unless that is an explicit product requirement.

## Model revisions, not mutable globals

Responses include revision/time where available. UI applies only results matching current signed-in user and request generation. On sign-out, cancel requests, clear sensitive caches and ignore late callbacks.

```cpp
struct PresenceView {
    UserId user;
    PresenceState state;
    std::optional<std::string> activity;
    TimePoint observedAt;
    bool mayDisplayActivity;
};
```

Privacy decision travels with data; UI must not reconstruct it from friendship alone. Block/remove events invalidate cached invitations/presence immediately.

## Matchmaking lifecycle

Ticket states: Creating, Searching, MatchFound, Joining, Cancelled, Failed. Every server response carries ticket ID/revision. A cancel racing MatchFound resolves by authoritative state and product policy; never join both. Timeouts cancel remotely where possible and remain observable.

Match result contains endpoint/session token plus protocol, content/mod/rules identity. Client validates before allocating a game world. Party matchmaking preserves membership revision so a stale leader response cannot split/overwrite party unexpectedly.

## Avatar pipeline

Download under per-image/request/cache byte limits, validate media type/dimensions, decode on worker and upload on graphics thread. Cache key includes content/version/size; evict LRU under total budget. Use placeholder while pending and retain no dependency from core friends data to texture success.

## UX and testing

Every screen represents Loading, Empty, Offline, Denied, Error and Stale states distinctly. Retry is bounded/backed off. Friend/invite actions show pending and server confirmation. Accessibility supplies readable names/focus and does not encode presence only by color.

Fake service deterministically schedules success, delays, duplicates, out-of-order, sign-out and privacy changes. Integration tests use test accounts with documented cleanup. Metrics aggregate counts/latency, never friend identities.

## Invitations and joining

Invite is immutable ID with inviter/session/type/compatibility/expiry, not live UI pointer. Accept revalidates signed-in user, privacy/block, expiry, capacity, protocol/content and platform policy. Duplicate IDs deduplicate; joining from existing match follows explicit prompt/queue policy.

Cache social data only per privacy/retention and mark stale. Sign-out clears sensitive cache/tokens and cancels joins. Offline menus remain usable and explain unavailable features.

Release tests use multiple accounts for add/remove/block/privacy, presence, party leadership, matchmaking cancel/found race, invite expiry and corrupt/large avatar. Verify callbacks after screen destruction plus localization/accessibility. Traces are sanitized and accounts cleaned automatically.
