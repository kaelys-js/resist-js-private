/**
 * Tests for the Svelte Vitest preset factory.
 *
 * @module
 */

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ViteUserConfig } from 'vitest/config';
import { createSvelteTestConfig, type SvelteTestOptions } from './svelte';

function opts(raw: Record<string, unknown>): SvelteTestOptions {
  return raw as unknown as SvelteTestOptions;
}

type CoverageLike = { exclude?: string[]; include?: string[]; provider?: string };
type TestLike = {
  environment?: string;
  include?: string[];
  coverage?: CoverageLike;
  globals?: boolean;
};

function testSection(cfg: ViteUserConfig): TestLike {
  return cfg.test as TestLike;
}

describe('createSvelteTestConfig', () => {
  it('sets environment to jsdom', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({}));
    expect(testSection(cfg).environment).toBe('jsdom');
  });

  it('enables globals (required by Testing Library)', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({}));
    expect(testSection(cfg).globals).toBe(true);
  });

  it('registers the svelte plugin', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({}));
    expect(Array.isArray(cfg.plugins)).toBe(true);
    expect((cfg.plugins ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('appends extra plugins after the svelte plugin', () => {
    const extra = { name: 'extra-plugin' };
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({ plugins: [extra] }));
    const last = (cfg.plugins ?? []).at(-1);
    expect(last).toBe(extra);
  });

  it('preserves base include when no extras provided', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({}));
    expect(testSection(cfg).include).toEqual(['src/**/*.test.ts']);
  });

  it('appends extra include patterns', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({ include: ['custom/**/*.test.ts'] }));
    expect(testSection(cfg).include).toEqual(['src/**/*.test.ts', 'custom/**/*.test.ts']);
  });

  it('sets coverage include to .ts and .svelte files', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({}));
    expect(testSection(cfg).coverage?.include).toEqual(['src/**/*.ts', 'src/**/*.svelte']);
  });

  it('appends extra coverage excludes after base', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(
      opts({ coverageExclude: ['src/legacy/**'] }),
    );
    const excl: string[] | undefined = testSection(cfg).coverage?.exclude;
    expect(excl).toContain('src/**/*.test.ts');
    expect(excl?.at(-1)).toBe('src/legacy/**');
  });

  it('returns no resolve block when packageName is omitted', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({}));
    expect(cfg.resolve).toBeUndefined();
  });

  it('returns no resolve block when only packageName is provided', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({ packageName: '@/ui' }));
    expect(cfg.resolve).toBeUndefined();
  });

  it('returns no resolve block when only dirname is provided', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({ dirname: '/tmp/ui-pkg' }));
    expect(cfg.resolve).toBeUndefined();
  });

  it('builds alias when both packageName and dirname are provided', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(
      opts({ packageName: '@/ui', dirname: '/tmp/ui-pkg' }),
    );
    expect(cfg.resolve).toEqual({ alias: { '@/ui': resolve('/tmp/ui-pkg', './src') } });
  });

  it('throws when packageName fails NameSchema validation', () => {
    expect((): ViteUserConfig => createSvelteTestConfig(opts({ packageName: 42 }))).toThrow();
  });

  it('uses v8 coverage provider', () => {
    const cfg: ViteUserConfig = createSvelteTestConfig(opts({}));
    expect(testSection(cfg).coverage?.provider).toBe('v8');
  });
});
