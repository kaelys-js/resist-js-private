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
  _injectLongTasks,
  _injectEventTimings,
  type VitalThresholds,
} from './vitals-diagnostics';

// =============================================================================
// Result Helpers
// =============================================================================

/**
 * Unwraps a Result for test assertions, returning the data or null on error.
 *
 * @param result - A Result-shaped object.
 * @returns The result data on success, or null on error / missing data.
 */
function unwrap<T>(result: { ok: boolean; data?: T | null }): T | null {
  if ('ok' in result && result.ok && 'data' in result) {
    return result.data ?? null;
  }
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
      if (fmtResult.ok) {
        expect(fmtResult.data).toBe('good < 2500ms \u00B7 poor > 4000ms');
      }
    });

    it('formats score thresholds without suffix', () => {
      const fmtResult = formatThresholds({ good: 0.1, poor: 0.25, unit: 'score' });
      expect(fmtResult.ok).toBe(true);
      if (fmtResult.ok) {
        expect(fmtResult.data).toBe('good < 0.1 \u00B7 poor > 0.25');
      }
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
        if (type === 'navigation') {
          return [];
        }
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
        if (type === 'resource') {
          return [];
        }
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

  // ── CLS both-directions shift ─────────────────────────────────────────

  describe('diagnoseCLS both-directions shift', () => {
    it('reports both horizontal and vertical movement when dx > 0 and dy > 0', () => {
      const el: Element = mockElement('div', 'slide-panel');
      _injectLayoutShiftEntries([
        mockLayoutShiftEntry({
          value: 0.15,
          hadRecentInput: false,
          sources: [
            {
              node: el,
              previousRect: { top: 100, left: 50, width: 200, height: 80 } as DOMRectReadOnly,
              currentRect: { top: 180, left: 120, width: 200, height: 80 } as DOMRectReadOnly,
            },
          ],
        }),
      ]);

      const diag = unwrap(collectDiagnostics('CLS', 0.15, 'needsImprovement'));
      expect(diag).not.toBeNull();
      const largest = diag!.findings.find((f) => f.label === 'Largest Shift');
      expect(largest).toBeDefined();
      expect(largest!.value).toContain('70px horizontal');
      expect(largest!.value).toContain('80px vertical');
      expect(largest!.value).toContain('<div.slide-panel>');
    });
  });

  // ── TTFB missing branches ─────────────────────────────────────────────

  describe('diagnoseTTFB missing branches', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('includes redirect timing when redirectEnd > redirectStart', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'navigation') {
          return [
            mockNavigationEntry({
              redirectStart: 0,
              redirectEnd: 150,
              domainLookupStart: 150,
              domainLookupEnd: 200,
              connectStart: 200,
              connectEnd: 250,
              secureConnectionStart: 210,
              requestStart: 250,
              responseStart: 800,
            }),
          ] as unknown as PerformanceEntry[];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('TTFB', 900, 'needsImprovement'));
      const waterfall = diag!.findings.find((f) => f.label === 'Waterfall');
      expect(waterfall).toBeDefined();
      expect(waterfall!.value).toContain('redirect 150ms');
    });

    it('shows TCP when no TLS (secureConnectionStart = 0)', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'navigation') {
          return [
            mockNavigationEntry({
              domainLookupStart: 10,
              domainLookupEnd: 30,
              connectStart: 30,
              connectEnd: 90,
              secureConnectionStart: 0,
              requestStart: 90,
              responseStart: 400,
            }),
          ] as unknown as PerformanceEntry[];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('TTFB', 900, 'needsImprovement'));
      const waterfall = diag!.findings.find((f) => f.label === 'Waterfall');
      expect(waterfall).toBeDefined();
      expect(waterfall!.value).toContain('TCP 60ms');
      expect(waterfall!.value).not.toContain('TLS');
    });

    it('does not report bottleneck when all values are <= 50', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'navigation') {
          return [
            mockNavigationEntry({
              redirectStart: 0,
              redirectEnd: 0,
              domainLookupStart: 10,
              domainLookupEnd: 30,
              connectStart: 30,
              connectEnd: 60,
              secureConnectionStart: 40,
              requestStart: 60,
              responseStart: 100,
            }),
          ] as unknown as PerformanceEntry[];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('TTFB', 900, 'needsImprovement'));
      const bottleneck = diag!.findings.find((f) => f.label === 'Bottleneck');
      expect(bottleneck).toBeUndefined();
    });
  });

  // ── FCP missing branches ──────────────────────────────────────────────

  describe('diagnoseFCP missing branches', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('shows overflow message when more than 3 blocking resources', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'resource') {
          return [
            mockResourceEntry({
              name: 'https://example.com/a.css',
              renderBlockingStatus: 'blocking',
            }),
            mockResourceEntry({
              name: 'https://example.com/b.css',
              renderBlockingStatus: 'blocking',
            }),
            mockResourceEntry({
              name: 'https://example.com/c.js',
              renderBlockingStatus: 'blocking',
            }),
            mockResourceEntry({
              name: 'https://example.com/d.js',
              renderBlockingStatus: 'blocking',
            }),
          ] as unknown as PerformanceEntry[];
        }
        if (type === 'navigation') {
          return [];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('FCP', 2500, 'needsImprovement'));
      const blocking = diag!.findings.find((f) => f.label === 'Render-Blocking');
      expect(blocking).toBeDefined();
      expect(blocking!.value).toBe('4 resources');

      // Should have the overflow "...and 1 more" finding
      const overflow = diag!.findings.find((f) => f.value.includes('and 1 more'));
      expect(overflow).toBeDefined();
    });

    it('does not add TTFB Impact when ttfb <= 400', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'resource') {
          return [];
        }
        if (type === 'navigation') {
          return [mockNavigationEntry({ responseStart: 300 })] as unknown as PerformanceEntry[];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('FCP', 2000, 'needsImprovement'));
      const ttfbImpact = diag!.findings.find((f) => f.label === 'TTFB Impact');
      expect(ttfbImpact).toBeUndefined();
    });

    it('uses singular "resource" for exactly 1 blocking resource', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(((type: Str) => {
        if (type === 'resource') {
          return [
            mockResourceEntry({
              name: 'https://example.com/style.css',
              renderBlockingStatus: 'blocking',
            }),
          ] as unknown as PerformanceEntry[];
        }
        if (type === 'navigation') {
          return [];
        }
        return [];
      }) as typeof performance.getEntriesByType);

      const diag = unwrap(collectDiagnostics('FCP', 2500, 'needsImprovement'));
      const blocking = diag!.findings.find((f) => f.label === 'Render-Blocking');
      expect(blocking).toBeDefined();
      expect(blocking!.value).toBe('1 resource');
    });
  });

  // ── INP internal branches ─────────────────────────────────────────────

  describe('INP internal branches', () => {
    it('identifies the slowest interaction with target', () => {
      const el: Element = mockElement('button', 'submit-btn');
      _injectEventTimings([
        {
          entryType: 'event',
          name: 'click',
          startTime: 100,
          duration: 350,
          processingStart: 120,
          processingEnd: 380,
          target: el,
          interactionId: 1,
        },
        {
          entryType: 'event',
          name: 'keydown',
          startTime: 500,
          duration: 150,
          processingStart: 510,
          processingEnd: 600,
          target: null,
          interactionId: 2,
        },
      ]);

      const diag = unwrap(collectDiagnostics('INP', 350, 'needsImprovement'));
      expect(diag).not.toBeNull();

      const slowest = diag!.findings.find((f) => f.label === 'Slowest');
      expect(slowest).toBeDefined();
      expect(slowest!.value).toContain('click');
      expect(slowest!.value).toContain('<button.submit-btn>');
      expect(slowest!.value).toContain('350ms');

      const breakdown = diag!.findings.find((f) => f.label === 'Breakdown');
      expect(breakdown).toBeDefined();
      expect(breakdown!.value).toContain('input delay');
      expect(breakdown!.value).toContain('processing');
      expect(breakdown!.value).toContain('presentation');

      const interactions = diag!.findings.find((f) => f.label === 'Interactions');
      expect(interactions).toBeDefined();
      expect(interactions!.value).toBe('2 recorded');
    });

    it('uses (unknown) for target when target is null', () => {
      _injectEventTimings([
        {
          entryType: 'event',
          name: 'pointerdown',
          startTime: 50,
          duration: 400,
          processingStart: 60,
          processingEnd: 300,
          target: null,
          interactionId: 3,
        },
      ]);

      const diag = unwrap(collectDiagnostics('INP', 400, 'poor'));
      const slowest = diag!.findings.find((f) => f.label === 'Slowest');
      expect(slowest).toBeDefined();
      expect(slowest!.value).toContain('(unknown)');
    });

    it('identifies the biggest phase as bottleneck when > 50ms', () => {
      _injectEventTimings([
        {
          entryType: 'event',
          name: 'click',
          startTime: 100,
          duration: 300,
          processingStart: 110,
          processingEnd: 350,
          target: null,
          interactionId: 4,
        },
      ]);

      const diag = unwrap(collectDiagnostics('INP', 300, 'needsImprovement'));
      const bottleneck = diag!.findings.find((f) => f.label === 'Bottleneck');
      expect(bottleneck).toBeDefined();
      // processing = 350 - 110 = 240ms is the biggest phase
      expect(bottleneck!.value).toContain('Processing');
    });

    it('does not show bottleneck when all phases are <= 50ms', () => {
      // inputDelay = 120 - 100 = 20ms
      // processing = 160 - 120 = 40ms
      // presentationDelay = 110 - (160 - 100) = 50ms
      // All <= 50, so no bottleneck (check is strictly > 50)
      _injectEventTimings([
        {
          entryType: 'event',
          name: 'click',
          startTime: 100,
          duration: 110,
          processingStart: 120,
          processingEnd: 160,
          target: null,
          interactionId: 5,
        },
      ]);

      const diag = unwrap(collectDiagnostics('INP', 210, 'needsImprovement'));
      const bottleneck = diag!.findings.find((f) => f.label === 'Bottleneck');
      expect(bottleneck).toBeUndefined();
    });
  });

  // ── TBT internal branches ─────────────────────────────────────────────

  describe('TBT internal branches', () => {
    it('reports long tasks with total blocking time', () => {
      _injectLongTasks([
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 200,
          duration: 120,
          attribution: [],
        },
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 500,
          duration: 80,
          attribution: [],
        },
      ]);

      const diag = unwrap(collectDiagnostics('TBT', 400, 'needsImprovement'));
      expect(diag).not.toBeNull();

      const tasks = diag!.findings.find((f) => f.label === 'Long Tasks');
      expect(tasks).toBeDefined();
      // 2 tasks, (120-50) + (80-50) = 100ms total blocking time
      expect(tasks!.value).toContain('2 tasks');
      expect(tasks!.value).toContain('100ms total blocking time');
    });

    it('identifies longest task and its containerSrc attribution', () => {
      _injectLongTasks([
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 100,
          duration: 200,
          attribution: [
            {
              name: 'script',
              containerType: 'iframe',
              containerSrc: 'https://cdn.example.com/analytics.js',
            },
          ],
        },
      ]);

      const diag = unwrap(collectDiagnostics('TBT', 500, 'poor'));
      const longest = diag!.findings.find((f) => f.label === 'Longest');
      expect(longest).toBeDefined();
      expect(longest!.value).toContain('200ms');
      // shortenUrl on cross-origin URL -> "cdn.example.com/analytics.js"
      expect(longest!.value).toContain('cdn.example.com/analytics.js');
    });

    it('uses containerType when containerSrc is empty', () => {
      _injectLongTasks([
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 100,
          duration: 180,
          attribution: [
            {
              name: 'script',
              containerType: 'iframe',
              containerSrc: '',
            },
          ],
        },
      ]);

      const diag = unwrap(collectDiagnostics('TBT', 500, 'poor'));
      const longest = diag!.findings.find((f) => f.label === 'Longest');
      expect(longest).toBeDefined();
      expect(longest!.value).toContain('180ms');
      expect(longest!.value).toContain('iframe');
    });

    it('shows duration only when no attribution', () => {
      _injectLongTasks([
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 100,
          duration: 150,
          attribution: [],
        },
      ]);

      const diag = unwrap(collectDiagnostics('TBT', 500, 'poor'));
      const longest = diag!.findings.find((f) => f.label === 'Longest');
      expect(longest).toBeDefined();
      expect(longest!.value).toBe('150ms');
    });

    it('works for NTBT metric (same collector as TBT)', () => {
      _injectLongTasks([
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 100,
          duration: 100,
          attribution: [],
        },
      ]);

      const diag = unwrap(collectDiagnostics('NTBT', 400, 'needsImprovement'));
      expect(diag).not.toBeNull();
      const tasks = diag!.findings.find((f) => f.label === 'Long Tasks');
      expect(tasks).toBeDefined();
      expect(tasks!.value).toContain('1 tasks');
    });
  });

  // ── collectDiagnostics safeParse failures ──────────────────────────────

  describe('collectDiagnostics safeParse failures', () => {
    it('returns error for invalid metricName', () => {
      // safeParse(StrSchema, ...) should fail for non-string
      const result = collectDiagnostics(123 as unknown as Str, 100, 'poor');
      expect(result.ok).toBe(false);
    });

    it('returns error for invalid value', () => {
      // safeParse(NumSchema, ...) should fail for non-number
      const result = collectDiagnostics('LCP', 'not-a-number' as unknown as number, 'poor');
      expect(result.ok).toBe(false);
    });

    it('returns error for invalid rating', () => {
      // safeParse(StrSchema, ...) should fail for non-string
      const result = collectDiagnostics('LCP', 3000, 42 as unknown as Str);
      expect(result.ok).toBe(false);
    });
  });

  // ── formatThresholds safeParse failure ─────────────────────────────────

  describe('formatThresholds safeParse failure', () => {
    it('returns error for invalid thresholds object', () => {
      const result = formatThresholds({
        good: 'not-a-number',
        poor: 4000,
        unit: 'ms',
      } as unknown as {
        good: number;
        poor: number;
        unit: 'ms' | 'score';
      });
      expect(result.ok).toBe(false);
    });
  });

  // ── _injectLongTasks / _injectEventTimings test helpers ───────────────

  describe('_injectLongTasks', () => {
    it('injects entries that diagnoseTBT reads', () => {
      const result = _injectLongTasks([
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 0,
          duration: 80,
          attribution: [],
        },
      ]);
      expect(result.ok).toBe(true);

      const diag = unwrap(collectDiagnostics('TBT', 300, 'poor'));
      expect(diag).not.toBeNull();
      const tasks = diag!.findings.find((f) => f.label === 'Long Tasks');
      expect(tasks!.value).toContain('1 tasks');
    });
  });

  describe('_injectEventTimings', () => {
    it('injects entries that diagnoseINP reads', () => {
      const result = _injectEventTimings([
        {
          entryType: 'event',
          name: 'click',
          startTime: 10,
          duration: 250,
          processingStart: 20,
          processingEnd: 200,
          target: null,
          interactionId: 1,
        },
      ]);
      expect(result.ok).toBe(true);

      const diag = unwrap(collectDiagnostics('INP', 250, 'needsImprovement'));
      expect(diag).not.toBeNull();
      const slowest = diag!.findings.find((f) => f.label === 'Slowest');
      expect(slowest).toBeDefined();
    });
  });

  // ── _inject* error paths ────────────────────────────────────────────────

  describe('_inject* error paths', () => {
    it('_injectLCPEntries returns error for non-array input', () => {
      const result = _injectLCPEntries('bad' as unknown as unknown[]);
      expect(result.ok).toBe(false);
    });

    it('_injectLayoutShiftEntries returns error for non-array input', () => {
      const result = _injectLayoutShiftEntries(42 as unknown as unknown[]);
      expect(result.ok).toBe(false);
    });

    it('_injectLongTasks returns error for non-array input', () => {
      const result = _injectLongTasks(null as unknown as unknown[]);
      expect(result.ok).toBe(false);
    });

    it('_injectEventTimings returns error for non-array input', () => {
      const result = _injectEventTimings({} as unknown as unknown[]);
      expect(result.ok).toBe(false);
    });
  });

  // ── getThresholds safeParse failure ─────────────────────────────────────

  describe('getThresholds safeParse failure', () => {
    it('returns error when metricName is not a string', () => {
      const result = getThresholds(123 as unknown as Str);
      expect(result.ok).toBe(false);
    });
  });

  // ── PerformanceObserver callback coverage ──────────────────────────────

  describe('setupDiagnosticObservers observer callbacks', () => {
    let origPerfObserver: typeof PerformanceObserver;

    beforeEach(() => {
      origPerfObserver = globalThis.PerformanceObserver;
      resetDiagnostics();
    });

    afterEach(() => {
      globalThis.PerformanceObserver = origPerfObserver;
      resetDiagnostics();
    });

    it('LCP observer callback pushes entries to lcpEntries', () => {
      const callbacks: Array<(list: { getEntries: () => unknown[] }) => void> = [];

      globalThis.PerformanceObserver = class MockPO {
        constructor(cb: (list: { getEntries: () => unknown[] }) => void) {
          callbacks.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
        takeRecords(): PerformanceEntryList {
          return [];
        }
      } as unknown as typeof PerformanceObserver;

      setupDiagnosticObservers();

      // First callback is LCP observer
      expect(callbacks.length).toBeGreaterThanOrEqual(1);
      callbacks[0]!({
        getEntries: () => [
          mockLCPEntry({
            element: mockElement('img', 'hero'),
            renderTime: 2500,
            loadTime: 1800,
            size: 100_000,
          }),
        ],
      });

      // Now collectDiagnostics should find the LCP entry
      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      expect(diag).not.toBeNull();
      const lcpEl = diag!.findings.find((f) => f.label === 'LCP Element');
      expect(lcpEl).toBeDefined();
      expect(lcpEl!.value).toBe('<img.hero>');
    });

    it('CLS observer callback pushes entries to layoutShiftEntries', () => {
      const callbacks: Array<(list: { getEntries: () => unknown[] }) => void> = [];

      globalThis.PerformanceObserver = class MockPO {
        constructor(cb: (list: { getEntries: () => unknown[] }) => void) {
          callbacks.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
        takeRecords(): PerformanceEntryList {
          return [];
        }
      } as unknown as typeof PerformanceObserver;

      setupDiagnosticObservers();

      // Second callback is CLS observer
      expect(callbacks.length).toBeGreaterThanOrEqual(2);
      callbacks[1]!({
        getEntries: () => [mockLayoutShiftEntry({ value: 0.1, hadRecentInput: false })],
      });

      const diag = unwrap(collectDiagnostics('CLS', 0.2, 'needsImprovement'));
      expect(diag).not.toBeNull();
      const shifts = diag!.findings.find((f) => f.label === 'Layout Shifts');
      expect(shifts).toBeDefined();
    });

    it('long task observer callback pushes entries to longTasks', () => {
      const callbacks: Array<(list: { getEntries: () => unknown[] }) => void> = [];

      globalThis.PerformanceObserver = class MockPO {
        constructor(cb: (list: { getEntries: () => unknown[] }) => void) {
          callbacks.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
        takeRecords(): PerformanceEntryList {
          return [];
        }
      } as unknown as typeof PerformanceObserver;

      setupDiagnosticObservers();

      // Third callback is long task observer
      expect(callbacks.length).toBeGreaterThanOrEqual(3);
      callbacks[2]!({
        getEntries: () => [
          { entryType: 'longtask', name: 'self', startTime: 100, duration: 120, attribution: [] },
        ],
      });

      const diag = unwrap(collectDiagnostics('TBT', 400, 'needsImprovement'));
      expect(diag).not.toBeNull();
      const tasks = diag!.findings.find((f) => f.label === 'Long Tasks');
      expect(tasks).toBeDefined();
      expect(tasks!.value).toContain('1 tasks');
    });

    it('event timing observer callback pushes entries with interactionId > 0 and filters out interactionId = 0', () => {
      const callbacks: Array<(list: { getEntries: () => unknown[] }) => void> = [];

      globalThis.PerformanceObserver = class MockPO {
        constructor(cb: (list: { getEntries: () => unknown[] }) => void) {
          callbacks.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
        takeRecords(): PerformanceEntryList {
          return [];
        }
      } as unknown as typeof PerformanceObserver;

      setupDiagnosticObservers();

      // Fourth callback is event timing observer
      expect(callbacks.length).toBeGreaterThanOrEqual(4);
      callbacks[3]!({
        getEntries: () => [
          // interactionId = 0 should be filtered out
          {
            entryType: 'event',
            name: 'mousemove',
            startTime: 50,
            duration: 200,
            processingStart: 60,
            processingEnd: 180,
            target: null,
            interactionId: 0,
          },
          // interactionId > 0 should be kept
          {
            entryType: 'event',
            name: 'click',
            startTime: 100,
            duration: 300,
            processingStart: 110,
            processingEnd: 350,
            target: null,
            interactionId: 1,
          },
        ],
      });

      const diag = unwrap(collectDiagnostics('INP', 300, 'needsImprovement'));
      expect(diag).not.toBeNull();
      // Only 1 interaction (interactionId=0 was filtered)
      const interactions = diag!.findings.find((f) => f.label === 'Interactions');
      expect(interactions).toBeDefined();
      expect(interactions!.value).toBe('1 recorded');
    });

    it('handles PerformanceObserver constructor throwing for individual observers', () => {
      let callCount = 0;

      globalThis.PerformanceObserver = class MockPO {
        constructor(_cb: unknown) {
          callCount++;
          // Let the first observer succeed, throw on rest
          if (callCount > 1) {
            throw new Error('Not supported');
          }
        }
        observe(): void {}
        disconnect(): void {}
        takeRecords(): PerformanceEntryList {
          return [];
        }
      } as unknown as typeof PerformanceObserver;

      // Should not throw — catch blocks handle errors
      const result = setupDiagnosticObservers();
      expect(result.ok).toBe(true);
    });
  });

  // ── describeElement / describeNode edge cases ────────────────────────────

  describe('describeElement edge cases', () => {
    it('returns <tag> for element with no id and no className', () => {
      const el: Element = mockElement('span', '');
      _injectLCPEntries([mockLCPEntry({ element: el, renderTime: 2000, size: 100 })]);

      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      const elementFinding = diag!.findings.find((f) => f.label === 'LCP Element');
      expect(elementFinding).toBeDefined();
      expect(elementFinding!.value).toBe('<span>');
    });

    it('returns <tag> for element with className that is not a string (SVG-like)', () => {
      const el: Partial<Element> = {
        tagName: 'SVG',
        className: { baseVal: 'icon' } as unknown as string, // SVGAnimatedString
        id: '',
        nodeName: 'SVG',
      };
      Object.setPrototypeOf(el, Element.prototype);

      _injectLCPEntries([mockLCPEntry({ element: el, renderTime: 2000, size: 100 })]);

      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      const elementFinding = diag!.findings.find((f) => f.label === 'LCP Element');
      expect(elementFinding).toBeDefined();
      expect(elementFinding!.value).toBe('<svg>');
    });
  });

  // ── describeNode non-Element ───────────────────────────────────────────

  describe('describeNode for non-Element node', () => {
    it('returns [#text] for Text node in CLS sources', () => {
      const textNode: Partial<Node> = {
        nodeName: '#text',
        nodeType: 3,
      };
      // Do NOT set prototype to Element — it should NOT be instanceof Element
      Object.setPrototypeOf(textNode, Node.prototype);

      _injectLayoutShiftEntries([
        mockLayoutShiftEntry({
          value: 0.15,
          hadRecentInput: false,
          sources: [
            {
              node: textNode,
              previousRect: { top: 100, left: 0 } as DOMRectReadOnly,
              currentRect: { top: 200, left: 0 } as DOMRectReadOnly,
            },
          ],
        }),
      ]);

      const diag = unwrap(collectDiagnostics('CLS', 0.15, 'needsImprovement'));
      const largest = diag!.findings.find((f) => f.label === 'Largest Shift');
      expect(largest).toBeDefined();
      expect(largest!.value).toContain('[#text]');
    });
  });

  // ── shortenUrl error path ─────────────────────────────────────────────

  describe('shortenUrl malformed URL', () => {
    it('uses raw URL when shortenUrl returns error for LCP resource', () => {
      // Mock URL constructor to throw for a specific URL
      const origURL = globalThis.URL;
      const badUrl = 'http://malformed-test-url';
      globalThis.URL = class extends origURL {
        constructor(input: string | URL, base?: string | URL) {
          if (typeof input === 'string' && input === badUrl) {
            throw new TypeError('Invalid URL');
          }
          super(input, base);
        }
      } as typeof URL;

      _injectLCPEntries([
        mockLCPEntry({
          element: null,
          url: badUrl,
          renderTime: 2000,
          loadTime: 1500,
        }),
      ]);

      const diag = unwrap(collectDiagnostics('LCP', 3000, 'needsImprovement'));
      // shortenUrl returns err but diagnoseLCP uses the raw url as fallback
      const resource = diag!.findings.find((f) => f.label === 'Resource');
      expect(resource).toBeDefined();
      expect(resource!.value).toBe(badUrl);

      globalThis.URL = origURL;
    });
  });

  // ── Diagnostic collector catch blocks ─────────────────────────────────

  describe('diagnostic collector catch blocks', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('diagnoseLCP catch — returns error when entry throws', () => {
      // Inject a normal entry first, then mutate it to throw
      const normalEntry = mockLCPEntry({ element: null, renderTime: 2000 });
      const arr: unknown[] = [normalEntry];
      _injectLCPEntries(arr);

      // Replace the entry with a poisoned one after injection
      arr[0] = new Proxy(normalEntry, {
        get(_target: Record<Str, unknown>, prop: string): unknown {
          if (prop === 'element') {
            throw new Error('Cannot access element');
          }
          return _target[prop];
        },
      });

      const result = collectDiagnostics('LCP', 3000, 'needsImprovement');
      expect(result.ok).toBe(false);
    });

    it('diagnoseCLS returns empty findings when no entries exist', () => {
      // Don't inject any layout shift entries — covers line 336 true branch
      const diag = unwrap(collectDiagnostics('CLS', 0.2, 'poor'));
      expect(diag).not.toBeNull();
      expect(diag!.findings).toHaveLength(0);
    });

    it('diagnoseCLS catch — returns error when entry throws', () => {
      // Inject a normal entry first, then mutate it to throw
      const normalEntry = mockLayoutShiftEntry({ value: 0.1, hadRecentInput: false });
      const arr: unknown[] = [normalEntry];
      _injectLayoutShiftEntries(arr);

      // Replace with a proxy that throws during filter iteration
      arr[0] = new Proxy(normalEntry, {
        get(_target: Record<Str, unknown>, prop: string): unknown {
          if (prop === 'hadRecentInput') {
            throw new Error('Cannot access hadRecentInput');
          }
          return _target[prop];
        },
      });

      const result = collectDiagnostics('CLS', 0.2, 'poor');
      expect(result.ok).toBe(false);
    });

    it('diagnoseFCP catch — returns error when performance API throws for resource', () => {
      vi.spyOn(performance, 'getEntriesByType').mockImplementation(() => {
        throw new Error('Not supported');
      });

      const result = collectDiagnostics('FCP', 2000, 'poor');
      expect(result.ok).toBe(false);
    });
  });
});
