/**
 * GPU tile shader source tests.
 *
 * Verifies GLSL shader source strings contain expected uniforms,
 * attributes, varyings, and GLSL keywords for data-texture-based
 * tile rendering.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import {
	GPU_TILE_VERTEX_SHADER,
	GPU_TILE_FRAGMENT_SHADER,
	GPU_TILE_HEIGHT_VERTEX_SHADER,
} from './gpu-tile-shader';

// =============================================================================
// Vertex Shader
// =============================================================================

describe('GPU_TILE_VERTEX_SHADER', () => {
	test('is a non-empty string', () => {
		expect(GPU_TILE_VERTEX_SHADER.length).toBeGreaterThan(0);
	});

	test('declares position attribute', () => {
		expect(GPU_TILE_VERTEX_SHADER).toContain('attribute vec3 position');
	});

	test('declares uv attribute', () => {
		expect(GPU_TILE_VERTEX_SHADER).toContain('attribute vec2 uv');
	});

	test('declares worldViewProjection uniform', () => {
		expect(GPU_TILE_VERTEX_SHADER).toContain('uniform mat4 worldViewProjection');
	});

	test('declares mapSize uniform', () => {
		expect(GPU_TILE_VERTEX_SHADER).toContain('uniform vec2 mapSize');
	});

	test('declares vWorldTilePos varying', () => {
		expect(GPU_TILE_VERTEX_SHADER).toContain('varying vec2 vWorldTilePos');
	});

	test('computes vWorldTilePos from uv * mapSize', () => {
		expect(GPU_TILE_VERTEX_SHADER).toContain('uv * mapSize');
	});

	test('writes gl_Position', () => {
		expect(GPU_TILE_VERTEX_SHADER).toContain('gl_Position');
	});
});

// =============================================================================
// Height Vertex Shader
// =============================================================================

describe('GPU_TILE_HEIGHT_VERTEX_SHADER', () => {
	test('is a non-empty string', () => {
		expect(GPU_TILE_HEIGHT_VERTEX_SHADER.length).toBeGreaterThan(0);
	});

	test('declares heightDataTexture uniform', () => {
		expect(GPU_TILE_HEIGHT_VERTEX_SHADER).toContain('heightDataTexture');
	});

	test('declares tileWorldHeight uniform', () => {
		expect(GPU_TILE_HEIGHT_VERTEX_SHADER).toContain('uniform float tileWorldHeight');
	});

	test('declares layerYOffset uniform', () => {
		expect(GPU_TILE_HEIGHT_VERTEX_SHADER).toContain('uniform float layerYOffset');
	});

	test('uses texelFetch for height lookup', () => {
		expect(GPU_TILE_HEIGHT_VERTEX_SHADER).toContain('texelFetch');
	});

	test('displaces vertex Y position', () => {
		expect(GPU_TILE_HEIGHT_VERTEX_SHADER).toContain('tileWorldHeight');
	});

	test('declares vWorldTilePos varying', () => {
		expect(GPU_TILE_HEIGHT_VERTEX_SHADER).toContain('varying vec2 vWorldTilePos');
	});

	test('writes gl_Position', () => {
		expect(GPU_TILE_HEIGHT_VERTEX_SHADER).toContain('gl_Position');
	});
});

// =============================================================================
// Fragment Shader
// =============================================================================

describe('GPU_TILE_FRAGMENT_SHADER', () => {
	test('is a non-empty string', () => {
		expect(GPU_TILE_FRAGMENT_SHADER.length).toBeGreaterThan(0);
	});

	test('declares tileDataTexture as sampler2D', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('sampler2D tileDataTexture');
	});

	test('declares tileAtlas as sampler2D', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('sampler2D tileAtlas');
	});

	test('declares mapSize uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('uniform vec2 mapSize');
	});

	test('declares tilePixelSize uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('uniform vec2 tilePixelSize');
	});

	test('declares layerOpacity uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('uniform float layerOpacity');
	});

	test('declares animationFrame uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('uniform float animationFrame');
	});

	test('declares per-layer tint uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('layerTint');
	});

	test('declares per-layer brightness uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('layerBrightness');
	});

	test('declares per-layer saturation uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('layerSaturation');
	});

	test('declares per-layer contrast uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('layerContrast');
	});

	test('declares per-layer offset uniform', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('layerOffset');
	});

	test('uses texelFetch for tile data lookup', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('texelFetch');
	});

	test('uses discard for empty tiles', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('discard');
	});

	test('decodes flipH from flags', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toMatch(/flipH|0x1u/);
	});

	test('decodes flipV from flags', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toMatch(/flipV|>> 1/);
	});

	test('decodes rotation from flags', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toMatch(/rotation|>> 2/);
	});

	test('handles animation frame advancement', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('animBase');
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('animCount');
	});

	test('writes gl_FragColor', () => {
		expect(GPU_TILE_FRAGMENT_SHADER).toContain('gl_FragColor');
	});
});
