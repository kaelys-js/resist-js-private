/**
 * Tests for the vitals console logger.
 *
 * Verifies colorized `%c` CSS formatting, correct log level selection
 * (console.log vs console.warn), format strings, metric unit handling,
 * and dev/prod mode behavior.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Num, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { logVital, setVitalsLoggerAppName } from './vitals-logger';

// ── Setup ──────────────────────────────────────────────────────────────────

let originalDev: unknown;

// ── Tests ──────────────────────────────────────────────────────────────────

describe('vitals logger', () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;
  let mockConsoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;
    setVitalsLoggerAppName('TestApp');
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    import.meta.env.DEV = originalDev as boolean;
  });

  // ── Format ─────────────────────────────────────────────────────────

  describe('format', () => {
    it('formats timing metrics with ms suffix', () => {
      logVital('LCP', 2450, 'needsImprovement');
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('LCP');
      expect(fmt).toContain('2450ms');
      expect(fmt).toContain('needsImprovement');
    });

    it('formats non-timing metrics without ms suffix', () => {
      logVital('CLS', 0.05, 'good');
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('CLS');
      expect(fmt).toContain('0.05');
      expect(fmt).not.toContain('ms');
    });

    it('rounds timing metric values', () => {
      logVital('FCP', 1234.567, 'good');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('1235ms');
    });

    it('does not round non-timing metrics', () => {
      logVital('CLS', 0.123, 'good');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('0.123');
    });

    it('includes rating icon for good', () => {
      logVital('TTFB', 100, 'good');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('✓');
    });

    it('includes rating icon for needsImprovement', () => {
      logVital('LCP', 3000, 'needsImprovement');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('⚠');
    });

    it('includes rating icon for poor', () => {
      logVital('INP', 650, 'poor');
      const fmt: Str = mockConsoleWarn.mock.calls[0][0] as Str;
      expect(fmt).toContain('✗');
    });

    it('includes app name prefix', () => {
      logVital('FCP', 1000, 'good');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('[TestApp]');
    });

    it('uses %c CSS formatting with style arguments', () => {
      logVital('LCP', 2450, 'good');
      const call: unknown[] = mockConsoleLog.mock.calls[0] as unknown[];
      const fmt: Str = call[0] as Str;
      // Format string should contain 4 %c directives
      const directiveCount: Num = (fmt.match(/%c/g) ?? []).length;
      expect(directiveCount).toBe(4);
      // Should have format string + 4 CSS style arguments = 5 total args
      expect(call).toHaveLength(5);
      // All 4 style args should be CSS strings containing 'color:'
      for (let i: Num = 1; i < call.length; i++) {
        expect(call[i]).toMatch(/color:/);
      }
    });
  });

  // ── Timing metric detection ─────────────────────────────────────────

  describe('timing metrics', () => {
    const timingMetrics: readonly Str[] = ['TTFB', 'FCP', 'LCP', 'FID', 'INP', 'TBT', 'NTBT'];

    it.each(timingMetrics)('treats %s as a timing metric (ms suffix)', (metric: Str) => {
      logVital(metric, 100, 'good');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('ms');
    });

    it('treats CLS as a non-timing metric (no ms suffix)', () => {
      logVital('CLS', 0.1, 'good');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).not.toContain('ms');
    });

    it('treats navigationTiming as a non-timing metric', () => {
      logVital('navigationTiming', 0, 'good');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).not.toContain('ms');
    });
  });

  // ── Dev mode behavior ───────────────────────────────────────────────

  describe('dev mode', () => {
    beforeEach(() => {
      import.meta.env.DEV = true;
    });

    it('logs good metrics via console.log in dev', () => {
      logVital('CLS', 0.05, 'good');
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('logs needsImprovement metrics via console.log in dev', () => {
      logVital('LCP', 2500, 'needsImprovement');
      expect(mockConsoleLog).toHaveBeenCalledOnce();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('logs poor metrics via console.warn in dev', () => {
      logVital('INP', 650, 'poor');
      expect(mockConsoleWarn).toHaveBeenCalledOnce();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  // ── Production mode behavior ────────────────────────────────────────

  describe('production mode', () => {
    beforeEach(() => {
      import.meta.env.DEV = false;
    });

    it('does not log good metrics in prod', () => {
      logVital('CLS', 0.05, 'good');
      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('does not log needsImprovement metrics in prod', () => {
      logVital('LCP', 2500, 'needsImprovement');
      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('logs poor metrics via console.warn in prod', () => {
      logVital('INP', 650, 'poor');
      expect(mockConsoleWarn).toHaveBeenCalledOnce();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  // ── setVitalsLoggerAppName ──────────────────────────────────────────

  describe('setVitalsLoggerAppName', () => {
    it('uses custom app name in log prefix', () => {
      setVitalsLoggerAppName('MyCustomApp');
      logVital('FCP', 1000, 'good');
      const fmt: Str = mockConsoleLog.mock.calls[0][0] as Str;
      expect(fmt).toContain('[MyCustomApp]');
    });
  });

  // ── Return type ─────────────────────────────────────────────────────

  describe('return type', () => {
    it('returns Result<Void> success', () => {
      const result: Result<Void> = logVital('LCP', 2450, 'needsImprovement');
      expect(result.ok).toBe(true);
    });
  });

  describe('diagnostics edge cases', () => {
    it('logs diagnostics in dev mode for non-poor rating with findings', () => {
      import.meta.env.DEV = true;
      const mockGroupCollapsed: ReturnType<typeof vi.fn> = vi.spyOn(console, 'groupCollapsed');
      const mockGroupEnd: ReturnType<typeof vi.fn> = vi.spyOn(console, 'groupEnd');

      const diagnostics = {
        thresholds: { good: 2500, poor: 4000, unit: 'ms' },
        findings: [{ label: 'Slow Resource', detail: 'Image load delay', severity: 'medium' }],
      };
      logVital('LCP', 2000, 'needsImprovement', diagnostics as never);

      expect(mockGroupCollapsed).toHaveBeenCalledOnce();
      expect(mockGroupEnd).toHaveBeenCalledOnce();
    });

    it('handles diagnostics with empty findings array', () => {
      import.meta.env.DEV = true;
      const mockConsoleLog: ReturnType<typeof vi.fn> = vi.spyOn(console, 'log');

      const diagnostics = {
        thresholds: { good: 1800, poor: 3000, unit: 'ms' },
        findings: [],
      };
      // Empty findings → hasDiagnostics is false → plain console.log
      logVital('FCP', 1200, 'good', diagnostics as never);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('handles finding with empty label', () => {
      import.meta.env.DEV = true;
      const mockGroupCollapsed: ReturnType<typeof vi.fn> = vi.spyOn(console, 'groupCollapsed');

      const diagnostics = {
        thresholds: { good: 2500, poor: 4000, unit: 'ms' },
        findings: [{ label: '', detail: 'unlabelled detail', severity: 'medium' }],
      };
      // Non-empty findings → hasDiagnostics is true → should use groupCollapsed
      logVital('LCP', 3000, 'needsImprovement', diagnostics as never);

      expect(mockGroupCollapsed).toHaveBeenCalled();
    });
  });
});
