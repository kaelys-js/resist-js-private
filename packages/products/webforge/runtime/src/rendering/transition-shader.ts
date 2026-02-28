/**
 * Transition shader module.
 *
 * Contains the GLSL fragment uber-shader for all 53 transition types,
 * a type-to-integer mapping constant, shader registration, and a
 * PostProcess factory function.
 *
 * The shader is split into two categories:
 *
 * | Category   | IDs   | Description                              |
 * |------------|-------|------------------------------------------|
 * | Mask-based | 0-21  | Grayscale mask with smoothstep threshold  |
 * | Procedural | 22-52 | Custom per-pixel math with direct output  |
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
 * Maps each of the 53 transition type strings to integer IDs 0-52.
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
	// Mask-based (0-21)
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
	randomBlocks: 14,
	crossSplit: 15,
	heartIris: 16,
	starIris: 17,
	crossIris: 18,
	clockWipe: 19,
	diagonalBlinds: 20,
	bowTie: 21,
	// Procedural (22-52)
	pixelate: 22,
	crtPowerOff: 23,
	swirl: 24,
	zoomLines: 25,
	shatter: 26,
	wavyDistortion: 27,
	hexagonalize: 28,
	pinwheel: 29,
	polkaDots: 30,
	gridFlip: 31,
	glitch: 32,
	ripple: 33,
	wind: 34,
	chromaticBurst: 35,
	zoom: 36,
	spiralWipe: 37,
	curtain: 38,
	dreamDissolve: 39,
	filmBurn: 40,
	overexposure: 41,
	doomMelt: 42,
	tvStatic: 43,
	matrixRain: 44,
	mosaic: 45,
	burn: 46,
	waterDrop: 47,
	squeeze: 48,
	flyEye: 49,
	crosshatch: 50,
	luminanceMelt: 51,
	pageFlip: 52,
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
	'pointCount',
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
uniform float pointCount;
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
	// Mask-based transitions (types 0-21)
	// ===================================================================
	if (maskType <= 21) {
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
		// 14: randomBlocks
		else if (maskType == 14) {
			vec2 cell = floor(uv * gridSize);
			mask = hash(cell);
		}
		// 15: crossSplit (4-quadrant split from center)
		else if (maskType == 15) {
			float dx = abs(uv.x - 0.5) * 2.0;
			float dy = abs(uv.y - 0.5) * 2.0;
			mask = openFromCenter > 0.5 ? 1.0 - max(dx, dy) : max(dx, dy);
		}
		// 16: heartIris
		else if (maskType == 16) {
			vec2 p = (uv - center) * 2.0;
			p.x *= aspectRatio;
			p.y -= 0.35;
			float a = atan(p.x, p.y) / 3.14159265;
			float r = length(p);
			float h = abs(a);
			float heartShape = (13.0 * h - 22.0 * h * h + 10.0 * h * h * h) / (6.0 - 5.0 * h);
			float d = r - heartShape * 0.5;
			mask = clamp(d + 0.5, 0.0, 1.0);
		}
		// 17: starIris
		else if (maskType == 17) {
			vec2 p = uv - center;
			p.x *= aspectRatio;
			float a = atan(p.y, p.x);
			float r = length(p);
			float n = pointCount;
			float star = cos(3.14159265 / n) / cos(mod(a, 2.0 * 3.14159265 / n) - 3.14159265 / n);
			float maxDist = length(vec2(max(center.x, 1.0 - center.x) * aspectRatio, max(center.y, 1.0 - center.y)));
			mask = (r / (star * 0.4)) / maxDist;
			mask = clamp(mask, 0.0, 1.0);
		}
		// 18: crossIris (plus/cross shape)
		else if (maskType == 18) {
			vec2 p = abs(uv - center);
			p.x *= aspectRatio;
			float crossDist = min(p.x, p.y);
			float maxDist = max(center.x, 1.0 - center.x) * aspectRatio * 0.5;
			mask = crossDist / maxDist;
			mask = clamp(mask, 0.0, 1.0);
		}
		// 19: clockWipe
		else if (maskType == 19) {
			vec2 diff = uv - center;
			diff.x *= aspectRatio;
			float a = atan(diff.y, diff.x);
			float startRad = -3.14159265 / 2.0;
			a -= startRad;
			if (clockwise < 0.5) a = -a;
			mask = (a + 3.14159265) / (2.0 * 3.14159265);
			mask = fract(mask);
		}
		// 20: diagonalBlinds
		else if (maskType == 20) {
			float rad = angle * 3.14159265 / 180.0;
			float coord = uv.x * cos(rad) + uv.y * sin(rad);
			mask = fract(coord * count);
		}
		// 21: bowTie (two triangles meeting at center)
		else if (maskType == 21) {
			vec2 p = uv - 0.5;
			if (axis < 0.5) {
				// Horizontal bow-tie
				float d = abs(p.y) / (abs(p.x) + 0.001);
				mask = clamp(d, 0.0, 1.0);
			} else {
				// Vertical bow-tie
				float d = abs(p.x) / (abs(p.y) + 0.001);
				mask = clamp(d, 0.0, 1.0);
			}
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
	// Procedural transitions (types 22-52)
	// ===================================================================

	// 22: pixelate
	if (maskType == 22) {
		float blockSize = max(1.0, maxBlockSize * prog);
		vec2 pixelUV = floor(uv * resolution / blockSize) * blockSize / resolution;
		vec4 pixelColor = texture2D(textureSampler, pixelUV);
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(pixelColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 23: crtPowerOff
	if (maskType == 23) {
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

	// 24: swirl
	if (maskType == 24) {
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

	// 25: zoomLines
	if (maskType == 25) {
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

	// 26: shatter
	if (maskType == 26) {
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

	// 27: wavyDistortion
	if (maskType == 27) {
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

	// 28: hexagonalize
	if (maskType == 28) {
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

	// 29: pinwheel
	if (maskType == 29) {
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

	// 30: polkaDots
	if (maskType == 30) {
		vec2 dotUV = fract(uv * cellCount);
		float dotDist = length(dotUV - 0.5);
		float dotRadius = prog * 0.5;
		float t = smoothstep(dotRadius - edgeSoftness, dotRadius + edgeSoftness, dotDist);
		gl_FragColor = mix(vec4(bgColor, 1.0), sceneColor, t);
		return;
	}

	// 31: gridFlip
	if (maskType == 31) {
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

	// 32: glitch
	if (maskType == 32) {
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

	// 33: ripple
	if (maskType == 33) {
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

	// 34: wind
	if (maskType == 34) {
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

	// 35: chromaticBurst
	if (maskType == 35) {
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

	// 36: zoom
	if (maskType == 36) {
		float scale = 1.0 + prog * 3.0;
		vec2 zoomUV = center + (uv - center) / scale;
		vec4 zoomColor;
		if (zoomUV.x < 0.0 || zoomUV.x > 1.0 || zoomUV.y < 0.0 || zoomUV.y > 1.0) {
			zoomColor = vec4(bgColor, 1.0);
		} else {
			zoomColor = texture2D(textureSampler, zoomUV);
		}
		float fadeOut = smoothstep(0.6, 1.0, prog);
		gl_FragColor = mix(zoomColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 37: spiralWipe
	if (maskType == 37) {
		vec2 diff = uv - center;
		diff.x *= aspectRatio;
		float dist = length(diff);
		float a = atan(diff.y, diff.x);
		if (clockwise < 0.5) a = -a;
		float spiral = fract((a / (2.0 * 3.14159265) + dist * 3.0) * 0.5 + 0.5);
		float t = smoothstep(prog - edgeSoftness, prog + edgeSoftness, spiral);
		gl_FragColor = mix(vec4(bgColor, 1.0), sceneColor, t);
		return;
	}

	// 38: curtain
	if (maskType == 38) {
		float coord;
		if (axis < 0.5) {
			coord = uv.x;
		} else {
			coord = uv.y;
		}
		float wave = sin(coord * 3.14159265 * 4.0) * 0.03 * (1.0 - prog);
		float curtainProg = prog + wave;
		float dist = abs(coord - 0.5) * 2.0;
		float mask = openFromCenter > 0.5 ? 1.0 - dist : dist;
		float t = smoothstep(curtainProg - edgeSoftness, curtainProg + edgeSoftness, mask);
		gl_FragColor = mix(vec4(bgColor, 1.0), sceneColor, t);
		return;
	}

	// 39: dreamDissolve
	if (maskType == 39) {
		float wave1 = sin(uv.x * frequency + prog * 8.0) * amplitude;
		float wave2 = sin(uv.y * frequency * 1.3 + prog * 6.0) * amplitude;
		vec2 dreamUV = vec2(uv.x + wave1 * prog, uv.y + wave2 * prog);
		dreamUV = clamp(dreamUV, 0.0, 1.0);
		vec4 dreamColor = texture2D(textureSampler, dreamUV);
		// Desaturate as transition progresses
		float gray = dot(dreamColor.rgb, vec3(0.299, 0.587, 0.114));
		dreamColor.rgb = mix(dreamColor.rgb, vec3(gray), prog * 0.5);
		float fadeOut = smoothstep(0.5, 1.0, prog);
		gl_FragColor = mix(dreamColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 40: filmBurn
	if (maskType == 40) {
		float n1 = valueNoise((uv + vec2(noiseSeed)) * noiseScale + prog * 2.0);
		float n2 = valueNoise((uv + vec2(noiseSeed + 7.0)) * noiseScale * 2.0 + prog * 3.0);
		float burnMask = n1 * 0.7 + n2 * 0.3;
		float threshold = prog * 1.4;
		float burnEdge = smoothstep(threshold - 0.15, threshold, burnMask);
		// Orange-hot edge
		vec3 hotColor = vec3(1.0, 0.6, 0.1);
		float edgeBand = smoothstep(threshold - 0.15, threshold - 0.05, burnMask)
			* (1.0 - smoothstep(threshold - 0.05, threshold, burnMask));
		vec4 burnColor = mix(vec4(bgColor, 1.0), sceneColor, burnEdge);
		burnColor.rgb = mix(burnColor.rgb, hotColor, edgeBand * 0.8);
		// Overexpose near burn
		float overexpose = smoothstep(threshold - 0.2, threshold - 0.1, burnMask) * (1.0 - burnEdge);
		burnColor.rgb += vec3(overexpose * 0.3);
		gl_FragColor = burnColor;
		return;
	}

	// 41: overexposure
	if (maskType == 41) {
		vec4 overColor = sceneColor;
		float exposure = prog * 4.0;
		overColor.rgb *= (1.0 + exposure);
		overColor.rgb = clamp(overColor.rgb, 0.0, 1.0);
		float fadeOut = smoothstep(0.6, 1.0, prog);
		gl_FragColor = mix(overColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 42: doomMelt
	if (maskType == 42) {
		float col = floor(uv.x * gridSize);
		float colDelay = hash(vec2(col, noiseSeed)) * 0.5;
		float colProg = clamp((prog - colDelay) / (1.0 - colDelay), 0.0, 1.0);
		float meltOffset = colProg * colProg * 1.5;
		vec2 meltUV = vec2(uv.x, uv.y - meltOffset);
		if (meltUV.y < 0.0) {
			gl_FragColor = vec4(bgColor, 1.0);
		} else {
			gl_FragColor = texture2D(textureSampler, meltUV);
		}
		return;
	}

	// 43: tvStatic
	if (maskType == 43) {
		float staticNoise = hash(uv * resolution + vec2(prog * 1000.0));
		float scanline = sin(uv.y * resolution.y * 3.14159265 / 2.0) * 0.5 + 0.5;
		vec4 staticColor = vec4(vec3(staticNoise * scanline), 1.0);
		float blend = prog;
		gl_FragColor = mix(sceneColor, staticColor, blend);
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(gl_FragColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 44: matrixRain
	if (maskType == 44) {
		float col = floor(uv.x * gridSize);
		float colHash = hash(vec2(col, noiseSeed));
		float speed = 0.5 + colHash * 1.5;
		float colStart = colHash * 0.6;
		float colProg = clamp((prog - colStart) / (1.0 - colStart), 0.0, 1.0);
		float rainY = 1.0 - colProg * speed;
		float trail = smoothstep(rainY - 0.3, rainY, uv.y);
		float head = smoothstep(rainY - 0.02, rainY, uv.y) * (1.0 - smoothstep(rainY, rainY + 0.02, uv.y));
		// Green tint for rain
		vec3 rainColor = vec3(0.0, 1.0, 0.3);
		vec4 result = sceneColor;
		result.rgb = mix(result.rgb, rainColor, trail * prog * 0.5);
		result.rgb += rainColor * head * 0.5;
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(result, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 45: mosaic
	if (maskType == 45) {
		vec2 cell = floor(uv * gridSize);
		float cellHash = hash(cell);
		float threshold = cellHash;
		if (prog > threshold) {
			float cellProg = (prog - threshold) / (1.0 - threshold);
			// Flip effect: scale Y within cell
			vec2 cellUV = fract(uv * gridSize);
			float flipScale = abs(1.0 - cellProg * 2.0);
			if (flipScale < 0.01) {
				gl_FragColor = vec4(bgColor, 1.0);
			} else if (cellProg < 0.5) {
				float newY = 0.5 + (cellUV.y - 0.5) / flipScale;
				if (newY < 0.0 || newY > 1.0) {
					gl_FragColor = vec4(bgColor, 1.0);
				} else {
					vec2 sampleUV = (cell + vec2(cellUV.x, newY)) / gridSize;
					gl_FragColor = texture2D(textureSampler, sampleUV);
				}
			} else {
				gl_FragColor = vec4(bgColor, 1.0);
			}
		} else {
			gl_FragColor = sceneColor;
		}
		return;
	}

	// 46: burn
	if (maskType == 46) {
		float noise = valueNoise((uv + vec2(noiseSeed)) * noiseScale);
		float burnThreshold = prog * 1.3;
		float burnMask = smoothstep(burnThreshold - 0.1, burnThreshold, noise);
		vec3 burnEdgeColor = vec3(1.0, 0.3, 0.0);
		float edge = smoothstep(burnThreshold - 0.1, burnThreshold - 0.02, noise)
			* (1.0 - smoothstep(burnThreshold - 0.02, burnThreshold, noise));
		vec4 result = mix(vec4(bgColor, 1.0), sceneColor, burnMask);
		result.rgb = mix(result.rgb, burnEdgeColor, edge);
		gl_FragColor = result;
		return;
	}

	// 47: waterDrop
	if (maskType == 47) {
		vec2 diff = uv - center;
		diff.x *= aspectRatio;
		float dist = length(diff);
		float rippleWave = sin(dist * 30.0 - prog * 20.0) * amplitude * (1.0 - prog);
		float ring = smoothstep(0.0, prog * 1.5, dist);
		vec2 dir = dist > 0.001 ? normalize(diff) : vec2(0.0);
		dir.x /= aspectRatio;
		vec2 dropUV = uv + dir * rippleWave * ring;
		dropUV = clamp(dropUV, 0.0, 1.0);
		vec4 dropColor = texture2D(textureSampler, dropUV);
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(dropColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 48: squeeze
	if (maskType == 48) {
		vec2 squeezeUV = uv;
		if (axis < 0.5) {
			// Horizontal squeeze
			float scale = 1.0 - prog;
			squeezeUV.x = 0.5 + (uv.x - 0.5) / max(scale, 0.001);
		} else {
			// Vertical squeeze
			float scale = 1.0 - prog;
			squeezeUV.y = 0.5 + (uv.y - 0.5) / max(scale, 0.001);
		}
		if (squeezeUV.x < 0.0 || squeezeUV.x > 1.0 || squeezeUV.y < 0.0 || squeezeUV.y > 1.0) {
			gl_FragColor = vec4(bgColor, 1.0);
		} else {
			gl_FragColor = texture2D(textureSampler, squeezeUV);
		}
		return;
	}

	// 49: flyEye
	if (maskType == 49) {
		float cells = cellCount;
		vec2 cellUV = fract(uv * cells);
		vec2 cellCenter = floor(uv * cells) / cells + 0.5 / cells;
		float dist = length(cellUV - 0.5);
		// Lens distortion within each cell
		float lensStrength = prog * 2.0;
		vec2 lensUV = cellCenter + (cellUV - 0.5) * (1.0 + lensStrength * dist) / cells;
		lensUV = clamp(lensUV, 0.0, 1.0);
		vec4 eyeColor = texture2D(textureSampler, lensUV);
		// Darken edges of each cell
		float vignette = 1.0 - smoothstep(0.3, 0.5, dist);
		eyeColor.rgb *= mix(1.0, vignette, prog);
		float fadeOut = smoothstep(0.7, 1.0, prog);
		gl_FragColor = mix(eyeColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 50: crosshatch
	if (maskType == 50) {
		float lum = dot(sceneColor.rgb, vec3(0.299, 0.587, 0.114));
		float scale = lineWidth * 10.0;
		float line1 = abs(sin((uv.x + uv.y) * scale * 3.14159265));
		float line2 = abs(sin((uv.x - uv.y) * scale * 3.14159265));
		float hatch1 = smoothstep(0.3, 0.5, line1);
		float hatch2 = smoothstep(0.3, 0.5, line2);
		float threshold = 1.0 - prog;
		float hatching = 1.0;
		if (lum < threshold) hatching *= hatch1;
		if (lum < threshold * 0.5) hatching *= hatch2;
		vec4 hatchColor = mix(vec4(bgColor, 1.0), sceneColor, hatching);
		float fadeOut = smoothstep(0.8, 1.0, prog);
		gl_FragColor = mix(hatchColor, vec4(bgColor, 1.0), fadeOut);
		return;
	}

	// 51: luminanceMelt
	if (maskType == 51) {
		float lum = dot(sceneColor.rgb, vec3(0.299, 0.587, 0.114));
		float noise = valueNoise(uv * noiseScale) * 0.3;
		float meltMask = lum + noise;
		float threshold = prog * 1.5;
		float t = smoothstep(threshold - edgeSoftness * 2.0, threshold + edgeSoftness * 2.0, meltMask);
		gl_FragColor = mix(vec4(bgColor, 1.0), sceneColor, t);
		return;
	}

	// 52: pageFlip
	if (maskType == 52) {
		float flipProg = prog;
		float curlX = 1.0 - flipProg;
		float distFromCurl = uv.x - curlX;
		if (distFromCurl > 0.0) {
			// Page being flipped - show bg
			float shadow = smoothstep(0.0, 0.1, distFromCurl);
			gl_FragColor = vec4(bgColor * (0.7 + 0.3 * shadow), 1.0);
		} else {
			// Underneath page visible
			float curl = smoothstep(-0.15, 0.0, distFromCurl);
			float yWarp = uv.y + sin(distFromCurl * 10.0) * 0.01 * curl;
			vec2 flipUV = vec2(uv.x, clamp(yWarp, 0.0, 1.0));
			vec4 pageColor = texture2D(textureSampler, flipUV);
			// Shadow near curl line
			float shadowEdge = smoothstep(-0.08, -0.02, distFromCurl);
			pageColor.rgb *= 1.0 - shadowEdge * 0.3;
			gl_FragColor = pageColor;
		}
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
