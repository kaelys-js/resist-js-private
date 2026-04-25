/**
 * Rule: vscode/no-unread-settings
 *
 * Every setting declared in package.json `contributes.configuration.properties`
 * must be read somewhere in the extension source via config.get or configManager.get.
 * Settings declared but never read are wasted UI and confuse users.
 *
 * This rule prevents the Phase-66-style failure where 5 settings were
 * declared in package.json but never actually read by the extension code.
 *
 * @module
 */

import { dirname, join } from 'node:path';

import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';
import { vscodeRuleInputs } from '@/lint/rules/vscode/_shared-inputs.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** Rule ID constant. */
const RULE_ID: string = 'vscode/no-unread-settings';

/** Regex to extract CONFIG_SECTION value from brand.ts. */
const CONFIG_SECTION_RE: RegExp = /export\s+const\s+CONFIG_SECTION\s*=\s*'([^']+)'/;

/** Relative path from package root to brand.ts. */
const BRAND_PATH: string = 'src/shared/brand.ts';

/** The no-unread-settings lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Every setting in package.json contributes.configuration must be read via config.get — prevents phantom settings.',
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
      if (!contributes || !contributes['configuration']) continue;

      const pkgDir: string = dirname(pkg.path);
      const brandPath: string = join(pkgDir, BRAND_PATH);

      /* Determine config section prefix */
      let configSection: string = '';
      if (await ctx.fileExists(brandPath)) {
        const brandSource: string = await ctx.readFile(brandPath);
        const configMatch: RegExpMatchArray | null = CONFIG_SECTION_RE.exec(brandSource);
        if (configMatch && configMatch[1]) {
          configSection = configMatch[1];
        }
      }

      /* Extract settings from package.json */
      const configuration = contributes['configuration'] as
        | { properties: Record<string, unknown> }
        | undefined;
      if (!configuration || !configuration.properties) continue;

      const settingKeys: string[] = Object.keys(configuration.properties);
      if (settingKeys.length === 0) continue;

      /* Read package.json source for line number reporting */
      const pkgSource: string = await ctx.readFile(pkg.path);
      const pkgLines: string[] = pkgSource.split('\n');

      /* Read all .ts files in the extension to find config.get calls */
      const allFiles: readonly string[] = await ctx.filesByExtension('.ts');
      const extFiles: readonly string[] = allFiles.filter(
        (f: string): boolean =>
          f.startsWith(pkgDir) && !f.includes('.test.') && !f.includes('__mocks__'),
      );

      /* Collect all source content */
      const allContent: string[] = [];
      for (const file of extFiles) {
        allContent.push(await ctx.readFile(file));
      }
      const combinedSource: string = allContent.join('\n');

      /* Check each setting for references */
      for (const fullKey of settingKeys) {
        /*
         * Settings are accessed with the relative key (minus the config section prefix).
         * e.g., "resist.lint.enable" → config.get('lint.enable')
         * Also check for the full key in case of direct getConfiguration().get() patterns.
         */
        const relativeKey: string =
          configSection.length > 0 && fullKey.startsWith(`${configSection}.`)
            ? fullKey.slice(configSection.length + 1)
            : fullKey;

        const isReferenced: boolean =
          combinedSource.includes(`'${relativeKey}'`) ||
          combinedSource.includes(`"${relativeKey}"`) ||
          combinedSource.includes(`'${fullKey}'`) ||
          combinedSource.includes(`"${fullKey}"`);

        if (!isReferenced) {
          const line: number = findLine(pkgLines, fullKey) ?? 1;
          results.push(
            createResult(
              RULE_ID,
              pkg.path,
              line,
              1,
              'error',
              `Setting "${fullKey}" is declared in package.json but never read via config.get("${relativeKey}") in extension source.`,
              {
                tip: `Either read this setting in extension code or remove it from package.json contributes.configuration.`,
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

/**
 * Find the 1-based line number containing a substring.
 *
 * @param {string[]} lines - File lines
 * @param {string} sub - Substring to find
 * @returns {number | undefined} 1-based line number
 */
function findLine(lines: string[], sub: string): number | undefined {
  for (let i: number = 0; i < lines.length; i++) {
    if ((lines[i] ?? '').includes(sub)) return i + 1;
  }
  return undefined;
}

export default rule;
