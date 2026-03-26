/**
 * Tests for rule auto-loader.
 *
 * @module
 */

import * as v from 'valibot';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAllRules, type LoadedRules } from './rule-loader.ts';
import { StageSchema } from './types.ts';

// =============================================================================
// StageSchema validation
// =============================================================================

describe('StageSchema', () => {
  it.each([
    'lint',
    'check',
    'pre-commit',
    'build',
    'ci',
    'test',
  ])('accepts valid stage "%s"', (stage) => {
    const result = v.safeParse(StageSchema, stage);
    expect(result.success).toBe(true);
  });

  it.each([
    'invalid',
    'deploy',
    'release',
    '',
    42,
    null,
    undefined,
  ])('rejects invalid value %j', (value) => {
    const result = v.safeParse(StageSchema, value);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Shared fixture — load once for all tests
// =============================================================================

let loaded: LoadedRules;

beforeAll(async () => {
  loaded = await loadAllRules();
});

// =============================================================================
// Return shape
// =============================================================================

describe('loadAllRules return shape', () => {
  it('returns an object with a typescript array', () => {
    expect(loaded).toHaveProperty('typescript');
    expect(Array.isArray(loaded.typescript)).toBe(true);
  });

  it('returns an object with a packageJson array', () => {
    expect(loaded).toHaveProperty('packageJson');
    expect(Array.isArray(loaded.packageJson)).toBe(true);
  });
});

// =============================================================================
// Rule counts
// =============================================================================

describe('rule counts', () => {
  it('loads at least 55 TypeScript rules', () => {
    expect(loaded.typescript.length).toBeGreaterThanOrEqual(55);
  });

  it('loads at least 12 package.json rules', () => {
    expect(loaded.packageJson.length).toBeGreaterThanOrEqual(12);
  });
});

// =============================================================================
// TypeScript rule shape
// =============================================================================

describe('TypeScript rule shape', () => {
  it('every rule has a non-empty id string', () => {
    for (const rule of loaded.typescript) {
      expect(typeof rule.id).toBe('string');
      expect(rule.id.length).toBeGreaterThan(0);
    }
  });

  it('every rule has a non-empty description string', () => {
    for (const rule of loaded.typescript) {
      expect(typeof rule.description).toBe('string');
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });

  it('every rule has a patterns array with at least one entry', () => {
    for (const rule of loaded.typescript) {
      expect(Array.isArray(rule.patterns)).toBe(true);
      expect(rule.patterns.length).toBeGreaterThan(0);
    }
  });

  it('every rule has a visitor object', () => {
    for (const rule of loaded.typescript) {
      expect(rule.visitor).toBeDefined();
      expect(typeof rule.visitor).toBe('object');
    }
  });
});

// =============================================================================
// PackageJson rule shape
// =============================================================================

describe('PackageJson rule shape', () => {
  it('every rule has a non-empty id string', () => {
    for (const rule of loaded.packageJson) {
      expect(typeof rule.id).toBe('string');
      expect(rule.id.length).toBeGreaterThan(0);
    }
  });

  it('every rule has a non-empty description string', () => {
    for (const rule of loaded.packageJson) {
      expect(typeof rule.description).toBe('string');
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });

  it('every rule has check as a function', () => {
    for (const rule of loaded.packageJson) {
      expect(typeof rule.check).toBe('function');
    }
  });
});

// =============================================================================
// Rule categorization
// =============================================================================

describe('rule categorization', () => {
  it('all TypeScript rules have a visitor property', () => {
    for (const rule of loaded.typescript) {
      expect('visitor' in rule).toBe(true);
    }
  });

  it('no TypeScript rule has a check property', () => {
    for (const rule of loaded.typescript) {
      expect('check' in rule).toBe(false);
    }
  });

  it('all packageJson rules have a check function', () => {
    for (const rule of loaded.packageJson) {
      expect(typeof rule.check).toBe('function');
    }
  });

  it('no packageJson rule has a visitor property', () => {
    for (const rule of loaded.packageJson) {
      expect('visitor' in rule).toBe(false);
    }
  });
});

// =============================================================================
// Deterministic ordering
// =============================================================================

describe('deterministic ordering', () => {
  it('TypeScript rules are sorted by id', () => {
    const ids = loaded.typescript.map((r) => r.id);
    const sorted = ids.toSorted((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  it('packageJson rules are sorted by id', () => {
    const ids = loaded.packageJson.map((r) => r.id);
    const sorted = ids.toSorted((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });
});

// =============================================================================
// No duplicate IDs
// =============================================================================

describe('no duplicate rule IDs', () => {
  it('TypeScript rules have unique ids', () => {
    const ids = loaded.typescript.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('packageJson rules have unique ids', () => {
    const ids = loaded.packageJson.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('no id appears in both TypeScript and packageJson arrays', () => {
    const tsIds = new Set(loaded.typescript.map((r) => r.id));
    const pkgIds = loaded.packageJson.map((r) => r.id);
    for (const id of pkgIds) {
      expect(tsIds.has(id)).toBe(false);
    }
  });
});

// =============================================================================
// Known rules are present
// =============================================================================

describe('known rules are present', () => {
  it('jsdoc/require-param is in typescript rules', () => {
    const ids = loaded.typescript.map((r) => r.id);
    expect(ids).toContain('jsdoc/require-param');
  });

  it('package/require-tsgo is in packageJson rules', () => {
    const ids = loaded.packageJson.map((r) => r.id);
    expect(ids).toContain('package/require-tsgo');
  });
});

// =============================================================================
// Categories and stages
// =============================================================================

describe('categories backfill', () => {
  it('every TypeScript rule has a non-empty categories array', () => {
    for (const rule of loaded.typescript) {
      expect(Array.isArray(rule.categories)).toBe(true);
      expect(rule.categories!.length).toBeGreaterThan(0);
    }
  });

  it('every packageJson rule has a non-empty categories array', () => {
    for (const rule of loaded.packageJson) {
      expect(Array.isArray(rule.categories)).toBe(true);
      expect(rule.categories!.length).toBeGreaterThan(0);
    }
  });

  it('categories always include the rule ID prefix', () => {
    for (const rule of [...loaded.typescript, ...loaded.packageJson]) {
      const prefix = rule.id.split('/')[0] ?? '';
      expect(rule.categories).toContain(prefix);
    }
  });
});

describe('stages backfill', () => {
  it('every TypeScript rule has a non-empty stages array', () => {
    for (const rule of loaded.typescript) {
      expect(Array.isArray(rule.stages)).toBe(true);
      expect(rule.stages!.length).toBeGreaterThan(0);
    }
  });

  it('every packageJson rule has a non-empty stages array', () => {
    for (const rule of loaded.packageJson) {
      expect(Array.isArray(rule.stages)).toBe(true);
      expect(rule.stages!.length).toBeGreaterThan(0);
    }
  });

  it('every rule includes "lint" in its stages', () => {
    for (const rule of [...loaded.typescript, ...loaded.packageJson]) {
      expect(rule.stages).toContain('lint');
    }
  });
});

describe('byCategory index', () => {
  it('returns a Map', () => {
    expect(loaded.byCategory).toBeInstanceOf(Map);
  });

  it('has entries for known categories', () => {
    expect(loaded.byCategory.has('typescript')).toBe(true);
    expect(loaded.byCategory.has('jsdoc')).toBe(true);
    expect(loaded.byCategory.has('package')).toBe(true);
  });

  it('typescript category contains typescript/no-throw', () => {
    const tsRules = loaded.byCategory.get('typescript') ?? [];
    const ids = tsRules.map((r) => r.id);
    expect(ids).toContain('typescript/no-throw');
  });

  it('safety category contains rules from multiple prefixes', () => {
    const safetyRules = loaded.byCategory.get('safety') ?? [];
    const prefixes = new Set(safetyRules.map((r) => r.id.split('/')[0]));
    expect(prefixes.size).toBeGreaterThan(1);
  });
});

describe('byStage index', () => {
  it('returns a Map', () => {
    expect(loaded.byStage).toBeInstanceOf(Map);
  });

  it('has a "lint" stage with all rules', () => {
    const lintRules = loaded.byStage.get('lint') ?? [];
    const total = loaded.typescript.length + loaded.packageJson.length;
    expect(lintRules.length).toBe(total);
  });

  it('has a "ci" stage with fewer rules than "lint"', () => {
    const ciRules = loaded.byStage.get('ci') ?? [];
    const lintRules = loaded.byStage.get('lint') ?? [];
    expect(ciRules.length).toBeGreaterThan(0);
    expect(ciRules.length).toBeLessThan(lintRules.length);
  });

  it('has a "pre-commit" stage', () => {
    const precommitRules = loaded.byStage.get('pre-commit') ?? [];
    expect(precommitRules.length).toBeGreaterThan(0);
  });
});
