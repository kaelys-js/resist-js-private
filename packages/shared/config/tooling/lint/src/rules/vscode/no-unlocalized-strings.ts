/**
 * Rule: vscode/no-unlocalized-strings
 *
 * Detects raw string literals passed to user-facing VSCode APIs
 * (showErrorMessage, showInformationMessage, showWarningMessage)
 * instead of using locale strings from the `en` locale object.
 *
 * @module
 */

import { dirname, join } from 'node:path';

import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';
import { vscodeRuleInputs } from '@/lint/rules/vscode/_shared-inputs.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** Rule ID constant. */
const RULE_ID: string = 'vscode/no-unlocalized-strings';

/** Relative path from package root to brand.ts (used to identify vscode packages). */
const BRAND_PATH: string = 'src/shared/brand.ts';

/**
 * Patterns that match user-facing API calls with raw string arguments.
 * Each regex captures the function name and checks for a string literal argument.
 * Template literals, single-quoted, and double-quoted strings are all detected.
 */
const MESSAGE_API_PATTERNS: ReadonlyArray<{ pattern: RegExp; api: string }> = [
  {
    pattern: /showErrorMessage\(\s*(['"`])/,
    api: 'showErrorMessage',
  },
  {
    pattern: /showInformationMessage\(\s*(['"`])/,
    api: 'showInformationMessage',
  },
  {
    pattern: /showWarningMessage\(\s*(['"`])/,
    api: 'showWarningMessage',
  },
];

/** The no-unlocalized-strings lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'User-facing messages must use locale strings from en — prevents unlocalized English strings.',
  scope: 'workspace',
  categories: ['vscode'],
  stages: ['lint', 'ci'],
  fixable: false,

  async inputs(context: unknown): Promise<readonly string[]> {
    return vscodeRuleInputs(context as WorkspaceContext);
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: LintResult[] = [];
    const packages: WorkspacePackage[] = await ctx.getWorkspacePackages();

    for (const pkg of packages) {
      const pkgJson = pkg.packageJson as Record<string, unknown>;
      const contributes = pkgJson['contributes'] as Record<string, unknown> | undefined;
      if (!contributes || !contributes['commands']) {
        continue;
      }

      const pkgDir: string = dirname(pkg.path);
      const brandPath: string = join(pkgDir, BRAND_PATH);
      if (!(await ctx.fileExists(brandPath))) {continue;}

      /* Read all .ts files in the extension */
      const allFiles: readonly string[] = await ctx.filesByExtension('.ts');
      const extFiles: readonly string[] = allFiles.filter(
        (f: string): boolean =>
          f.startsWith(pkgDir) &&
          !f.includes('.test.') &&
          !f.includes('__mocks__') &&
          !f.includes('/locale/'),
      );

      for (const file of extFiles) {
        const content: string = await ctx.readFile(file);
        const lines: string[] = content.split('\n');

        for (let i: number = 0; i < lines.length; i++) {
          const line: string = lines[i] ?? '';

          for (const { pattern, api } of MESSAGE_API_PATTERNS) {
            if (pattern.test(line)) {
              results.push(
                createResult(
                  RULE_ID,
                  file,
                  i + 1,
                  1,
                  'error',
                  `Unlocalized string in ${api}() — use en.<category>.<key> from locale instead.`,
                  {
                    tip: `Replace the raw string with a locale key: e.g. en.messages.<key>`,
                  },
                ),
              );
            }
          }
        }
      }
    }

    return results;
  },
};

export default rule;
