/**
 * Rule: workspace/vscode-brand-sync
 *
 * Validates that VS Code extension package.json `contributes.commands`
 * and `contributes.configuration.properties` stay in sync with brand.ts
 * constants. Auto-discovers VS Code extension packages by looking for
 * `contributes.commands` in package.json.
 *
 * @module
 */

import { dirname, join } from 'node:path';

import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

// =============================================================================
// Constants
// =============================================================================

/** Regex to extract COMMANDS values from brand.ts. */
const COMMANDS_BLOCK_RE: RegExp = /export\s+const\s+COMMANDS\s*=\s*\{([\s\S]*?)\}\s*as\s+const/;

/** Regex to extract individual command string values from the COMMANDS block. */
const COMMAND_VALUE_RE: RegExp = /:\s*`([^`]+)`|:\s*'([^']+)'/g;

/** Regex to extract CONFIG_SECTION value from brand.ts. */
const CONFIG_SECTION_RE: RegExp = /export\s+const\s+CONFIG_SECTION\s*=\s*'([^']+)'/;

/** Relative path from package root to brand.ts. */
const BRAND_PATH = 'src/shared/brand.ts';

// =============================================================================
// Rule
// =============================================================================

/** Validates VS Code extension brand.ts ↔ package.json sync. */
const rule: WorkspaceRule = {
  id: 'workspace/vscode-brand-sync',
  description:
    'VS Code extension package.json commands and settings must stay in sync with brand.ts constants.',
  scope: 'workspace',
  categories: ['workspace', 'vscode'],
  stages: ['lint', 'ci'],
  fixable: false,

  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
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

      // This is a VS Code extension package — validate brand sync
      const pkgDir: string = dirname(pkg.path);
      const brandPath: string = join(pkgDir, BRAND_PATH);
      const brandExists: boolean = await ctx.fileExists(brandPath);

      if (!brandExists) {
        results.push(
          createResult(
            'workspace/vscode-brand-sync',
            pkg.path,
            1,
            1,
            'error',
            `VS Code extension has contributes.commands but no ${BRAND_PATH} file found.`,
            {
              tip: 'Create a brand.ts file with COMMANDS and CONFIG_SECTION constants.',
            },
          ),
        );
        continue;
      }

      const brandSource: string = await ctx.readFile(brandPath);
      const brandLines: string[] = brandSource.split('\n');

      // Extract COMMANDS from brand.ts
      const commandsBlock: RegExpMatchArray | null = COMMANDS_BLOCK_RE.exec(brandSource);

      if (!commandsBlock) {
        results.push(
          createResult(
            'workspace/vscode-brand-sync',
            brandPath,
            1,
            1,
            'error',
            'Could not parse COMMANDS constant from brand.ts.',
            {
              tip: 'Ensure brand.ts exports `const COMMANDS = { ... } as const`.',
            },
          ),
        );
        continue;
      }

      const brandCommands: string[] = [];
      const commandsText: string = commandsBlock[1] ?? '';
      let match: RegExpExecArray | null;

      while ((match = COMMAND_VALUE_RE.exec(commandsText)) !== null) {
        brandCommands.push(match[1] ?? match[2] ?? '');
      }

      // Extract CONFIG_SECTION from brand.ts
      const configMatch: RegExpMatchArray | null = CONFIG_SECTION_RE.exec(brandSource);

      if (!configMatch) {
        results.push(
          createResult(
            'workspace/vscode-brand-sync',
            brandPath,
            1,
            1,
            'error',
            'Could not parse CONFIG_SECTION constant from brand.ts.',
            {
              tip: "Ensure brand.ts exports `const CONFIG_SECTION = 'prefix'`.",
            },
          ),
        );
        continue;
      }

      const configSection: string = configMatch[1] ?? '';

      // Extract commands from package.json
      const pkgCommands: string[] = (contributes['commands'] as Array<{ command: string }>).map(
        (c) => c.command,
      );

      // Extract settings from package.json
      const configuration = contributes['configuration'] as
        | { properties: Record<string, unknown> }
        | undefined;
      const pkgSettings: string[] = configuration ? Object.keys(configuration.properties) : [];

      // Find the line in package.json where contributes.commands starts (for diagnostics)
      const pkgSource: string = await ctx.readFile(pkg.path);
      const pkgLines: string[] = pkgSource.split('\n');

      // Validate: every brand.ts command must exist in package.json
      for (const cmd of brandCommands) {
        if (!pkgCommands.includes(cmd)) {
          const cmdLine: number = findLineContaining(brandLines, cmd) ?? 1;
          results.push(
            createResult(
              'workspace/vscode-brand-sync',
              brandPath,
              cmdLine,
              1,
              'error',
              `brand.ts command "${cmd}" is missing from package.json contributes.commands.`,
              {
                tip: 'Add the command to package.json contributes.commands array.',
              },
            ),
          );
        }
      }

      // Validate: every package.json command must exist in brand.ts
      for (const cmd of pkgCommands) {
        if (!brandCommands.includes(cmd)) {
          const cmdLine: number = findLineContaining(pkgLines, cmd) ?? 1;
          results.push(
            createResult(
              'workspace/vscode-brand-sync',
              pkg.path,
              cmdLine,
              1,
              'error',
              `package.json command "${cmd}" is not defined in brand.ts COMMANDS.`,
              {
                tip: 'Add the command to brand.ts COMMANDS constant.',
              },
            ),
          );
        }
      }

      // Validate: all settings must be prefixed with CONFIG_SECTION
      for (const key of pkgSettings) {
        if (!key.startsWith(`${configSection}.`)) {
          const keyLine: number = findLineContaining(pkgLines, key) ?? 1;
          results.push(
            createResult(
              'workspace/vscode-brand-sync',
              pkg.path,
              keyLine,
              1,
              'error',
              `package.json setting "${key}" does not start with CONFIG_SECTION "${configSection}.".`,
              {
                tip: `Rename the setting to start with "${configSection}.".`,
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Finds the 1-based line number of the first line containing the given substring.
 *
 * @param lines - Array of file lines
 * @param substring - Text to search for
 * @returns 1-based line number, or undefined if not found
 */
function findLineContaining(lines: string[], substring: string): number | undefined {
  for (const [i, line] of lines.entries()) {
    if (line.includes(substring)) {
      return i + 1;
    }
  }
  return undefined;
}

export default rule;
