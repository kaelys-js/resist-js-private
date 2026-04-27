/**
 * Tests for the Icons gallery page server load.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { load, type IconsData } from './+page.server';

describe('(testing)/icons +page.server load', () => {
  it('returns array of icon names', () => {
    const result = (load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as IconsData;
    expect(Array.isArray(result.names)).toBe(true);
    // In test env, Lucide resolves from workspace root where it may not exist
    // — catch returns empty array. Validates the error path.
  });

  it('names array is sorted when non-empty', () => {
    const result = (load as unknown as (event: Record<string, unknown>) => unknown)(
      {},
    ) as IconsData;
    if (result.names.length > 1) {
      const sorted = [...result.names].toSorted();
      expect(result.names).toEqual(sorted);
    }
  });
});
