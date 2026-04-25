/**
 * Tests for the vitals panel store.
 *
 * @module
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { Str, Num } from '@/schemas/common';
import {
  reportVitalToPanel,
  getVitalsPanelMetrics,
  resetPanelMetrics,
} from './vitals-panel-store.svelte';

beforeEach(() => {
  resetPanelMetrics();
});

describe('vitals panel store', () => {
  it('getVitalsPanelMetrics returns empty array initially', () => {
    const result = getVitalsPanelMetrics();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it('reportVitalToPanel adds a metric to the store', () => {
    reportVitalToPanel('LCP' as Str, 2500 as Num, 'good' as Str, null);
    const result = getVitalsPanelMetrics();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.name).toBe('LCP');
    expect(result.data[0]!.value).toBe(2500);
    expect(result.data[0]!.rating).toBe('good');
    expect(result.data[0]!.timestamp).toBeTypeOf('number');
  });

  it('reportVitalToPanel adds multiple metrics', () => {
    reportVitalToPanel('FCP' as Str, 1200 as Num, 'good' as Str, null);
    reportVitalToPanel('LCP' as Str, 2500 as Num, 'needsImprovement' as Str, null);
    reportVitalToPanel('CLS' as Str, 0.15 as Num, 'poor' as Str, null);

    const result = getVitalsPanelMetrics();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data).toHaveLength(3);
    expect(result.data[0]!.name).toBe('FCP');
    expect(result.data[1]!.name).toBe('LCP');
    expect(result.data[2]!.name).toBe('CLS');
  });

  it('reportVitalToPanel includes diagnostics when provided', () => {
    const diagnostics = {
      thresholds: { good: 2500, poor: 4000, unit: 'ms' as const },
      findings: [{ label: 'LCP Element', value: '<img.hero>' }],
    };
    reportVitalToPanel('LCP' as Str, 5000 as Num, 'poor' as Str, diagnostics as never);
    const result = getVitalsPanelMetrics();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data[0]!.diagnostics).toBeDefined();
    expect(result.data[0]!.diagnostics).not.toBeNull();
  });

  it('reportVitalToPanel defaults diagnostics to null when passed null', () => {
    reportVitalToPanel('FCP' as Str, 1200 as Num, 'good' as Str, null);
    const result = getVitalsPanelMetrics();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data[0]!.diagnostics).toBeNull();
  });

  it('resetPanelMetrics clears all metrics', () => {
    reportVitalToPanel('LCP' as Str, 2500 as Num, 'good' as Str, null);
    reportVitalToPanel('FCP' as Str, 1200 as Num, 'good' as Str, null);
    const beforeResult = getVitalsPanelMetrics();
    expect(beforeResult.ok).toBe(true);
    if (beforeResult.ok) {
      expect(beforeResult.data).toHaveLength(2);
    }

    resetPanelMetrics();
    const afterResult = getVitalsPanelMetrics();
    expect(afterResult.ok).toBe(true);
    if (afterResult.ok) {
      expect(afterResult.data).toHaveLength(0);
    }
  });

  // ── safeParse failures ──────────────────────────────────────────

  describe('safeParse failures', () => {
    it('returns error when name is invalid', () => {
      const result = reportVitalToPanel(123 as unknown as Str, 100 as Num, 'good' as Str, null);
      expect(result.ok).toBe(false);
    });

    it('returns error when value is invalid', () => {
      const result = reportVitalToPanel('LCP' as Str, 'bad' as unknown as Num, 'good' as Str, null);
      expect(result.ok).toBe(false);
    });

    it('returns error when rating is invalid', () => {
      const result = reportVitalToPanel('LCP' as Str, 100 as Num, 123 as unknown as Str, null);
      expect(result.ok).toBe(false);
    });

    it('returns error when diagnostics is invalid', () => {
      const result = reportVitalToPanel(
        'LCP' as Str,
        100 as Num,
        'good' as Str,
        'bad' as unknown as null,
      );
      expect(result.ok).toBe(false);
    });
  });
});
