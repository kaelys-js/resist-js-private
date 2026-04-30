/**
 * Rule: vscode/no-hardcoded-brand
 *
 * Detects hardcoded brand string literals that should use constants
 * from brand.ts. Ensures the extension remains white-label-ready by
 * centralising all brand references in one file.
 *
 * @module
 */

import { dirname, join } from 'node:path';

import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';
import { vscodeRuleInputs } from '@/lint/rules/vscode/_shared-inputs.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** Rule ID constant. */
const RULE_ID: string = 'vscode/no-hardcoded-brand';

/** Relative path from package root to brand.ts. */
const BRAND_PATH: string = 'src/shared/brand.ts';

/** Brand constant values and their corresponding constant names. */
const BRAND_CONSTANTS: ReadonlyArray<{ value: string; constant: string }> = [
  { value: 'Resist', constant: 'BRAND_NAME' },
  { value: 'resist-lint-disable-next-line', constant: 'DISABLE_NEXT_LINE_PREFIX' },
  { value: 'resist-lint-disable', constant: 'DISABLE_FILE_PREFIX' },
  { value: 'resist-fix-preview', constant: 'PREVIEW_SCHEME' },
  { value: 'resist-linter', constant: 'DIAGNOSTIC_SOURCE / DIAGNOSTIC_COLLECTION_NAME' },
  { value: 'resist-lint', constant: 'BINARY_NAME' },
];

/**
 * Build a regex that matches a brand value as a standalone string literal.
 * Avoids matching partial substrings by requiring word boundaries or quote chars.
 *
 * @param value - Brand string literal to match (will be regex-escaped)
 * @returns Compiled global RegExp matching the value when surrounded by quotes
 */
function buildBrandRegex(value: string): RegExp {
  const escaped: string = value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

  return new RegExp(`(?:^|[^a-zA-Z0-9_-])(?:'${escaped}'|"${escaped}"|\`${escaped}\`)`, 'g');
}

/** The no-hardcoded-brand lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Hardcoded brand strings must use constants from brand.ts — ensures white-label readiness.',
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

      if (!(await ctx.fileExists(brandPath))) {
        continue;
      }

      /* Read all .ts files in the extension */
      const allFiles: readonly string[] = await ctx.filesByExtension('.ts');
      const extFiles: readonly string[] = allFiles.filter(
        (f: string): boolean =>
          f.startsWith(pkgDir) &&
          !f.includes('.test.') &&
          !f.includes('__mocks__') &&
          !f.endsWith('brand.ts'),
      );

      for (const file of extFiles) {
        const content: string = await ctx.readFile(file);
        const lines: string[] = content.split('\n');

        /* Check each brand constant value, longest first to avoid partial matches */
        for (const { value, constant } of BRAND_CONSTANTS) {
          const regex: RegExp = buildBrandRegex(value);

          for (let i: number = 0; i < lines.length; i++) {
            const line: string = lines[i] ?? '';
            /* Skip import lines — importing brand.ts is fine */

            if (line.includes('import ') && line.includes('brand')) {
              continue;
            }
            /* Skip comments */
            if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) {
              continue;
            }

            if (regex.test(line)) {
              results.push(
                createResult(
                  RULE_ID,
                  file,
                  i + 1,
                  1,
                  'error',
                  `Hardcoded brand string '${value}' — use ${constant} from brand.ts instead.`,
                  {
                    tip: `Import { ${constant.split(' / ')[0]} } from './shared/brand' and use the constant.`,
                  },
                ),
              );
            }
            regex.lastIndex = 0;
          }
        }
      }
    }

    return results;
  },
};

export default rule;
