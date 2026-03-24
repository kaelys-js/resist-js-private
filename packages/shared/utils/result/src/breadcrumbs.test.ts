/**
 * Tests for breadcrumb collection.
 *
 * @module
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { Breadcrumb } from '@/schemas/result/captured-error';
import type { Result } from '@/schemas/result/result';
import { addBreadcrumb, drainBreadcrumbs, getBreadcrumbs, clearBreadcrumbs } from './breadcrumbs';

beforeEach(() => {
  clearBreadcrumbs();
});

describe('addBreadcrumb', () => {
  it('adds a breadcrumb with auto-timestamp', () => {
    const result = addBreadcrumb({
      type: 'http',
      category: 'fetch',
      message: 'GET /api',
      level: 'info',
    });
    expect(result.ok).toBe(true);

    const crumbs: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(crumbs.ok).toBe(true);
    if (crumbs.ok) {
      expect(crumbs.data).toHaveLength(1);
      expect(crumbs.data[0]!.timestamp).toBeDefined();
    }
  });

  it('preserves provided timestamp', () => {
    const ts = '2026-03-05T12:00:00.000Z';
    addBreadcrumb({
      type: 'navigation',
      category: 'route',
      message: '/ → /editor',
      level: 'info',
      timestamp: ts,
    });

    const crumbs: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(crumbs.ok).toBe(true);
    if (crumbs.ok) {
      expect(crumbs.data[0]!.timestamp).toBe(ts);
    }
  });

  it('evicts oldest when exceeding MAX_BREADCRUMBS', () => {
    // Add 101 breadcrumbs (max is 100)
    for (let i = 0; i < 101; i++) {
      addBreadcrumb({
        type: 'http',
        category: 'fetch',
        message: `req-${String(i)}`,
        level: 'info',
      });
    }

    const crumbs: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(crumbs.ok).toBe(true);
    if (crumbs.ok) {
      expect(crumbs.data).toHaveLength(100);
      // First should be req-1 (req-0 was evicted)
      expect(crumbs.data[0]!.message).toBe('req-1');
    }
  });
});

describe('getBreadcrumbs', () => {
  it('returns current breadcrumbs without clearing', () => {
    addBreadcrumb({ type: 'http', message: 'GET /api', level: 'info' });
    const first: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    const second: Result<readonly Breadcrumb[]> = getBreadcrumbs();

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data).toHaveLength(1);
      expect(second.data).toHaveLength(1);
    }
  });
});

describe('drainBreadcrumbs', () => {
  it('returns and clears breadcrumbs', () => {
    addBreadcrumb({ type: 'http', message: 'GET /api', level: 'info' });
    const drained: Result<readonly Breadcrumb[]> = drainBreadcrumbs();
    expect(drained.ok).toBe(true);
    if (drained.ok) {
      expect(drained.data).toHaveLength(1);
    }

    // Buffer should be empty now
    const after: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.data).toHaveLength(0);
    }
  });
});

describe('clearBreadcrumbs', () => {
  it('removes all breadcrumbs', () => {
    addBreadcrumb({ type: 'http', message: 'GET /api', level: 'info' });
    clearBreadcrumbs();

    const crumbs: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(crumbs.ok).toBe(true);
    if (crumbs.ok) {
      expect(crumbs.data).toHaveLength(0);
    }
  });
});
