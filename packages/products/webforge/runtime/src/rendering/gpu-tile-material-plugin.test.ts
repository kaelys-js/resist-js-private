/**
 * GPU tile material plugin tests.
 *
 * Tests for the MaterialPluginBase that hooks into StandardMaterial
 * to perform data-texture tile lookups while preserving all
 * Babylon.js lighting, shadows, and fog.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';

import { GpuTileMaterialPlugin } from './gpu-tile-material-plugin';

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
// Constructor
// =============================================================================

describe('GpuTileMaterialPlugin', () => {
	it('registers on a StandardMaterial without errors', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		expect(plugin).toBeDefined();
		expect(plugin.getClassName()).toBe('GpuTileMaterialPlugin');
	});

	it('starts disabled by default', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		expect(plugin.isEnabled).toBe(false);
	});

	it('can be enabled', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		plugin.isEnabled = true;
		expect(plugin.isEnabled).toBe(true);
	});
});

// =============================================================================
// getSamplers
// =============================================================================

describe('GpuTileMaterialPlugin.getSamplers', () => {
	it('returns tileDataTexture and tileAtlas sampler names', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		const samplers: string[] = [];
		plugin.getSamplers(samplers);

		expect(samplers).toContain('tileDataTexture');
		expect(samplers).toContain('tileAtlas');
	});
});

// =============================================================================
// getUniforms
// =============================================================================

describe('GpuTileMaterialPlugin.getUniforms', () => {
	it('returns UBO definitions with expected uniform names', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		const result = plugin.getUniforms();
		const uboNames: string[] = result.ubo.map((u: { name: string }) => u.name);

		expect(uboNames).toContain('gpuMapSize');
		expect(uboNames).toContain('gpuTilePixelSize');
		expect(uboNames).toContain('gpuAnimationFrame');
		expect(uboNames).toContain('gpuLayerOpacity');
		expect(uboNames).toContain('gpuLayerTint');
		expect(uboNames).toContain('gpuLayerBrightness');
		expect(uboNames).toContain('gpuLayerSaturation');
		expect(uboNames).toContain('gpuLayerContrast');
		expect(uboNames).toContain('gpuLayerOffset');
	});
});

// =============================================================================
// getCustomCode
// =============================================================================

describe('GpuTileMaterialPlugin.getCustomCode', () => {
	it('returns vertex shader hooks', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		const code = plugin.getCustomCode('vertex');
		expect(code).not.toBeNull();
		if (!code) return;
		expect(code['CUSTOM_VERTEX_DEFINITIONS']).toContain('vWorldTilePos');
		// Uniforms are declared via getUniforms().vertex, not CUSTOM_VERTEX_DEFINITIONS
		const uniforms = plugin.getUniforms();
		expect(uniforms.vertex).toContain('gpuMapSize');
		expect(uniforms.vertex).toContain('gpuInvWorldSize');
	});

	it('returns fragment shader hooks', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		const code = plugin.getCustomCode('fragment');
		expect(code).not.toBeNull();
		if (!code) return;
		expect(code['CUSTOM_FRAGMENT_DEFINITIONS']).toContain('tileDataTexture');
		expect(code['CUSTOM_FRAGMENT_DEFINITIONS']).toContain('tileAtlas');
		expect(code['CUSTOM_FRAGMENT_DEFINITIONS']).toContain('sampler2D tileDataTexture');
	});

	it('returns null for unknown shader types', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		const code = plugin.getCustomCode('compute');
		expect(code).toBeNull();
	});

	it('fragment code contains texelFetch', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		const code = plugin.getCustomCode('fragment');
		expect(code).not.toBeNull();
		if (!code) return;

		// Check fragment definitions or any hook point for texelFetch
		const allCode: string = Object.values(code).join(' ');
		expect(allCode).toContain('texelFetch');
	});

	it('fragment code contains discard for empty tiles', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('test-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		const code = plugin.getCustomCode('fragment');
		expect(code).not.toBeNull();
		if (!code) return;

		const allCode: string = Object.values(code).join(' ');
		expect(allCode).toContain('discard');
	});
});

// =============================================================================
// Full integration: StandardMaterial + Plugin
// =============================================================================

describe('GpuTileMaterialPlugin integration', () => {
	it('can be attached to a StandardMaterial used on a mesh', () => {
		const scene: BABYLON.Scene = setupEngine();
		const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial('tile-mat', scene);
		const plugin: GpuTileMaterialPlugin = new GpuTileMaterialPlugin(material);

		plugin.isEnabled = true;
		plugin.mapSize = new BABYLON.Vector2(32, 32);
		plugin.tilePixelSize = new BABYLON.Vector2(32, 32);

		const mesh: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
			'test-ground',
			{
				width: 32,
				height: 32,
			},
			scene,
		);
		mesh.material = material;

		expect(mesh.material).toBe(material);
		expect(plugin.isEnabled).toBe(true);
	});
});
