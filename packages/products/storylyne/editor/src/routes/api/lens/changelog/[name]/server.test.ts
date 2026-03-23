/**
 * Tests for the changelog API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Num, Str } from '@/schemas/common';
import { GET } from './+server';

type ChangelogEntry = {
  hash: Str;
  message: Str;
  body: Str;
  date: Str;
  author: Str;
};

type ChangelogResponse = {
  entries: ChangelogEntry[];
  total: Num;
  repoUrl: Str;
  componentPath: Str;
  diffAnchor: Str;
};

describe('GET /api/lens/changelog/[name]', () => {
  it('returns JSON with entries array for known component', async () => {
    const response: Response = GET({ params: { name: 'button' } } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body: ChangelogResponse = await response.json();
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries.length).toBeGreaterThan(0);
  });

  it('entries have hash, message, date, author fields', async () => {
    const response: Response = GET({ params: { name: 'button' } } as never);
    const body: ChangelogResponse = await response.json();
    const first = body.entries[0]!;

    expect(first.hash).toBeTruthy();
    expect(first.message).toBeTruthy();
    expect(first.date).toBeTruthy();
    expect(first.author).toBeTruthy();
  });

  it('returns empty entries for nonexistent component', async () => {
    const response: Response = GET({ params: { name: 'nonexistent-component-xyz' } } as never);
    const body: ChangelogResponse = await response.json();
    expect(body.entries).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('returns empty array when name param is empty', async () => {
    const response: Response = GET({ params: { name: '' } } as never);
    const body: unknown[] = await response.json();
    expect(body).toEqual([]);
  });

  it('includes repoUrl, componentPath, and diffAnchor in response', async () => {
    const response: Response = GET({ params: { name: 'button' } } as never);
    const body: ChangelogResponse = await response.json();

    expect(typeof body.repoUrl).toBe('string');
    expect(body.componentPath).toBe('packages/shared/ui/src/button');
    expect(typeof body.diffAnchor).toBe('string');
  });
});
