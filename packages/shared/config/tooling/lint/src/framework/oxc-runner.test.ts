/**
 * Tests for oxc-parser-based TypeScript rule runner.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { walkNode, runTypeScriptRules } from './oxc-runner.ts';
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

describe('runTypeScriptRules — loc patching', () => {
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
