/**
 * Rule: vscode/require-error-boundary
 *
 * Enforces use of shared error handling utilities in the VSCode extension:
 *
 * 1. Direct `vscode.commands.registerCommand` / `registerTextEditorCommand`
 *    calls should use the wrappers from command-registration.ts which include
 *    automatic error boundary wrapping via safeRunAsync.
 *
 * 2. Inline `error instanceof Error ? error.message : String(error)` patterns
 *    should use the shared `extractMessage()` utility from errors.ts.
 *
 * @module
 */

import { dirname, join } from 'node:path';

import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';
import { vscodeRuleInputs } from '@/lint/rules/vscode/_shared-inputs.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** Rule ID constant. */
const RULE_ID: string = 'vscode/require-error-boundary';

/** Relative path from package root to brand.ts (used to identify vscode packages). */
const BRAND_PATH: string = 'src/shared/brand.ts';

/** Files that ARE the wrapper implementations — they use the raw APIs by definition. */
const WRAPPER_FILES: readonly string[] = [
  'command-registration.ts',
  'command-registration.test.ts',
];

/** File that defines extractMessage — allowed to use raw pattern. */
const ERROR_UTILITY_FILE: string = 'errors.ts';

/** Regex matching direct vscode.commands.registerCommand calls. */
const DIRECT_REGISTER_RE: RegExp = /vscode\.commands\.register(?:Command|TextEditorCommand)\s*\(/;

/** Regex matching inline error extraction pattern. */
const INLINE_EXTRACT_RE: RegExp = /\binstanceof\s+Error\s*\?\s*\w+\.message\s*:\s*String\s*\(/;

/** The require-error-boundary lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Use registerCommand() wrapper and extractMessage() utility — prevents raw error handling patterns.',
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
          f.startsWith(pkgDir) && !f.includes('.test.') && !f.includes('__mocks__'),
      );

      for (const file of extFiles) {
        const fileName: string = file.split('/').pop() ?? '';

        /* Skip wrapper implementation files for Pattern A */
        const isWrapperFile: boolean = WRAPPER_FILES.some((w: string): boolean => fileName === w);

        /* Skip error utility file for Pattern B */
        const isErrorUtility: boolean = fileName === ERROR_UTILITY_FILE;

        const content: string = await ctx.readFile(file);
        const lines: string[] = content.split('\n');

        for (let i: number = 0; i < lines.length; i++) {
          const line: string = lines[i] ?? '';

          /* Pattern A: Direct vscode.commands.registerCommand */
          if (!isWrapperFile && DIRECT_REGISTER_RE.test(line)) {
            results.push(
              createResult(
                RULE_ID,
                file,
                i + 1,
                1,
                'error',
                'Direct vscode.commands.registerCommand — use registerCommand() from command-registration.ts instead.',
                {
                  tip: 'Import { registerCommand } from "./shared/command-registration" which includes automatic error boundary wrapping.',
                },
              ),
            );
          }

          /* Pattern B: Inline error extraction */
          if (!isErrorUtility && INLINE_EXTRACT_RE.test(line)) {
            results.push(
              createResult(
                RULE_ID,
                file,
                i + 1,
                1,
                'error',
                'Inline error extraction pattern — use extractMessage() from errors.ts instead.',
                {
                  tip: 'Import { extractMessage } from "./shared/errors" to replace `error instanceof Error ? error.message : String(error)`.',
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
