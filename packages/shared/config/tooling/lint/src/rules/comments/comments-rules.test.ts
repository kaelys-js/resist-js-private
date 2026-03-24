/**
 * Tests for comments lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noLintDisable from './no-lint-disable.ts';
import requireSectionMarkerStyle from './require-section-marker-style.ts';
import requireSectionOrder from './require-section-order.ts';
import requireBlankLineGroups from './require-blank-line-groups.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @returns {Promise<LintResult[]>} Array of lint results
 */
function lint(rule: TypeScriptRule, code: string): Promise<LintResult[]> {
  return runTypeScriptRules('test.ts', code, [rule]);
}

// =============================================================================
// comments/no-lint-disable
// =============================================================================

describe('comments/no-lint-disable', () => {
  it('reports eslint-disable comment', async () => {
    const code: string = `// eslint-disable-next-line no-console\nconsole.log('hi');`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('eslint-disable');
  });

  it('reports oxlint-ignore comment', async () => {
    const code: string = `// oxlint-ignore no-unused-vars\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('oxlint-ignore');
  });

  it('reports @ts-ignore comment', async () => {
    const code: string = `// @ts-ignore\nconst x: string = 42;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('@ts-ignore');
  });

  it('reports @ts-nocheck comment', async () => {
    const code: string = `// @ts-nocheck\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('@ts-nocheck');
  });

  it('reports /* global */ comment', async () => {
    const code: string = `/* global window, document */\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('/* global */');
  });

  it('allows max-lines disable', async () => {
    const code: string = `// eslint-disable-next-line max-lines\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(0);
  });

  it('allows max-lines-per-function disable', async () => {
    const code: string = `// eslint-disable-next-line max-lines-per-function\nfunction big(): void {}`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(0);
  });

  it('passes clean code without disable comments', async () => {
    const code: string = `const x: number = 1;\nconst y: number = 2;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// comments/require-section-marker-style
// =============================================================================

describe('comments/require-section-marker-style', () => {
  it('passes canonical section marker style', async () => {
    const code: string = `
// =============================================================================
// Section Name
// =============================================================================

const x: number = 1;
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(0);
  });

  it('reports block comment section marker (/* --- */ style)', async () => {
    const code: string = `
/* ------------------------------------------------------------------ */
/*  Section Name                                                       */
/* ------------------------------------------------------------------ */

const x: number = 1;
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('comments/require-section-marker-style');
    expect(results[0].message).toContain('section marker');
  });

  it('reports dash-style line comment section marker at top level', async () => {
    const code: string = `
// -------------------------------------------------------------------------
// Section Name
// -------------------------------------------------------------------------

const x: number = 1;
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(1);
  });

  it('allows dash-style markers inside object literals (indented)', async () => {
    const code: string = `
const config = {
  // -------------------------------------------------------------------------
  // Business Configuration
  // -------------------------------------------------------------------------

  company: { name: 'Test' },
};
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(0);
  });

  it('allows dash-style markers inside function bodies (indented)', async () => {
    const code: string = `
function setup(): void {
  // -------------------------------------------------------------------------
  // Initialize
  // -------------------------------------------------------------------------

  const x: number = 1;
}
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(0);
  });

  it('reports multiple non-canonical markers', async () => {
    const code: string = `
/* ------------------------------------------------------------------ */
/*  First Section                                                      */
/* ------------------------------------------------------------------ */

const a: number = 1;

/* ------------------------------------------------------------------ */
/*  Second Section                                                     */
/* ------------------------------------------------------------------ */

const b: number = 2;
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(2);
  });

  it('passes code with no section markers at all', async () => {
    const code: string = `
const x: number = 1;
const y: number = 2;
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(0);
  });

  it('does not flag short dash comments (< 10 chars)', async () => {
    const code: string = `
// -----
// Note
// -----
const x: number = 1;
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(0);
  });

  it('provides auto-fix with canonical style', async () => {
    const code: string = `
/* ------------------------------------------------------------------ */
/*  My Section                                                         */
/* ------------------------------------------------------------------ */

const x: number = 1;
`;
    const results: LintResult[] = await lint(requireSectionMarkerStyle, code);
    expect(results.length).toBe(1);
    expect(results[0].fix).toBeDefined();
    expect(results[0].fix.text).toContain('// =');
    expect(results[0].fix.text).toContain('My Section');
  });
});

// =============================================================================
// comments/require-section-order
// =============================================================================

describe('comments/require-section-order', () => {
  it('passes correct section order', async () => {
    const code: string = `
// =============================================================================
// Types
// =============================================================================
type Foo = { x: Str };

// =============================================================================
// Constants
// =============================================================================
const MAX: Num = 10;

// =============================================================================
// Helpers
// =============================================================================
function helper(): Void { return undefined; }

// =============================================================================
// Exported Functions
// =============================================================================
export function main(): Void { return undefined; }
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(0);
  });

  it('flags wrong section order', async () => {
    const code: string = `
// =============================================================================
// Exported Functions
// =============================================================================
export function main(): Void { return undefined; }

// =============================================================================
// Types
// =============================================================================
type Foo = { x: Str };
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Types');
  });

  it('skips files with fewer than 2 sections', async () => {
    const code: string = `
// =============================================================================
// Types
// =============================================================================
type Foo = { x: Str };
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// comments/require-blank-line-groups
// =============================================================================

describe('comments/require-blank-line-groups', () => {
  it('flags missing blank line between const and if', async () => {
    const code: string = `function foo(): void {
  const x: Num = 1;
  if (x > 0) {
    return;
  }
}`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('blank line');
  });

  it('passes when blank line exists between const and if', async () => {
    const code: string = `function foo(): void {
  const x: Num = 1;

  if (x > 0) {
    return;
  }
}`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(0);
  });

  it('allows adjacent single-line guard clauses', async () => {
    const code: string = `function foo(): void {
  if (!a.ok) { return a; }
  if (!b.ok) { return b; }
}`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(0);
  });

  it('allows adjacent declarations (same group)', async () => {
    const code: string = `function foo(): void {
  const x: Num = 1;
  const y: Num = 2;
}`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(0);
  });

  it('flags missing blank line between if block and const', async () => {
    const code: string = `function foo(): void {
  if (true) {
    doSomething();
  }
  const x: Num = 1;
}`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(1);
  });
});
