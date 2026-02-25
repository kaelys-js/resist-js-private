/**
 * Babylon.js engine core tests.
 *
 * Tests engine creation (NullEngine for headless), render loop management,
 * and disposal using the NullEngine backend.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	createTestEngine,
	startRenderLoop,
	stopRenderLoop,
	disposeEngine,
	type BabylonEngineInstance,
} from './engine';

describe('createTestEngine', () => {
	test('returns ok Result with engine, scene, and isWebGPU flag', () => {
		const result = createTestEngine();
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.engine).toBeDefined();
		expect(result.data.scene).toBeDefined();
		expect(result.data.isWebGPU).toBeFalsy();

		// Cleanup
		result.data.scene.dispose();
		result.data.engine.dispose();
	});

	test('scene is attached to engine', () => {
		const result = createTestEngine();
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.scene.getEngine()).toBe(result.data.engine);

		result.data.scene.dispose();
		result.data.engine.dispose();
	});

	test('NullEngine reports as not WebGPU', () => {
		const result = createTestEngine();
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.isWebGPU).toBeFalsy();

		result.data.scene.dispose();
		result.data.engine.dispose();
	});
});

describe('startRenderLoop', () => {
	let instance: BabylonEngineInstance;

	beforeEach(() => {
		const result = createTestEngine();
		if (!result.ok) throw new Error('Failed to create test engine');
		instance = result.data;
	});

	afterEach(() => {
		stopRenderLoop(instance);
		instance.scene.dispose();
		instance.engine.dispose();
	});

	test('starts render loop successfully', () => {
		const result = startRenderLoop(instance);
		expect(result.ok).toBeTruthy();
		expect(instance.engine.activeRenderLoops.length).toBe(1);
	});

	test('returns error when render loop already running', () => {
		const first = startRenderLoop(instance);
		expect(first.ok).toBeTruthy();

		const second = startRenderLoop(instance);
		expect(second.ok).toBeFalsy();
	});
});

describe('stopRenderLoop', () => {
	let instance: BabylonEngineInstance;

	beforeEach(() => {
		const result = createTestEngine();
		if (!result.ok) throw new Error('Failed to create test engine');
		instance = result.data;
	});

	afterEach(() => {
		instance.scene.dispose();
		instance.engine.dispose();
	});

	test('stops a running render loop', () => {
		startRenderLoop(instance);
		expect(instance.engine.activeRenderLoops.length).toBe(1);

		const result = stopRenderLoop(instance);
		expect(result.ok).toBeTruthy();
		expect(instance.engine.activeRenderLoops.length).toBe(0);
	});

	test('succeeds even when no render loop is running', () => {
		const result = stopRenderLoop(instance);
		expect(result.ok).toBeTruthy();
	});
});

describe('disposeEngine', () => {
	test('disposes scene and engine', () => {
		const createResult = createTestEngine();
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const result = disposeEngine(createResult.data);
		expect(result.ok).toBeTruthy();
		expect(createResult.data.engine.isDisposed).toBeTruthy();
	});

	test('stops render loop before disposing', () => {
		const createResult = createTestEngine();
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		startRenderLoop(createResult.data);
		expect(createResult.data.engine.activeRenderLoops.length).toBe(1);

		const result = disposeEngine(createResult.data);
		expect(result.ok).toBeTruthy();
		expect(createResult.data.engine.isDisposed).toBeTruthy();
	});

	test('scene can render before disposal', () => {
		const createResult = createTestEngine();
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		// Babylon.js requires at least one camera to render
		// eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
		new BABYLON.ArcRotateCamera(
			'test-camera',
			0,
			0,
			10,
			new BABYLON.Vector3(0, 0, 0),
			createResult.data.scene,
		);

		// Manual render should not throw
		createResult.data.scene.render();

		const result = disposeEngine(createResult.data);
		expect(result.ok).toBeTruthy();
	});
});
