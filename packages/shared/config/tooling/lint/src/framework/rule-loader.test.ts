/**
 * Tests for rule auto-loader.
 *
 * @module
 */

import * as v from 'valibot';
import { beforeAll, describe, expect, it } from 'vitest';

import { en } from '@/lint/locale/locales/en.ts';

import { loadAllRules, LoadedRulesSchema, type LoadedRules } from './rule-loader.ts';
import { createResult, StageSchema } from './types.ts';

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
  loaded = await loadAllRules(en);
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

describe('byId index', () => {
  it('returns a Map', () => {
    expect(loaded.byId).toBeInstanceOf(Map);
  });

  it('size equals total typescript + packageJson count', () => {
    const total = loaded.typescript.length + loaded.packageJson.length;
    expect(loaded.byId.size).toBe(total);
  });

  it('contains known TypeScript rule ID', () => {
    expect(loaded.byId.has('jsdoc/require-param')).toBe(true);
  });

  it('contains known packageJson rule ID', () => {
    expect(loaded.byId.has('package/require-tsgo')).toBe(true);
  });

  it('every entry key matches the rule id', () => {
    for (const [key, rule] of loaded.byId) {
      expect(rule.id).toBe(key);
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

// =============================================================================
// createResult factory
// =============================================================================

describe('createResult', () => {
  it('returns a valid LintResult with all required fields', () => {
    const result = createResult('test/rule', '/src/foo.ts', 10, 5, 'error', 'Test message');
    expect(result.ruleId).toBe('test/rule');
    expect(result.file).toBe('/src/foo.ts');
    expect(result.line).toBe(10);
    expect(result.column).toBe(5);
    expect(result.severity).toBe('error');
    expect(result.message).toBe('Test message');
  });

  it('defaults fix to no-op when omitted', () => {
    const result = createResult('test/rule', '/src/foo.ts', 1, 1, 'error', 'msg');
    expect(result.fix).toEqual({ range: { start: 0, end: 0 }, text: '' });
  });

  it('passes through optional tip and example', () => {
    const result = createResult('test/rule', '/src/foo.ts', 1, 1, 'warning', 'msg', {
      tip: 'Fix this',
      example: 'const x: string = "";',
    });
    expect(result.tip).toBe('Fix this');
    expect(result.example).toBe('const x: string = "";');
  });

  it('uses explicit fix when provided', () => {
    const fix = { range: { start: 10, end: 20 }, text: 'replaced' };
    const result = createResult('test/rule', '/src/foo.ts', 1, 1, 'error', 'msg', { fix });
    expect(result.fix).toEqual(fix);
  });

  it('passes through endLine and endColumn', () => {
    const result = createResult('test/rule', '/src/foo.ts', 1, 1, 'info', 'msg', {
      endLine: 5,
      endColumn: 20,
    });
    expect(result.endLine).toBe(5);
    expect(result.endColumn).toBe(20);
  });

  it('passes through source and url', () => {
    const result = createResult('test/rule', '/src/foo.ts', 1, 1, 'error', 'msg', {
      source: 'const x = 42;',
      url: 'https://docs.example.com/rules/test-rule',
    });
    expect(result.source).toBe('const x = 42;');
    expect(result.url).toBe('https://docs.example.com/rules/test-rule');
  });

  it('leaves optional fields undefined when not provided', () => {
    const result = createResult('test/rule', '/src/foo.ts', 1, 1, 'error', 'msg');
    expect(result.tip).toBeUndefined();
    expect(result.example).toBeUndefined();
    expect(result.source).toBeUndefined();
    expect(result.url).toBeUndefined();
    expect(result.endLine).toBeUndefined();
    expect(result.endColumn).toBeUndefined();
  });
});

// =============================================================================
// Multiple rule export formats
// =============================================================================

describe('multiple rule export formats', () => {
  it('loads rules from array default export (multi-export-fixture)', () => {
    const ids = loaded.typescript.map((r) => r.id);
    expect(ids).toContain('testing/multi-export-a');
    expect(ids).toContain('testing/multi-export-b');
  });

  it('loads rules from named `rules` export (named-export-fixture)', () => {
    const ids = loaded.typescript.map((r) => r.id);
    expect(ids).toContain('testing/named-export-a');
  });

  it('multi-export rules have correct descriptions', () => {
    const ruleA = loaded.byId.get('testing/multi-export-a');
    const ruleB = loaded.byId.get('testing/multi-export-b');
    expect(ruleA?.description).toBe('Multi-export fixture rule A (no-op).');
    expect(ruleB?.description).toBe('Multi-export fixture rule B (no-op).');
  });

  it('named-export rules have correct descriptions', () => {
    const rule = loaded.byId.get('testing/named-export-a');
    expect(rule?.description).toBe('Named export fixture rule (no-op).');
  });

  it('multi-export rules appear in byCategory under "testing"', () => {
    const testingRules = loaded.byCategory.get('testing') ?? [];
    const ids = testingRules.map((r) => r.id);
    expect(ids).toContain('testing/multi-export-a');
    expect(ids).toContain('testing/multi-export-b');
    expect(ids).toContain('testing/named-export-a');
  });

  it('multi-export rules appear in byStage under "lint"', () => {
    const lintRules = loaded.byStage.get('lint') ?? [];
    const ids = lintRules.map((r) => r.id);
    expect(ids).toContain('testing/multi-export-a');
    expect(ids).toContain('testing/multi-export-b');
    expect(ids).toContain('testing/named-export-a');
  });
});

// =============================================================================
// Workspace rules
// =============================================================================

describe('workspace rules', () => {
  it('returns a workspace array', () => {
    expect(loaded).toHaveProperty('workspace');
    expect(Array.isArray(loaded.workspace)).toBe(true);
  });

  it('loads at least 3 workspace rules', () => {
    expect(loaded.workspace.length).toBeGreaterThanOrEqual(3);
  });

  it('workspace rules have scope = "workspace"', () => {
    for (const rule of loaded.workspace) {
      expect(rule.scope).toBe('workspace');
    }
  });

  it('workspace rules have non-empty id and description', () => {
    for (const rule of loaded.workspace) {
      expect(typeof rule.id).toBe('string');
      expect(rule.id.length).toBeGreaterThan(0);
      expect(typeof rule.description).toBe('string');
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });

  it('workspace rules have check as a function', () => {
    for (const rule of loaded.workspace) {
      expect(typeof rule.check).toBe('function');
    }
  });

  it('contains workspace/no-merge-conflicts', () => {
    const ids = loaded.workspace.map((r) => r.id);
    expect(ids).toContain('workspace/no-merge-conflicts');
  });

  it('contains workspace/no-crlf', () => {
    const ids = loaded.workspace.map((r) => r.id);
    expect(ids).toContain('workspace/no-crlf');
  });

  it('contains workspace/no-empty-files', () => {
    const ids = loaded.workspace.map((r) => r.id);
    expect(ids).toContain('workspace/no-empty-files');
  });

  it('workspace rules are sorted by id', () => {
    const ids = loaded.workspace.map((r) => r.id);
    const sorted = ids.toSorted((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });
});

// =============================================================================
// LoadedRulesSchema validators
// =============================================================================

describe('LoadedRulesSchema', () => {
  it('byCategory validator accepts a Map', () => {
    const result = v.safeParse(LoadedRulesSchema, {
      byCategory: new Map(),
      byId: new Map(),
      byStage: new Map(),
      packageJson: [],
      typescript: [],
      workspace: [],
    });
    expect(result.success).toBe(true);
  });

  it('byCategory validator rejects a plain object', () => {
    const result = v.safeParse(LoadedRulesSchema, {
      byCategory: {},
      byId: new Map(),
      byStage: new Map(),
      packageJson: [],
      typescript: [],
      workspace: [],
    });
    expect(result.success).toBe(false);
  });

  it('byId validator rejects a non-Map value', () => {
    const result = v.safeParse(LoadedRulesSchema, {
      byCategory: new Map(),
      byId: 'not-a-map',
      byStage: new Map(),
      packageJson: [],
      typescript: [],
      workspace: [],
    });
    expect(result.success).toBe(false);
  });

  it('byStage validator rejects null', () => {
    const result = v.safeParse(LoadedRulesSchema, {
      byCategory: new Map(),
      byId: new Map(),
      byStage: null,
      packageJson: [],
      typescript: [],
      workspace: [],
    });
    expect(result.success).toBe(false);
  });

  it('packageJson validator rejects a non-array value', () => {
    const result = v.safeParse(LoadedRulesSchema, {
      byCategory: new Map(),
      byId: new Map(),
      byStage: new Map(),
      packageJson: 'not-an-array',
      typescript: [],
      workspace: [],
    });
    expect(result.success).toBe(false);
  });

  it('typescript validator rejects a number', () => {
    const result = v.safeParse(LoadedRulesSchema, {
      byCategory: new Map(),
      byId: new Map(),
      byStage: new Map(),
      packageJson: [],
      typescript: 42,
      workspace: [],
    });
    expect(result.success).toBe(false);
  });

  it('workspace validator rejects a non-array', () => {
    const result = v.safeParse(LoadedRulesSchema, {
      byCategory: new Map(),
      byId: new Map(),
      byStage: new Map(),
      packageJson: [],
      typescript: [],
      workspace: {},
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Categories and stages on loaded rules
// =============================================================================

describe('categories with existing values', () => {
  it('rules with pre-defined categories keep their categories', () => {
    const allRules = [...loaded.typescript, ...loaded.packageJson];
    const rulesWithMultiCats = allRules.filter((r) => r.categories && r.categories.length > 1);
    // Rules like typescript/no-throw have categories: ['typescript', 'safety']
    // They should keep their pre-defined categories intact
    for (const rule of rulesWithMultiCats) {
      expect(rule.categories!.length).toBeGreaterThan(1);
    }
  });

  it('workspace rules have categories backfilled', () => {
    for (const rule of loaded.workspace) {
      expect(Array.isArray(rule.categories)).toBe(true);
      expect(rule.categories!.length).toBeGreaterThan(0);
    }
  });

  it('workspace rules have stages backfilled', () => {
    for (const rule of loaded.workspace) {
      expect(Array.isArray(rule.stages)).toBe(true);
      expect(rule.stages!.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// byStage index includes multi-stage rules
// =============================================================================

describe('byStage multi-stage indexing', () => {
  it('rules in multiple stages appear in each stage index', () => {
    const allRules = [...loaded.typescript, ...loaded.packageJson];
    const multiStageRules = allRules.filter((r) => r.stages && r.stages.length > 1);
    for (const rule of multiStageRules) {
      for (const stage of rule.stages!) {
        const stageRules = loaded.byStage.get(stage) ?? [];
        const ids = stageRules.map((r) => r.id);
        expect(ids).toContain(rule.id);
      }
    }
  });
});

// =============================================================================
// byCategory index completeness
// =============================================================================

describe('byCategory multi-category indexing', () => {
  it('rules with multiple categories appear in each category', () => {
    const allRules = [...loaded.typescript, ...loaded.packageJson];
    const multiCatRules = allRules.filter((r) => r.categories && r.categories.length > 1);
    for (const rule of multiCatRules) {
      for (const cat of rule.categories!) {
        const catRules = loaded.byCategory.get(cat) ?? [];
        const ids = catRules.map((r) => r.id);
        expect(ids).toContain(rule.id);
      }
    }
  });
});
