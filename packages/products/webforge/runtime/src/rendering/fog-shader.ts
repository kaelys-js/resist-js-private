/**
 * Fog shader module.
 *
 * Provides two GLSL post-process shaders for the fog system:
 *
 * 1. **Advanced fog** — Depth-based fog with height fog, second layer,
 *    inscattering, atmospheric scattering, noise modulation, wind, and
 *    animated density.
 *
 * 2. **Overlay fog** — Up to 4 scrolling texture layers with per-layer
 *    blend mode, tint, hue shift, vignette mask, and opacity.
 *
 * Both shaders are registered into `BABYLON.Effect.ShadersStore` on first use.
 * Factory functions return `BabylonResult<BABYLON.PostProcess>`.
 *
 * @example
 * ```typescript
 * import { createAdvancedFogPostProcess, createOverlayFogPostProcess } from './fog-shader';
 *
 * const advResult = createAdvancedFogPostProcess({ camera, engine });
 * if (!advResult.ok) return advResult;
 *
 * const overlayResult = createOverlayFogPostProcess({ camera, engine });
 * if (!overlayResult.ok) return overlayResult;
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Shader Names
// =============================================================================

/** Advanced fog post-process shader name. */
export const ADVANCED_FOG_SHADER_NAME = 'webforgeFog';

/** Overlay fog post-process shader name. */
export const OVERLAY_FOG_SHADER_NAME = 'webforgeFogOverlay';

// =============================================================================
// Advanced Fog — Uniforms & Samplers
// =============================================================================

/** Uniform names for the advanced fog post-process. */
export const ADVANCED_FOG_UNIFORMS: readonly string[] = [
	// Camera / scene
	'cameraPosition',
	'cameraFar',
	'cameraNear',
	'invProjection',
	'invView',

	// Core fog
	'fogColor',
	'fogDensity',
	'fogMode',
	'fogStart',
	'fogEnd',
	'maxOpacity',
	'startDistance',
	'cutoffDistance',
	'excludeSkybox',
	'skyAffect',

	// Height fog
	'heightFogEnabled',
	'heightFogBaseHeight',
	'heightFogFalloff',
	'heightFogDensity',
	'heightFogOffset',

	// Second layer
	'secondLayerEnabled',
	'secondLayerDensity',
	'secondLayerHeightFalloff',
	'secondLayerHeightOffset',
	'secondLayerColor',

	// Inscattering
	'inscatteringEnabled',
	'inscatteringColor',
	'inscatteringExponent',
	'inscatteringStartDistance',
	'inscatteringIntensity',
	'sunDirection',

	// Atmospheric
	'atmosphericEnabled',
	'extinction',
	'inscatteringCoeffs',

	// Noise
	'noiseEnabled',
	'noiseScale',
	'noiseAmplitude',
	'noiseSpeed',
	'noiseOctaves',
	'noiseLacunarity',
	'noisePersistence',

	// Wind
	'windEnabled',
	'windDirection',
	'windSpeed',
	'windTurbulence',

	// Animation
	'animationEnabled',
	'animationSpeed',
	'animationAmplitude',
	'animationWaveform',

	// Time
	'time',
];

/** Sampler names for the advanced fog post-process. */
export const ADVANCED_FOG_SAMPLERS: readonly string[] = ['depthSampler'];

// =============================================================================
// Overlay Fog — Uniforms & Samplers
// =============================================================================

/** Uniform names for the overlay fog post-process. */
export const OVERLAY_FOG_UNIFORMS: readonly string[] = [
	'time',
	'layerCount',

	// Per-layer (4 layers max) — arrays indexed [0..3]
	'layerEnabled',
	'layerOpacity',
	'layerBlendMode',
	'layerScrollX',
	'layerScrollY',
	'layerScale',
	'layerTint',
	'layerHue',
	'layerHueSpeed',
	'layerVignette',
	'layerVignetteIntensity',
];

/** Sampler names for the overlay fog post-process. */
export const OVERLAY_FOG_SAMPLERS: readonly string[] = [
	'overlayTex0',
	'overlayTex1',
	'overlayTex2',
	'overlayTex3',
];

// =============================================================================
// Advanced Fog — GLSL Fragment Shader
// =============================================================================

/* eslint-disable max-lines-per-function */
/* biome-ignore lint/style/noNonNullAssertion: GLSL string constant */
/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: GLSL string constant */

const ADVANCED_FOG_FRAGMENT_SHADER = `
precision highp float;

// Babylon.js built-ins
varying vec2 vUV;
uniform sampler2D textureSampler;

// Depth buffer
uniform sampler2D depthSampler;

// Camera / scene
uniform vec3 cameraPosition;
uniform float cameraFar;
uniform float cameraNear;
uniform mat4 invProjection;
uniform mat4 invView;

// Core fog
uniform vec3 fogColor;
uniform float fogDensity;
uniform int fogMode; // 0=none, 1=exp, 2=exp2, 3=linear
uniform float fogStart;
uniform float fogEnd;
uniform float maxOpacity;
uniform float startDistance;
uniform float cutoffDistance;
uniform int excludeSkybox; // 0 or 1
uniform float skyAffect;

// Height fog
uniform int heightFogEnabled;
uniform float heightFogBaseHeight;
uniform float heightFogFalloff;
uniform float heightFogDensity;
uniform float heightFogOffset;

// Second layer
uniform int secondLayerEnabled;
uniform float secondLayerDensity;
uniform float secondLayerHeightFalloff;
uniform float secondLayerHeightOffset;
uniform vec3 secondLayerColor;

// Inscattering
uniform int inscatteringEnabled;
uniform vec3 inscatteringColor;
uniform float inscatteringExponent;
uniform float inscatteringStartDistance;
uniform float inscatteringIntensity;
uniform vec3 sunDirection;

// Atmospheric
uniform int atmosphericEnabled;
uniform vec3 extinction;
uniform vec3 inscatteringCoeffs;

// Noise
uniform int noiseEnabled;
uniform float noiseScale;
uniform float noiseAmplitude;
uniform float noiseSpeed;
uniform int noiseOctaves;
uniform float noiseLacunarity;
uniform float noisePersistence;

// Wind
uniform int windEnabled;
uniform vec2 windDirection;
uniform float windSpeed;
uniform float windTurbulence;

// Animation
uniform int animationEnabled;
uniform float animationSpeed;
uniform float animationAmplitude;
uniform int animationWaveform; // 0=sine, 1=triangle, 2=sawtooth

// Time
uniform float time;

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Reconstruct world position from depth buffer.
 */
vec3 worldPosFromDepth(vec2 uv, float depth) {
  // NDC in [-1, 1]
  vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 viewPos = invProjection * clipPos;
  viewPos /= viewPos.w;
  vec4 worldPos = invView * viewPos;
  return worldPos.xyz;
}

/**
 * 3D hash for noise.
 */
vec3 hash3(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453123);
}

/**
 * 3D value noise.
 */
float valueNoise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f); // smoothstep

  float n000 = fract(sin(dot(i, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n100 = fract(sin(dot(i + vec3(1.0, 0.0, 0.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n010 = fract(sin(dot(i + vec3(0.0, 1.0, 0.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n110 = fract(sin(dot(i + vec3(1.0, 1.0, 0.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n001 = fract(sin(dot(i + vec3(0.0, 0.0, 1.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n101 = fract(sin(dot(i + vec3(1.0, 0.0, 1.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n011 = fract(sin(dot(i + vec3(0.0, 1.0, 1.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n111 = fract(sin(dot(i + vec3(1.0, 1.0, 1.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);

  float x0 = mix(n000, n100, u.x);
  float x1 = mix(n010, n110, u.x);
  float x2 = mix(n001, n101, u.x);
  float x3 = mix(n011, n111, u.x);

  float y0 = mix(x0, x1, u.y);
  float y1 = mix(x2, x3, u.y);

  return mix(y0, y1, u.z);
}

/**
 * Fractal Brownian Motion (FBM) using 3D value noise.
 */
float fbm(vec3 p, int octaves, float lacunarity, float persistence) {
  float value = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  float total = 0.0;

  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += valueNoise3D(p * freq) * amp;
    total += amp;
    freq *= lacunarity;
    amp *= persistence;
  }

  return value / max(total, 0.001);
}

/**
 * Height fog factor — Inigo Quilez analytical formula.
 * Returns fog amount [0, 1] for a ray from camera through world position.
 */
float heightFogFactor(vec3 rayOrigin, vec3 rayDir, float dist, float baseH, float falloff, float dens) {
  float a = falloff * (rayOrigin.y - baseH);
  float b = falloff * rayDir.y;

  // Prevent division by zero
  float bSafe = abs(b) < 0.0001 ? 0.0001 : b;

  float fogAmount = dens * (exp(-a) * (1.0 - exp(-bSafe * dist)) / bSafe);
  return clamp(fogAmount, 0.0, 1.0);
}

/**
 * Standard fog factor from mode, density, distance.
 */
float standardFogFactor(float dist, int mode, float dens, float fStart, float fEnd) {
  if (mode == 1) {
    // Exponential
    return 1.0 - exp(-dens * dist);
  } else if (mode == 2) {
    // Exponential squared
    float dd = dens * dist;
    return 1.0 - exp(-dd * dd);
  } else if (mode == 3) {
    // Linear
    return clamp((dist - fStart) / max(fEnd - fStart, 0.001), 0.0, 1.0);
  }
  return 0.0;
}

/**
 * Animated density oscillation.
 */
float animatedDensityMultiplier(float t, float speed, float amplitude, int waveform) {
  float phase = t * speed;

  float wave;
  if (waveform == 0) {
    // Sine
    wave = sin(phase * 6.28318);
  } else if (waveform == 1) {
    // Triangle
    wave = abs(fract(phase) * 2.0 - 1.0) * 2.0 - 1.0;
  } else {
    // Sawtooth
    wave = fract(phase) * 2.0 - 1.0;
  }

  return 1.0 + wave * amplitude;
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

void main(void) {
  vec4 sceneColor = texture2D(textureSampler, vUV);
  float depthValue = texture2D(depthSampler, vUV).r;

  // Early out: no fog mode
  if (fogMode == 0) {
    gl_FragColor = sceneColor;
    return;
  }

  // Skybox check — depth near 1.0 indicates far plane / skybox
  bool isSkybox = depthValue > 0.9999;

  if (isSkybox && excludeSkybox == 1) {
    // Apply partial sky affect
    if (skyAffect > 0.0) {
      float skyFog = skyAffect * maxOpacity;
      gl_FragColor = vec4(mix(sceneColor.rgb, fogColor, skyFog), sceneColor.a);
    } else {
      gl_FragColor = sceneColor;
    }
    return;
  }

  // Reconstruct world position
  vec3 worldPos = worldPosFromDepth(vUV, depthValue);
  vec3 viewDir = worldPos - cameraPosition;
  float dist = length(viewDir);
  vec3 rayDir = normalize(viewDir);

  // Start distance — no fog before this distance
  if (startDistance > 0.0 && dist < startDistance) {
    gl_FragColor = sceneColor;
    return;
  }

  // Cutoff distance — no fog beyond this distance
  float effectiveDist = dist;
  if (cutoffDistance > 0.0) {
    effectiveDist = min(dist, cutoffDistance);
  }

  // Adjust for start distance
  if (startDistance > 0.0) {
    effectiveDist = max(effectiveDist - startDistance, 0.0);
  }

  // -----------------------------------------------------------------------
  // Compute density modifier from noise + animation
  // -----------------------------------------------------------------------
  float densityMod = 1.0;

  // Noise density modulation
  if (noiseEnabled == 1) {
    vec3 noisePos = worldPos * noiseScale;

    // Wind offset shifts noise sampling position
    if (windEnabled == 1) {
      vec2 windOff = windDirection * windSpeed * time;
      // Add turbulence as small perpendicular offset
      float turb = sin(time * 3.17) * windTurbulence;
      noisePos.xz += windOff + vec2(-windDirection.y, windDirection.x) * turb;
    }

    // Temporal morphing
    noisePos.z += time * noiseSpeed;

    float n = fbm(noisePos, noiseOctaves, noiseLacunarity, noisePersistence);
    // Map [0, 1] to [1 - amplitude, 1 + amplitude]
    densityMod *= 1.0 + (n * 2.0 - 1.0) * noiseAmplitude;
  }

  // Animation — density breathing
  if (animationEnabled == 1) {
    densityMod *= animatedDensityMultiplier(time, animationSpeed, animationAmplitude, animationWaveform);
  }

  densityMod = max(densityMod, 0.0);

  // -----------------------------------------------------------------------
  // Compute primary fog factor
  // -----------------------------------------------------------------------
  float fogFactor = 0.0;

  if (heightFogEnabled == 1) {
    // Height-based fog uses Inigo Quilez formula
    fogFactor = heightFogFactor(
      cameraPosition + vec3(0.0, heightFogOffset, 0.0),
      rayDir, effectiveDist,
      heightFogBaseHeight, heightFogFalloff, heightFogDensity * densityMod
    );

    // Blend with standard distance fog
    float stdFog = standardFogFactor(effectiveDist, fogMode, fogDensity * densityMod, fogStart, fogEnd);
    fogFactor = max(fogFactor, stdFog);
  } else {
    fogFactor = standardFogFactor(effectiveDist, fogMode, fogDensity * densityMod, fogStart, fogEnd);
  }

  vec3 finalFogColor = fogColor;

  // -----------------------------------------------------------------------
  // Second fog layer
  // -----------------------------------------------------------------------
  if (secondLayerEnabled == 1) {
    float layer2Fog = heightFogFactor(
      cameraPosition,
      rayDir, effectiveDist,
      secondLayerHeightOffset, secondLayerHeightFalloff, secondLayerDensity * densityMod
    );
    // Blend second layer color
    finalFogColor = mix(finalFogColor, secondLayerColor, layer2Fog);
    fogFactor = max(fogFactor, layer2Fog);
  }

  // -----------------------------------------------------------------------
  // Directional inscattering
  // -----------------------------------------------------------------------
  if (inscatteringEnabled == 1 && dist > inscatteringStartDistance) {
    float sunDot = max(dot(rayDir, normalize(sunDirection)), 0.0);
    float scatter = pow(sunDot, inscatteringExponent) * inscatteringIntensity;
    finalFogColor += inscatteringColor * scatter;
  }

  // -----------------------------------------------------------------------
  // Atmospheric scattering (per-channel extinction / inscattering)
  // -----------------------------------------------------------------------
  if (atmosphericEnabled == 1) {
    vec3 ext = exp(-extinction * effectiveDist);
    vec3 insc = inscatteringCoeffs * (1.0 - ext);
    // Apply atmospheric to both scene and fog
    sceneColor.rgb = sceneColor.rgb * ext + insc;
    finalFogColor = finalFogColor * ext + insc;
  }

  // -----------------------------------------------------------------------
  // Clamp fog factor
  // -----------------------------------------------------------------------
  fogFactor = clamp(fogFactor, 0.0, maxOpacity);

  // -----------------------------------------------------------------------
  // Final compositing
  // -----------------------------------------------------------------------
  vec3 result = mix(sceneColor.rgb, finalFogColor, fogFactor);
  gl_FragColor = vec4(result, sceneColor.a);
}
`;

// =============================================================================
// Overlay Fog — GLSL Fragment Shader
// =============================================================================

const OVERLAY_FOG_FRAGMENT_SHADER = `
precision highp float;

// Babylon.js built-ins
varying vec2 vUV;
uniform sampler2D textureSampler;

// Overlay textures (up to 4)
uniform sampler2D overlayTex0;
uniform sampler2D overlayTex1;
uniform sampler2D overlayTex2;
uniform sampler2D overlayTex3;

// Global
uniform float time;
uniform int layerCount;

// Per-layer uniforms (arrays of 4)
uniform int layerEnabled[4];
uniform float layerOpacity[4];
uniform int layerBlendMode[4]; // 0=normal, 1=additive, 2=multiply, 3=screen
uniform float layerScrollX[4];
uniform float layerScrollY[4];
uniform float layerScale[4];
uniform vec4 layerTint[4];
uniform float layerHue[4];
uniform float layerHueSpeed[4];
uniform int layerVignette[4]; // 0=none, 1=radial, 2=border, 3=horiz, 4=vert, 5=upper, 6=lower, 7=left, 8=right
uniform float layerVignetteIntensity[4];

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * RGB to HSV conversion.
 */
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

/**
 * HSV to RGB conversion.
 */
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

/**
 * Apply hue shift to RGB color.
 */
vec3 applyHueShift(vec3 color, float hueShift) {
  if (hueShift == 0.0) return color;
  vec3 hsv = rgb2hsv(color);
  hsv.x = fract(hsv.x + hueShift / 360.0);
  return hsv2rgb(hsv);
}

/**
 * Compute vignette mask for a given UV and type.
 */
float vignetteMask(vec2 uv, int vigType, float intensity) {
  if (vigType == 0) return 1.0; // none

  float mask = 1.0;

  if (vigType == 1) {
    // Radial — darkens from center outward
    vec2 centered = uv - 0.5;
    float dist = length(centered) * 2.0;
    mask = 1.0 - smoothstep(0.3, 1.2, dist);
  } else if (vigType == 2) {
    // Border — all edges
    vec2 edge = smoothstep(vec2(0.0), vec2(0.15), uv) *
                smoothstep(vec2(0.0), vec2(0.15), 1.0 - uv);
    mask = edge.x * edge.y;
  } else if (vigType == 3) {
    // Horizontal — fades at left/right edges
    mask = smoothstep(0.0, 0.2, uv.x) * smoothstep(0.0, 0.2, 1.0 - uv.x);
  } else if (vigType == 4) {
    // Vertical — fades at top/bottom edges
    mask = smoothstep(0.0, 0.2, uv.y) * smoothstep(0.0, 0.2, 1.0 - uv.y);
  } else if (vigType == 5) {
    // Upper — visible in upper half, fades at bottom
    mask = smoothstep(0.3, 0.6, uv.y);
  } else if (vigType == 6) {
    // Lower — visible in lower half, fades at top
    mask = smoothstep(0.3, 0.6, 1.0 - uv.y);
  } else if (vigType == 7) {
    // Left — visible on left side, fades right
    mask = smoothstep(0.3, 0.6, 1.0 - uv.x);
  } else if (vigType == 8) {
    // Right — visible on right side, fades left
    mask = smoothstep(0.3, 0.6, uv.x);
  }

  return mix(1.0, mask, intensity);
}

/**
 * Sample overlay texture by layer index.
 */
vec4 sampleOverlay(int idx, vec2 uv) {
  if (idx == 0) return texture2D(overlayTex0, uv);
  if (idx == 1) return texture2D(overlayTex1, uv);
  if (idx == 2) return texture2D(overlayTex2, uv);
  return texture2D(overlayTex3, uv);
}

/**
 * Blend overlay color with scene using specified blend mode.
 */
vec3 blendLayer(vec3 base, vec3 overlay, float opacity, int mode) {
  vec3 result;

  if (mode == 0) {
    // Normal
    result = overlay;
  } else if (mode == 1) {
    // Additive
    result = base + overlay;
  } else if (mode == 2) {
    // Multiply
    result = base * overlay;
  } else {
    // Screen
    result = 1.0 - (1.0 - base) * (1.0 - overlay);
  }

  return mix(base, result, opacity);
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

void main(void) {
  vec4 sceneColor = texture2D(textureSampler, vUV);
  vec3 result = sceneColor.rgb;

  for (int i = 0; i < 4; i++) {
    if (i >= layerCount) break;
    if (layerEnabled[i] == 0) continue;

    // UV with scrolling and scale
    vec2 uv = vUV * layerScale[i];
    uv += vec2(layerScrollX[i], layerScrollY[i]) * time;
    uv = fract(uv); // Tile

    // Sample texture
    vec4 texColor = sampleOverlay(i, uv);

    // Apply tint
    vec3 tinted = texColor.rgb * layerTint[i].rgb;

    // Apply hue shift (static + animated)
    float totalHue = layerHue[i] + layerHueSpeed[i] * time;
    tinted = applyHueShift(tinted, totalHue);

    // Compute vignette mask
    float vig = vignetteMask(vUV, layerVignette[i], layerVignetteIntensity[i]);

    // Effective opacity
    float opacity = texColor.a * layerOpacity[i] * vig * layerTint[i].a;

    // Blend
    result = blendLayer(result, tinted, opacity, layerBlendMode[i]);
  }

  gl_FragColor = vec4(result, sceneColor.a);
}
`;

// =============================================================================
// Shader Registration
// =============================================================================

/** Whether the advanced fog shader has been registered. */
let advancedFogRegistered = false;

/** Whether the overlay fog shader has been registered. */
let overlayFogRegistered = false;

/**
 * Register the advanced fog fragment shader into the Babylon.js shader store.
 *
 * Idempotent — safe to call multiple times.
 */
export function registerAdvancedFogShader(): void {
	if (advancedFogRegistered) return;
	BABYLON.Effect.ShadersStore[`${ADVANCED_FOG_SHADER_NAME}FragmentShader`] =
		ADVANCED_FOG_FRAGMENT_SHADER;
	advancedFogRegistered = true;
}

/**
 * Register the overlay fog fragment shader into the Babylon.js shader store.
 *
 * Idempotent — safe to call multiple times.
 */
export function registerOverlayFogShader(): void {
	if (overlayFogRegistered) return;
	BABYLON.Effect.ShadersStore[`${OVERLAY_FOG_SHADER_NAME}FragmentShader`] =
		OVERLAY_FOG_FRAGMENT_SHADER;
	overlayFogRegistered = true;
}

// =============================================================================
// PostProcess Factory — Types
// =============================================================================

/**
 * Options for creating an advanced fog post-process.
 *
 * @example
 * ```typescript
 * const result = createAdvancedFogPostProcess({ camera, engine });
 * ```
 */
export type CreateAdvancedFogPostProcessOptions = {
	readonly camera: BABYLON.Camera;
	readonly engine: BABYLON.Engine;
};

/**
 * Options for creating an overlay fog post-process.
 *
 * @example
 * ```typescript
 * const result = createOverlayFogPostProcess({ camera, engine });
 * ```
 */
export type CreateOverlayFogPostProcessOptions = {
	readonly camera: BABYLON.Camera;
	readonly engine: BABYLON.Engine;
};

// =============================================================================
// PostProcess Factory — Advanced Fog
// =============================================================================

/**
 * Create an advanced fog post-process.
 *
 * Registers the shader on first call, then creates a new `BABYLON.PostProcess`
 * attached to the given camera. The caller is responsible for setting uniforms
 * via `pp.onApply`.
 *
 * @param options - Camera and engine references.
 * @returns `BabylonResult<BABYLON.PostProcess>` — the created post-process.
 *
 * @example
 * ```typescript
 * const result = createAdvancedFogPostProcess({ camera, engine });
 * if (!result.ok) return result;
 * const pp = result.data;
 *
 * pp.onApply = (effect) => {
 *   effect.setFloat('fogDensity', 0.02);
 *   effect.setColor3('fogColor', new BABYLON.Color3(0.8, 0.8, 0.85));
 *   // ... set all uniforms
 * };
 * ```
 */
export function createAdvancedFogPostProcess(
	options: CreateAdvancedFogPostProcessOptions,
): BabylonResult<BABYLON.PostProcess> {
	try {
		registerAdvancedFogShader();

		const postProcess: BABYLON.PostProcess = new BABYLON.PostProcess(
			'WebForgeAdvancedFog',
			ADVANCED_FOG_SHADER_NAME,
			[...ADVANCED_FOG_UNIFORMS],
			[...ADVANCED_FOG_SAMPLERS],
			1.0,
			options.camera,
			BABYLON.Texture.BILINEAR_SAMPLINGMODE,
			options.engine,
			false,
		);

		return okShallow(postProcess);
	} catch (error: unknown) {
		return err(
			ERRORS.SCENE.RENDER_FAILED,
			`Failed to create advanced fog post-process: ${fromUnknownError(error).message}`,
		);
	}
}

// =============================================================================
// PostProcess Factory — Overlay Fog
// =============================================================================

/**
 * Create an overlay fog post-process.
 *
 * Registers the shader on first call, then creates a new `BABYLON.PostProcess`
 * attached to the given camera. The caller is responsible for setting uniforms
 * and textures via `pp.onApply`.
 *
 * @param options - Camera and engine references.
 * @returns `BabylonResult<BABYLON.PostProcess>` — the created post-process.
 *
 * @example
 * ```typescript
 * const result = createOverlayFogPostProcess({ camera, engine });
 * if (!result.ok) return result;
 * const pp = result.data;
 *
 * pp.onApply = (effect) => {
 *   effect.setFloat('time', engine.getDeltaTime() / 1000);
 *   effect.setInt('layerCount', 2);
 *   effect.setIntArray('layerEnabled', [1, 1, 0, 0]);
 *   // ... set all uniforms + textures
 * };
 * ```
 */
export function createOverlayFogPostProcess(
	options: CreateOverlayFogPostProcessOptions,
): BabylonResult<BABYLON.PostProcess> {
	try {
		registerOverlayFogShader();

		const postProcess: BABYLON.PostProcess = new BABYLON.PostProcess(
			'WebForgeFogOverlay',
			OVERLAY_FOG_SHADER_NAME,
			[...OVERLAY_FOG_UNIFORMS],
			[...OVERLAY_FOG_SAMPLERS],
			1.0,
			options.camera,
			BABYLON.Texture.BILINEAR_SAMPLINGMODE,
			options.engine,
			false,
		);

		return okShallow(postProcess);
	} catch (error: unknown) {
		return err(
			ERRORS.SCENE.RENDER_FAILED,
			`Failed to create overlay fog post-process: ${fromUnknownError(error).message}`,
		);
	}
}
