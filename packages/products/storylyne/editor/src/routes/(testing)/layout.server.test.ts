/**
 * Tests for the testing layout server load.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { load, type TestingLayoutData } from './+layout.server';

describe('(testing) +layout.server load', () => {
  it('returns iconCount as a non-negative number', () => {
    const result = (load as Function)({}) as TestingLayoutData;
    expect(typeof result.iconCount).toBe('number');
    expect(result.iconCount).toBeGreaterThanOrEqual(0);
  });

  it('returns integer iconCount', () => {
    const result = (load as Function)({}) as TestingLayoutData;
    expect(Number.isInteger(result.iconCount)).toBe(true);
  });
});
