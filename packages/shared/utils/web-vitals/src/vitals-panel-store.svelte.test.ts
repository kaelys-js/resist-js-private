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
    const metrics = getVitalsPanelMetrics();
    expect(metrics).toEqual([]);
  });

  it('reportVitalToPanel adds a metric to the store', () => {
    reportVitalToPanel('LCP' as Str, 2500 as Num, 'good' as Str);
    const metrics = getVitalsPanelMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.name).toBe('LCP');
    expect(metrics[0]!.value).toBe(2500);
    expect(metrics[0]!.rating).toBe('good');
    expect(metrics[0]!.timestamp).toBeTypeOf('number');
  });

  it('reportVitalToPanel adds multiple metrics', () => {
    reportVitalToPanel('FCP' as Str, 1200 as Num, 'good' as Str);
    reportVitalToPanel('LCP' as Str, 2500 as Num, 'needsImprovement' as Str);
    reportVitalToPanel('CLS' as Str, 0.15 as Num, 'poor' as Str);

    const metrics = getVitalsPanelMetrics();
    expect(metrics).toHaveLength(3);
    expect(metrics[0]!.name).toBe('FCP');
    expect(metrics[1]!.name).toBe('LCP');
    expect(metrics[2]!.name).toBe('CLS');
  });

  it('reportVitalToPanel includes diagnostics when provided', () => {
    const diagnostics = {
      metric: 'LCP',
      value: 5000,
      rating: 'poor',
      findings: [{ type: 'slow-resource', detail: 'Image took 3s', severity: 'high' }],
    };
    reportVitalToPanel('LCP' as Str, 5000 as Num, 'poor' as Str, diagnostics as never);
    const metrics = getVitalsPanelMetrics();
    expect(metrics[0]!.diagnostics).toBeDefined();
    expect(metrics[0]!.diagnostics).not.toBeNull();
  });

  it('reportVitalToPanel defaults diagnostics to null when omitted', () => {
    reportVitalToPanel('FCP' as Str, 1200 as Num, 'good' as Str);
    const metrics = getVitalsPanelMetrics();
    expect(metrics[0]!.diagnostics).toBeNull();
  });

  it('resetPanelMetrics clears all metrics', () => {
    reportVitalToPanel('LCP' as Str, 2500 as Num, 'good' as Str);
    reportVitalToPanel('FCP' as Str, 1200 as Num, 'good' as Str);
    expect(getVitalsPanelMetrics()).toHaveLength(2);

    resetPanelMetrics();
    expect(getVitalsPanelMetrics()).toHaveLength(0);
  });
});
