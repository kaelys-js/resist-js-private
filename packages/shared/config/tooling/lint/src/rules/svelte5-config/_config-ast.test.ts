/**
 * Tests for the shared svelte5-config AST helpers used by the
 * Svelte-config lint rules — covers `collectPropertyPaths`,
 * `findProperty`, `getAdapterImport`, and the
 * `CLOUDFLARE_ADAPTERS` / `STATIC_ADAPTERS` registries.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { AstNode, ImportInfo } from '@/lint/framework/types.ts';

import {
  CLOUDFLARE_ADAPTERS,
  STATIC_ADAPTERS,
  collectPropertyPaths,
  findProperty,
  getAdapterImport,
  getDefaultExportObject,
  getNestedValue,
  getPropertyEntries,
  getPropertyName,
  getPropertyValueNode,
  getStringValue,
  hasProperty,
  isBooleanLiteral,
  isStringLiteral,
  isUndefinedValue,
} from './_config-ast.ts';

/* ---------- AST node factories ---------- */

function loc() {
  return { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } };
}

function makeNode(overrides: Record<string, unknown>): AstNode {
  return { start: 0, end: 1, loc: loc(), ...overrides } as unknown as AstNode;
}

function makeIdentifier(name: string): AstNode {
  return makeNode({ type: 'Identifier', name });
}

function makeStringLiteral(value: string): AstNode {
  return makeNode({ type: 'StringLiteral', value });
}

function makeBooleanLiteral(value: boolean): AstNode {
  return makeNode({ type: 'BooleanLiteral', value });
}

function makeLiteral(value: unknown): AstNode {
  return makeNode({ type: 'Literal', value });
}

function makeProperty(
  name: string,
  value: AstNode,
  keyType: 'Identifier' | 'StringLiteral' = 'Identifier',
): AstNode {
  const key = keyType === 'Identifier' ? makeIdentifier(name) : makeStringLiteral(name);

  return makeNode({ type: 'ObjectProperty', key, value });
}

function makeObjectExpression(properties: AstNode[]): AstNode {
  return makeNode({ type: 'ObjectExpression', properties });
}

/* ---------- getPropertyName ---------- */

describe('getPropertyName', () => {
  it('returns name for Identifier key', () => {
    const prop = makeProperty('foo', makeStringLiteral('bar'));
    expect(getPropertyName(prop)).toBe('foo');
  });

  it('returns name for StringLiteral key', () => {
    const prop = makeProperty('hello', makeStringLiteral('world'), 'StringLiteral');
    expect(getPropertyName(prop)).toBe('hello');
  });

  it('returns undefined for node without key', () => {
    const prop = makeNode({ type: 'ObjectProperty' });
    expect(getPropertyName(prop)).toBeUndefined();
  });

  it('returns undefined for computed/unknown key type', () => {
    const prop = makeNode({
      type: 'ObjectProperty',
      key: makeNode({ type: 'NumericLiteral', value: 42 }),
    });
    expect(getPropertyName(prop)).toBeUndefined();
  });
});

/* ---------- findProperty ---------- */

describe('findProperty', () => {
  it('finds property by name in ObjectExpression', () => {
    const obj = makeObjectExpression([
      makeProperty('alpha', makeStringLiteral('a')),
      makeProperty('beta', makeStringLiteral('b')),
    ]);
    const result = findProperty(obj, 'beta');
    expect(result).toBeDefined();
    expect(getPropertyName(result!)).toBe('beta');
  });

  it('returns undefined for non-ObjectExpression', () => {
    expect(findProperty(makeStringLiteral('test'), 'foo')).toBeUndefined();
  });

  it('returns undefined when property not found', () => {
    const obj = makeObjectExpression([makeProperty('a', makeStringLiteral('1'))]);
    expect(findProperty(obj, 'z')).toBeUndefined();
  });

  it('returns undefined when properties is falsy', () => {
    const obj = makeNode({ type: 'ObjectExpression' });
    expect(findProperty(obj, 'foo')).toBeUndefined();
  });

  it('handles Property type (alias for ObjectProperty)', () => {
    const prop = makeNode({
      type: 'Property',
      key: makeIdentifier('test'),
      value: makeStringLiteral('val'),
    });
    const obj = makeNode({ type: 'ObjectExpression', properties: [prop] });
    expect(findProperty(obj, 'test')).toBe(prop);
  });
});

/* ---------- getPropertyValueNode ---------- */

describe('getPropertyValueNode', () => {
  it('returns value node for existing property', () => {
    const val = makeStringLiteral('hello');
    const obj = makeObjectExpression([makeProperty('key', val)]);
    expect(getPropertyValueNode(obj, 'key')).toBeDefined();
  });

  it('returns undefined for missing property', () => {
    const obj = makeObjectExpression([makeProperty('a', makeStringLiteral('1'))]);
    expect(getPropertyValueNode(obj, 'missing')).toBeUndefined();
  });
});

/* ---------- getNestedValue ---------- */

describe('getNestedValue', () => {
  it('resolves single-level path', () => {
    const inner = makeStringLiteral('value');
    const obj = makeObjectExpression([makeProperty('key', inner)]);
    const result = getNestedValue(obj, 'key');
    expect(result).toBeDefined();
  });

  it('resolves deep nested path', () => {
    const leaf = makeStringLiteral('deep');
    const mid = makeObjectExpression([makeProperty('c', leaf)]);
    const outer = makeObjectExpression([makeProperty('b', mid)]);
    const root = makeObjectExpression([makeProperty('a', outer)]);
    const result = getNestedValue(root, 'a.b.c');
    expect(result).toBeDefined();
  });

  it('returns undefined for missing intermediate', () => {
    const obj = makeObjectExpression([makeProperty('a', makeStringLiteral('val'))]);
    expect(getNestedValue(obj, 'a.b.c')).toBeUndefined();
  });

  it('returns undefined when starting node is not ObjectExpression', () => {
    expect(getNestedValue(makeStringLiteral('test'), 'a.b')).toBeUndefined();
  });
});

/* ---------- hasProperty ---------- */

describe('hasProperty', () => {
  it('returns true when property exists', () => {
    const obj = makeObjectExpression([makeProperty('key', makeStringLiteral('val'))]);
    expect(hasProperty(obj, 'key')).toBe(true);
  });

  it('returns false when property missing', () => {
    const obj = makeObjectExpression([makeProperty('a', makeStringLiteral('1'))]);
    expect(hasProperty(obj, 'z')).toBe(false);
  });
});

/* ---------- isUndefinedValue ---------- */

describe('isUndefinedValue', () => {
  it('returns true for undefined Identifier', () => {
    expect(isUndefinedValue(makeIdentifier('undefined'))).toBe(true);
  });

  it('returns false for other Identifiers', () => {
    expect(isUndefinedValue(makeIdentifier('null'))).toBe(false);
  });

  it('returns false for non-Identifier nodes', () => {
    expect(isUndefinedValue(makeStringLiteral('undefined'))).toBe(false);
  });
});

/* ---------- getDefaultExportObject ---------- */

describe('getDefaultExportObject', () => {
  it('returns ObjectExpression from export default', () => {
    const obj = makeObjectExpression([makeProperty('key', makeStringLiteral('val'))]);
    const ast = makeNode({
      type: 'Program',
      body: [makeNode({ type: 'ExportDefaultDeclaration', declaration: obj })],
    });
    const result = getDefaultExportObject(ast);
    expect(result).toBeDefined();
    expect(result!.type).toBe('ObjectExpression');
  });

  it('returns ObjectExpression from export default defineConfig({})', () => {
    const obj = makeObjectExpression([makeProperty('key', makeStringLiteral('val'))]);
    const callExpr = makeNode({
      type: 'CallExpression',
      arguments: [obj],
    });
    const ast = makeNode({
      type: 'Program',
      body: [makeNode({ type: 'ExportDefaultDeclaration', declaration: callExpr })],
    });
    const result = getDefaultExportObject(ast);
    expect(result).toBeDefined();
    expect(result!.type).toBe('ObjectExpression');
  });

  it('returns undefined when no default export', () => {
    const ast = makeNode({
      type: 'Program',
      body: [makeNode({ type: 'ImportDeclaration' })],
    });
    expect(getDefaultExportObject(ast)).toBeUndefined();
  });

  it('returns undefined when body is falsy', () => {
    const ast = makeNode({ type: 'Program' });
    expect(getDefaultExportObject(ast)).toBeUndefined();
  });

  it('returns undefined when declaration is not object or call', () => {
    const ast = makeNode({
      type: 'Program',
      body: [
        makeNode({
          type: 'ExportDefaultDeclaration',
          declaration: makeIdentifier('config'),
        }),
      ],
    });
    expect(getDefaultExportObject(ast)).toBeUndefined();
  });

  it('returns undefined when CallExpression has no arguments', () => {
    const callExpr = makeNode({ type: 'CallExpression', arguments: [] });
    const ast = makeNode({
      type: 'Program',
      body: [makeNode({ type: 'ExportDefaultDeclaration', declaration: callExpr })],
    });
    expect(getDefaultExportObject(ast)).toBeUndefined();
  });

  it('returns undefined when declaration is falsy', () => {
    const ast = makeNode({
      type: 'Program',
      body: [makeNode({ type: 'ExportDefaultDeclaration' })],
    });
    expect(getDefaultExportObject(ast)).toBeUndefined();
  });
});

/* ---------- getAdapterImport ---------- */

describe('getAdapterImport', () => {
  it('returns adapter-auto when imported', () => {
    const imports: ImportInfo[] = [
      { source: '@sveltejs/adapter-auto', specifiers: [], isTypeOnly: false },
    ] as unknown as ImportInfo[];
    expect(getAdapterImport(imports)).toBe('@sveltejs/adapter-auto');
  });

  it('returns adapter-cloudflare when imported', () => {
    const imports: ImportInfo[] = [
      { source: '@sveltejs/adapter-cloudflare', specifiers: [], isTypeOnly: false },
    ] as unknown as ImportInfo[];
    expect(getAdapterImport(imports)).toBe('@sveltejs/adapter-cloudflare');
  });

  it('returns undefined when no adapter imported', () => {
    const imports: ImportInfo[] = [
      { source: 'valibot', specifiers: [], isTypeOnly: false },
    ] as unknown as ImportInfo[];
    expect(getAdapterImport(imports)).toBeUndefined();
  });

  it('returns undefined for empty imports', () => {
    expect(getAdapterImport([])).toBeUndefined();
  });
});

/* ---------- CLOUDFLARE_ADAPTERS / STATIC_ADAPTERS ---------- */

describe('adapter constants', () => {
  it('CLOUDFLARE_ADAPTERS includes expected values', () => {
    expect(CLOUDFLARE_ADAPTERS.has('@sveltejs/adapter-cloudflare')).toBe(true);
    expect(CLOUDFLARE_ADAPTERS.has('@sveltejs/adapter-cloudflare-workers')).toBe(true);
  });

  it('STATIC_ADAPTERS includes expected values', () => {
    expect(STATIC_ADAPTERS.has('@sveltejs/adapter-static')).toBe(true);
  });
});

/* ---------- collectPropertyPaths ---------- */

describe('collectPropertyPaths', () => {
  it('returns paths for flat object', () => {
    const obj = makeObjectExpression([
      makeProperty('a', makeStringLiteral('1')),
      makeProperty('b', makeStringLiteral('2')),
    ]);
    const paths = collectPropertyPaths(obj);
    expect(paths).toContain('a');
    expect(paths).toContain('b');
  });

  it('returns nested paths for nested objects', () => {
    const inner = makeObjectExpression([makeProperty('c', makeStringLiteral('val'))]);
    const obj = makeObjectExpression([makeProperty('a', inner)]);
    const paths = collectPropertyPaths(obj);
    expect(paths).toContain('a');
    expect(paths).toContain('a.c');
  });

  it('returns empty array for non-ObjectExpression', () => {
    expect(collectPropertyPaths(makeStringLiteral('test'))).toEqual([]);
  });

  it('returns empty array when properties is falsy', () => {
    const obj = makeNode({ type: 'ObjectExpression' });
    expect(collectPropertyPaths(obj)).toEqual([]);
  });

  it('uses prefix when provided', () => {
    const obj = makeObjectExpression([makeProperty('key', makeStringLiteral('val'))]);
    const paths = collectPropertyPaths(obj, 'root');
    expect(paths).toContain('root.key');
  });

  it('skips properties without extractable names', () => {
    const prop = makeNode({
      type: 'ObjectProperty',
      key: makeNode({ type: 'NumericLiteral', value: 42 }),
      value: makeStringLiteral('val'),
    });
    const obj = makeNode({ type: 'ObjectExpression', properties: [prop] });
    expect(collectPropertyPaths(obj)).toEqual([]);
  });
});

/* ---------- getPropertyEntries ---------- */

describe('getPropertyEntries', () => {
  it('returns entries for ObjectExpression', () => {
    const obj = makeObjectExpression([
      makeProperty('key1', makeStringLiteral('val1')),
      makeProperty('key2', makeStringLiteral('val2')),
    ]);
    const entries = getPropertyEntries(obj);
    expect(entries).toHaveLength(2);
    expect(entries[0]![0]).toBe('key1');
    expect(entries[1]![0]).toBe('key2');
  });

  it('returns empty array for non-ObjectExpression', () => {
    expect(getPropertyEntries(makeStringLiteral('test'))).toEqual([]);
  });

  it('returns empty array when properties is falsy', () => {
    const obj = makeNode({ type: 'ObjectExpression' });
    expect(getPropertyEntries(obj)).toEqual([]);
  });

  it('skips properties without name or value', () => {
    const prop = makeNode({
      type: 'ObjectProperty',
      key: makeNode({ type: 'NumericLiteral', value: 42 }),
    });
    const obj = makeNode({ type: 'ObjectExpression', properties: [prop] });
    expect(getPropertyEntries(obj)).toEqual([]);
  });

  it('handles Property type (alias)', () => {
    const prop = makeNode({
      type: 'Property',
      key: makeIdentifier('foo'),
      value: makeStringLiteral('bar'),
    });
    const obj = makeNode({ type: 'ObjectExpression', properties: [prop] });
    const entries = getPropertyEntries(obj);
    expect(entries).toHaveLength(1);
    expect(entries[0]![0]).toBe('foo');
  });
});

/* ---------- isStringLiteral ---------- */

describe('isStringLiteral', () => {
  it('returns true for StringLiteral node', () => {
    expect(isStringLiteral(makeStringLiteral('hello'))).toBe(true);
  });

  it('returns true for Literal with string value', () => {
    expect(isStringLiteral(makeLiteral('hello'))).toBe(true);
  });

  it('returns false for non-string node', () => {
    expect(isStringLiteral(makeIdentifier('foo'))).toBe(false);
  });

  it('returns true when value matches', () => {
    expect(isStringLiteral(makeStringLiteral('target'), 'target')).toBe(true);
  });

  it('returns false when value does not match', () => {
    expect(isStringLiteral(makeStringLiteral('other'), 'target')).toBe(false);
  });

  it('returns false for Literal with non-string value', () => {
    expect(isStringLiteral(makeLiteral(42))).toBe(false);
  });
});

/* ---------- getStringValue ---------- */

describe('getStringValue', () => {
  it('returns string value for StringLiteral', () => {
    expect(getStringValue(makeStringLiteral('hello'))).toBe('hello');
  });

  it('returns string value for Literal with string', () => {
    expect(getStringValue(makeLiteral('world'))).toBe('world');
  });

  it('returns undefined for non-string node', () => {
    expect(getStringValue(makeIdentifier('foo'))).toBeUndefined();
  });

  it('returns undefined for Literal with non-string value', () => {
    expect(getStringValue(makeLiteral(42))).toBeUndefined();
  });
});

/* ---------- isBooleanLiteral ---------- */

describe('isBooleanLiteral', () => {
  it('returns true for BooleanLiteral node', () => {
    expect(isBooleanLiteral(makeBooleanLiteral(true))).toBe(true);
  });

  it('returns true for Literal with boolean value', () => {
    expect(isBooleanLiteral(makeLiteral(false))).toBe(true);
  });

  it('returns false for non-boolean node', () => {
    expect(isBooleanLiteral(makeStringLiteral('true'))).toBe(false);
  });

  it('matches specific boolean value when provided', () => {
    expect(isBooleanLiteral(makeBooleanLiteral(true), true)).toBe(true);
    expect(isBooleanLiteral(makeBooleanLiteral(true), false)).toBe(false);
  });

  it('returns false for Literal with non-boolean value', () => {
    expect(isBooleanLiteral(makeLiteral(42))).toBe(false);
  });
});
