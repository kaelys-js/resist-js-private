/**
 * Runtime integration tests.
 *
 * Tests the full runtime lifecycle: create → start → stop → dispose.
 * Uses NullEngine for headless testing.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { createTestRuntime, disposeRuntime } from './runtime';

describe('createTestRuntime', () => {
	test('creates a runtime instance with engine, camera, and scene', () => {
		const result = createTestRuntime();
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.engine).toBeDefined();
		expect(result.data.engine.engine).toBeDefined();
		expect(result.data.engine.scene).toBeDefined();
		expect(result.data.engine.isWebGPU).toBeFalsy();
		expect(result.data.camera).toBeDefined();

		disposeRuntime(result.data);
	});

	test('scene has default hemispheric light', () => {
		const result = createTestRuntime();
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.engine.scene.lights.length).toBe(1);

		disposeRuntime(result.data);
	});

	test('scene has correct clear color', () => {
		const result = createTestRuntime();
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.engine.scene.clearColor.r).toBeCloseTo(0.15);
		expect(result.data.engine.scene.clearColor.g).toBeCloseTo(0.15);
		expect(result.data.engine.scene.clearColor.b).toBeCloseTo(0.2);

		disposeRuntime(result.data);
	});

	test('camera is attached to scene', () => {
		const result = createTestRuntime();
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.engine.scene.activeCamera).toBe(result.data.camera);

		disposeRuntime(result.data);
	});

	test('accepts scene config overrides', () => {
		const result = createTestRuntime({
			scene: { clearColor: { r: 1, g: 0, b: 0, a: 1 } },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.engine.scene.clearColor.r).toBeCloseTo(1);
		expect(result.data.engine.scene.clearColor.g).toBeCloseTo(0);

		disposeRuntime(result.data);
	});

	test('accepts camera mode override', () => {
		const result = createTestRuntime({
			camera: { mode: 'gameplay' },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// Gameplay mode locks alpha
		expect(result.data.camera.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(result.data.camera.upperAlphaLimit).toBeCloseTo(Math.PI / 4);

		disposeRuntime(result.data);
	});
});

describe('disposeRuntime', () => {
	test('disposes engine and all resources', () => {
		const result = createTestRuntime();
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const disposeResult = disposeRuntime(result.data);
		expect(disposeResult.ok).toBeTruthy();
		expect(result.data.engine.engine.isDisposed).toBeTruthy();
	});

	test('disposes performance monitor when present', () => {
		const result = createTestRuntime({ debug: true });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.performanceMonitor).toBeDefined();

		const disposeResult = disposeRuntime(result.data);
		expect(disposeResult.ok).toBeTruthy();
	});
});

describe('createTestRuntime — debug mode', () => {
	test('creates performance monitor when debug is true', () => {
		const result = createTestRuntime({ debug: true });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.performanceMonitor).toBeDefined();

		disposeRuntime(result.data);
	});

	test('no performance monitor when debug is false', () => {
		const result = createTestRuntime({ debug: false });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.performanceMonitor).toBeUndefined();

		disposeRuntime(result.data);
	});
});
