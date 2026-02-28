/**
 * Transition shader module.
 *
 * Contains the GLSL fragment uber-shader for all 28 transition types,
 * a type-to-integer mapping constant, shader registration, and a
 * PostProcess factory function.
 *
 * The shader is split into two categories:
 *
 * | Category   | IDs   | Description                              |
 * |------------|-------|------------------------------------------|
 * | Mask-based | 0-13  | Grayscale mask with smoothstep threshold  |
 * | Procedural | 14-27 | Custom per-pixel math with direct output  |
 *
 * Mask-based transitions compute a 0-1 grayscale value per pixel, then
 * use `smoothstep` with `edgeSoftness` to blend between background color
 * and scene color. Procedural transitions compute their own final color.
 *
 * @example
 * ```typescript
 * import { createTransitionPostProcess, TRANSITION_TYPE_MAP } from './transition-shader';
 *
 * const result = createTransitionPostProcess({ camera, engine });
 * if (!result.ok) return result;
 * const postProcess = result.data;
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { TransitionType } from '../schemas/transition-config';

// =============================================================================
// Constants
// =============================================================================

/**
 * Shader name used for Babylon.js Effect.ShadersStore registration.
 *
 * The actual key in `ShadersStore` is `'webforgeTransitionFragmentShader'`.
 *
 * @example
 * ```typescript
 * import { TRANSITION_SHADER_NAME } from './transition-shader';
 *
 * // 'webforgeTransition'
 * console.log(TRANSITION_SHADER_NAME);
 * ```
 */
export const TRANSITION_SHADER_NAME = 'webforgeTransition';

/**
 * Maps each of the 28 transition type strings to integer IDs 0-27.
 *
 * The integer values match the `maskType` uniform in the GLSL shader.
 * Order matches {@link TransitionTypeSchema} exactly.
 *
 * @example
 * ```typescript
 * import { TRANSITION_TYPE_MAP } from './transition-shader';
 *
 * const id = TRANSITION_TYPE_MAP.circleIris; // 2
 * const fadeId = TRANSITION_TYPE_MAP.fade; // 0
 * ```
 */
export const TRANSITION_TYPE_MAP: Readonly<Record<TransitionType, number>> = {
	fade: 0,
	crossFade: 1,
	circleIris: 2,
	diamondIris: 3,
	wipe: 4,
	diagonalWipe: 5,
	doubleDoor: 6,
	noiseDissove: 7,
	ditheredFade: 8,
	venetianBlinds: 9,
	bars: 10,
	checkerboard: 11,
	radialWipe: 12,
	scanlineReveal: 13,
	pixelate: 14,
	crtPowerOff: 15,
	swirl: 16,
	zoomLines: 17,
	shatter: 18,
	wavyDistortion: 19,
	hexagonalize: 20,
	pinwheel: 21,
	polkaDots: 22,
	gridFlip: 23,
	glitch: 24,
	ripple: 25,
	wind: 26,
	chromaticBurst: 27,
};

// =============================================================================
// Uniform / Sampler Lists
// =============================================================================

/** Uniform names passed to the PostProcess constructor. */
const UNIFORM_NAMES: readonly string[] = [
	'progress',
	'maskType',
	'edgeSoftness',
	'bgColor',
	'edgeColor',
	'hasEdgeColor',
	'useCustomMask',
	'reversed',
	'direction',
	'axis',
	'openFromCenter',
	'center',
	'count',
	'gridSize',
	'angle',
	'clockwise',
	'bladeCount',
	'noiseScale',
	'noiseSeed',
	'matrixSize',
	'lineWidth',
	'maxBlockSize',
	'hasScanlines',
	'swirlStrength',
	'swirlRadius',
	'zoomLineWidth',
	'cellCount',
	'amplitude',
	'frequency',
	'waveCount',
	'glitchIntensity',
	'resolution',
];

/** Sampler names passed to the PostProcess constructor. */
const SAMPLER_NAMES: readonly string[] = ['fromTexture', 'maskTexture'];

// =============================================================================
// GLSL Fragment Shader
// =============================================================================

/* eslint-disable max-lines-per-function */
/* biome-ignore lint/style/noNonNullAssertion: GLSL string constant */
/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: GLSL string constant */

const TRANSITION_FRAGMENT_SHADER = `
precision highp float;

// Babylon.js built-ins
varying vec2 vUV;
uniform sampler2D textureSampler;

// Additional samplers
uniform sampler2D fromTexture;
uniform sampler2D maskTexture;

// Shared uniforms
uniform float progress;
uniform int maskType;
uniform float edgeSoftness;
uniform vec3 bgColor;
uniform vec3 edgeColor;
uniform float hasEdgeColor;
uniform float useCustomMask;
uniform float reversed;

// Type-specific uniforms
uniform float direction;   // 0=left, 1=right, 2=up, 3=down
uniform float axis;        // 0=horizontal, 1=vertical
uniform float openFromCenter;
uniform vec2 center;
uniform float count;
uniform float gridSize;
uniform float angle;
uniform float clockwise;
uniform float bladeCount;
uniform float noiseScale;
uniform float noiseSeed;
uniform float matrixSize;
uniform float lineWidth;
uniform float maxBlockSize;
uniform float hasScanlines;
uniform float swirlStrength;
uniform float swirlRadius;
uniform float zoomLineWidth;
uniform float cellCount;
uniform float amplitude;
uniform float frequency;
uniform float waveCount;
uniform float glitchIntensity;
uniform vec2 resolution;

// =========================================================================
// Helper Functions
// =========================================================================

float hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec2 voronoiCell(vec2 p, float scale) {
	vec2 ip = floor(p * scale);
	vec2 fp = fract(p * scale);
	float minDist = 1.0e10;
	vec2 nearest = vec2(0.0);
	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 neighbor = vec2(float(x), float(y));
			vec2 point = vec2(hash(ip + neighbor), hash(ip + neighbor + vec2(127.1, 311.7)));
			vec2 diff = neighbor + point - fp;
			float dist = dot(diff, diff);
			if (dist < minDist) {
				minDist = dist;
				nearest = ip + neighbor + point;
			}
		}
	}
	return nearest;
}

float bayerMatrix(vec2 coord, float size) {
	vec2 px = floor(coord);
	if (size < 3.0) {
		// 2x2 Bayer
		int ix = int(mod(px.x, 2.0));
		int iy = int(mod(px.y, 2.0));
		if (ix == 0 && iy == 0) return 0.0 / 4.0;
		if (ix == 1 && iy == 0) return 2.0 / 4.0;
		if (ix == 0 && iy == 1) return 3.0 / 4.0;
		return 1.0 / 4.0;
	} else if (size < 6.0) {
		// 4x4 Bayer
		int ix = int(mod(px.x, 4.0));
		int iy = int(mod(px.y, 4.0));
		int idx = iy * 4 + ix;
		// Bayer 4x4 matrix values / 16
		if (idx == 0) return 0.0 / 16.0;
		if (idx == 1) return 8.0 / 16.0;
		if (idx == 2) return 2.0 / 16.0;
		if (idx == 3) return 10.0 / 16.0;
		if (idx == 4) return 12.0 / 16.0;
		if (idx == 5) return 4.0 / 16.0;
		if (idx == 6) return 14.0 / 16.0;
		if (idx == 7) return 6.0 / 16.0;
		if (idx == 8) return 3.0 / 16.0;
		if (idx == 9) return 11.0 / 16.0;
		if (idx == 10) return 1.0 / 16.0;
		if (idx == 11) return 9.0 / 16.0;
		if (idx == 12) return 15.0 / 16.0;
		if (idx == 13) return 7.0 / 16.0;
		if (idx == 14) return 13.0 / 16.0;
		return 5.0 / 16.0;
	} else {
		// 8x8 hash-based approximation
		return hash(floor(mod(px, 8.0)));
	}
}

// =========================================================================
// Main
// =========================================================================

void main(void) {
	vec2 uv = vUV;
	float prog = reversed > 0.5 ? 1.0 - progress : progress;
	vec4 sceneColor = texture2D(textureSampler, uv);
	float aspectRatio = resolution.x / resolution.y;

	// ----- Custom mask override -----
	if (useCustomMask > 0.5) {
		float customMask = texture2D(maskTexture, uv).r;
		float t = smoothstep(prog - edgeSoftness, prog + edgeSoftness, customMask);

		vec4 result;
		if (maskType == 1) {
			vec4 fromColor = texture2D(fromTexture, uv);
			result = mix(fromColor, sceneColor, t);
		} else {
			result = mix(vec4(bgColor, 1.0), sceneColor, t);
		}

		// Edge color
		if (hasEdgeColor > 0.5) {
			float edgeBand = smoothstep(prog - edgeSoftness * 3.0, prog - edgeSoftness, customMask)
				* (1.0 - smoothstep(prog + edgeSoftness, prog + edgeSoftness * 3.0, customMask));
			result.rgb = mix(result.rgb, edgeColor, edgeBand);
		}
		gl_FragColor = result;
		return;
	}

	// ===================================================================
	// Mask-based transitions (types 0-13)
	// ===================================================================
	if (maskType <= 13) {
		float mask = 0.0;

		// 0: fade
		if (maskType == 0) {
			mask = 0.5;
		}
		// 1: crossFade
		else if (maskType == 1) {
			mask = 0.5;
		}
		// 2: circleIris
		else if (maskType == 2) {
			vec2 diff = uv - center;
			diff.x *= aspectRatio;
			float maxDist = length(vec2(max(center.x, 1.0 - center.x) * aspectRatio,
				max(center.y, 1.0 - center.y)));
			mask = length(diff) / maxDist;
		}
		// 3: diamondIris
		else if (maskType == 3) {
			vec2 diff = abs(uv - center);
			diff.x *= aspectRatio;
			float maxDist = max(center.x, 1.0 - center.x) * aspectRatio
				+ max(center.y, 1.0 - center.y);
			mask = (diff.x + diff.y) / maxDist;
		}
		// 4: wipe
		else if (maskType == 4) {
			if (direction < 0.5) mask = uv.x;            // left
			else if (direction < 1.5) mask = 1.0 - uv.x; // right
			else if (direction < 2.5) mask = 1.0 - uv.y; // up
			else mask = uv.y;                             // down
		}
		// 5: diagonalWipe
		else if (maskType == 5) {
			float rad = angle * 3.14159265 / 180.0;
			vec2 dir = vec2(cos(rad), sin(rad));
			mask = dot(uv - 0.5, dir) + 0.5;
			mask = clamp(mask, 0.0, 1.0);
		}
		// 6: doubleDoor
		else if (maskType == 6) {
			float dist;
			if (axis < 0.5) {
				dist = abs(uv.x - 0.5) * 2.0;
			} else {
				dist = abs(uv.y - 0.5) * 2.0;
			}
			mask = openFromCenter > 0.5 ? 1.0 - dist : dist;
		}
		// 7: noiseDissove
		else if (maskType == 7) {
			mask = valueNoise((uv + vec2(noiseSeed)) * noiseScale);
		}
		// 8: ditheredFade
		else if (maskType == 8) {
			mask = bayerMatrix(uv * resolution, matrixSize);
		}
		// 9: venetianBlinds
		else if (maskType == 9) {
			float coord = axis < 0.5 ? uv.y : uv.x;
			mask = fract(coord * count);
		}
		// 10: bars
		else if (maskType == 10) {
			float coord = axis < 0.5 ? uv.y : uv.x;
			float barIdx = floor(coord * count);
			float offset = hash(vec2(barIdx, 0.0)) * 0.4;
			float barLocal = fract(coord * count);
			mask = barLocal * 0.6 + offset;
		}
		// 11: checkerboard
		else if (maskType == 11) {
			vec2 cell = floor(uv * gridSize);
			float checker = mod(cell.x + cell.y, 2.0);
			float stagger = hash(cell) * 0.3;
			mask = checker * 0.5 + stagger;
		}
		// 12: radialWipe
		else if (maskType == 12) {
			vec2 diff = uv - center;
			diff.x *= aspectRatio;
			float a = atan(diff.y, diff.x);
			float startRad = angle * 3.14159265 / 180.0;
			a -= startRad;
			if (clockwise < 0.5) a = -a;
			mask = (a + 3.14159265) / (2.0 * 3.14159265);
			mask = fract(mask);
		}
		// 13: scanlineReveal
		else if (maskType == 13) {
			mask = uv.y;
		}

		// Apply smoothstep threshold
		float t = smoothstep(prog - edgeSoftness, prog + edgeSoftness, mask);

		// Color output
		vec4 result;
		if (maskType == 0) {
			// fade: gradual blend across full duration (bypass smoothstep)
			result = mix(sceneColor, vec4(bgColor, 1.0), prog);
		} else if (maskType == 1) {
			// crossFade: blend from captured frame to current scene
			vec4 fromColor = texture2D(fromTexture, uv);
			result = mix(fromColor, sceneColor, prog);
		} else {
			result = mix(vec4(bgColor, 1.0), sceneColor, t);
		}

		// Edge color overlay
		if (hasEdgeColor > 0.5 && maskType != 0 && maskType != 1) {
			float edgeBand = smoothstep(prog - edgeSoftness * 3.0, prog - edgeSoftness, mask)
				* (1.0 - smoothstep(prog + edgeSoftness, prog + edgeSoftness * 3.0, mask));
			result.rgb = mix(result.rgb, edgeColor, edgeBand);
		}

		gl_FragColor = result;
		return;
	}

	// ===================================================================
	// Procedural transitions (types 14-27)
	// ===================================================================

	// 14: pixelate
	if (maskType == 14) {
		float blockSize = max(1.0, maxBlockSize * prog);
		vec2 pixelUV = floor(uv * resolution / blockSize) * blockSize / resolution;
		vec4 pixelColor = texture2D(textureSampler, pixelUV);
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(pixelColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 15: crtPowerOff
	if (maskType == 15) {
		vec2 crtUV = uv;
		float phase1 = clamp(prog * 2.0, 0.0, 1.0);
		float phase2 = clamp(prog * 2.0 - 1.0, 0.0, 1.0);

		// Phase 1: vertical squeeze
		float vScale = mix(1.0, 0.005, phase1);
		crtUV.y = 0.5 + (crtUV.y - 0.5) / max(vScale, 0.001);

		// Phase 2: horizontal squeeze
		float hScale = mix(1.0, 0.0, phase2);
		crtUV.x = 0.5 + (crtUV.x - 0.5) / max(hScale, 0.001);

		vec4 crtColor;
		if (crtUV.x < 0.0 || crtUV.x > 1.0 || crtUV.y < 0.0 || crtUV.y > 1.0) {
			crtColor = vec4(bgColor, 1.0);
		} else {
			crtColor = texture2D(textureSampler, crtUV);
			// Scanline overlay
			if (hasScanlines > 0.5) {
				float scanline = sin(crtUV.y * resolution.y * 3.14159265 / lineWidth) * 0.5 + 0.5;
				crtColor.rgb *= 0.8 + 0.2 * scanline;
			}
		}
		gl_FragColor = crtColor;
		return;
	}

	// 16: swirl
	if (maskType == 16) {
		vec2 swirlUV = uv;
		vec2 diff = swirlUV - center;
		diff.x *= aspectRatio;
		float dist = length(diff);
		float falloff = smoothstep(swirlRadius, 0.0, dist);
		float theta = swirlStrength * prog * falloff;
		float s = sin(theta);
		float c = cos(theta);
		diff.x /= aspectRatio;
		vec2 rotated = vec2(diff.x * c - diff.y * s, diff.x * s + diff.y * c);
		swirlUV = center + rotated;

		vec4 swirlColor;
		if (swirlUV.x < 0.0 || swirlUV.x > 1.0 || swirlUV.y < 0.0 || swirlUV.y > 1.0) {
			swirlColor = vec4(bgColor, 1.0);
		} else {
			swirlColor = texture2D(textureSampler, swirlUV);
		}
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(swirlColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 17: zoomLines
	if (maskType == 17) {
		vec2 diff = uv - center;
		diff.x *= aspectRatio;
		float dist = length(diff);
		float a = atan(diff.y, diff.x);
		float linePattern = sin(a * count) * 0.5 + 0.5;
		float lineMask = smoothstep(zoomLineWidth, 0.0, linePattern * prog);
		float zoom = 1.0 + prog * 0.3;
		vec2 zoomUV = center + (uv - center) / zoom;
		vec4 zoomColor = texture2D(textureSampler, zoomUV);
		float fadeOut = smoothstep(0.6, 1.0, prog);
		vec4 lineColor = mix(zoomColor, vec4(bgColor, 1.0), lineMask * prog);
		gl_FragColor = mix(lineColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 18: shatter
	if (maskType == 18) {
		vec2 cell = voronoiCell(uv, cellCount);
		float cellHash = hash(cell);
		float threshold = cellHash;
		if (prog > threshold) {
			float cellProg = (prog - threshold) / (1.0 - threshold);
			vec2 offset = vec2(
				(hash(cell + vec2(1.0, 0.0)) - 0.5) * cellProg,
				cellProg * cellProg * 2.0
			);
			vec2 shatterUV = uv + offset;
			if (shatterUV.x < 0.0 || shatterUV.x > 1.0 || shatterUV.y < 0.0 || shatterUV.y > 1.0) {
				gl_FragColor = vec4(bgColor, 1.0);
			} else {
				vec4 shatterColor = texture2D(textureSampler, shatterUV);
				float alpha = 1.0 - cellProg;
				gl_FragColor = mix(vec4(bgColor, 1.0), shatterColor, alpha);
			}
		} else {
			gl_FragColor = sceneColor;
		}
		return;
	}

	// 19: wavyDistortion
	if (maskType == 19) {
		float xOffset = sin(uv.y * frequency + prog * 20.0) * amplitude * prog;
		vec2 wavyUV = vec2(uv.x + xOffset, uv.y);
		vec4 wavyColor;
		if (wavyUV.x < 0.0 || wavyUV.x > 1.0) {
			wavyColor = vec4(bgColor, 1.0);
		} else {
			wavyColor = texture2D(textureSampler, wavyUV);
		}
		float fadeOut = smoothstep(0.6, 1.0, prog);
		gl_FragColor = mix(wavyColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 20: hexagonalize
	if (maskType == 20) {
		vec2 hexUV = uv * gridSize;
		vec2 hexCell = floor(hexUV);
		float threshold = hash(hexCell);
		if (prog > threshold) {
			gl_FragColor = vec4(bgColor, 1.0);
		} else {
			gl_FragColor = sceneColor;
		}
		return;
	}

	// 21: pinwheel
	if (maskType == 21) {
		vec2 diff = uv - center;
		diff.x *= aspectRatio;
		float a = atan(diff.y, diff.x);
		float sector = fract(a * bladeCount / (2.0 * 3.14159265));
		float dist = length(diff);
		float mask = sector + dist * 0.5;
		float t = smoothstep(prog - edgeSoftness, prog + edgeSoftness, mask);
		gl_FragColor = mix(vec4(bgColor, 1.0), sceneColor, t);
		return;
	}

	// 22: polkaDots
	if (maskType == 22) {
		vec2 dotUV = fract(uv * cellCount);
		float dotDist = length(dotUV - 0.5);
		float dotRadius = prog * 0.5;
		float t = smoothstep(dotRadius - edgeSoftness, dotRadius + edgeSoftness, dotDist);
		gl_FragColor = mix(vec4(bgColor, 1.0), sceneColor, t);
		return;
	}

	// 23: gridFlip
	if (maskType == 23) {
		vec2 cell = floor(uv * gridSize);
		float cellHash = hash(cell);
		float stagger = cellHash * 0.6;
		float cellProg = clamp((prog - stagger) / (1.0 - stagger), 0.0, 1.0);
		vec2 cellUV = fract(uv * gridSize);

		if (cellProg < 0.5) {
			// First half: scale X down
			float scale = 1.0 - cellProg * 2.0;
			float newX = 0.5 + (cellUV.x - 0.5) / max(scale, 0.001);
			if (newX < 0.0 || newX > 1.0) {
				gl_FragColor = vec4(bgColor, 1.0);
			} else {
				vec2 sampleUV = (cell + vec2(newX, cellUV.y)) / gridSize;
				gl_FragColor = texture2D(textureSampler, sampleUV);
			}
		} else {
			// Second half: flipped to bg
			gl_FragColor = vec4(bgColor, 1.0);
		}
		return;
	}

	// 24: glitch
	if (maskType == 24) {
		float intensity = glitchIntensity * prog;
		float blockY = floor(uv.y * 20.0 + prog * 7.0);
		float blockShift = (hash(vec2(blockY, prog * 100.0)) - 0.5) * intensity * 0.3;

		vec2 glitchUV = uv;
		if (hash(vec2(blockY, floor(prog * 10.0))) > 0.5) {
			glitchUV.x += blockShift;
		}
		glitchUV = clamp(glitchUV, 0.0, 1.0);

		// RGB channel separation
		float chromaShift = intensity * 0.02;
		float r = texture2D(textureSampler, glitchUV + vec2(chromaShift, 0.0)).r;
		float g = texture2D(textureSampler, glitchUV).g;
		float b = texture2D(textureSampler, glitchUV - vec2(chromaShift, 0.0)).b;

		vec4 glitchColor = vec4(r, g, b, 1.0);
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(glitchColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 25: ripple
	if (maskType == 25) {
		vec2 diff = uv - center;
		diff.x *= aspectRatio;
		float dist = length(diff);
		float rippleOffset = sin(dist * waveCount * 2.0 * 3.14159265 - prog * 20.0)
			* amplitude * prog;
		vec2 dir = dist > 0.001 ? normalize(diff) : vec2(0.0);
		dir.x /= aspectRatio;
		vec2 rippleUV = uv + dir * rippleOffset;
		rippleUV = clamp(rippleUV, 0.0, 1.0);
		vec4 rippleColor = texture2D(textureSampler, rippleUV);
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(rippleColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 26: wind
	if (maskType == 26) {
		float windDir = direction < 1.5 ? 1.0 : -1.0;
		float row = floor(uv.y * resolution.y);
		float rowHash = hash(vec2(row, 0.0));
		float rowPhase = rowHash * 0.5;
		float windProg = clamp((prog - rowPhase) / (1.0 - rowPhase), 0.0, 1.0);
		float offset = windDir * windProg * (0.5 + rowHash * 0.5);
		vec2 windUV = vec2(uv.x + offset, uv.y);

		if (windUV.x < 0.0 || windUV.x > 1.0) {
			gl_FragColor = vec4(bgColor, 1.0);
		} else {
			gl_FragColor = texture2D(textureSampler, windUV);
		}
		return;
	}

	// 27: chromaticBurst
	if (maskType == 27) {
		vec2 diff = uv - center;
		float separation = prog * 0.05;
		vec2 dir = length(diff) > 0.001 ? normalize(diff) : vec2(1.0, 0.0);
		float r = texture2D(textureSampler, uv + dir * separation).r;
		float g = texture2D(textureSampler, uv).g;
		float b = texture2D(textureSampler, uv - dir * separation).b;
		vec4 chromaColor = vec4(r, g, b, 1.0);
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(chromaColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// Fallback: pass through
	gl_FragColor = sceneColor;
}
`;

// =============================================================================
// Registration
// =============================================================================

/** Module-level flag to ensure the shader is only registered once. */
let shaderRegistered = false;

/**
 * Registers the transition GLSL fragment shader in Babylon.js ShadersStore.
 *
 * Idempotent: calling multiple times has no additional effect after
 * the first registration.
 *
 * @example
 * ```typescript
 * import { registerTransitionShader } from './transition-shader';
 *
 * registerTransitionShader();
 * // Shader is now available as 'webforgeTransition' in Effect.ShadersStore
 * ```
 */
export function registerTransitionShader(): void {
	if (shaderRegistered) {
		return;
	}
	BABYLON.Effect.ShadersStore[`${TRANSITION_SHADER_NAME}FragmentShader`] =
		TRANSITION_FRAGMENT_SHADER;
	shaderRegistered = true;
}

// =============================================================================
// PostProcess Factory
// =============================================================================

/** Options for {@link createTransitionPostProcess}. */
type CreateTransitionPostProcessOptions = {
	readonly camera: BABYLON.Camera;
	readonly engine: BABYLON.Engine;
};

/**
 * Creates a Babylon.js PostProcess configured for the transition uber-shader.
 *
 * Registers the shader if not already registered, then constructs a
 * `BABYLON.PostProcess` with all required uniforms and samplers.
 *
 * @param options - Camera and engine to attach the post-process to.
 * @returns BabylonResult containing the created PostProcess, or an error.
 *
 * @example
 * ```typescript
 * import { createTransitionPostProcess } from './transition-shader';
 *
 * const result = createTransitionPostProcess({ camera, engine });
 * if (!result.ok) return result;
 * const postProcess = result.data;
 *
 * // Set uniforms via postProcess.onApply
 * postProcess.onApply = (effect) => {
 *   effect.setFloat('progress', 0.5);
 *   effect.setInt('maskType', 0);
 * };
 * ```
 */
export function createTransitionPostProcess(
	options: CreateTransitionPostProcessOptions,
): BabylonResult<BABYLON.PostProcess> {
	try {
		registerTransitionShader();

		const postProcess = new BABYLON.PostProcess(
			'WebForgeTransition',
			TRANSITION_SHADER_NAME,
			[...UNIFORM_NAMES],
			[...SAMPLER_NAMES],
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
			`Failed to create transition post-process: ${fromUnknownError(error).message}`,
		);
	}
}
