---
title: Lighting, Shadows and PBR in CNA
date: 2027-07-29T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Progress from BasicEffect lighting to shadow maps and CNA's optional physically based material workflow.
author: Robert Vokac
categories: [Development]
tags: [CNA, Lighting, Shadows, PBR, Graphics]
draft: false
---

CNA supports several lighting levels rather than forcing one material system. `BasicEffect` provides XNA-compatible directional lighting, ambient and emissive terms. More advanced CNA extensions and CNA Engine can add physically based materials, image-based lighting, local lights and shadows.

Begin with correct geometry. Lit vertices need normals in a supported layout, transforms must treat directions correctly, and non-uniform scaling may require a normal matrix. Validate one white directional light before adding textures or several sources.

PBR materials separate base color, metalness, roughness, normals and occlusion. Imported glTF assets must follow CNA's coordinate, tangent and texture conventions. A fallback renderer may use a simpler stock effect, but that fallback should preserve object identity and transparency rules even if it cannot reproduce the same response.

## Shadows are another rendering problem

A directional shadow map first renders depth from the light, then samples that map while drawing the camera view. Choose a stable light projection, bias carefully and inspect the depth target directly when debugging. Too little bias creates acne; too much detaches shadows from objects.

Shadow resolution, caster count and update frequency are quality controls. Static or distant content may not need a fresh map every frame. Cull casters against the light volume and expose shadow draw counts in diagnostics.

Image-based lighting needs environment data and a defined exposure. Do not compensate for an incorrect color space by arbitrarily changing light intensity. Base-color textures are commonly sRGB while normal and ORM data are linear; format selection must preserve that distinction on supported renderers.

Test materials under neutral lights, extreme roughness and metalness, missing maps, mirrored transforms and renderer fallback. Screenshot tolerances should be renderer-aware because floating-point and sampling details vary, but large energy, orientation or channel errors are not aesthetic differences.

The maintainable approach is layered: XNA-compatible effects for the broad baseline, capability-gated enhancements for richer renderers, and one material description that can select the best valid binder without hiding which path was used.

## Authoring and performance

Review imports on reference spheres under neutral lighting. Check normal-map handedness, ORM channels, alpha mode and double-sided intent before tuning lights. Preserve physical meaning: metalness is not a generic reflection slider.

Cull local lights, bound shadow casters and reuse static environment data. Measure shadow draws and target switches separately from the main pass. When falling back, record omitted material features so differences remain documented rather than becoming vague renderer “quality.”

## From material inputs to final light

Define the material contract before authoring content: base color, metalness, roughness, normal, emissive and occlusion, including color space and packed channels. Base color and emissive textures are typically color data; roughness, metalness and normals are numeric data and must not receive the same gamma treatment. Provide neutral defaults so a missing map has predictable meaning.

Transform normals correctly under non-uniform scale and keep tangent basis handedness consistent with the content pipeline. Test with a directional light rotating around a reference sphere and plane. If the highlight flips or a normal map appears embossed inward, investigate basis conventions before altering artist values.

## Shadow discipline

Select shadow casters and receivers explicitly. Directional lights may use cascades; local lights require different projections and costs. Stabilize directional projections where possible to reduce shimmering, apply bias in the correct space, and visualize shadow-map depth and cascade selection. Too much bias disconnects shadows from objects, while too little causes self-shadowing acne.

Budget shadows by submitted geometry, target pixels and update frequency. Static lights can reuse maps until a caster moves. Small or distant lights may omit shadows, but the rule should be visible in tooling. Filter quality, cascade count and resolution make useful quality tiers.

Validate PBR under a neutral environment before a dramatic scene. Use dielectric, metallic, rough and smooth reference materials, inspect energy behavior at grazing angles and compare backends with identical exposure and tone mapping. A renderer fallback may simplify the model, but it should preserve recognizable base color, opacity and light direction rather than silently substituting arbitrary constants.

## Worked example: establish a lighting baseline

Before PBR, prove coordinate and normal conventions with `BasicEffect`:

```cpp
BasicEffect effect(device);
effect.setWorldProperty(world);
effect.setViewProperty(view);
effect.setProjectionProperty(projection);
effect.setLightingEnabledProperty(true);
effect.EnableDefaultLighting();
effect.setPreferPerPixelLightingProperty(true);
effect.setTextureEnabledProperty(true);
effect.setTextureProperty(&albedo);
```

Render a sphere, cube and non-uniformly scaled object. If stock lighting is wrong, a custom PBR shader will not rescue the underlying vertex layout, winding or transform convention.

For PBR, define a material record whose fields name meaning and color space:

```cpp
struct PbrMaterial {
    Texture2D* baseColorSrgb;
    Texture2D* normalLinear;
    Texture2D* ormLinear; // R=occlusion, G=roughness, B=metalness
    Vector4 baseColorFactor{1,1,1,1};
    float roughnessFactor = 1.0f;
    float metalnessFactor = 1.0f;
    AlphaMode alphaMode = AlphaMode::Opaque;
};
```

The shader converts base color to linear, keeps numeric maps linear, evaluates light, and tone-maps once at the end. Never compensate for a gamma mistake by changing artist values.

## Shadow-map pass

Render depth from the light into a target, then sample it from the camera pass using `lightViewProjection`. Visualize the depth texture and projected coordinates. Test a plane plus floating cube while varying slope and constant bias. Bias that hides acne but disconnects the cube's shadow is not a correct fix.

Record shadow resolution, cascades, casters, draws and update frequency. Update static-light maps only after a caster changes. Quality tiers can reduce cascades, resolution or shadowed local lights in a stated order. Keep the neutral material chart in cross-renderer captures so exposure and shadow differences cannot hide behind a beautiful environment.

## Light selection and environment terms

Do not upload every light to every object. Partition or cull by influence, rank the remaining lights by a documented importance measure, and keep limits visible. Sudden changes in the selected set can flicker, so use stable ordering or hysteresis where necessary. Record considered and selected counts per object or tile.

Image-based lighting normally separates diffuse irradiance from a prefiltered specular environment and a BRDF lookup. These assets must share the renderer's cube orientation and color-space conventions. Validate with a chrome sphere and a very rough sphere: the former exposes reflection direction and seams, the latter exposes diffuse/environment energy.

Tone mapping and exposure are part of comparison. Lock them when testing renderers. Automatic exposure can make a darker incorrect frame appear similar after several seconds. Include raw linear target checks or fixed-exposure captures for parity fixtures.

## Authoring and fallback checklist

Import base color, normal, occlusion/roughness/metalness, emissive, alpha mode and double-sided intent explicitly. Verify a material grid containing dielectric/metallic and rough/smooth extremes. Rotate one directional light and environment, inspect grazing angles, then add shadow receivers and alpha-tested casters.

On a backend without the full PBR route, map base color, opacity and dominant light into a declared simpler technique. Report omitted normal, environment or shadow features. A fallback is useful when it preserves scene meaning and can be tested; a fixed white stock shader is not a material fallback.
