/**
 * Tests for the What's New changelog page server load.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { load, type ChangelogData } from './+page.server';

describe('(testing)/changelog +page.server load', () => {
  it('returns groups array with changelog entries', () => {
    const result = (load as Function)({}) as ChangelogData;
    expect(result.groups).toBeDefined();
    expect(Array.isArray(result.groups)).toBe(true);
    expect(result.groups.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it('each entry has hash, message, author, date, components fields', () => {
    const result = (load as Function)({}) as ChangelogData;
    const first = result.groups[0]!.entries[0]!;
    expect(first.hash).toBeTruthy();
    expect(first.message).toBeTruthy();
    expect(first.author).toBeTruthy();
    expect(first.date).toBeTruthy();
    expect(Array.isArray(first.components)).toBe(true);
    expect(first.components.length).toBeGreaterThan(0);
  });

  it('entries are grouped by date', () => {
    const result = (load as Function)({}) as ChangelogData;
    for (const group of result.groups) {
      expect(group.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(group.entries.length).toBeGreaterThan(0);
    }
  });

  it('repoUrl is a non-empty string', () => {
    const result = (load as Function)({}) as ChangelogData;
    expect(typeof result.repoUrl).toBe('string');
    expect(result.repoUrl.length).toBeGreaterThan(0);
  });
});
