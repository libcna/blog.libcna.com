---
title: CNA Goes Online: Gamer Services, Avatars and Networking
date: 2026-10-05T07:42:31Z
updated: 2026-10-04T07:52:08Z
description: |
  CNA implements much more than the graphics and game-loop side of Microsoft XNA 4.0.
author: Robert Vokac
categories:
  - Development
tags: []
originalUrl: https://blog.libcna.com/2026/10/05/cna-goes-online-gamer-services-avatars-and-networking/
classicpressId: 226
classicpressStatus: future
featuredImage: /wp-content/uploads/2026/10/avatar-shadows.png
featuredImageAlt: |
  Avatar shadows
draft: false
---

CNA implements much more than the graphics and game-loop side of Microsoft XNA 4.0.

The framework now includes substantial parts of `Microsoft.Xna.Framework.GamerServices` and `Microsoft.Xna.Framework.Net`, including gamer profiles, achievements, leaderboards, friends, avatars, invitations, parties, network sessions and online multiplayer.

CNA also has its own independent Gamer Services server.

## Gamer Services in CNA

XNA Gamer Services originally depended heavily on Xbox LIVE. CNA keeps the XNA programming model, but replaces unavailable external infrastructure with its own implementation.

CNA Gamer Services supports concepts such as:

- `Gamer`
- `SignedInGamer`
- `GamerProfile`
- friends and presence
- achievements
- leaderboards
- gamer pictures
- privileges
- Guide sign-in
- messages
- parties
- invitations
- avatars

CNA does **not** emulate Xbox LIVE and is not compatible with Xbox LIVE protocols, accounts or services.

When no server is configured, CNA can use local offline profiles. Games can still sign in players, store local achievements, maintain local leaderboard data and use locally generated avatars.

When a Gamer Services server is configured, the same API can provide online functionality.

## CNA Gamer Services Server

The separate `cna-gamer-services-server` project is written in C++23 and provides the backend for CNA's online Gamer Services.

It currently supports:

- accounts and authentication
- gamer profiles and gamer pictures
- friends and friend requests
- presence
- achievements
- leaderboards
- messages and player reviews
- parties
- avatars
- session discovery
- persistent invitations
- host migration
- online `NetworkSession` relay

The server also exposes title configuration, minimum accepted game versions and server-side gamer privileges.

Storage uses SQLite, while normal network deployments use TLS.

The server includes a small administration utility for creating users, registering games, defining leaderboards and achievements, assigning gamer pictures and configuring avatar catalogs.

## XNA NetworkSession on CNA

CNA implements real networking for `Microsoft.Xna.Framework.Net`.

For System Link, CNA uses ENet and UDP. Games can create sessions, discover them, join them and exchange packets between machines.

Online `PlayerMatch` and `Ranked` sessions use the CNA Gamer Services server for session management.

Realtime traffic travels through an authenticated WebSocket relay. The relay forwards ENet datagrams between participating machines while checking that each connection belongs to the session.

This also allows online sessions to work when players are behind NAT without requiring direct incoming connections.

CNA supports several higher-level XNA networking features as well, including:

- session discovery
- invitations
- `AddLocalGamer`
- player removal
- host migration
- session state changes
- Ranked arbitration

Voice communication can also travel through the same `NetworkSession` transport.

## CNA Avatars

CNA implements the XNA Avatar API using completely original assets.

It does not redistribute Xbox avatar models or textures.

The implementation includes familiar XNA classes such as:

- `AvatarDescription`
- `AvatarAnimation`
- `AvatarRenderer`

CNA avatars have their own body types, hairstyles, clothes, shoes, glasses, hats, facial hair, face parameters and colours.

The avatar skeleton contains 71 bones and CNA includes a set of predefined animation presets.

`AvatarRenderer` builds the character from the avatar description and renders it through CNA's graphics system.

Applications can also access bone transforms and create custom animation systems or attach objects to the avatar skeleton.

## Avatars and the Gamer Services Server

An online CNA account can have its own avatar.

The server stores the player's validated `AvatarDescription`, rather than storing a separate complete 3D model for every account.

The client uses its local CNA avatar catalog to construct the character.

Avatar catalogs are versioned. If an account uses a catalog version that a client does not have, the server can provide the corresponding catalog pack.

This keeps the player identity small while still allowing the same avatar to appear on different machines.

## Five Avatar Samples Running in the Browser

The CNA Samples gallery contains several original Microsoft XNA Avatar samples ported to CNA and compiled to WebAssembly.

They can be launched directly in a browser.

### Avatar Animation Blending

This sample demonstrates smooth interpolation between avatar animations such as Stand, Celebrate, Clap and Wave.

It shows how animation transitions can be blended instead of changing instantly.

### Avatar Multiple Animations

Different parts of the skeleton can play different animations at the same time.

For example, most of the character can perform one animation while one arm performs another.

### Object Placement on Avatar

This sample attaches an object to an animated avatar bone.

A baseball bat follows the avatar's hand using the current animated bone transformation.

### Custom Avatar Animation

This example uses custom animation and facial-expression data instead of only the built-in CNA animation presets.

The avatar can perform actions such as jumping, kicking and punching.

### Avatar Shadows

Avatar Shadows renders multiple independently generated CNA avatars in the same scene together with planar shadows.

It is probably the best visual demonstration of the current CNA Avatar implementation.

## Avatars over NetworkSession

CNA also contains networking demos that combine Avatars with `NetworkSession`.

A machine can send another player:

- avatar description
- position
- rotation
- animation state

The receiving machine recreates and renders the remote avatar locally.

Only the avatar description and gameplay state need to be synchronized. The actual meshes and textures already exist in the CNA avatar catalog.

## Testing

The Gamer Services and Net implementation has dedicated automated tests covering areas such as:

- authentication
- achievements
- leaderboards
- profiles
- friends
- avatars
- invitations
- parties
- session creation and joining
- host migration
- online relay traffic
- service restart
- persistence

Some networking tests also launch separate CNA processes and test communication through isolated Linux network environments.

The Gamer Services server repository contains its own server-side test suite and benchmarks.

## Screenshots

![Avatars](/wp-content/uploads/2026/10/avatars-1.jpg)

## Try the Avatar Samples

The easiest way to see this part of CNA is through the online Samples gallery:

[**https://samples.libcna.com/**](https://samples.libcna.com/)

The avatar samples currently include:

- Avatar Animation Blending
- Avatar Multiple Animations
- Object Placement on Avatar
- Custom Avatar Animation
- Avatar Shadows

Their source code is available in the CNA Samples repository:

[**https://github.com/libcna/cna-samples**](https://github.com/libcna/cna-samples)

The Gamer Services server is available separately:

[**https://github.com/libcna/cna-gamer-services-server**](https://github.com/libcna/cna-gamer-services-server)

And the main CNA framework repository is available at:

[**https://github.com/libcna/cna**](https://github.com/libcna/cna)

CNA's Gamer Services, Net and Avatar implementations bring back some of the less commonly reimplemented parts of XNA 4.0 while replacing the original Xbox-dependent infrastructure with independent CNA components.
