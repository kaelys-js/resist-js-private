/**
 * Tests for tile-material — StandardMaterial factory for pixel-art tilesets.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import { createTileMaterial, createTileTexture } from './tile-material';

// =============================================================================
// Helpers
// =============================================================================

let instance: BabylonEngineInstance | null = null;

afterEach(() => {
	if (instance) {
		disposeEngine(instance);
		instance = null;
	}
});

function setupEngine(): BABYLON.Scene {
	const result: BabylonResult<BabylonEngineInstance> = createTestEngine();
	expect(result.ok).toBe(true);
	if (!result.ok) throw new Error('Engine creation failed');
	instance = result.data;
	return instance.scene;
}

// =============================================================================
// createTileTexture
// =============================================================================

describe('createTileTexture', () => {
	it('creates a texture with NullEngine', () => {
		const scene: BABYLON.Scene = setupEngine();
		const result: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.Texture);
	});

	it('uses NEAREST sampling mode', () => {
		const scene: BABYLON.Scene = setupEngine();
		const result: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.samplingMode).toBe(BABYLON.Texture.NEAREST_SAMPLINGMODE);
	});
});

// =============================================================================
// createTileMaterial
// =============================================================================

describe('createTileMaterial', () => {
	it('creates material with correct name', () => {
		const scene: BABYLON.Scene = setupEngine();
		const texResult: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(texResult.ok).toBe(true);
		if (!texResult.ok) return;

		const result: BabylonResult<BABYLON.StandardMaterial> = createTileMaterial({
			scene,
			name: 'terrain-mat',
			texture: texResult.data,
			hasAlpha: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.name).toBe('terrain-mat');
	});

	it('has black specular color', () => {
		const scene: BABYLON.Scene = setupEngine();
		const texResult: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(texResult.ok).toBe(true);
		if (!texResult.ok) return;

		const result: BabylonResult<BABYLON.StandardMaterial> = createTileMaterial({
			scene,
			name: 'test-mat',
			texture: texResult.data,
			hasAlpha: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.specularColor.r).toBe(0);
		expect(result.data.specularColor.g).toBe(0);
		expect(result.data.specularColor.b).toBe(0);
	});

	it('disables back-face culling', () => {
		const scene: BABYLON.Scene = setupEngine();
		const texResult: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(texResult.ok).toBe(true);
		if (!texResult.ok) return;

		const result: BabylonResult<BABYLON.StandardMaterial> = createTileMaterial({
			scene,
			name: 'test-mat',
			texture: texResult.data,
			hasAlpha: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.backFaceCulling).toBe(false);
	});

	it('enables alpha when hasAlpha is true', () => {
		const scene: BABYLON.Scene = setupEngine();
		const texResult: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(texResult.ok).toBe(true);
		if (!texResult.ok) return;

		const result: BabylonResult<BABYLON.StandardMaterial> = createTileMaterial({
			scene,
			name: 'alpha-mat',
			texture: texResult.data,
			hasAlpha: true,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.useAlphaFromDiffuseTexture).toBe(true);
	});

	it('uses ALPHATEST transparency mode when hasAlpha is true', () => {
		const scene: BABYLON.Scene = setupEngine();
		const texResult: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(texResult.ok).toBe(true);
		if (!texResult.ok) return;

		const result: BabylonResult<BABYLON.StandardMaterial> = createTileMaterial({
			scene,
			name: 'alphatest-mat',
			texture: texResult.data,
			hasAlpha: true,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.transparencyMode).toBe(BABYLON.Material.MATERIAL_ALPHATEST);
		expect(result.data.alphaCutOff).toBe(0.5);
	});

	it('does not set ALPHATEST when hasAlpha is false', () => {
		const scene: BABYLON.Scene = setupEngine();
		const texResult: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(texResult.ok).toBe(true);
		if (!texResult.ok) return;

		const result: BabylonResult<BABYLON.StandardMaterial> = createTileMaterial({
			scene,
			name: 'opaque-mat',
			texture: texResult.data,
			hasAlpha: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.transparencyMode).not.toBe(BABYLON.Material.MATERIAL_ALPHATEST);
	});

	it('does not enable alpha when hasAlpha is false', () => {
		const scene: BABYLON.Scene = setupEngine();
		const texResult: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(texResult.ok).toBe(true);
		if (!texResult.ok) return;

		const result: BabylonResult<BABYLON.StandardMaterial> = createTileMaterial({
			scene,
			name: 'no-alpha-mat',
			texture: texResult.data,
			hasAlpha: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.useAlphaFromDiffuseTexture).toBe(false);
	});

	it('assigns diffuse texture to material', () => {
		const scene: BABYLON.Scene = setupEngine();
		const texResult: BabylonResult<BABYLON.Texture> = createTileTexture({
			scene,
			imagePath: 'test.png',
		});
		expect(texResult.ok).toBe(true);
		if (!texResult.ok) return;

		const result: BabylonResult<BABYLON.StandardMaterial> = createTileMaterial({
			scene,
			name: 'tex-mat',
			texture: texResult.data,
			hasAlpha: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.diffuseTexture).toBe(texResult.data);
	});
});
