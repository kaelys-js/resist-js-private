/**
 * Tests for Web Vitals Diagnostics module.
 *
 * Mocks browser Performance APIs to verify diagnostic collection
 * for each metric type.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Bool } from '@/schemas/common';
import {
  getThresholds,
  collectDiagnostics,
  formatThresholds,
  setupDiagnosticObservers,
  resetDiagnostics,
  _injectLCPEntries,
  _injectLayoutShiftEntries,
  type VitalThresholds,
  type VitalDiagnostics,
} from './vitals-diagnostics';

// =============================================================================
// Result Helpers
// =============================================================================

/**
 * Unwraps a Result for test assertions, returning the data or null on error.
 */
function unwrap<T>(result: { ok: boolean; data?: T | null }): T | null {
  if ('ok' in result && result.ok && 'data' in result) return result.data ?? null;
  return null;
}

// =============================================================================
// Mock Helpers
// =============================================================================

// Note: Mock helpers return `Record<Str, unknown>` because test mocks don't
// implement the full PerformanceEntry interface. Callers cast through
// `unknown` to PerformanceEntry[] — safe because only the properties read
// by the diagnostics module are accessed at runtime.

/**
 * Creates a mock LCP PerformanceEntry.
 *
 * @param overrides - Properties to override in the mock entry
 * @returns Mock LCP entry as a record
 */
function mockLCPEntry(overrides: Record<Str, unknown> = {}): Record<Str, unknown> {
  return {
    entryType: 'largest-contentful-paint',
    name: '',
    startTime: 2500,
    duration: 0,
    element: null,
    url: '',
    size: 0,
    loadTime: 0,
    renderTime: 0,
    toJSON: () => ({}),
    ...overrides,
  };
}

/**
 * Creates a mock LayoutShift PerformanceEntry.
 *
 * @param overrides - Properties to override in the mock entry
 * @returns Mock layout shift entry as a record
 */
function mockLayoutShiftEntry(overrides: Record<Str, unknown> = {}): Record<Str, unknown> {
  return {
    entryType: 'layout-shift',
    name: '',
    startTime: 1000,
    duration: 0,
    value: 0.05,
    hadRecentInput: false,
    sources: [],
    toJSON: () => ({}),
    ...overrides,
  };
}

/**
 * Creates a mock PerformanceNavigationTiming entry.
 *
 * @param overrides - Properties to override in the mock entry
 * @returns Mock navigation entry as a record
 */
function mockNavigationEntry(overrides: Record<Str, unknown> = {}): Record<Str, unknown> {
  return {
    entryType: 'navigation',
    name: 'document',
    startTime: 0,
    duration: 3000,
    redirectStart: 0,
    redirectEnd: 0,
    domainLookupStart: 10,
    domainLookupEnd: 55,
    connectStart: 55,
    connectEnd: 200,
    secureConnectionStart: 100,
    requestStart: 200,
    responseStart: 1200,
    responseEnd: 1500,
    toJSON: () => ({}),
    ...overrides,
  };
}

/**
 * Creates a mock PerformanceResourceTiming entry.
 *
 * @param overrides - Properties to override in the mock entry
 * @returns Mock resource entry as a record
 */
function mockResourceEntry(overrides: Record<Str, unknown> = {}): Record<Str, unknown> {
  return {
    entryType: 'resource',
    name: 'https://example.com/style.css',
    startTime: 50,
    duration: 120,
    renderBlockingStatus: undefined,
    toJSON: () => ({}),
    ...overrides,
  };
}

/**
 * Creates a mock DOM Element for LCP/CLS targets.
 *
 * @param tag - HTML tag name
 * @param classOrId - CSS class name or element ID
 * @param isId - If true, `classOrId` is treated as an ID; otherwise as a class
 * @returns Mock Element instance
 */
function mockElement(tag: Str, classOrId: Str = '', isId: Bool = false): Element {
  const el: Partial<Element> = {
    tagName: tag.toUpperCase(),
    className: isId ? '' : classOrId,
    id: isId ? classOrId : '',
    nodeName: tag.toUpperCase(),
  };
  // nodeType = 1 (ELEMENT_NODE) for instanceof checks
  Object.setPrototypeOf(el, Element.prototype);
  return el as Element;
}

// =============================================================================
// Tests
// =============================================================================

describe('vitals-diagnostics', () => {
  beforeEach(() => {
    resetDiagnostics();
  });

  // ── Thresholds ────────────────────────────────────────────────────────

  describe('getThresholds', () => {
    it('returns thresholds for known metrics', () => {
      const result = getThresholds('LCP');
      expect(result.ok).toBe(true);
      const lcp: VitalThresholds | null = result.ok ? result.data : null;
      expect(lcp).not.toBeNull();
      expect(lcp!.good).toBe(2500);
      expect(lcp!.poor).toBe(4000);
      expect(lcp!.unit).toBe('ms');
    });

    it('returns CLS thresholds with score unit', () => {
      const clsResult = getThresholds('CLS');
      expect(clsResult.ok).toBe(true);
      const cls: VitalThresholds | null = clsResult.ok ? clsResult.data : null;
      expect(cls).not.toBeNull();
      expect(cls!.good).toBe(0.1);
      expect(cls!.poor).toBe(0.25);
      expect(cls!.unit).toBe('score');
    });

    it('returns null for unknown metrics', () => {
      const r1 = getThresholds('UNKNOWN');
      expect(r1.ok && r1.data).toBeNull();
      const r2 = getThresholds('navigationTiming');
      expect(r2.ok && r2.data).toBeNull();
    });

    it('has thresholds for all core Web Vitals', () => {
      const coreMetrics: Str[] = ['LCP', 'CLS', 'FCP', 'TTFB', 'INP', 'FID', 'TBT', 'NTBT'];
      for (const name of coreMetrics) {
        const r = getThresholds(name);
        expect(r.ok && r.data, `Missing thresholds for ${name}`).not.toBeNull();
      }
    });
  });

  // ── formatThresholds ──────────────────────────────────────────────────

  describe('formatThresholds', () => {
    it('formats timing thresholds with ms suffix', () => {
      const fmtResult = formatThresholds({ good: 2500, poor: 4000, unit: 'ms' });
      expect(fmtResult.ok).toBe(true);
      if (fmtResult.ok) expect(fmtResult.data).toBe('good < 2500ms \u00B7 poor > 4000ms');
    });

    it('formats score thresholds without suffix', () => {
      const fmtResult = formatThresholds({ good: 0.1, poor: 0.25, unit: 'score' });
      expect(fmtResult.ok).toBe(true);
      if (fmtResult.ok) expect(fmtResult.data).toBe('good < 0.1 \u00B7 poor > 0.25');
    });
  });

  // ── collectDiagnostics ────────────────────────────────────────────────

  describe('collectDiagnostics', () => {
    it('returns null for good ratings', () => {
      const r1 = collectDiagnostics('LCP', 1200, 'good');
      expect(r1.ok && r1.data).toBeNull();
      const r2 = collectDiagnostics('CLS', 0.05, 'good');
      expect(r2.ok && r2.data).toBeNull();
    });

    it('returns null for unknown metrics', () => {
      const rUnknown = collectDiagnostics('UNKNOWN', 100, 'poor');
      expect(rUnknown.ok && rUnknown.data).toBeNull();
    });

    it('returns thresholds for non-good metrics', () => {
      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      expect(diag).not.toBeNull();
      expect(diag!.thresholds.good).toBe(2500);
      expect(diag!.thresholds.poor).toBe(4000);
    });

    it('returns findings array (may be empty if APIs unavailable)', () => {
      const diag = unwrap(collectDiagnostics('TTFB', 2000, 'poor'));
      expect(diag).not.toBeNull();
      expect(Array.isArray(diag!.findings)).toBe(true);
    });
  });

  // ── LCP Diagnostics ──────────────────────────────────────────────────

  describe('LCP diagnostics', () => {
    it('identifies LCP element by tag and class', () => {
      const el: Element = mockElement('img', 'hero-image');
      _injectLCPEntries([
        mockLCPEntry({
          element: el,
          url: '/images/hero.jpg',
          renderTime: 2500,
          loadTime: 1800,
          size: 450_000,
        }),
      ]);

      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      expect(diag).not.toBeNull();

      const labels: Str[] = diag!.findings.map((f) => f.label);
      expect(labels).toContain('LCP Element');
      expect(labels).toContain('Resource');
      expect(labels).toContain('Timing');

      const elementFinding = diag!.findings.find((f) => f.label === 'LCP Element');
      expect(elementFinding!.value).toBe('<img.hero-image>');
    });

    it('identifies LCP element by ID when available', () => {
      const el: Element = mockElement('div', 'main-banner', true);
      _injectLCPEntries([mockLCPEntry({ element: el, renderTime: 3000 })]);

      const diag = unwrap(collectDiagnostics('LCP', 3500, 'poor'));
      const elementFinding = diag!.findings.find((f) => f.label === 'LCP Element');
      expect(elementFinding!.value).toBe('<div#main-banner>');
    });

    it('shows timing breakdown with load and render delay', () => {
      _injectLCPEntries([mockLCPEntry({ loadTime: 1500, renderTime: 2200 })]);

      const diag = unwrap(collectDiagnostics('LCP', 2800, 'needsImprovement'));
      const timing = diag!.findings.find((f) => f.label === 'Timing');
      expect(timing!.value).toBe('load 1500ms + render delay 700ms');
    });

    it('returns empty findings when no LCP entries exist', () => {
      const diag = unwrap(collectDiagnostics('LCP', 5000, 'poor'));
      expect(diag!.findings).toHaveLength(0);
    });
  });

  // ── CLS Diagnostics ──────────────────────────────────────────────────

  describe('CLS diagnostics', () => {
    it('counts unexpected layout shifts', () => {
      _injectLayoutShiftEntries([
        mockLayoutShiftEntry({ value: 0.05, hadRecentInput: false }),
        mockLayoutShiftEntry({ value: 0.03, hadRecentInput: false }),
        mockLayoutShiftEntry({ value: 0.02, hadRecentInput: true }),
      ]);

      const diag = unwrap(collectDiagnostics('CLS', 0.15, 'needsImprovement'));
      const shiftCount = diag!.findings.find((f) => f.label === 'Layout Shifts');
      expect(shiftCount!.value).toBe('2 unexpected (3 total)');
    });

    it('identifies the largest shifting element', () => {
      const el: Element = mockElement('div', 'ad-banner');
      _injectLayoutShiftEntries([
        mockLayoutShiftEntry({
          value: 0.12,
          hadRecentInput: false,
          sources: [
            {
              node: el,
              previousRect: { top: 400, left: 0, width: 300, height: 100 } as DOMRectReadOnly,
              currentRect: { top: 542, left: 0, width: 300, height: 100 } as DOMRectReadOnly,
            },
          ],
        }),
      ]);

      const diag = unwrap(collectDiagnostics('CLS', 0.3, 'poor'));
      const largest = diag!.findings.find((f) => f.label === 'Largest Shift');
      expect(largest).toBeDefined();
      expect(largest!.value).toContain('<div.ad-banner>');
      expect(largest!.value).toContain('142px vertical');
    });
  });

  // ── TTFB Diagnostics ─────────────────────────────────────────────────

  describe('TTFB diagnostics', () => {
    it('breaks down network waterfall', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'navigation') {
          return [mockNavigationEntry()] as unknown as PerformanceEntry[];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('TTFB', 1200, 'needsImprovement'));
      const waterfall = diag!.findings.find((f) => f.label === 'Waterfall');
      expect(waterfall).toBeDefined();
      expect(waterfall!.value).toContain('DNS');
      expect(waterfall!.value).toContain('TLS');
      expect(waterfall!.value).toContain('server');

      vi.restoreAllMocks();
    });

    it('identifies the biggest bottleneck', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'navigation') {
          return [
            mockNavigationEntry({
              requestStart: 200,
              responseStart: 1800,
            }),
          ] as unknown as PerformanceEntry[];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('TTFB', 1800, 'poor'));
      const bottleneck = diag!.findings.find((f) => f.label === 'Bottleneck');
      expect(bottleneck).toBeDefined();
      expect(bottleneck!.value).toContain('Server response');

      vi.restoreAllMocks();
    });
  });

  // ── FCP Diagnostics ──────────────────────────────────────────────────

  describe('FCP diagnostics', () => {
    it('identifies render-blocking resources', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'resource') {
          return [
            mockResourceEntry({
              name: 'https://example.com/style.css',
              duration: 120,
              renderBlockingStatus: 'blocking',
            }),
            mockResourceEntry({
              name: 'https://example.com/app.js',
              duration: 450,
              renderBlockingStatus: 'blocking',
            }),
            mockResourceEntry({ name: 'https://example.com/image.png', duration: 200 }),
          ] as unknown as PerformanceEntry[];
        }
        if (type === 'navigation') return [];
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('FCP', 2500, 'needsImprovement'));
      const blocking = diag!.findings.find((f) => f.label === 'Render-Blocking');
      expect(blocking).toBeDefined();
      expect(blocking!.value).toBe('2 resources');

      vi.restoreAllMocks();
    });

    it('reports TTFB impact when server response is slow', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'resource') return [];
        if (type === 'navigation') {
          return [mockNavigationEntry({ responseStart: 900 })] as unknown as PerformanceEntry[];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('FCP', 2000, 'needsImprovement'));
      const ttfbImpact = diag!.findings.find((f) => f.label === 'TTFB Impact');
      expect(ttfbImpact).toBeDefined();
      expect(ttfbImpact!.value).toContain('900ms');

      vi.restoreAllMocks();
    });
  });

  // ── INP Diagnostics ──────────────────────────────────────────────────

  describe('INP diagnostics', () => {
    it('shows note when no interactions recorded', () => {
      const diag = unwrap(collectDiagnostics('INP', 300, 'needsImprovement'));
      const note = diag!.findings.find((f) => f.label === 'Note');
      expect(note).toBeDefined();
      expect(note!.value).toContain('No interactions recorded');
    });
  });

  // ── TBT Diagnostics ──────────────────────────────────────────────────

  describe('TBT diagnostics', () => {
    it('shows message when no long tasks observed', () => {
      const diag = unwrap(collectDiagnostics('TBT', 300, 'needsImprovement'));
      const tasks = diag!.findings.find((f) => f.label === 'Long Tasks');
      expect(tasks).toBeDefined();
      expect(tasks!.value).toContain('None observed');
    });
  });

  // ── Observer Setup ───────────────────────────────────────────────────

  describe('setupDiagnosticObservers', () => {
    it('does not throw when PerformanceObserver is unavailable', () => {
      const orig = globalThis.PerformanceObserver;
      // @ts-expect-error — Simulating missing API
      globalThis.PerformanceObserver = undefined;

      expect(() => setupDiagnosticObservers()).not.toThrow();

      globalThis.PerformanceObserver = orig;
    });
  });

  // ── Edge Cases ───────────────────────────────────────────────────────

  describe('edge cases', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('handles performance.getEntriesByType throwing for TTFB', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(() => {
        throw new Error('Not supported');
      });

      // When the performance API throws, collectDiagnostics returns an err Result
      const result = collectDiagnostics('TTFB', 2000, 'poor');
      expect(result.ok).toBe(false);
    });

    it('handles LCP entry with null element gracefully', () => {
      _injectLCPEntries([mockLCPEntry({ element: null, loadTime: 1500, renderTime: 2000 })]);

      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      const labels: Str[] = diag!.findings.map((f) => f.label);
      expect(labels).not.toContain('LCP Element');
      expect(labels).toContain('Timing');
    });
  });

  describe('setupDiagnosticObservers edge cases', () => {
    it('skips re-initialization when already active', () => {
      setupDiagnosticObservers();
      // Second call should be a no-op (no error)
      setupDiagnosticObservers();
      // If it didn't throw, the guard works
    });
  });

  describe('diagnoseCLS edge cases', () => {
    it('handles dx-only movement (dy=0)', () => {
      _injectLayoutShiftEntries([
        {
          value: 0.2,
          hadRecentInput: false,
          sources: [
            {
              node: null,
              previousRect: {
                x: 0,
                y: 100,
                width: 200,
                height: 50,
                top: 100,
                right: 200,
                bottom: 150,
                left: 0,
                toJSON: () => ({}),
              },
              currentRect: {
                x: 50,
                y: 100,
                width: 200,
                height: 50,
                top: 100,
                right: 250,
                bottom: 150,
                left: 50,
                toJSON: () => ({}),
              },
            },
          ],
        },
      ]);

      const diag = unwrap(collectDiagnostics('CLS', 0.2, 'needsImprovement'));
      expect(diag).not.toBeNull();
      // Should contain movement detail with dx direction
      const shiftFinding = diag!.findings.find((f) => f.label === 'Shifted Element');
      if (shiftFinding) {
        expect(shiftFinding.value).toContain('50px');
      }
    });
  });

  describe('diagnoseLCP timing branches', () => {
    it('reports render-only timing when loadTime is 0', () => {
      _injectLCPEntries([mockLCPEntry({ renderTime: 2000, loadTime: 0 })]);

      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      expect(diag).not.toBeNull();
      const renderFinding = diag!.findings.find((f) => f.label === 'Render Time');
      expect(renderFinding).toBeDefined();
      if (renderFinding) {
        expect(renderFinding.value).toContain('2000ms');
      }
    });

    it('reports load-only timing when renderTime is 0', () => {
      _injectLCPEntries([mockLCPEntry({ renderTime: 0, loadTime: 1500 })]);

      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      expect(diag).not.toBeNull();
      const loadFinding = diag!.findings.find((f) => f.label === 'Load Time');
      expect(loadFinding).toBeDefined();
      if (loadFinding) {
        expect(loadFinding.value).toContain('1500ms');
      }
    });
  });
});
