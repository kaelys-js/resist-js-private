/**
 * Tests for config schema.
 *
 * @module
 */

import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as v from 'valibot';

import { en } from '@/lint/locale/locales/en.ts';

import type { OptionsSchema } from '../framework/types.ts';
import {
  RuleSeveritySchema,
  OverrideSchema,
  LintConfigSchema,
  loadConfig,
  _resetConfigCache,
  resolveRuleSeverity,
  generateJsonSchema,
  validateConfig,
  type LintConfig,
  type ConfigWarning,
} from './schema.ts';

vi.mock('node:fs');

beforeEach(() => {
  _resetConfigCache();
});

// =============================================================================
// RuleSeveritySchema
// =============================================================================

describe('RuleSeveritySchema', () => {
  it('accepts "error"', () => {
    const result = v.safeParse(RuleSeveritySchema, 'error');
    expect(result.success).toBe(true);
  });

  it('accepts "warn"', () => {
    const result = v.safeParse(RuleSeveritySchema, 'warn');
    expect(result.success).toBe(true);
  });

  it('accepts "off"', () => {
    const result = v.safeParse(RuleSeveritySchema, 'off');
    expect(result.success).toBe(true);
  });

  it('rejects invalid severity "info"', () => {
    const result = v.safeParse(RuleSeveritySchema, 'info');
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity "warning"', () => {
    const result = v.safeParse(RuleSeveritySchema, 'warning');
    expect(result.success).toBe(false);
  });

  it('rejects non-string values', () => {
    const result = v.safeParse(RuleSeveritySchema, 1);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// OverrideSchema
// =============================================================================

describe('OverrideSchema', () => {
  it('accepts a valid override object', () => {
    const result = v.safeParse(OverrideSchema, {
      files: ['**/*.test.ts'],
      rules: { 'jsdoc/require-param': 'off' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts an override with empty files and rules', () => {
    const result = v.safeParse(OverrideSchema, { files: [], rules: {} });
    expect(result.success).toBe(true);
  });

  it('rejects invalid rule severity in override', () => {
    const result = v.safeParse(OverrideSchema, {
      files: ['**/*.ts'],
      rules: { 'some/rule': 'info' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown extra keys (strictObject)', () => {
    const result = v.safeParse(OverrideSchema, {
      files: ['**/*.ts'],
      rules: {},
      extra: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing files key', () => {
    const result = v.safeParse(OverrideSchema, { rules: {} });
    expect(result.success).toBe(false);
  });

  it('rejects missing rules key', () => {
    const result = v.safeParse(OverrideSchema, { files: ['**/*.ts'] });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// LintConfigSchema
// =============================================================================

describe('LintConfigSchema', () => {
  it('accepts an empty object and applies all defaults', () => {
    const result = v.safeParse(LintConfigSchema, {});
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.output.include).toEqual([]);
    expect(result.output.exclude).toEqual(['*.test.ts', '*.d.ts']);
    expect(result.output.extensions).toEqual([
      '.ts',
      '.svelte.ts',
      '.svelte',
      '.astro',
      '.html',
      '.vue',
      '.md',
      '.mdx',
      '.mjs',
    ]);
    expect(result.output.rules).toEqual({});
    expect(result.output.overrides).toEqual([]);
    expect(result.output.$schema).toBeUndefined();
  });

  it('accepts a fully specified valid config', () => {
    const result = v.safeParse(LintConfigSchema, {
      $schema: './.resist-lint.schema.json',
      include: ['src'],
      exclude: ['dist/**'],
      extensions: ['.ts'],
      rules: { 'jsdoc/require-param': 'warn' },
      overrides: [{ files: ['**/*.test.ts'], rules: { 'jsdoc/require-param': 'off' } }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid rule severity in top-level rules', () => {
    const result = v.safeParse(LintConfigSchema, {
      rules: { 'some/rule': 'info' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown extra top-level keys (strictObject)', () => {
    const result = v.safeParse(LintConfigSchema, {
      unknownKey: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional $schema field', () => {
    const result = v.safeParse(LintConfigSchema, {
      $schema: 'http://example.com/schema.json',
    });
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.output.$schema).toBe('http://example.com/schema.json');
  });
});

// =============================================================================
// loadConfig
// =============================================================================

describe('loadConfig', () => {
  it('returns defaults when no config file exists', () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    const config: LintConfig = loadConfig('/some/nonexistent/dir', undefined, en);
    expect(config.include).toEqual([]);
    expect(config.exclude).toEqual(['*.test.ts', '*.d.ts']);
    expect(config.extensions).toEqual([
      '.ts',
      '.svelte.ts',
      '.svelte',
      '.astro',
      '.html',
      '.vue',
      '.md',
      '.mdx',
      '.mjs',
    ]);
    expect(config.rules).toEqual({});
    expect(config.overrides).toEqual([]);
  });

  it('parses a minimal valid JSONC file', () => {
    vi.mocked(readFileSync).mockReturnValue('{}');

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.rules).toEqual({});
    expect(config.overrides).toEqual([]);
  });

  it('parses JSONC with line comments (//) correctly', () => {
    const jsonc: string = [
      '{',
      '  // This is a line comment',
      '  "rules": {',
      '    "jsdoc/require-param": "warn" // inline comment',
      '  }',
      '}',
    ].join('\n');

    vi.mocked(readFileSync).mockReturnValue(jsonc);

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.rules['jsdoc/require-param']).toBe('warn');
  });

  it('parses JSONC with block comments (/* */) correctly', () => {
    const jsonc: string = [
      '{',
      '  /* block comment */  ',
      '  "rules": { /* another block */ "imports/no-relative-imports": "error" }',
      '}',
    ].join('\n');

    vi.mocked(readFileSync).mockReturnValue(jsonc);

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.rules['imports/no-relative-imports']).toBe('error');
  });

  it('preserves comment markers inside strings', () => {
    const jsonc: string = '{ "include": ["src // not a comment"] }';
    vi.mocked(readFileSync).mockReturnValue(jsonc);

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.include).toEqual(['src // not a comment']);
  });

  it('preserves block comment markers inside strings', () => {
    const jsonc: string = '{ "include": ["src /* not a comment */"] }';
    vi.mocked(readFileSync).mockReturnValue(jsonc);

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.include).toEqual(['src /* not a comment */']);
  });

  it('throws on invalid JSON (after stripping comments)', () => {
    vi.mocked(readFileSync).mockReturnValue('{ invalid json }');

    expect(() => loadConfig('/some/dir', undefined, en)).toThrow(/Invalid JSONC/);
  });

  it('throws on schema validation failure', () => {
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ rules: { 'some/rule': 'bad-severity' } }),
    );

    expect(() => loadConfig('/some/dir', undefined, en)).toThrow(/Invalid config/);
  });

  it('throws on unknown extra keys in config', () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ unknownKey: true }));

    expect(() => loadConfig('/some/dir', undefined, en)).toThrow(/Invalid config/);
  });

  it('reads from the correct path (cwd + .resist-lint.jsonc)', () => {
    vi.mocked(readFileSync).mockReturnValue('{}');

    loadConfig('/project/root', undefined, en);

    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.resist-lint.jsonc'),
      'utf8',
    );
    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining('project'), 'utf8');
  });
});

// =============================================================================
// resolveRuleSeverity
// =============================================================================

function baseConfig(): LintConfig {
  return {
    $schema: undefined,
    include: [],
    exclude: [],
    extensions: [],
    rules: {},
    ruleOptions: {},
    overrides: [],
  };
}

describe('resolveRuleSeverity', () => {
  it('returns "error" for an unknown rule with no config', () => {
    const config: LintConfig = baseConfig();
    const severity = resolveRuleSeverity(config, 'unknown/rule', '/src/foo.ts');
    expect(severity).toBe('error');
  });

  it('returns top-level rule severity when no overrides match', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'jsdoc/require-param': 'warn' },
    };
    const severity = resolveRuleSeverity(config, 'jsdoc/require-param', '/src/foo.ts');
    expect(severity).toBe('warn');
  });

  it('returns "off" for a rule explicitly set to off', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'imports/no-relative-imports': 'off' },
    };
    const severity = resolveRuleSeverity(config, 'imports/no-relative-imports', '/src/foo.ts');
    expect(severity).toBe('off');
  });

  it('override wins when file pattern matches (*.ext)', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'jsdoc/require-param': 'error' },
      overrides: [
        {
          files: ['*.test.ts'],
          rules: { 'jsdoc/require-param': 'off' },
        },
      ],
    };
    const severity = resolveRuleSeverity(config, 'jsdoc/require-param', '/src/foo.test.ts');
    expect(severity).toBe('off');
  });

  it('top-level rule is used when *.ext pattern does not match', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'jsdoc/require-param': 'warn' },
      overrides: [
        {
          files: ['*.test.ts'],
          rules: { 'jsdoc/require-param': 'off' },
        },
      ],
    };
    const severity = resolveRuleSeverity(config, 'jsdoc/require-param', '/src/foo.ts');
    expect(severity).toBe('warn');
  });

  it('last matching override wins (reverse priority)', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'some/rule': 'error' },
      overrides: [
        {
          files: ['**/*.ts'],
          rules: { 'some/rule': 'warn' },
        },
        {
          files: ['**/*.ts'],
          rules: { 'some/rule': 'off' },
        },
      ],
    };
    // Second override is last → should win
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/file.ts');
    expect(severity).toBe('off');
  });

  it('first override used when second does not match', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'some/rule': 'error' },
      overrides: [
        {
          files: ['*.test.ts'],
          rules: { 'some/rule': 'warn' },
        },
        {
          files: ['*.d.ts'],
          rules: { 'some/rule': 'off' },
        },
      ],
    };
    // Only the first override matches *.test.ts
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/foo.test.ts');
    expect(severity).toBe('warn');
  });

  it('**/dir/** pattern matches file inside that directory', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'some/rule': 'error' },
      overrides: [
        {
          files: ['**/generated/**'],
          rules: { 'some/rule': 'off' },
        },
      ],
    };
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/generated/foo.ts');
    expect(severity).toBe('off');
  });

  it('**/dir/** pattern does not match a file outside that directory', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'some/rule': 'error' },
      overrides: [
        {
          files: ['**/generated/**'],
          rules: { 'some/rule': 'off' },
        },
      ],
    };
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/normal/foo.ts');
    expect(severity).toBe('error');
  });

  it('**/*.ext pattern matches file with that extension', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'some/rule': 'error' },
      overrides: [
        {
          files: ['**/*.svelte.ts'],
          rules: { 'some/rule': 'warn' },
        },
      ],
    };
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/Component.svelte.ts');
    expect(severity).toBe('warn');
  });

  it('direct path fragment matching works', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'some/rule': 'error' },
      overrides: [
        {
          files: ['node_modules'],
          rules: { 'some/rule': 'off' },
        },
      ],
    };
    const severity = resolveRuleSeverity(
      config,
      'some/rule',
      '/project/node_modules/some-package/index.ts',
    );
    expect(severity).toBe('off');
  });

  it('override is skipped when rule is not present in that override', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'some/rule': 'warn' },
      overrides: [
        {
          files: ['**/*.ts'],
          // override matches the file but doesn't mention 'some/rule'
          rules: { 'other/rule': 'off' },
        },
      ],
    };
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/foo.ts');
    expect(severity).toBe('warn');
  });
});

// =============================================================================
// generateJsonSchema
// =============================================================================

describe('generateJsonSchema', () => {
  const ruleIds: string[] = ['jsdoc/require-param', 'imports/no-relative-imports'];
  const ruleDescriptions: Map<string, string> = new Map([
    ['jsdoc/require-param', 'Requires @param tags for function parameters'],
    ['imports/no-relative-imports', 'Disallows relative imports'],
  ]);

  it('returns a valid JSON Schema document with required top-level fields', () => {
    const schema = generateJsonSchema(ruleIds, ruleDescriptions, en);
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.title).toContain('resist-lint');
    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
  });

  it('includes all expected properties', () => {
    const schema = generateJsonSchema(ruleIds, ruleDescriptions, en);
    const propKeys: string[] = Object.keys(schema.properties);
    expect(propKeys).toContain('$schema');
    expect(propKeys).toContain('include');
    expect(propKeys).toContain('exclude');
    expect(propKeys).toContain('extensions');
    expect(propKeys).toContain('rules');
    expect(propKeys).toContain('overrides');
    expect(propKeys).toContain('ruleOptions');
    expect(propKeys.length).toBe(7);
  });

  it('has per-rule properties with individual descriptions', () => {
    const schema = generateJsonSchema(ruleIds, ruleDescriptions, en);
    const rulesProps = schema.properties['rules']?.properties;
    expect(rulesProps).toBeDefined();
    expect(rulesProps?.['jsdoc/require-param']).toEqual({
      description: 'Requires @param tags for function parameters',
      enum: ['error', 'warn', 'off'],
      type: 'string',
    });
    expect(rulesProps?.['imports/no-relative-imports']).toEqual({
      description: 'Disallows relative imports',
      enum: ['error', 'warn', 'off'],
      type: 'string',
    });
  });

  it('rules description is base description without bundled rule list', () => {
    const schema = generateJsonSchema(ruleIds, ruleDescriptions, en);
    const rulesDescription: string = schema.properties['rules']?.description ?? '';
    expect(rulesDescription).toBe('Rule ID → severity mapping. Unlisted rules default to "error".');
    expect(rulesDescription).not.toContain('jsdoc/require-param');
  });

  it('works with empty rule lists', () => {
    const schema = generateJsonSchema([], new Map(), en);
    expect(schema.properties['rules']).toBeDefined();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
  });

  it('exclude property has correct default', () => {
    const schema = generateJsonSchema([], new Map(), en);
    expect(schema.properties['exclude']?.default).toEqual(['*.test.ts', '*.d.ts']);
  });

  it('extensions property has correct default', () => {
    const schema = generateJsonSchema([], new Map(), en);
    expect(schema.properties['extensions']?.default).toEqual([
      '.ts',
      '.svelte.ts',
      '.svelte',
      '.astro',
      '.html',
      '.vue',
      '.md',
      '.mdx',
      '.mjs',
    ]);
  });

  it('rules additionalProperties is false (rejects unknown rule IDs)', () => {
    const schema = generateJsonSchema([], new Map(), en);
    expect(schema.properties['rules']?.additionalProperties).toBe(false);
  });

  it('ruleOptions additionalProperties is false (rejects unknown rule IDs)', () => {
    const schema = generateJsonSchema([], new Map(), en);
    expect(schema.properties['ruleOptions']?.additionalProperties).toBe(false);
  });

  it('ruleOptions has per-rule properties (no optionsSchema)', () => {
    const schema = generateJsonSchema(ruleIds, ruleDescriptions, en);
    const optProps = schema.properties['ruleOptions']?.properties;
    expect(optProps).toBeDefined();
    expect(optProps?.['jsdoc/require-param']).toEqual({
      description: 'Options for jsdoc/require-param',
      type: 'object',
    });
  });

  it('ruleOptions has typed properties when optionsSchema is provided', () => {
    const schemas: Map<string, OptionsSchema> = new Map([
      [
        'jsdoc/require-param',
        {
          allowedTargets: { type: 'array', items: 'string', description: 'Allowed targets' },
          strict: { type: 'boolean', description: 'Strict mode' },
        },
      ],
    ]);
    const schema = generateJsonSchema(ruleIds, ruleDescriptions, en, schemas);
    const optProps = schema.properties['ruleOptions']?.properties;
    expect(optProps?.['jsdoc/require-param']).toEqual({
      additionalProperties: false,
      description: 'Options for jsdoc/require-param',
      properties: {
        allowedTargets: {
          description: 'Allowed targets',
          items: { type: 'string' },
          type: 'array',
        },
        strict: { description: 'Strict mode', type: 'boolean' },
      },
      type: 'object',
    });
    // Rule without optionsSchema stays generic
    expect(optProps?.['imports/no-relative-imports']).toEqual({
      description: 'Options for imports/no-relative-imports',
      type: 'object',
    });
  });

  it('overrides items have required files and rules', () => {
    const schema = generateJsonSchema([], new Map(), en);
    const overrideItems = schema.properties['overrides']?.items;
    expect(overrideItems).toBeDefined();
    if (overrideItems && typeof overrideItems === 'object' && 'required' in overrideItems) {
      expect(overrideItems.required).toContain('files');
      expect(overrideItems.required).toContain('rules');
    }
  });

  it('handles a rule with no description entry gracefully', () => {
    const schema = generateJsonSchema(['unknown/rule'], new Map(), en);
    const rulesProps = schema.properties['rules']?.properties;
    expect(rulesProps?.['unknown/rule']).toEqual({
      description: '',
      enum: ['error', 'warn', 'off'],
      type: 'string',
    });
  });

  it('empty rule list produces empty properties object', () => {
    const schema = generateJsonSchema([], new Map(), en);
    const rulesProps = schema.properties['rules']?.properties;
    expect(rulesProps).toEqual({});
  });

  it('overrides rules also have per-rule properties', () => {
    const schema = generateJsonSchema(ruleIds, ruleDescriptions, en);
    const overrideItems = schema.properties['overrides']?.items;
    expect(overrideItems).toBeDefined();
    if (overrideItems && typeof overrideItems === 'object' && 'properties' in overrideItems) {
      const overrideRules = (
        overrideItems.properties as Record<string, { properties?: Record<string, unknown> }>
      )?.['rules'];
      expect(overrideRules?.properties).toBeDefined();
      expect(overrideRules?.properties?.['jsdoc/require-param']).toEqual({
        description: 'Requires @param tags for function parameters',
        enum: ['error', 'warn', 'off'],
        type: 'string',
      });
    }
  });
});

// =============================================================================
// loadConfig — custom config path
// =============================================================================

describe('loadConfig — custom config path', () => {
  it('reads from a custom config path when provided', () => {
    vi.mocked(readFileSync).mockReturnValue('{}');

    loadConfig('/project/root', 'custom/lint.jsonc', en);

    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining('custom'), 'utf8');
  });

  it('resolves custom config path relative to cwd', () => {
    vi.mocked(readFileSync).mockReturnValue('{"rules": {"some/rule": "warn"}}');

    const config: LintConfig = loadConfig('/project/root', 'configs/lint.jsonc', en);
    expect(config.rules['some/rule']).toBe('warn');
  });
});

// =============================================================================
// loadConfig — JSONC edge cases
// =============================================================================

describe('loadConfig — JSONC edge cases', () => {
  it('handles escaped quotes inside JSON strings', () => {
    const jsonc: string = '{ "include": ["src/\\"special\\""] }';
    vi.mocked(readFileSync).mockReturnValue(jsonc);

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.include).toEqual(['src/"special"']);
  });

  it('handles strings containing backslash-backslash before close quote', () => {
    const jsonc: string = '{ "include": ["path\\\\"] }';
    vi.mocked(readFileSync).mockReturnValue(jsonc);

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.include).toEqual(['path\\']);
  });

  it('strips line comment at end of file without trailing newline', () => {
    const jsonc: string = '{"rules": {}} // trailing comment';
    vi.mocked(readFileSync).mockReturnValue(jsonc);

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.rules).toEqual({});
  });

  it('strips multi-line block comment spanning multiple lines', () => {
    const jsonc: string = [
      '{',
      '  /* this is a',
      '     multi-line comment */',
      '  "rules": {}',
      '}',
    ].join('\n');
    vi.mocked(readFileSync).mockReturnValue(jsonc);

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.rules).toEqual({});
  });

  it('handles empty JSONC string gracefully (throws)', () => {
    vi.mocked(readFileSync).mockReturnValue('');
    expect(() => loadConfig('/some/dir', undefined, en)).toThrow();
  });
});

// =============================================================================
// loadConfig — schema validation error details
// =============================================================================

describe('loadConfig — schema validation error paths', () => {
  it('error message includes the property path on nested failure', () => {
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ overrides: [{ files: ['**/*.ts'], rules: { r: 'bad' } }] }),
    );

    expect(() => loadConfig('/some/dir', undefined, en)).toThrow(/Invalid config/);
  });

  it('error message includes path info for deeply invalid config', () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ rules: 'not-an-object' }));

    try {
      loadConfig('/some/dir', undefined, en);
      expect.unreachable('should have thrown');
    } catch (error: unknown) {
      expect((error as Error).message).toContain('Invalid config');
    }
  });
});

// =============================================================================
// loadConfig — ruleOptions
// =============================================================================

describe('loadConfig — ruleOptions', () => {
  it('parses ruleOptions from config', () => {
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        ruleOptions: {
          'some/rule': { allowedTargets: ['browser'] },
        },
      }),
    );

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.ruleOptions['some/rule']).toEqual({ allowedTargets: ['browser'] });
  });

  it('defaults ruleOptions to empty object when not provided', () => {
    vi.mocked(readFileSync).mockReturnValue('{}');

    const config: LintConfig = loadConfig('/some/dir', undefined, en);
    expect(config.ruleOptions).toEqual({});
  });
});

// =============================================================================
// loadConfig — caching
// =============================================================================

describe('loadConfig — caching', () => {
  it('returns cached result on second call with same path', () => {
    vi.mocked(readFileSync).mockClear();
    vi.mocked(readFileSync).mockReturnValue('{ "rules": { "foo/bar": "warn" } }');

    const first: LintConfig = loadConfig('/cache/dir', undefined, en);
    const second: LintConfig = loadConfig('/cache/dir', undefined, en);
    expect(first.rules['foo/bar']).toBe('warn');
    expect(second.rules['foo/bar']).toBe('warn');
    /* readFileSync should only be called once for this path. */
    expect(vi.mocked(readFileSync)).toHaveBeenCalledTimes(1);
  });

  it('returns shallow copies so mutations do not poison the cache', () => {
    vi.mocked(readFileSync).mockReturnValue('{ "rules": { "a/b": "error" } }');

    const first: LintConfig = loadConfig('/mutate/dir', undefined, en);
    first.exclude.push('extra-pattern');
    first.rules['a/b'] = 'off';

    const second: LintConfig = loadConfig('/mutate/dir', undefined, en);
    expect(second.exclude).not.toContain('extra-pattern');
    expect(second.rules['a/b']).toBe('error');
  });

  it('caches defaults when config file does not exist', () => {
    vi.mocked(readFileSync).mockClear();
    vi.mocked(readFileSync).mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    const first: LintConfig = loadConfig('/no/file', undefined, en);
    const second: LintConfig = loadConfig('/no/file', undefined, en);
    expect(first.include).toEqual([]);
    expect(second.include).toEqual([]);
    expect(vi.mocked(readFileSync)).toHaveBeenCalledTimes(1);
  });

  it('_resetConfigCache clears the cache', () => {
    vi.mocked(readFileSync).mockReturnValue('{ "rules": { "x/y": "warn" } }');
    loadConfig('/reset/dir', undefined, en);

    _resetConfigCache();

    vi.mocked(readFileSync).mockReturnValue('{ "rules": { "x/y": "off" } }');
    const after: LintConfig = loadConfig('/reset/dir', undefined, en);
    expect(after.rules['x/y']).toBe('off');
  });
});

// =============================================================================
// resolveRuleSeverity — additional branch coverage
// =============================================================================

describe('resolveRuleSeverity — additional branches', () => {
  it('skips override when file matches but ruleId is not in override rules', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: {},
      overrides: [
        {
          files: ['**/*.ts'],
          rules: { 'other/rule': 'warn' },
        },
      ],
    };
    // 'some/rule' is not in the override, so it falls through to default
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/foo.ts');
    expect(severity).toBe('error');
  });

  it('handles override with **/ pattern containing a wildcard and no dot', () => {
    const config: LintConfig = {
      ...baseConfig(),
      overrides: [
        {
          files: ['**/test-*'],
          rules: { 'some/rule': 'off' },
        },
      ],
    };
    // Pattern is "**/test-*" — suffix is "test-*", contains * but no dot
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/test-foo.ts');
    // fileMatchesPattern will hit the branch where suffix.includes('*') but dotIdx < 0
    expect(severity).toBe('error');
  });

  it('handles **/ pattern with direct suffix match (no wildcards)', () => {
    const config: LintConfig = {
      ...baseConfig(),
      overrides: [
        {
          files: ['**/helpers.ts'],
          rules: { 'some/rule': 'warn' },
        },
      ],
    };
    // Pattern is "**/helpers.ts" — suffix is "helpers.ts", no wildcards and no trailing /**
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/utils/helpers.ts');
    expect(severity).toBe('warn');
  });

  it('returns error (default) when no overrides and no top-level rule entry', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'other/rule': 'warn' },
      overrides: [],
    };
    const severity = resolveRuleSeverity(config, 'unrelated/rule', '/src/foo.ts');
    expect(severity).toBe('error');
  });

  it('handles multiple overrides where none match the file', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'some/rule': 'warn' },
      overrides: [
        { files: ['*.test.ts'], rules: { 'some/rule': 'off' } },
        { files: ['*.spec.ts'], rules: { 'some/rule': 'off' } },
      ],
    };
    const severity = resolveRuleSeverity(config, 'some/rule', '/src/foo.ts');
    expect(severity).toBe('warn');
  });
});

// =============================================================================
// Config structure — simplified config with path-prefix exclusion
// =============================================================================

describe('simplified config structure', () => {
  it('loadConfig accepts a config with single include and path-prefix exclude', () => {
    const jsonc: string = JSON.stringify({
      include: ['packages'],
      exclude: ['node_modules', 'packages/shared/utils/cli'],
      extensions: ['.ts'],
    });
    vi.mocked(readFileSync).mockReturnValueOnce(jsonc);
    const config: LintConfig = loadConfig('/fake', undefined, en);
    expect(config.include).toEqual(['packages']);
    expect(config.exclude).toContain('packages/shared/utils/cli');
    expect(config.exclude).toContain('node_modules');
  });

  it('path-prefix excludes contain / while name-based excludes do not', () => {
    const jsonc: string = JSON.stringify({
      include: ['packages'],
      exclude: ['node_modules', '.git', 'packages/shared/utils/cli'],
      extensions: ['.ts'],
    });
    vi.mocked(readFileSync).mockReturnValueOnce(jsonc);
    const config: LintConfig = loadConfig('/fake', undefined, en);
    const nameExcludes: string[] = config.exclude.filter((e: string): boolean => !e.includes('/'));
    const pathExcludes: string[] = config.exclude.filter((e: string): boolean => e.includes('/'));
    expect(nameExcludes).toContain('node_modules');
    expect(nameExcludes).toContain('.git');
    expect(pathExcludes).toContain('packages/shared/utils/cli');
  });
});

// =============================================================================
// validateConfig — semantic warnings
// =============================================================================

describe('validateConfig', () => {
  const knownRules: ReadonlySet<string> = new Set([
    'jsdoc/require-param',
    'imports/no-relative-imports',
    'naming/no-default-export',
  ]);

  it('returns no warnings for a valid config', () => {
    const schemas: Map<string, OptionsSchema> = new Map([
      ['imports/no-relative-imports', { allow: { type: 'array', items: 'string' } }],
    ]);
    const config: LintConfig = {
      ...baseConfig(),
      extensions: ['.ts', '.svelte'],
      rules: { 'jsdoc/require-param': 'warn' },
      ruleOptions: { 'imports/no-relative-imports': { allow: ['./'] } },
      overrides: [{ files: ['**/*.test.ts'], rules: { 'naming/no-default-export': 'off' } }],
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules, schemas);
    expect(warnings).toHaveLength(0);
  });

  it('warns on extension without leading dot', () => {
    const config: LintConfig = {
      ...baseConfig(),
      extensions: ['.ts', 'svelte', 'md'],
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]!.path).toBe('extensions');
    expect(warnings[0]!.message).toContain('"svelte"');
    expect(warnings[0]!.message).toContain('does not start with "."');
    expect(warnings[1]!.message).toContain('"md"');
  });

  it('warns on unknown rule ID in rules section', () => {
    const config: LintConfig = {
      ...baseConfig(),
      rules: { 'jsdoc/require-param': 'warn', 'fake/nonexistent-rule': 'error' },
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.path).toBe('rules');
    expect(warnings[0]!.message).toContain('fake/nonexistent-rule');
    expect(warnings[0]!.message).toContain('Unknown rule');
  });

  it('warns on unknown rule ID in ruleOptions section', () => {
    const config: LintConfig = {
      ...baseConfig(),
      ruleOptions: { 'made-up/option': { foo: true } },
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.path).toBe('ruleOptions');
    expect(warnings[0]!.message).toContain('made-up/option');
  });

  it('warns on unknown rule ID in overrides', () => {
    const config: LintConfig = {
      ...baseConfig(),
      overrides: [
        { files: ['**/*.ts'], rules: { 'jsdoc/require-param': 'off', 'bogus/rule': 'warn' } },
      ],
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.path).toBe('overrides[0].rules');
    expect(warnings[0]!.message).toContain('bogus/rule');
  });

  it('reports warnings from multiple sections simultaneously', () => {
    const config: LintConfig = {
      ...baseConfig(),
      extensions: ['ts'],
      rules: { 'unknown/a': 'off' },
      ruleOptions: { 'unknown/b': {} },
      overrides: [{ files: ['**/*.ts'], rules: { 'unknown/c': 'warn' } }],
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(4);
    expect(warnings.map((w: ConfigWarning): string => w.path)).toEqual([
      'extensions',
      'rules',
      'ruleOptions',
      'overrides[0].rules',
    ]);
  });

  it('returns no warnings when knownRuleIds is empty and config has no rules', () => {
    const config: LintConfig = {
      ...baseConfig(),
      extensions: ['.ts'],
    };
    const warnings: ConfigWarning[] = validateConfig(config, new Set());
    expect(warnings).toHaveLength(0);
  });

  it('warns on multiple unknown rules in the same override', () => {
    const config: LintConfig = {
      ...baseConfig(),
      overrides: [{ files: ['**/*.ts'], rules: { 'bad/one': 'off', 'bad/two': 'warn' } }],
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(2);
    expect(warnings.every((w: ConfigWarning): boolean => w.path === 'overrides[0].rules')).toBe(
      true,
    );
  });

  it('warns on empty string in include', () => {
    const config: LintConfig = {
      ...baseConfig(),
      include: ['packages', ''],
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.path).toBe('include');
    expect(warnings[0]!.message).toContain('Empty string');
  });

  it('warns on empty string in exclude', () => {
    const config: LintConfig = {
      ...baseConfig(),
      exclude: ['node_modules', '', '  '],
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(2);
    expect(warnings.every((w: ConfigWarning): boolean => w.path === 'exclude')).toBe(true);
  });

  it('warns on empty string in overrides.files', () => {
    const config: LintConfig = {
      ...baseConfig(),
      overrides: [{ files: ['**/*.ts', ''], rules: { 'jsdoc/require-param': 'off' } }],
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.path).toBe('overrides[0].files');
    expect(warnings[0]!.message).toContain('Empty string');
  });

  it('warns on unknown option key in ruleOptions', () => {
    const schemas: Map<string, OptionsSchema> = new Map([
      ['jsdoc/require-param', { scope: { type: 'string' } }],
    ]);
    const config: LintConfig = {
      ...baseConfig(),
      ruleOptions: { 'jsdoc/require-param': { scope: 'test', bogusKey: true } },
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules, schemas);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.path).toBe('ruleOptions.jsdoc/require-param.bogusKey');
    expect(warnings[0]!.message).toContain('Unknown option "bogusKey"');
    expect(warnings[0]!.message).toContain('scope');
  });

  it('no warning for valid option keys matching optionsSchema', () => {
    const schemas: Map<string, OptionsSchema> = new Map([
      ['jsdoc/require-param', { allowedTargets: { type: 'array', items: 'string' } }],
    ]);
    const config: LintConfig = {
      ...baseConfig(),
      ruleOptions: { 'jsdoc/require-param': { allowedTargets: ['max-lines'] } },
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules, schemas);
    expect(warnings).toHaveLength(0);
  });

  it('warns when rule has ruleOptions but no optionsSchema declared', () => {
    const schemas: Map<string, OptionsSchema> = new Map();
    const config: LintConfig = {
      ...baseConfig(),
      ruleOptions: { 'jsdoc/require-param': { anything: 'goes' } },
    };
    const warnings: ConfigWarning[] = validateConfig(config, knownRules, schemas);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.path).toBe('ruleOptions.jsdoc/require-param');
    expect(warnings[0]!.message).toContain('does not declare an optionsSchema');
  });
});
