/**
 * Tests for the (app) root layout server load function.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Str, Num } from '@/schemas/common';
import { load } from './+layout.server';
import { MOCK_USER } from '$lib/server/mock/data';
import { createMockService } from '$lib/server/mock/service';

function makeLocals(user: typeof MOCK_USER | null = MOCK_USER) {
  return {
    locale: 'en' as Str,
    sidebarPx: 300 as Num | null,
    sidebarOpen: true as boolean | null,
    user,
    db: createMockService(0),
    saveData: false,
  };
}

function makeUrl(search: string = ''): URL {
  return new URL(`http://localhost/editor${search}`);
}

describe('(app) +layout.server load', () => {
  it('returns null user and empty scenes when no user in locals', () => {
    const result = (load as unknown as (event: Record<string, unknown>) => Record<string, any>)({
      locals: makeLocals(null),
      url: makeUrl(),
    });
    expect(result.user).toBeNull();
    expect(result.project).toBeNull();
    expect(result.scenes).toEqual([]);
  });

  it('returns user and project promise when authenticated', () => {
    const result = (load as unknown as (event: Record<string, unknown>) => Record<string, any>)({
      locals: makeLocals(),
      url: makeUrl(),
    });
    expect(result.user).toBe(MOCK_USER);
    expect(result.project).toBeInstanceOf(Promise);
    expect(result.scenes).toBeInstanceOf(Promise);
  });

  it('project promise resolves to project data', async () => {
    const result = (load as unknown as (event: Record<string, unknown>) => Record<string, any>)({
      locals: makeLocals(),
      url: makeUrl(),
    });
    const project = await result.project;
    expect(project).not.toBeNull();
    expect(project.id).toBeDefined();
    expect(project.name).toBeDefined();
  });

  it('scenes promise resolves to scene array', async () => {
    const result = (load as unknown as (event: Record<string, unknown>) => Record<string, any>)({
      locals: makeLocals(),
      url: makeUrl(),
    });
    const scenes = await result.scenes;
    expect(Array.isArray(scenes)).toBe(true);
    expect(scenes.length).toBeGreaterThan(0);
  });

  it('scenes returns empty when sto.scenes=empty URL param set', async () => {
    const result = (load as unknown as (event: Record<string, unknown>) => Record<string, any>)({
      locals: makeLocals(),
      url: makeUrl('?sto.scenes=empty'),
    });
    const scenes = await result.scenes;
    expect(scenes).toEqual([]);
  });
});
