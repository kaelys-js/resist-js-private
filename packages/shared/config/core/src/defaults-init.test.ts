/**
 * Tests for defaults.ts module-level throw branch (line 230).
 *
 * This test verifies that defaults.ts throws when safeParse returns a failure.
 * Must be a separate file because the throw happens at module import time.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';

describe('defaults module-level throw', () => {
  it('throws when safeParse returns failure for defaults', async () => {
    vi.resetModules();

    vi.doMock('@/utils/result/safe', () => ({
      safeParse: () => ({
        ok: false,
        error: { message: 'schema validation failed' },
      }),
    }));

    await expect(() => import('./defaults')).rejects.toThrow('Default config validation failed');
  });
});
