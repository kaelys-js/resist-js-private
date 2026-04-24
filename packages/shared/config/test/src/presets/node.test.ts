/**
 * Tests for the Node Vitest preset factory.
 *
 * @module
 */

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ViteUserConfig } from 'vitest/config';
import { createNodeTestConfig, type NodeTestOptions } from './node';

/* Helper: feed raw shapes as if they were the pre-parse input. */
function opts(raw: Record<string, unknown>): NodeTestOptions {
  return raw as unknown as NodeTestOptions;
}

type CoverageLike = { exclude?: string[]; provider?: string };
type TestLike = {
  environment?: string;
  include?: string[];
  coverage?: CoverageLike;
  globals?: boolean;
  pool?: string;
};

function testSection(cfg: ViteUserConfig): TestLike {
  return cfg.test as TestLike;
}

describe('createNodeTestConfig', () => {
  it('returns a config with environment=node', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(opts({}));
    expect(testSection(cfg).environment).toBe('node');
  });

  it('preserves base include when no extras provided', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(opts({}));
    expect(testSection(cfg).include).toEqual(['src/**/*.test.ts']);
  });

  it('appends extra include patterns after base patterns', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(opts({ include: ['custom/**/*.test.ts'] }));
    expect(testSection(cfg).include).toEqual(['src/**/*.test.ts', 'custom/**/*.test.ts']);
  });

  it('appends extra coverage excludes after base excludes', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(opts({ coverageExclude: ['src/legacy/**'] }));
    const excl: string[] | undefined = testSection(cfg).coverage?.exclude;
    expect(excl).toContain('src/**/*.test.ts');
    expect(excl?.[excl.length - 1]).toBe('src/legacy/**');
  });

  it('returns no resolve block when packageName is omitted', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(opts({}));
    expect(cfg.resolve).toBeUndefined();
  });

  it('returns no resolve block when packageName provided without dirname', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(opts({ packageName: '@/cli' }));
    expect(cfg.resolve).toBeUndefined();
  });

  it('returns no resolve block when dirname provided without packageName', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(opts({ dirname: '/tmp/pkg' }));
    expect(cfg.resolve).toBeUndefined();
  });

  it('builds the self-referencing alias when both packageName and dirname are provided', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(
      opts({ packageName: '@/cli', dirname: '/tmp/pkg' }),
    );
    expect(cfg.resolve).toEqual({ alias: { '@/cli': resolve('/tmp/pkg', './src') } });
  });

  it('throws a valibot error when packageName fails NameSchema validation', () => {
    /* cast intentional: exercise safeParse rejection branch */
    expect((): ViteUserConfig => createNodeTestConfig(opts({ packageName: 123 }))).toThrow();
  });

  it('inherits base pool=threads and globals=false', () => {
    const cfg: ViteUserConfig = createNodeTestConfig(opts({}));
    expect(testSection(cfg).pool).toBe('threads');
    expect(testSection(cfg).globals).toBe(false);
  });
});
