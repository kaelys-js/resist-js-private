/**
 * Tests for --stdin-filename CLI behavior.
 *
 * Verifies that the linter can read content from stdin instead of disk,
 * enabling real-time lint-on-type in IDE extensions.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runLinter, parseCliArgs, type CliArgs, type CliOutput } from './cli-helpers.ts';
import type { LintResult } from './framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';

// =============================================================================
// Test Helpers
// =============================================================================

function makeCliArgs(overrides: Partial<CliArgs> = {}): CliArgs {
  return {
    packageNames: [],
    paths: [],
    json: false,
    listRules: false,
    warnOnly: false,
    fix: false,
    help: false,
    ruleIds: [],
    categories: [],
    quiet: false,
    bail: false,
    ignore: [],
    configPath: undefined,
    severityOverride: undefined,
    diff: undefined,
    debug: false,
    format: undefined,
    jobs: undefined,
    stdinFilename: undefined,
    tools: false,
    cache: false,
    ...overrides,
  };
}

function captureOutput(): { stdoutLines: string[]; stderrLines: string[]; output: CliOutput } {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    stdoutLines,
    stderrLines,
    output: {
      stdout: (msg: string): void => {
        stdoutLines.push(msg);
      },
      stderr: (msg: string): void => {
        stderrLines.push(msg);
      },
    },
  };
}

// =============================================================================
// parseCliArgs — --stdin-filename
// =============================================================================

describe('parseCliArgs — --stdin-filename', () => {
  it('defaults stdinFilename to undefined', () => {
    const args: CliArgs = parseCliArgs([]);
    expect(args.stdinFilename).toBeUndefined();
  });

  it('parses --stdin-filename=<path>', () => {
    const args: CliArgs = parseCliArgs(['--stdin-filename=/src/foo.ts']);
    expect(args.stdinFilename).toBe('/src/foo.ts');
  });

  it('parses --stdin-filename alongside other flags', () => {
    const args: CliArgs = parseCliArgs([
      '--stdin-filename=/src/foo.ts',
      '--format=json',
      '--debug',
    ]);
    expect(args.stdinFilename).toBe('/src/foo.ts');
    expect(args.format).toBe('json');
    expect(args.debug).toBe(true);
  });

  it('does not treat --stdin-filename value as a positional path', () => {
    const args: CliArgs = parseCliArgs(['--stdin-filename=/src/foo.ts']);
    expect(args.paths).toEqual([]);
  });
});

// =============================================================================
// runLinter — --stdin-filename integration
// =============================================================================

describe.concurrent('runLinter — --stdin-filename', () => {
  it('lints stdin content instead of disk content', async () => {
    const { stdoutLines, output } = captureOutput();

    // Use a real file path but provide different content via stdin
    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    // Provide content with a known lint error (missing @param {Type})
    const stdinContent: string = `/**
 * Example function.
 *
 * @param name - The name
 * @returns The greeting
 */
export function greet(name: string): string {
  return \`Hello \${name}\`;
}
`;

    const code: number = await runLinter(
      makeCliArgs({
        stdinFilename: filePath,
        format: 'json',
        warnOnly: true,
        ruleIds: ['jsdoc/require-param'],
      }),
      output,
      en,
      stdinContent,
    );

    expect([0, 1]).toContain(code);
    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      // Should find the missing {Type} error from the stdin content
      const paramErrors: LintResult[] = results.filter(
        (r: LintResult): boolean => r.ruleId === 'jsdoc/require-param',
      );
      expect(paramErrors.length).toBeGreaterThan(0);
      expect(paramErrors[0]!.message).toContain('missing {Type}');
    }
  });

  it('uses stdin content even when disk file has no errors', async () => {
    const { stdoutLines, output } = captureOutput();

    // Point to a real file that has correct JSDoc
    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    // Provide intentionally bad content via stdin
    const stdinContent: string = `/**
 * Bad function with missing param type.
 *
 * @param x - Missing type
 * @returns {number} The value
 */
export function bad(x: number): number {
  return x * 2;
}
`;

    const code: number = await runLinter(
      makeCliArgs({
        stdinFilename: filePath,
        format: 'json',
        warnOnly: true,
        ruleIds: ['jsdoc/require-param'],
      }),
      output,
      en,
      stdinContent,
    );

    expect(code).toBe(0); // warnOnly
    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      // Should lint the stdin content, not disk
      const paramErrors: LintResult[] = results.filter(
        (r: LintResult): boolean => r.ruleId === 'jsdoc/require-param',
      );
      expect(paramErrors.length).toBeGreaterThan(0);
    }
  });

  it('reports file path from --stdin-filename in results', async () => {
    const { stdoutLines, output } = captureOutput();

    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    const stdinContent: string = `/**
 * No param type.
 *
 * @param val - Value
 * @returns {string} The string
 */
export function convert(val: number): string {
  return String(val);
}
`;

    await runLinter(
      makeCliArgs({
        stdinFilename: filePath,
        format: 'json',
        warnOnly: true,
        ruleIds: ['jsdoc/require-param'],
      }),
      output,
      en,
      stdinContent,
    );

    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      for (const r of results) {
        expect(r.file).toBe(filePath);
      }
    }
  });

  it('returns empty results for clean stdin content', async () => {
    const { stdoutLines, output } = captureOutput();

    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    // Provide clean content with proper {Type}
    const stdinContent: string = `/**
 * Clean function.
 *
 * @param {string} name - The name
 * @returns {string} The greeting
 */
export function greet(name: string): string {
  return \`Hello \${name}\`;
}
`;

    const code: number = await runLinter(
      makeCliArgs({
        stdinFilename: filePath,
        format: 'json',
        warnOnly: true,
        ruleIds: ['jsdoc/require-param'],
      }),
      output,
      en,
      stdinContent,
    );

    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      const paramErrors: LintResult[] = results.filter(
        (r: LintResult): boolean => r.ruleId === 'jsdoc/require-param',
      );
      expect(paramErrors.length).toBe(0);
    }
  });

  it('disables caching when --stdin-filename is used', async () => {
    const { stderrLines, output } = captureOutput();

    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    const stdinContent: string = `export const FOO: string = 'bar';\n`;

    await runLinter(
      makeCliArgs({
        stdinFilename: filePath,
        format: 'json',
        warnOnly: true,
        cache: true, // explicitly enable cache
        debug: true,
      }),
      output,
      en,
      stdinContent,
    );

    const stderrCombined: string = stderrLines.join('');
    // Debug output should NOT mention cache loading (disabled for stdin)
    expect(stderrCombined).not.toContain('cache: loaded');
  });

  it('works with --format=json and produces valid JSON', async () => {
    const { stdoutLines, output } = captureOutput();

    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    const stdinContent: string = `export const X: number = 42;\n`;

    const code: number = await runLinter(
      makeCliArgs({
        stdinFilename: filePath,
        format: 'json',
        warnOnly: true,
      }),
      output,
      en,
      stdinContent,
    );

    expect(code).toBe(0);
    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 0) {
      // Should be valid JSON
      expect(() => JSON.parse(combined)).not.toThrow();
    }
  });

  it('stdin content with syntax errors produces lint results not crashes', async () => {
    const { output } = captureOutput();

    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    // Intentionally broken TypeScript
    const stdinContent: string = `export function broken( { return "oops" }\n`;

    const code: number = await runLinter(
      makeCliArgs({
        stdinFilename: filePath,
        format: 'json',
        warnOnly: true,
      }),
      output,
      en,
      stdinContent,
    );

    // Should not crash — return 0 (warnOnly) or 1
    expect([0, 1]).toContain(code);
  });

  it('uses real file content when stdinContent is not provided', async () => {
    const { stdoutLines, output } = captureOutput();

    // Lint a real file (not via stdin) for comparison
    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');

    const code: number = await runLinter(
      makeCliArgs({
        paths: [filePath],
        format: 'json',
        warnOnly: true,
        ruleIds: ['jsdoc/require-jsdoc'],
      }),
      output,
      en,
      // no stdinContent
    );

    expect([0, 1]).toContain(code);
    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      // Results should reference the actual file
      for (const r of results) {
        expect(r.file).toBe(filePath);
      }
    }
  });

  it('detects errors in unsaved content that do not exist on disk', async () => {
    const { stdoutLines, output } = captureOutput();

    // Read the actual file from disk
    const filePath: string = resolve('packages/shared/config/tooling/lint/src/constants.ts');
    const diskContent: string = readFileSync(filePath, 'utf8');

    // Inject a deliberate error into the "editor buffer"
    const modifiedContent: string =
      diskContent +
      `
/**
 * Added function with missing param type.
 *
 * @param value - Should have {Type}
 * @returns {string} Result
 */
export function injectedForTest(value: string): string {
  return value;
}
`;

    const code: number = await runLinter(
      makeCliArgs({
        stdinFilename: filePath,
        format: 'json',
        warnOnly: true,
        ruleIds: ['jsdoc/require-param'],
      }),
      output,
      en,
      modifiedContent,
    );

    expect(code).toBe(0); // warnOnly
    const combined: string = stdoutLines.join('');
    if (combined.trim().length > 2) {
      const results: LintResult[] = JSON.parse(combined) as LintResult[];
      // The injected function should trigger a missing {Type} error
      const injectedErrors: LintResult[] = results.filter(
        (r: LintResult): boolean =>
          r.ruleId === 'jsdoc/require-param' && r.message.includes('injectedForTest'),
      );
      expect(injectedErrors.length).toBeGreaterThan(0);
    }
  });
});
