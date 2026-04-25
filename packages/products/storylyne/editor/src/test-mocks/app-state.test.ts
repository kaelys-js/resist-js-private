/**
 * Tests for the `$app/state` mock module.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { navigating, page, updated } from './app-state';

describe('app-state mock', () => {
  it('page exposes a default URL, params, status, and empty data', () => {
    expect(page.url).toBeInstanceOf(URL);
    expect(page.url.href).toBe('http://localhost/');
    expect(page.params).toEqual({});
    expect(page.route).toEqual({ id: null });
    expect(page.status).toBe(200);
    expect(page.error).toBeNull();
    expect(page.data).toEqual({});
    expect(page.form).toBeUndefined();
    expect(page.state).toEqual({});
  });

  it('navigating defaults to null (no navigation in progress)', () => {
    expect(navigating).toBeNull();
  });

  it('updated.current is false and updated.check resolves to false', async (): Promise<void> => {
    expect(updated.current).toBe(false);
    const result: boolean = await updated.check();
    expect(result).toBe(false);
  });
});
