// @vitest-environment jsdom

/**
 * Screen effects tests.
 *
 * Tests screen tint, flash, fade-in, fade-out DOM overlay creation,
 * CSS opacity animation setup, and disposal.
 *
 * Uses jsdom environment since screen effects create DOM overlays
 * positioned over the canvas.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import { screenTint, screenFlash, screenFadeIn, screenFadeOut } from './screen-effects';

let instance: BabylonEngineInstance;

beforeEach(() => {
	const result = createTestEngine();
	if (!result.ok) throw new Error('Failed to create test engine');
	instance = result.data;
});

afterEach(() => {
	disposeEngine(instance);
	// Clean up any leftover overlays
	for (const el of document.body.querySelectorAll('div')) {
		el.remove();
	}
});

// =============================================================================
// screenTint
// =============================================================================

describe('screenTint', () => {
	test('returns ok with a dispose handle', () => {
		const result = screenTint({
			scene: instance.scene,
			color: { r: 1, g: 0, b: 0, a: 0.5 },
			durationMs: 1000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('creates overlay div in the DOM', () => {
		const divCountBefore = document.body.querySelectorAll('div').length;
		const result = screenTint({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 1, a: 0.3 },
			durationMs: 500,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(document.body.querySelectorAll('div').length).toBeGreaterThan(divCountBefore);
		result.data.dispose();
	});

	test('dispose removes overlay div', () => {
		const result = screenTint({
			scene: instance.scene,
			color: { r: 0, g: 1, b: 0, a: 0.4 },
			durationMs: 1000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const divCountBefore = document.body.querySelectorAll('div').length;
		result.data.dispose();
		expect(document.body.querySelectorAll('div').length).toBeLessThan(divCountBefore);
	});

	test('overlay has correct background color', () => {
		const result = screenTint({
			scene: instance.scene,
			color: { r: 1, g: 0, b: 0, a: 0.5 },
			durationMs: 1000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const overlay = document.body.querySelector('div');
		expect(overlay).not.toBeNull();
		expect(overlay!.style.backgroundColor).toContain('255');
		result.data.dispose();
	});

	test('overlay starts with opacity 0 (fades in)', () => {
		const result = screenTint({
			scene: instance.scene,
			color: { r: 1, g: 0, b: 0, a: 0.5 },
			durationMs: 1000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const overlay = document.body.querySelector('div');
		expect(overlay).not.toBeNull();
		expect(overlay!.style.opacity).toBe('0');
		result.data.dispose();
	});
});

// =============================================================================
// screenFlash
// =============================================================================

describe('screenFlash', () => {
	test('returns ok with a dispose handle', () => {
		const result = screenFlash({
			scene: instance.scene,
			color: { r: 1, g: 1, b: 1, a: 1 },
			durationMs: 200,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('creates overlay div', () => {
		const divCountBefore = document.body.querySelectorAll('div').length;
		const result = screenFlash({
			scene: instance.scene,
			color: { r: 1, g: 1, b: 1, a: 1 },
			durationMs: 100,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(document.body.querySelectorAll('div').length).toBeGreaterThan(divCountBefore);
		result.data.dispose();
	});

	test('overlay starts at full alpha', () => {
		const result = screenFlash({
			scene: instance.scene,
			color: { r: 1, g: 1, b: 1, a: 1 },
			durationMs: 200,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const overlay = document.body.querySelector('div');
		expect(overlay).not.toBeNull();
		expect(overlay!.style.opacity).toBe('1');
		result.data.dispose();
	});
});

// =============================================================================
// screenFadeIn
// =============================================================================

describe('screenFadeIn', () => {
	test('returns ok with a dispose handle', () => {
		const result = screenFadeIn({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 500,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('creates overlay div', () => {
		const divCountBefore = document.body.querySelectorAll('div').length;
		const result = screenFadeIn({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 300,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(document.body.querySelectorAll('div').length).toBeGreaterThan(divCountBefore);
		result.data.dispose();
	});

	test('overlay starts opaque (fades to transparent)', () => {
		const result = screenFadeIn({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 500,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const overlay = document.body.querySelector('div');
		expect(overlay).not.toBeNull();
		expect(overlay!.style.opacity).toBe('1');
		result.data.dispose();
	});
});

// =============================================================================
// screenFadeOut
// =============================================================================

describe('screenFadeOut', () => {
	test('returns ok with a dispose handle', () => {
		const result = screenFadeOut({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 500,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('creates overlay div', () => {
		const divCountBefore = document.body.querySelectorAll('div').length;
		const result = screenFadeOut({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 300,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(document.body.querySelectorAll('div').length).toBeGreaterThan(divCountBefore);
		result.data.dispose();
	});

	test('overlay starts transparent (fades to opaque)', () => {
		const result = screenFadeOut({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 500,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const overlay = document.body.querySelector('div');
		expect(overlay).not.toBeNull();
		expect(overlay!.style.opacity).toBe('0');
		result.data.dispose();
	});

	test('dispose removes overlay even during animation', () => {
		const result = screenFadeOut({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 5000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const divCountBefore = document.body.querySelectorAll('div').length;
		result.data.dispose();
		expect(document.body.querySelectorAll('div').length).toBeLessThan(divCountBefore);
	});
});
