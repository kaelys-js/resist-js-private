/**
 * Tests for the vitals console logger.
 *
 * Verifies correct log level selection (info vs warn), format strings,
 * metric unit handling, and dev/prod mode behavior.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { logVital } from './vitals-logger';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();

vi.mock('@/utils/core/logger', () => ({
	log: {
		info: (...args: unknown[]) => mockLogInfo(...args),
		warn: (...args: unknown[]) => mockLogWarn(...args),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		json: vi.fn(),
	},
	setupLogging: vi.fn(),
}));

// Default: dev = true (from test mock)
let mockDev: boolean = true;
vi.mock('$app/environment', () => ({
	get dev() {
		return mockDev;
	},
	browser: false,
	building: false,
	version: 'test',
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('vitals logger', () => {
	beforeEach(() => {
		mockLogInfo.mockClear();
		mockLogWarn.mockClear();
		mockDev = true;
	});

	afterEach(() => {
		mockDev = true;
	});

	// ── Format ─────────────────────────────────────────────────────────

	describe('format', () => {
		it('formats timing metrics with ms suffix', () => {
			logVital('LCP', 2450, 'needsImprovement');
			expect(mockLogInfo).toHaveBeenCalledOnce();
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).toContain('LCP');
			expect(msg).toContain('2450ms');
			expect(msg).toContain('needsImprovement');
		});

		it('formats non-timing metrics without ms suffix', () => {
			logVital('CLS', 0.05, 'good');
			expect(mockLogInfo).toHaveBeenCalledOnce();
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).toContain('CLS');
			expect(msg).toContain('0.05');
			expect(msg).not.toContain('ms');
		});

		it('rounds timing metric values', () => {
			logVital('FCP', 1234.567, 'good');
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).toContain('1235ms');
		});

		it('does not round non-timing metrics', () => {
			logVital('CLS', 0.123, 'good');
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).toContain('0.123');
		});

		it('includes rating icon for good', () => {
			logVital('TTFB', 100, 'good');
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).toContain('✓');
		});

		it('includes rating icon for needsImprovement', () => {
			logVital('LCP', 3000, 'needsImprovement');
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).toContain('⚠');
		});

		it('includes rating icon for poor', () => {
			logVital('INP', 650, 'poor');
			const msg: Str = mockLogWarn.mock.calls[0][0] as Str;
			expect(msg).toContain('✗');
		});

		it('includes [perf] prefix', () => {
			logVital('FCP', 1000, 'good');
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).toContain('[perf]');
		});
	});

	// ── Timing metric detection ─────────────────────────────────────────

	describe('timing metrics', () => {
		const timingMetrics: readonly Str[] = ['TTFB', 'FCP', 'LCP', 'FID', 'INP', 'TBT', 'NTBT'];
		for (const metric of timingMetrics) {
			it(`treats ${metric} as a timing metric (ms suffix)`, () => {
				logVital(metric, 100, 'good');
				const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
				expect(msg).toContain('ms');
				mockLogInfo.mockClear();
			});
		}

		it('treats CLS as a non-timing metric (no ms suffix)', () => {
			logVital('CLS', 0.1, 'good');
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).not.toContain('ms');
		});

		it('treats navigationTiming as a non-timing metric', () => {
			logVital('navigationTiming', 0, 'good');
			const msg: Str = mockLogInfo.mock.calls[0][0] as Str;
			expect(msg).not.toContain('ms');
		});
	});

	// ── Dev mode behavior ───────────────────────────────────────────────

	describe('dev mode', () => {
		beforeEach(() => {
			mockDev = true;
		});

		it('logs good metrics via log.info in dev', () => {
			logVital('CLS', 0.05, 'good');
			expect(mockLogInfo).toHaveBeenCalledOnce();
			expect(mockLogWarn).not.toHaveBeenCalled();
		});

		it('logs needsImprovement metrics via log.info in dev', () => {
			logVital('LCP', 2500, 'needsImprovement');
			expect(mockLogInfo).toHaveBeenCalledOnce();
			expect(mockLogWarn).not.toHaveBeenCalled();
		});

		it('logs poor metrics via log.warn in dev', () => {
			logVital('INP', 650, 'poor');
			expect(mockLogWarn).toHaveBeenCalledOnce();
			expect(mockLogInfo).not.toHaveBeenCalled();
		});
	});

	// ── Production mode behavior ────────────────────────────────────────

	describe('production mode', () => {
		beforeEach(() => {
			mockDev = false;
		});

		it('does not log good metrics in prod', () => {
			logVital('CLS', 0.05, 'good');
			expect(mockLogInfo).not.toHaveBeenCalled();
			expect(mockLogWarn).not.toHaveBeenCalled();
		});

		it('does not log needsImprovement metrics in prod', () => {
			logVital('LCP', 2500, 'needsImprovement');
			expect(mockLogInfo).not.toHaveBeenCalled();
			expect(mockLogWarn).not.toHaveBeenCalled();
		});

		it('logs poor metrics via log.warn in prod', () => {
			logVital('INP', 650, 'poor');
			expect(mockLogWarn).toHaveBeenCalledOnce();
			expect(mockLogInfo).not.toHaveBeenCalled();
		});
	});

	// ── Return type ─────────────────────────────────────────────────────

	describe('return type', () => {
		it('returns Result<Void> success', () => {
			const result: Result<Void> = logVital('LCP', 2450, 'needsImprovement');
			expect(result.ok).toBe(true);
		});
	});
});
