/**
 * Tests for the vitals beacon client.
 *
 * Verifies metric queuing, beacon flushing, visibilitychange registration,
 * dev mode skipping, and sendBeacon / fetch fallback behavior.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Num, Bool, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { VitalsMetric, VitalsDevice } from './vitals-payload';
import {
	queueVital,
	flushVitals,
	setupVitalsBeacon,
	setDeviceInfo,
	getBeaconStatus,
	resetBeacon,
} from './vitals-beacon';

// ── Mocks ──────────────────────────────────────────────────────────────────

let mockDev: Bool = false;
vi.mock('$app/environment', () => ({
	get dev() {
		return mockDev;
	},
	browser: true,
	building: false,
	version: 'test',
}));

vi.mock('@/utils/core/logger', () => ({
	log: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		json: vi.fn(),
	},
	setupLogging: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a valid VitalsMetric fixture.
 *
 * @param overrides - Partial overrides
 * @returns A complete VitalsMetric
 */
function createMetric(overrides: Partial<VitalsMetric> = {}): VitalsMetric {
	return {
		name: 'LCP',
		value: 2450,
		rating: 'needsImprovement',
		navigationType: 'navigate',
		...overrides,
	};
}

/**
 * Creates a valid VitalsDevice fixture.
 *
 * @returns A complete VitalsDevice
 */
function createDevice(): VitalsDevice {
	return {
		isLowEndDevice: false,
		isLowEndExperience: false,
		deviceMemory: 8,
		hardwareConcurrency: 8,
		effectiveType: '4g',
		saveData: false,
	};
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('vitals beacon', () => {
	const mockSendBeacon = vi.fn().mockReturnValue(true);
	const originalAddEventListener = document.addEventListener.bind(document);
	const mockAddEventListener = vi.fn();

	beforeEach(() => {
		mockDev = false;
		mockSendBeacon.mockClear();
		mockAddEventListener.mockClear();
		vi.stubGlobal('navigator', {
			...navigator,
			sendBeacon: mockSendBeacon,
		});
		vi.stubGlobal('crypto', {
			randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
		});
		// resetBeacon must come AFTER crypto mock so sessionId uses the mocked UUID
		resetBeacon();
		document.addEventListener = mockAddEventListener;
	});

	afterEach(() => {
		document.addEventListener = originalAddEventListener;
		vi.unstubAllGlobals();
	});

	// ── queueVital ──────────────────────────────────────────────────────

	describe('queueVital', () => {
		it('adds a metric to the internal queue', () => {
			const result: Result<Void> = queueVital(createMetric());
			expect(result.ok).toBe(true);
			expect(getBeaconStatus().queued).toBe(1);
		});

		it('increments queue count with multiple metrics', () => {
			queueVital(createMetric({ name: 'LCP' }));
			queueVital(createMetric({ name: 'FCP' }));
			queueVital(createMetric({ name: 'CLS', value: 0.05, rating: 'good' }));
			expect(getBeaconStatus().queued).toBe(3);
		});

		it('auto-flushes at MAX_QUEUE_SIZE (10)', () => {
			setDeviceInfo(createDevice());
			for (let i: Num = 0; i < 10; i++) {
				queueVital(createMetric({ name: `M${String(i)}` }));
			}
			// Should have auto-flushed after 10th item
			expect(mockSendBeacon).toHaveBeenCalledOnce();
			expect(getBeaconStatus().queued).toBe(0);
		});
	});

	// ── flushVitals ─────────────────────────────────────────────────────

	describe('flushVitals', () => {
		it('sends beacon with correct payload when queue has items', () => {
			setDeviceInfo(createDevice());
			queueVital(createMetric());

			const result: Result<Void> = flushVitals();
			expect(result.ok).toBe(true);
			expect(mockSendBeacon).toHaveBeenCalledOnce();
			expect(mockSendBeacon).toHaveBeenCalledWith('/api/vitals', expect.any(Blob));
		});

		it('does nothing when queue is empty', () => {
			const result: Result<Void> = flushVitals();
			expect(result.ok).toBe(true);
			expect(mockSendBeacon).not.toHaveBeenCalled();
		});

		it('clears queue after send', () => {
			setDeviceInfo(createDevice());
			queueVital(createMetric());
			flushVitals();
			expect(getBeaconStatus().queued).toBe(0);
		});

		it('updates lastFlushAt timestamp', () => {
			setDeviceInfo(createDevice());
			queueVital(createMetric());
			expect(getBeaconStatus().lastFlushAt).toBeNull();
			flushVitals();
			expect(getBeaconStatus().lastFlushAt).not.toBeNull();
		});

		it('skips beacon in dev mode', () => {
			mockDev = true;
			setDeviceInfo(createDevice());
			queueVital(createMetric());
			flushVitals();
			expect(mockSendBeacon).not.toHaveBeenCalled();
			// Queue should still be cleared
			expect(getBeaconStatus().queued).toBe(0);
		});
	});

	// ── setupVitalsBeacon ───────────────────────────────────────────────

	describe('setupVitalsBeacon', () => {
		it('registers visibilitychange event listener', () => {
			const result: Result<Void> = setupVitalsBeacon();
			expect(result.ok).toBe(true);
			expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
		});
	});

	// ── setDeviceInfo ───────────────────────────────────────────────────

	describe('setDeviceInfo', () => {
		it('stores device context for future payloads', () => {
			const device: VitalsDevice = createDevice();
			const result: Result<Void> = setDeviceInfo(device);
			expect(result.ok).toBe(true);
		});
	});

	// ── getBeaconStatus ─────────────────────────────────────────────────

	describe('getBeaconStatus', () => {
		it('returns initial status', () => {
			const status = getBeaconStatus();
			expect(status.queued).toBe(0);
			expect(status.queuedItems).toEqual([]);
			expect(status.lastFlushAt).toBeNull();
			expect(status.sessionId).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(status.maxQueueSize).toBe(10);
		});

		it('returns queued metric items with name, value, and rating', () => {
			queueVital(createMetric({ name: 'LCP', value: 2450, rating: 'needsImprovement' }));
			queueVital(createMetric({ name: 'FCP', value: 1200, rating: 'good' }));
			const status = getBeaconStatus();
			expect(status.queuedItems).toEqual([
				{ name: 'LCP', value: 2450, rating: 'needsImprovement' },
				{ name: 'FCP', value: 1200, rating: 'good' },
			]);
		});
	});

	// ── sendBeacon fallback ─────────────────────────────────────────────

	describe('sendBeacon unavailable', () => {
		it('falls back to fetch with keepalive', () => {
			const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
			vi.stubGlobal('navigator', {
				sendBeacon: undefined,
			});
			vi.stubGlobal('fetch', mockFetch);

			setDeviceInfo(createDevice());
			queueVital(createMetric());
			flushVitals();

			expect(mockFetch).toHaveBeenCalledOnce();
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/vitals',
				expect.objectContaining({ keepalive: true }),
			);
		});
	});
});
