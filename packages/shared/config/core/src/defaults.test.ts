/**
 * Tests for core config defaults.
 *
 * Verifies that the defaults object is a valid CoreConfig with correct
 * default values for every section.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { CoreConfigSchema } from '@/schemas/core-config/config';
import { safeParse } from '@/utils/result/safe';
import { defaults } from './defaults';

describe('defaults', () => {
  it('validates against CoreConfigSchema', () => {
    const result = safeParse(CoreConfigSchema, defaults);
    expect(result.ok).toBe(true);
  });

  it('company defaults are correct', () => {
    expect(defaults.company.name).toBe('My Company');
    expect(defaults.company.domain).toBe('example.com');
    expect(defaults.company.supportEmail).toBe('support@example.com');
    expect(defaults.company.license).toBe('MIT');
    expect(defaults.company.emails).toEqual({});
    expect(defaults.company.domains).toEqual({});
  });

  it('products defaults to empty array', () => {
    expect(defaults.products).toEqual([]);
  });

  it('locales defaults to [en] with defaultLocale en', () => {
    expect(defaults.locales).toEqual(['en']);
    expect(defaults.defaultLocale).toBe('en');
  });

  it('tooling.devProxy defaults are correct', () => {
    expect(defaults.tooling.devProxy.port).toBe(3000);
    expect(defaults.tooling.devProxy.https).toBe(true);
    expect(defaults.tooling.devProxy.localTld).toBe('.localhost');
    expect(defaults.tooling.devProxy.portIncrement).toBe(100);
    expect(defaults.tooling.devProxy.adminPort).toBe(9001);
  });

  it('tooling.formatting defaults are correct', () => {
    expect(defaults.tooling.formatting.useTabs).toBe(true);
    expect(defaults.tooling.formatting.tabWidth).toBe(2);
    expect(defaults.tooling.formatting.printWidth).toBe(100);
    expect(defaults.tooling.formatting.singleQuote).toBe(true);
    expect(defaults.tooling.formatting.semi).toBe(true);
  });

  it('versions defaults are correct', () => {
    expect(defaults.versions.node).toBe('24.13.0');
    expect(defaults.versions.packageManager).toBe('10.28.2');
    expect(Object.keys(defaults.versions.nodeTools).length).toBe(26);
    expect(defaults.versions.nodeTools['@biomejs/biome']).toBe('2.4.2');
    expect(Object.keys(defaults.versions.systemTools).length).toBe(66);
    expect(defaults.versions.systemTools.caddy).toBe('2.10.2');
  });

  it('environment defaults to development', () => {
    expect(defaults.environment).toBe('development');
  });
});
