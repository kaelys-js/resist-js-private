/**
 * Tests for comments lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import { expectTextFix, type LintResult, type TypeScriptRule } from '../../framework/types.ts';

import noLintDisable from './no-lint-disable.ts';
import requireSectionMarkerStyle from './require-section-marker-style.ts';
import requireSectionOrder from './require-section-order.ts';
import requireBlankLineGroups from './require-blank-line-groups.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @param {Record<string, Record<string, unknown>>} ruleOptions - Per-rule config options
 * @returns {Promise<LintResult[]>} Array of lint results
 */
function lint(
  rule: TypeScriptRule,
  code: string,
  ruleOptions?: Record<string, Record<string, unknown>>,
): Promise<LintResult[]> {
  return runTypeScriptRules('test.ts', code, [rule], ruleOptions);
}

/**
 * Apply a single byte-range {@link LintResult} fix to source code.
 *
 * @param {string} code - Original source text.
 * @param {LintResult} result - The lint result whose fix to apply.
 * @returns {string} The source with the fix applied.
 */
function applyFix(code: string, result: LintResult): string {
  const fix: { range: { start: number; end: number }; text: string } = expectTextFix(result.fix);

  return code.slice(0, fix.range.start) + fix.text + code.slice(fix.range.end);
}

/**
 * Whether a result carries the NO_OP_FIX sentinel (detect-only, no auto-fix).
 *
 * @param {LintResult} result - The lint result to inspect.
 * @returns {boolean} True when the fix range is {0,0} and text is empty.
 */
function isNoOpFix(result: LintResult): boolean {
  const fix: { range: { start: number; end: number }; text: string } = expectTextFix(result.fix);

  return fix.range.start === 0 && fix.range.end === 0 && fix.text === '';
}

/**
 * Re-lint code and assert it produced no internal parse-error diagnostic
 * (i.e. the post-fix source is syntactically parseable).
 *
 * @param {TypeScriptRule} rule - The rule to re-run.
 * @param {string} code - The (post-fix) source text.
 * @returns {Promise<LintResult[]>} The re-lint results.
 */
async function relintExpectingParseable(rule: TypeScriptRule, code: string): Promise<LintResult[]> {
  const results: LintResult[] = await lint(rule, code);

  for (const result of results) {
    expect(result.ruleId).not.toBe('internal/ts-parse-error');
    expect(result.ruleId).not.toBe('internal/oxc-parser-unavailable');
  }

  return results;
}

// =============================================================================
// comments/no-lint-disable
// =============================================================================

describe('comments/no-lint-disable', () => {
  it('reports eslint-disable comment', async () => {
    const code: string = `// eslint-disable-next-line no-console\nconsole.log('hi');`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('eslint-disable');
  });

  it('reports oxlint-ignore comment', async () => {
    const code: string = `// oxlint-ignore no-unused-vars\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('oxlint-ignore');
  });

  it('reports @ts-ignore comment', async () => {
    const code: string = `// @ts-ignore\nconst x: string = 42;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('@ts-ignore');
  });

  it('reports @ts-nocheck comment', async () => {
    const code: string = `// @ts-nocheck\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('@ts-nocheck');
  });

  it('reports /* global */ comment', async () => {
    const code: string = `/* global window, document */\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('/* global */');
  });

  it('allows max-lines disable', async () => {
    const code: string = `// eslint-disable-next-line max-lines\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code, {
      'comments/no-lint-disable': { allowedTargets: ['max-lines', 'max-lines-per-function'] },
    });
    expect(results.length).toBe(0);
  });

  it('allows max-lines-per-function disable', async () => {
    const code: string = `// eslint-disable-next-line max-lines-per-function\nfunction big(): void {}`;
    const results: LintResult[] = await lint(noLintDisable, code, {
      'comments/no-lint-disable': { allowedTargets: ['max-lines', 'max-lines-per-function'] },
    });
    expect(results.length).toBe(0);
  });

  it('passes clean code without disable comments', async () => {
    const code: string = `const x: number = 1;\nconst y: number = 2;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(0);
  });

  it('keeps fixable: true in the rule definition', () => {
    expect(noLintDisable.fixable).toBe(true);
  });

  // --- Fix shape: SAFE FULL-LINE DELETE (comment alone on its line) ---

  it('full-line-deletes a standalone single-line disable comment', async () => {
    const code: string = `// eslint-disable-next-line no-console\nconsole.log('hi');`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);

    const fixed: string = applyFix(code, results[0]!);
    expect(fixed).toBe(`console.log('hi');`);
    await relintExpectingParseable(noLintDisable, fixed);
  });

  it('full-line-deletes a standalone single-line /* global */ block comment', async () => {
    const code: string = `/* global window, document */\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);

    const fixed: string = applyFix(code, results[0]!);
    expect(fixed).toBe(`const x = 1;`);
    await relintExpectingParseable(noLintDisable, fixed);
  });

  it('preserves indentation-only lines around a deleted standalone comment', async () => {
    const code: string = `const a = 1;\n  // @ts-ignore\nconst b = 2;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);

    const fixed: string = applyFix(code, results[0]!);
    expect(fixed).toBe(`const a = 1;\nconst b = 2;`);
    await relintExpectingParseable(noLintDisable, fixed);
  });

  // --- Fix shape: SAFE TRAILING STRIP (line comment after real code) ---

  it('strips a trailing line disable comment without destroying the code', async () => {
    const code: string = `const x = 1; // eslint-disable-line no-unused-vars\nconst y = 2;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);

    const fixed: string = applyFix(code, results[0]!);
    expect(fixed).toBe(`const x = 1;\nconst y = 2;`);
    await relintExpectingParseable(noLintDisable, fixed);
  });

  it('strips a trailing @ts-ignore line comment, keeping the statement', async () => {
    const code: string = `const z: string = foo();   // @ts-ignore`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);

    const fixed: string = applyFix(code, results[0]!);
    expect(fixed).toBe(`const z: string = foo();`);
    await relintExpectingParseable(noLintDisable, fixed);
  });

  // --- Fix shape: NO_OP (inline block comment / multi-line block comment) ---

  it('does NOT fix an inline block comment sharing a line with code', async () => {
    const code: string = `const x = 1; /* @ts-ignore */ const z = 3;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(isNoOpFix(results[0]!)).toBe(true);
  });

  it('does NOT fix a multi-line block disable comment', async () => {
    const code: string = `/* @ts-ignore\n   spanning multiple lines */\nconst y = 2;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(isNoOpFix(results[0]!)).toBe(true);
  });

  it('does NOT fix a multi-line block comment that is alone on its first line', async () => {
    const code: string = `/* eslint-disable\n  no-console */\nconsole.log('x');`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(isNoOpFix(results[0]!)).toBe(true);
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
    expect(results[0]!.ruleId).toBe('comments/require-section-marker-style');
    expect(results[0]!.message).toContain('section marker');
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
    expect(results[0]!.fix).toBeDefined();
    expect(expectTextFix(results[0]!.fix).text).toContain('// =');
    expect(expectTextFix(results[0]!.fix).text).toContain('My Section');
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
    expect(results[0]!.message).toContain('Types');
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

  it('flags file with multiple content categories but no section markers', async () => {
    // Generate a file over 50 lines with schemas + exported functions
    const padding: string = Array.from(
      { length: 55 },
      (_: unknown, i: number) => `// line ${i + 1}`,
    ).join('\n');
    const code: string = `${padding}
const FooSchema = v.strictObject({ name: v.string() });
export type Foo = v.InferOutput<typeof FooSchema>;
const MAX_RETRIES: Num = 3;
export function doStuff(): void {}
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('content categories');
    expect(results[0]!.message).toContain('no section markers');
    /* The "no markers" diagnostic cannot synthesize markers — stays detect-only. */
    expect(isNoOpFix(results[0]!)).toBe(true);
  });

  it('passes small file with no section markers', async () => {
    const code: string = `
const FooSchema = v.strictObject({ name: v.string() });
export type Foo = v.InferOutput<typeof FooSchema>;
export function doStuff(): void {}
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(0);
  });

  it('passes file with proper section markers', async () => {
    const padding: string = Array.from(
      { length: 55 },
      (_: unknown, i: number) => `// line ${i + 1}`,
    ).join('\n');
    const code: string = `${padding}
// =============================================================================
// Schemas
// =============================================================================
const FooSchema = v.strictObject({ name: v.string() });

// =============================================================================
// Exported Functions
// =============================================================================
export function doStuff(): void {}
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(0);
  });

  // --- Reorder fix gating (TDZ-safety + recognized-headers) ---

  it('emits a reorder fix for clean, recognized, dependency-free sections', async () => {
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
    /* Both headers recognized, no cross-block declaration deps → fix is emitted. */
    expect(isNoOpFix(results[0]!)).toBe(false);

    const fixed: string = applyFix(code, results[0]!);
    /* After reordering, Types precedes Exported Functions. */
    expect(fixed.indexOf('// Types')).toBeLessThan(fixed.indexOf('// Exported Functions'));

    /* Applying the fix yields parseable, now-ordered code → re-lint reports nothing. */
    const second: LintResult[] = await relintExpectingParseable(requireSectionOrder, fixed);
    expect(second.length).toBe(0);
  });

  it('does NOT reorder when an unrecognized // === header sits inside the region', async () => {
    const code: string = `
// =============================================================================
// Exported Functions
// =============================================================================
export function main(): Void { return undefined; }

// =============================================================================
// Random Notes
// =============================================================================
const note: Num = 1;

// =============================================================================
// Types
// =============================================================================
type Foo = { x: Str };
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(1);
    /* "Random Notes" is unrecognized — reordering would drag it with a moved
     * block, so the fix is suppressed (detect-only). */
    expect(isNoOpFix(results[0]!)).toBe(true);
  });

  it('does NOT reorder when a moved block declares an identifier used by another block', async () => {
    const code: string = `
// =============================================================================
// Exported API
// =============================================================================
export const handler = (): Num => useConfig(CONFIG);

// =============================================================================
// Constants
// =============================================================================
const CONFIG: Num = 1;
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(1);
    /* The Constants block declares top-level CONFIG, referenced in the API block —
     * reordering risks use-before-declaration, so the fix is suppressed. */
    expect(isNoOpFix(results[0]!)).toBe(true);
  });

  it('still emits a reorder fix when blocks share no declared identifiers', async () => {
    const code: string = `
// =============================================================================
// Exported API
// =============================================================================
export const handler = (): Num => 1;

// =============================================================================
// Constants
// =============================================================================
const LIMIT: Num = 5;
`;
    const results: LintResult[] = await lint(requireSectionOrder, code);
    expect(results.length).toBe(1);
    /* LIMIT is declared in Constants but not referenced in the API block → safe. */
    expect(isNoOpFix(results[0]!)).toBe(false);

    const fixed: string = applyFix(code, results[0]!);
    expect(fixed.indexOf('// Constants')).toBeLessThan(fixed.indexOf('// Exported API'));

    const second: LintResult[] = await relintExpectingParseable(requireSectionOrder, fixed);
    expect(second.length).toBe(0);
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
    expect(results[0]!.message).toContain('blank line');
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

  it('provides fix with newline text to insert blank line between groups', async () => {
    const code: string = `function foo(): void {
  const x: Num = 1;
  if (x > 0) {
    return;
  }
}`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(1);
    expect(results[0]!.fix).toBeDefined();
    /* One newline already separates the statements — inserting one more makes a
     * blank line. The fix anchors at current.end (before the next line's indent). */
    expect(expectTextFix(results[0]!.fix).text).toBe('\n');
  });

  it('applies the fix to a real blank line and is idempotent', async () => {
    const code: string = `function foo(): void {
  const x: Num = 1;
  if (x > 0) {
    return;
  }
}`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(1);

    const fixed: string = applyFix(code, results[0]!);
    expect(fixed).toContain('const x: Num = 1;\n\n  if (x > 0)');

    /* Re-running must find the blank line and report nothing (idempotent). */
    const second: LintResult[] = await relintExpectingParseable(requireBlankLineGroups, fixed);
    expect(second.length).toBe(0);
  });

  it('inserts TWO newlines when statements share a line (zero existing newlines)', async () => {
    const code: string = `function foo(): void {
  const x: Num = 1; if (x > 0) { return; }
}`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(1);
    /* No newline between the two statements → need both newlines of a blank line. */
    expect(expectTextFix(results[0]!.fix).text).toBe('\n\n');

    const fixed: string = applyFix(code, results[0]!);
    const second: LintResult[] = await relintExpectingParseable(requireBlankLineGroups, fixed);
    expect(second.length).toBe(0);
  });

  it('fixes a module-level (Program) declaration-to-control gap idempotently', async () => {
    const code: string = `const total: Num = compute();
while (total > 0) { break; }`;
    const results: LintResult[] = await lint(requireBlankLineGroups, code);
    expect(results.length).toBe(1);
    /* One newline between them → insert one more for a blank line. */
    expect(expectTextFix(results[0]!.fix).text).toBe('\n');

    const fixed: string = applyFix(code, results[0]!);
    expect(fixed).toBe(`const total: Num = compute();\n\nwhile (total > 0) { break; }`);

    const second: LintResult[] = await relintExpectingParseable(requireBlankLineGroups, fixed);
    expect(second.length).toBe(0);
  });

  it('has fixable: true in the rule definition', () => {
    expect(requireBlankLineGroups.fixable).toBe(true);
  });
});
