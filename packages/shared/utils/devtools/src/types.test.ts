/**
 * Tests for shared devtools type constants.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { LOG_LEVELS } from './types';

describe('LOG_LEVELS', () => {
  it('contains all five levels in ascending severity order', () => {
    expect(LOG_LEVELS).toEqual(['trace', 'debug', 'info', 'warn', 'error']);
  });
});
