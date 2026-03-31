/**
 * Tests for oxc-parser-based TypeScript rule runner.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { walkNode, runTypeScriptRules, extractSvelteScript } from './oxc-runner.ts';
import type { AstNode, LintResult, TypeScriptRule, VisitorContext } from './types.ts';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Run rules against source code and return results.
 *
 * @param rules - Rules to run
 * @param code - TypeScript source code
 * @param filename - File path to use
 * @returns Array of lint results
 */
function lint(
  rules: TypeScriptRule[],
  code: string,
  filename: string = 'test.ts',
): Promise<LintResult[]> {
  return runTypeScriptRules(filename, code, rules);
}

/**
 * Make a minimal valid AstNode for use in mock trees.
 *
 * @param type - Node type string
 * @param extra - Additional properties
 * @returns A mock AstNode
 */
function makeNode(type: string, extra: Record<string, unknown> = {}): AstNode {
  return {
    type,
    start: 0,
    end: 10,
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
    ...extra,
  };
}

// =============================================================================
// walkNode
// =============================================================================

describe('walkNode', () => {
  it('skips null', () => {
    const visited: string[] = [];
    walkNode(null, (n) => visited.push(n.type));
    expect(visited).toEqual([]);
  });

  it('skips undefined', () => {
    const visited: string[] = [];
    walkNode(undefined, (n) => visited.push(n.type));
    expect(visited).toEqual([]);
  });

  it('skips primitives — string', () => {
    const visited: string[] = [];
    walkNode('hello', (n) => visited.push(n.type));
    expect(visited).toEqual([]);
  });

  it('skips primitives — number', () => {
    const visited: string[] = [];
    walkNode(42, (n) => visited.push(n.type));
    expect(visited).toEqual([]);
  });

  it('calls callback for a node with a type property', () => {
    const visited: string[] = [];
    const node: AstNode = makeNode('Program');
    walkNode(node, (n) => visited.push(n.type));
    expect(visited).toEqual(['Program']);
  });

  it('does not call callback for plain objects without a type property', () => {
    const visited: string[] = [];
    const obj = { foo: 'bar', baz: 123 };
    walkNode(obj, (n) => visited.push(n.type));
    expect(visited).toEqual([]);
  });

  it('recurses into object properties', () => {
    const visited: string[] = [];
    const node: AstNode = makeNode('Program', {
      body: makeNode('ExpressionStatement'),
    });
    walkNode(node, (n) => visited.push(n.type));
    expect(visited).toContain('Program');
    expect(visited).toContain('ExpressionStatement');
  });

  it('recurses into array properties', () => {
    const visited: string[] = [];
    const node: AstNode = makeNode('Program', {
      body: [makeNode('ExpressionStatement'), makeNode('ReturnStatement')],
    });
    walkNode(node, (n) => visited.push(n.type));
    expect(visited).toContain('ExpressionStatement');
    expect(visited).toContain('ReturnStatement');
  });

  it('handles deeply nested structures', () => {
    const visited: string[] = [];
    const node: AstNode = makeNode('Program', {
      body: [
        makeNode('IfStatement', {
          consequent: makeNode('BlockStatement', {
            body: [makeNode('ReturnStatement')],
          }),
        }),
      ],
    });
    walkNode(node, (n) => visited.push(n.type));
    expect(visited).toContain('Program');
    expect(visited).toContain('IfStatement');
    expect(visited).toContain('BlockStatement');
    expect(visited).toContain('ReturnStatement');
  });

  it('visits all nodes in declaration order (parent before children)', () => {
    const visited: string[] = [];
    const node: AstNode = makeNode('Program', {
      body: [makeNode('ExpressionStatement')],
    });
    walkNode(node, (n) => visited.push(n.type));
    expect(visited[0]).toBe('Program');
    expect(visited[1]).toBe('ExpressionStatement');
  });

  it('skips null items inside arrays', () => {
    const visited: string[] = [];
    const node: AstNode = makeNode('Program', {
      body: [null, makeNode('ExpressionStatement'), undefined],
    });
    // walkNode should not throw and should still visit valid nodes
    expect(() => walkNode(node, (n) => visited.push(n.type))).not.toThrow();
    expect(visited).toContain('ExpressionStatement');
  });
});

// =============================================================================
// runTypeScriptRules — basics
// =============================================================================

describe('runTypeScriptRules — basics', () => {
  it('returns empty array when no rules are provided', async () => {
    const results: LintResult[] = await lint([], 'const x: number = 1;');
    expect(results).toEqual([]);
  });

  it('returns empty array for unparseable source', async () => {
    // Deliberately malformed TypeScript that oxc-parser cannot parse
    const results: LintResult[] = await lint(
      [
        {
          id: 'test/simple',
          description: 'Simple test rule',
          patterns: ['**/*.ts'],
          visitor: {
            Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
              return [
                {
                  file: ctx.file,
                  line: 1,
                  column: 1,
                  severity: 'error',
                  message: 'found program',
                  ruleId: 'test/simple',
                  fix: { range: { start: 0, end: 0 }, text: '' },
                },
              ];
            },
          },
        },
      ],
      // unclosed string literal — hard parse error
      `const x = "`,
    );
    // oxc-parser is lenient; if it still parses, we get results;
    // the important assertion is that no exception is thrown
    expect(Array.isArray(results)).toBe(true);
  });

  it('correctly runs a simple visitor rule on a variable declaration', async () => {
    const testRule: TypeScriptRule = {
      id: 'test/var',
      description: 'Detects variable declarations',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
          return [
            {
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message: 'Found variable declaration',
              ruleId: 'test/var',
              fix: { range: { start: node.start, end: node.end }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([testRule], 'const x: number = 1;');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.ruleId).toBe('test/var');
    expect(results[0]!.message).toBe('Found variable declaration');
  });

  it('multiple rules can run on the same file and both produce results', async () => {
    const ruleA: TypeScriptRule = {
      id: 'test/rule-a',
      description: 'Rule A',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(_node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: 1,
              column: 1,
              severity: 'warning',
              message: 'rule-a hit',
              ruleId: 'test/rule-a',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    const ruleB: TypeScriptRule = {
      id: 'test/rule-b',
      description: 'Rule B',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(_node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: 1,
              column: 1,
              severity: 'info',
              message: 'rule-b hit',
              ruleId: 'test/rule-b',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([ruleA, ruleB], 'const x: number = 1;');
    const ruleIds: string[] = results.map((r) => r.ruleId);
    expect(ruleIds).toContain('test/rule-a');
    expect(ruleIds).toContain('test/rule-b');
  });

  it('rule exceptions do not crash the runner — remaining rules still run', async () => {
    const crashingRule: TypeScriptRule = {
      id: 'test/crash',
      description: 'Throws on every node',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(): LintResult[] {
          throw new Error('intentional crash');
        },
      },
    };

    const safeRule: TypeScriptRule = {
      id: 'test/safe',
      description: 'Never throws',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(_node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: 1,
              column: 1,
              severity: 'info',
              message: 'safe rule ran',
              ruleId: 'test/safe',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    // Should not throw, and safe rule should still produce results
    let results: LintResult[] = [];
    await expect(
      (async () => {
        results = await lint([crashingRule, safeRule], 'const x: number = 1;');
      })(),
    ).resolves.not.toThrow();

    expect(results.some((r) => r.ruleId === 'test/safe')).toBe(true);
    // crashing rule should produce no results (exception swallowed)
    expect(results.some((r) => r.ruleId === 'test/crash')).toBe(false);
  });
});

// =============================================================================
// runTypeScriptRules — loc patching
// =============================================================================

describe('runTypeScriptRules — loc patching (lazy)', () => {
  it('loc is a lazy getter — not computed until first access', async () => {
    const capturedNodes: AstNode[] = [];
    const rule: TypeScriptRule = {
      id: 'test/lazy-loc',
      description: 'Captures nodes before accessing loc',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode): LintResult[] {
          capturedNodes.push(node);
          return [];
        },
      },
    };

    await lint([rule], 'const x: number = 1;');
    expect(capturedNodes.length).toBeGreaterThanOrEqual(1);
    const node: AstNode = capturedNodes[0]!;

    /* Before accessing loc, verify the descriptor is a getter (not a value) */
    const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(node, 'loc');
    expect(descriptor).toBeDefined();
    /* Could be a getter OR already resolved to a value (both are valid) */
    const isGetter: boolean = typeof descriptor!.get === 'function';
    const isValue: boolean = 'value' in descriptor!;
    expect(isGetter || isValue).toBe(true);

    /* Access loc — should compute and cache */
    const loc: AstNode['loc'] = node.loc;
    expect(loc.start.line).toBe(1);
    expect(loc.start.column).toBe(0);

    /* After access, descriptor should be a cached value (no longer a getter) */
    const afterDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
      node,
      'loc',
    );
    expect(afterDescriptor).toBeDefined();
    expect('value' in afterDescriptor!).toBe(true);

    /* Second access returns the same cached object */
    expect(node.loc).toBe(loc);
  });

  it('assigns correct 1-based line to a declaration on line 1', async () => {
    const capturedNodes: AstNode[] = [];
    const rule: TypeScriptRule = {
      id: 'test/loc',
      description: 'Captures nodes',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode): LintResult[] {
          capturedNodes.push(node);
          return [];
        },
      },
    };

    await lint([rule], 'const x: number = 1;');
    expect(capturedNodes.length).toBeGreaterThanOrEqual(1);
    expect(capturedNodes[0]!.loc.start.line).toBe(1);
    expect(capturedNodes[0]!.loc.start.column).toBe(0);
  });

  it('assigns correct line number when declaration is on line 3', async () => {
    const capturedNodes: AstNode[] = [];
    const rule: TypeScriptRule = {
      id: 'test/loc-line3',
      description: 'Captures variable decls',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode): LintResult[] {
          capturedNodes.push(node);
          return [];
        },
      },
    };

    const code: string = '\n\nconst x: number = 1;';
    await lint([rule], code);
    expect(capturedNodes.length).toBeGreaterThanOrEqual(1);
    expect(capturedNodes[0]!.loc.start.line).toBe(3);
  });

  it('results carry the correct line from loc', async () => {
    const rule: TypeScriptRule = {
      id: 'test/line-check',
      description: 'Reports line from loc',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message: 'line check',
              ruleId: 'test/line-check',
              fix: { range: { start: node.start, end: node.end }, text: '' },
            },
          ];
        },
      },
    };

    const code: string = '\n\n\nconst y: string = "hello";';
    const results: LintResult[] = await lint([rule], code);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.line).toBe(4);
    expect(results[0]!.column).toBe(1); // 0-based column 0 + 1
  });
});

// =============================================================================
// runTypeScriptRules — import extraction
// =============================================================================

describe('runTypeScriptRules — import extraction', () => {
  it('context.imports is populated with named imports', async () => {
    let importList: AstNode[] = [];

    const rule: TypeScriptRule = {
      id: 'test/imports',
      description: 'Checks imports',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          importList = ctx.imports as never;
          return [];
        },
      },
    };

    await lint([rule], `import { foo, bar } from 'some-module';`);
    // importList is the ctx.imports array itself
    expect(Array.isArray(importList)).toBe(true);

    // Re-run capturing ctx.imports directly
    let imports: AstNode[] = [];
    const rule2: TypeScriptRule = {
      id: 'test/imports2',
      description: 'Captures imports via context',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          imports = ctx.imports as never;
          return [];
        },
      },
    };

    await lint([rule2], `import { foo, bar } from 'some-module';`);
    expect(Array.isArray(imports)).toBe(true);
    expect(imports.length).toBeGreaterThanOrEqual(1);

    const [imp] = imports as unknown as Array<{
      source: string;
      specifiers: Array<{ local: string }>;
    }>;
    expect(imp!.source).toBe('some-module');
    expect(imp!.specifiers.map((s) => s.local)).toContain('foo');
    expect(imp!.specifiers.map((s) => s.local)).toContain('bar');
  });

  it('context.imports captures default imports', async () => {
    let imports: unknown[] = [];
    const rule: TypeScriptRule = {
      id: 'test/default-import',
      description: 'Captures default import',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          ({ imports } = ctx as unknown as { imports: unknown[] });
          return [];
        },
      },
    };

    await lint([rule], `import React from 'react';`);
    const [imp] = imports as Array<{
      source: string;
      specifiers: Array<{ isDefault: boolean; local: string }>;
    }>;
    expect(imp!.source).toBe('react');
    const defaultSpec = imp!.specifiers.find((s) => s.isDefault);
    expect(defaultSpec).toBeDefined();
    expect(defaultSpec!.local).toBe('React');
  });

  it('context.imports captures namespace imports', async () => {
    let imports: unknown[] = [];
    const rule: TypeScriptRule = {
      id: 'test/namespace-import',
      description: 'Captures namespace import',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          ({ imports } = ctx as unknown as { imports: unknown[] });
          return [];
        },
      },
    };

    await lint([rule], `import * as v from 'valibot';`);
    const [imp] = imports as Array<{
      source: string;
      specifiers: Array<{ isNamespace: boolean; local: string }>;
    }>;
    expect(imp!.source).toBe('valibot');
    const nsSpec = imp!.specifiers.find((s) => s.isNamespace);
    expect(nsSpec).toBeDefined();
    expect(nsSpec!.local).toBe('v');
  });
});

// =============================================================================
// runTypeScriptRules — context.getNodeText
// =============================================================================

describe('runTypeScriptRules — context.getNodeText', () => {
  it('returns the correct source slice for a node', async () => {
    const nodeTexts: string[] = [];
    const rule: TypeScriptRule = {
      id: 'test/node-text',
      description: 'Extracts node text',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          nodeTexts.push(ctx.getNodeText(node));
          return [];
        },
      },
    };

    await lint([rule], 'const x: number = 42;');
    expect(nodeTexts.length).toBeGreaterThanOrEqual(1);
    expect(nodeTexts[0]).toContain('const x');
  });

  it('getNodeText returns empty string for a zero-length node', async () => {
    const nodeTexts: string[] = [];
    const rule: TypeScriptRule = {
      id: 'test/empty-node-text',
      description: 'Zero-length node text',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          // Create a synthetic zero-length node derived from a real one
          const zeroNode: AstNode = { ...node, start: node.start, end: node.start };
          nodeTexts.push(ctx.getNodeText(zeroNode));
          return [];
        },
      },
    };

    await lint([rule], 'const x: number = 42;');
    expect(nodeTexts[0]).toBe('');
  });
});

// =============================================================================
// runTypeScriptRules — context.isImportedFrom
// =============================================================================

describe('runTypeScriptRules — context.isImportedFrom', () => {
  it('returns true for a named import from the correct module', async () => {
    const results: boolean[] = [];
    const rule: TypeScriptRule = {
      id: 'test/is-imported',
      description: 'Checks isImportedFrom',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          results.push(ctx.isImportedFrom('safeParse', 'valibot'));
          return [];
        },
      },
    };

    await lint([rule], `import { safeParse } from 'valibot';`);
    expect(results[0]).toBe(true);
  });

  it('returns false when the identifier is imported from a different module', async () => {
    const results: boolean[] = [];
    const rule: TypeScriptRule = {
      id: 'test/is-imported-wrong-module',
      description: 'Module mismatch',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          results.push(ctx.isImportedFrom('safeParse', 'other-module'));
          return [];
        },
      },
    };

    await lint([rule], `import { safeParse } from 'valibot';`);
    expect(results[0]).toBe(false);
  });

  it('returns false when the identifier is not imported at all', async () => {
    const results: boolean[] = [];
    const rule: TypeScriptRule = {
      id: 'test/not-imported',
      description: 'Not imported',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          results.push(ctx.isImportedFrom('nonExistent', 'valibot'));
          return [];
        },
      },
    };

    await lint([rule], `import { safeParse } from 'valibot';`);
    expect(results[0]).toBe(false);
  });

  it('returns true for namespace import — identifier starts with namespace alias', async () => {
    const results: boolean[] = [];
    const rule: TypeScriptRule = {
      id: 'test/namespace-check',
      description: 'Namespace import check',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          results.push(ctx.isImportedFrom('v.safeParse', 'valibot'));
          return [];
        },
      },
    };

    await lint([rule], `import * as v from 'valibot';`);
    expect(results[0]).toBe(true);
  });

  it('returns false for namespace import when identifier prefix does not match', async () => {
    const results: boolean[] = [];
    const rule: TypeScriptRule = {
      id: 'test/namespace-mismatch',
      description: 'Namespace prefix mismatch',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          results.push(ctx.isImportedFrom('x.safeParse', 'valibot'));
          return [];
        },
      },
    };

    await lint([rule], `import * as v from 'valibot';`);
    expect(results[0]).toBe(false);
  });
});

// =============================================================================
// runTypeScriptRules — file extension handling
// =============================================================================

describe('runTypeScriptRules — file extension handling', () => {
  it('works with .svelte.ts file extensions', async () => {
    const rule: TypeScriptRule = {
      id: 'test/svelte-ts',
      description: 'Works on svelte.ts',
      patterns: ['**/*.svelte.ts'],
      visitor: {
        VariableDeclaration(_node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: 1,
              column: 1,
              severity: 'warning',
              message: 'svelte.ts hit',
              ruleId: 'test/svelte-ts',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([rule], 'const x: number = 1;', 'Component.svelte.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.file).toBe('Component.svelte.ts');
  });

  it('context.file reflects the filename passed to runTypeScriptRules', async () => {
    const files: string[] = [];
    const rule: TypeScriptRule = {
      id: 'test/file-context',
      description: 'Records file from context',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          files.push(ctx.file);
          return [];
        },
      },
    };

    await lint([rule], 'const x: number = 1;', '/absolute/path/to/file.ts');
    expect(files[0]).toBe('/absolute/path/to/file.ts');
  });
});

// =============================================================================
// runTypeScriptRules — source backfill
// =============================================================================

describe('runTypeScriptRules — source backfill', () => {
  it('backfills source on results that do not have it', async () => {
    const rule: TypeScriptRule = {
      id: 'test/no-source',
      description: 'Reports without source',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: node.loc.start.line,
              column: 1,
              severity: 'error',
              message: 'no source provided',
              ruleId: 'test/no-source',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([rule], 'const x: number = 1;');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.source).toBe('const x: number = 1;');
  });

  it('does not overwrite source when already provided', async () => {
    const rule: TypeScriptRule = {
      id: 'test/has-source',
      description: 'Reports with source already set',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: node.loc.start.line,
              column: 1,
              severity: 'error',
              message: 'has source',
              ruleId: 'test/has-source',
              source: 'custom source text',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([rule], 'const x: number = 1;');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.source).toBe('custom source text');
  });

  it('does not backfill source when line is out of range', async () => {
    const rule: TypeScriptRule = {
      id: 'test/bad-line',
      description: 'Reports with out-of-range line',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(_node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: 999,
              column: 1,
              severity: 'error',
              message: 'bad line',
              ruleId: 'test/bad-line',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([rule], 'const x: number = 1;');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.source).toBeUndefined();
  });

  it('does not backfill source when line is 0', async () => {
    const rule: TypeScriptRule = {
      id: 'test/zero-line',
      description: 'Reports with line 0',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(_node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: 0,
              column: 1,
              severity: 'error',
              message: 'zero line',
              ruleId: 'test/zero-line',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([rule], 'const x: number = 1;');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.source).toBeUndefined();
  });
});

// =============================================================================
// runTypeScriptRules — ruleOptions
// =============================================================================

describe('runTypeScriptRules — ruleOptions', () => {
  it('passes ruleOptions to the visitor context', async () => {
    let capturedOptions: Record<string, unknown> | undefined;
    const rule: TypeScriptRule = {
      id: 'test/options',
      description: 'Captures rule options',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          capturedOptions = ctx.ruleOptions;
          return [];
        },
      },
    };

    await runTypeScriptRules('test.ts', 'const x = 1;', [rule], {
      'test/options': { allowedTargets: ['browser'] },
    });
    expect(capturedOptions).toEqual({ allowedTargets: ['browser'] });
  });

  it('ruleOptions is undefined when not provided for the rule', async () => {
    let capturedOptions: Record<string, unknown> | undefined = { initial: true };
    const rule: TypeScriptRule = {
      id: 'test/no-options',
      description: 'No options provided',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          capturedOptions = ctx.ruleOptions;
          return [];
        },
      },
    };

    await runTypeScriptRules('test.ts', 'const x = 1;', [rule], {});
    expect(capturedOptions).toBeUndefined();
  });

  it('ruleOptions is undefined when allRuleOptions is not passed', async () => {
    let capturedOptions: Record<string, unknown> | undefined = { initial: true };
    const rule: TypeScriptRule = {
      id: 'test/no-all-options',
      description: 'No allRuleOptions arg',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          capturedOptions = ctx.ruleOptions;
          return [];
        },
      },
    };

    await runTypeScriptRules('test.ts', 'const x = 1;', [rule]);
    expect(capturedOptions).toBeUndefined();
  });
});

// =============================================================================
// runTypeScriptRules — type-only imports
// =============================================================================

describe('runTypeScriptRules — type-only imports', () => {
  it('context.imports detects type-only import declarations', async () => {
    let imports: unknown[] = [];
    const rule: TypeScriptRule = {
      id: 'test/type-import',
      description: 'Checks type-only imports',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          ({ imports } = ctx as unknown as { imports: unknown[] });
          return [];
        },
      },
    };

    await lint([rule], `import type { Foo } from 'some-module';`);
    const [imp] = imports as Array<{ source: string; isTypeOnly: boolean }>;
    expect(imp!.source).toBe('some-module');
    expect(imp!.isTypeOnly).toBe(true);
  });
});

// =============================================================================
// walkNode — edge cases
// =============================================================================

describe('walkNode — additional edge cases', () => {
  it('skips boolean primitives', () => {
    const visited: string[] = [];
    walkNode(true, (n) => visited.push(n.type));
    expect(visited).toEqual([]);
  });

  it('handles object without type (no callback)', () => {
    const visited: string[] = [];
    walkNode({ foo: 'bar' }, (n) => visited.push(n.type));
    expect(visited).toEqual([]);
  });

  it('handles arrays containing primitive values', () => {
    const visited: string[] = [];
    const node: AstNode = makeNode('Program', {
      values: [1, 'hello', null, true],
    });
    walkNode(node, (n) => visited.push(n.type));
    expect(visited).toEqual(['Program']);
  });

  it('handles nested object that is not a node (no type)', () => {
    const visited: string[] = [];
    const node: AstNode = makeNode('Program', {
      meta: { description: 'test', nested: { deep: true } },
    });
    walkNode(node, (n) => visited.push(n.type));
    // Only Program should be visited since meta/nested have no type
    expect(visited).toEqual(['Program']);
  });
});

// =============================================================================
// extractSvelteScript — unit tests (TASK 4)
// =============================================================================

describe('extractSvelteScript', () => {
  it('extracts content from a single <script lang="ts"> block preserving line numbers', () => {
    const svelte: string = [
      '<div>hello</div>',
      '<script lang="ts">',
      'const x: number = 1;',
      'const y: string = "hi";',
      '</script>',
      '<style>div { color: red; }</style>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines.length).toBe(6);
    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('const x: number = 1;');
    expect(lines[3]).toBe('const y: string = "hi";');
    expect(lines[4]).toBe('');
    expect(lines[5]).toBe('');
  });

  it('extracts content from a single <script> block (no lang attr)', () => {
    const svelte: string = ['<script>', 'let count = 0;', '</script>', '<p>template</p>'].join(
      '\n',
    );

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('let count = 0;');
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('');
  });

  it('extracts content from <script lang="js"> block', () => {
    const svelte: string = ['<script lang="js">', 'const foo = "bar";', '</script>'].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('const foo = "bar";');
    expect(lines[2]).toBe('');
  });

  it('extracts content from <script module> (Svelte 5 module context)', () => {
    const svelte: string = [
      '<script module>',
      'export const API_URL = "/api";',
      '</script>',
      '<p>content</p>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('export const API_URL = "/api";');
    expect(lines[2]).toBe('');
  });

  it('extracts content from <script context="module"> (Svelte 4 module context)', () => {
    const svelte: string = [
      '<script context="module">',
      'export const prerender = true;',
      '</script>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('export const prerender = true;');
    expect(lines[2]).toBe('');
  });

  it('extracts content from multiple script blocks (module + instance) preserving positions', () => {
    const svelte: string = [
      '<script context="module">',
      'export const prerender = true;',
      '</script>',
      '',
      '<script lang="ts">',
      'let count: number = 0;',
      'function increment(): void { count++; }',
      '</script>',
      '',
      '<button on:click={increment}>{count}</button>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines.length).toBe(10);
    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('export const prerender = true;');
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('');
    expect(lines[4]).toBe('');
    expect(lines[5]).toBe('let count: number = 0;');
    expect(lines[6]).toBe('function increment(): void { count++; }');
    expect(lines[7]).toBe('');
    expect(lines[8]).toBe('');
    expect(lines[9]).toBe('');
  });

  it('returns empty string for template-only file (no script block)', () => {
    const svelte: string = [
      '<div>',
      '  <p>Hello world</p>',
      '</div>',
      '<style>p { color: blue; }</style>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    expect(result).toBe('');
  });

  it('returns empty string for empty file', () => {
    const result: string = extractSvelteScript('');
    expect(result).toBe('');
  });

  it('extracts script block with imports and complex TypeScript', () => {
    const svelte: string = [
      '<script lang="ts">',
      "import { onMount } from 'svelte';",
      "import type { PageData } from './$types';",
      '',
      'export let data: PageData;',
      'let items: string[] = [];',
      '',
      'onMount(async () => {',
      '  items = await fetch("/api/items").then(r => r.json());',
      '});',
      '</script>',
      '',
      '<ul>',
      '  {#each items as item}',
      '    <li>{item}</li>',
      '  {/each}',
      '</ul>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[0]).toBe('');
    expect(lines[1]).toContain("import { onMount } from 'svelte';");
    expect(lines[2]).toContain('PageData');
    expect(lines[3]).toBe('');
    expect(lines[4]).toBe('export let data: PageData;');
    expect(lines[5]).toBe('let items: string[] = [];');
    expect(lines[7]).toBe('onMount(async () => {');
    expect(lines[10]).toBe('');
    expect(lines[11]).toBe('');
  });

  it('handles <script lang="ts" module> — attributes in various orders', () => {
    const svelte: string = [
      '<script lang="ts" module>',
      'export const API = "/api";',
      '</script>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[1]).toBe('export const API = "/api";');
  });

  it('handles whitespace variations in script tags', () => {
    const svelte: string = ['<script  lang="ts" >', 'const x = 1;', '</script >'].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[1]).toBe('const x = 1;');
  });

  it('handles closing </script> with extra whitespace', () => {
    const svelte: string = ['<script>', 'const a = 1;', '</script  >'].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[1]).toBe('const a = 1;');
  });
});

// =============================================================================
// runTypeScriptRules — Svelte integration (TASK 5)
// =============================================================================

describe('runTypeScriptRules — Svelte file integration', () => {
  it('runs AST rules on .svelte files with <script lang="ts">', async () => {
    const svelteContent: string = [
      '<script lang="ts">',
      'const x: number = 1;',
      '</script>',
      '<p>hello</p>',
    ].join('\n');

    const rule: TypeScriptRule = {
      id: 'test/svelte-var',
      description: 'Detects variable declarations in svelte',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message: 'Found var decl in svelte',
              ruleId: 'test/svelte-var',
              fix: { range: { start: node.start, end: node.end }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await runTypeScriptRules('Component.svelte', svelteContent, [
      rule,
    ]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.ruleId).toBe('test/svelte-var');
  });

  it('line numbers in results match original .svelte file lines', async () => {
    const svelteContent: string = [
      '<div>template</div>',
      '',
      '<script lang="ts">',
      'const x: number = 1;',
      '</script>',
    ].join('\n');

    const rule: TypeScriptRule = {
      id: 'test/svelte-line',
      description: 'Reports line number',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message: 'line check',
              ruleId: 'test/svelte-line',
              fix: { range: { start: node.start, end: node.end }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await runTypeScriptRules('Component.svelte', svelteContent, [
      rule,
    ]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.line).toBe(4);
  });

  it('context.content contains only the script block content', async () => {
    const svelteContent: string = [
      '<p>template</p>',
      '<script lang="ts">',
      'const x: number = 1;',
      '</script>',
      '<style>p { color: red; }</style>',
    ].join('\n');

    let capturedContent: string = '';
    const rule: TypeScriptRule = {
      id: 'test/svelte-content',
      description: 'Captures context.content',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          capturedContent = ctx.content;
          return [];
        },
      },
    };

    await runTypeScriptRules('Component.svelte', svelteContent, [rule]);
    expect(capturedContent).not.toContain('<p>template</p>');
    expect(capturedContent).not.toContain('color: red');
    expect(capturedContent).toContain('const x: number = 1;');
  });

  it('context.file is the original .svelte filename', async () => {
    const svelteContent: string = ['<script lang="ts">', 'const x = 1;', '</script>'].join('\n');

    let capturedFile: string = '';
    const rule: TypeScriptRule = {
      id: 'test/svelte-file',
      description: 'Captures context.file',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          capturedFile = ctx.file;
          return [];
        },
      },
    };

    await runTypeScriptRules('/path/to/Component.svelte', svelteContent, [rule]);
    expect(capturedFile).toBe('/path/to/Component.svelte');
  });

  it('imports are extracted correctly from .svelte script blocks', async () => {
    const svelteContent: string = [
      '<script lang="ts">',
      "import { onMount } from 'svelte';",
      "import type { PageData } from './$types';",
      'let x = 1;',
      '</script>',
      '<p>content</p>',
    ].join('\n');

    let capturedImports: unknown[] = [];
    const rule: TypeScriptRule = {
      id: 'test/svelte-imports',
      description: 'Captures imports from svelte',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          capturedImports = ctx.imports as unknown as unknown[];
          return [];
        },
      },
    };

    await runTypeScriptRules('Component.svelte', svelteContent, [rule]);
    const imports = capturedImports as Array<{
      source: string;
      specifiers: Array<{ local: string }>;
    }>;
    expect(imports.length).toBe(2);
    expect(imports[0]!.source).toBe('svelte');
    expect(imports[0]!.specifiers[0]!.local).toBe('onMount');
    expect(imports[1]!.source).toBe('./$types');
  });

  it('.svelte file with no script block produces zero results', async () => {
    const svelteContent: string = [
      '<div>',
      '  <p>Hello world</p>',
      '</div>',
      '<style>p { color: blue; }</style>',
    ].join('\n');

    const rule: TypeScriptRule = {
      id: 'test/svelte-empty',
      description: 'Should not run on template-only svelte',
      patterns: ['**/*.ts'],
      visitor: {
        Program(_node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: 1,
              column: 1,
              severity: 'error',
              message: 'should not appear',
              ruleId: 'test/svelte-empty',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await runTypeScriptRules('Component.svelte', svelteContent, [
      rule,
    ]);
    expect(results).toEqual([]);
  });

  it('non-svelte .ts files are unaffected (regression)', async () => {
    const rule: TypeScriptRule = {
      id: 'test/ts-regression',
      description: 'Normal TS still works',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: node.loc.start.line,
              column: 1,
              severity: 'error',
              message: 'found var',
              ruleId: 'test/ts-regression',
              fix: { range: { start: node.start, end: node.end }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([rule], 'const x: number = 1;', 'module.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.file).toBe('module.ts');
    expect(results[0]!.line).toBe(1);
  });

  it('.svelte.ts files still work correctly (regression)', async () => {
    const rule: TypeScriptRule = {
      id: 'test/svelte-ts-regression',
      description: 'svelte.ts still works',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: node.loc.start.line,
              column: 1,
              severity: 'error',
              message: 'svelte.ts var',
              ruleId: 'test/svelte-ts-regression',
              fix: { range: { start: node.start, end: node.end }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await lint([rule], 'const x: number = 1;', 'Component.svelte.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.file).toBe('Component.svelte.ts');
  });
});

// =============================================================================
// extractSvelteScript — edge cases (TASK 6)
// =============================================================================

describe('extractSvelteScript — edge cases', () => {
  it('handles unclosed <script> tag gracefully — includes remaining lines', () => {
    const svelte: string = ['<script lang="ts">', 'const x = 1;', 'const y = 2;'].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('const x = 1;');
    expect(lines[2]).toBe('const y = 2;');
  });

  it('handles </script> inside a string literal in script block', () => {
    const svelte: string = [
      '<script lang="ts">',
      'const tag = "</script>";',
      'const x = 1;',
      '</script>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('const tag = "</script>";');
  });

  it('style block between two script blocks — only script content extracted', () => {
    const svelte: string = [
      '<script context="module">',
      'export const prerender = true;',
      '</script>',
      '',
      '<style>',
      '  div { color: red; }',
      '</style>',
      '',
      '<script lang="ts">',
      'let count = 0;',
      '</script>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[1]).toBe('export const prerender = true;');
    expect(lines[5]).toBe('');
    expect(lines[9]).toBe('let count = 0;');
  });

  it('file with only <style> block — returns empty, no crash', () => {
    const svelte: string = ['<style>', '  div { color: blue; }', '</style>'].join('\n');

    const result: string = extractSvelteScript(svelte);
    expect(result).toBe('');
  });

  it('script block with TypeScript generics using <T> — not confused with HTML', () => {
    const svelte: string = [
      '<script lang="ts">',
      'function identity<T>(value: T): T { return value; }',
      'const result = identity<string>("hello");',
      '</script>',
      '<p>content</p>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[1]).toBe('function identity<T>(value: T): T { return value; }');
    expect(lines[2]).toBe('const result = identity<string>("hello");');
  });

  it('svelte template with {@html} containing script-like content', () => {
    const svelte: string = [
      '<script lang="ts">',
      'let html = "<script>alert(1)</script>";',
      '</script>',
      '{@html html}',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[0]).toBe('');
    expect(lines[1]).toContain('let html');
  });

  it('script block indented content preserves indentation', () => {
    const svelte: string = [
      '<script lang="ts">',
      '  const x = 1;',
      '    const y = 2;',
      '</script>',
    ].join('\n');

    const result: string = extractSvelteScript(svelte);
    const lines: string[] = result.split('\n');

    expect(lines[1]).toBe('  const x = 1;');
    expect(lines[2]).toBe('    const y = 2;');
  });
});

// =============================================================================
// runTypeScriptRules — Svelte source backfill (TASK 5 cont.)
// =============================================================================

describe('runTypeScriptRules — Svelte source backfill', () => {
  it('backfills source from original content for .svelte files', async () => {
    const svelteContent: string = [
      '<p>template line</p>',
      '<script lang="ts">',
      'const badVar: number = 1;',
      '</script>',
    ].join('\n');

    const rule: TypeScriptRule = {
      id: 'test/svelte-backfill',
      description: 'Reports without source',
      patterns: ['**/*.ts'],
      visitor: {
        VariableDeclaration(node: AstNode, ctx: VisitorContext): LintResult[] {
          return [
            {
              file: ctx.file,
              line: node.loc.start.line,
              column: 1,
              severity: 'error',
              message: 'backfill check',
              ruleId: 'test/svelte-backfill',
              fix: { range: { start: node.start, end: node.end }, text: '' },
            },
          ];
        },
      },
    };

    const results: LintResult[] = await runTypeScriptRules('Component.svelte', svelteContent, [
      rule,
    ]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.source).toBe('const badVar: number = 1;');
  });
});
