/**
 * Rule: vscode/no-unwired-commands
 *
 * Every command defined in brand.ts COMMANDS must have a matching
 * registerCommand or registerTextEditorCommand call somewhere in
 * the extension source. Commands declared but never registered are
 * orphaned and invisible to users.
 *
 * This rule prevents the Phase-66-style failure where 6 commands
 * existed in package.json/brand.ts but had no registerCommand call.
 *
 * @module
 */

import { dirname, join, relative } from 'node:path';

import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';
import { vscodeRuleInputs } from '@/lint/rules/vscode/_shared-inputs.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** Rule ID constant. */
const RULE_ID: string = 'vscode/no-unwired-commands';

/** Regex to extract COMMANDS block from brand.ts. */
const COMMANDS_BLOCK_RE: RegExp = /export\s+const\s+COMMANDS\s*=\s*\{([\s\S]*?)\}\s*as\s+const/;

/** Regex to extract individual command key-value pairs from COMMANDS block. */
const COMMAND_ENTRY_RE: RegExp = /(\w+)\s*:\s*(?:`([^`]+)`|'([^']+)')/g;

/** Regex to extract COMMAND_PREFIX value from brand.ts. */
const COMMAND_PREFIX_RE: RegExp = /export\s+const\s+COMMAND_PREFIX\s*=\s*'([^']+)'/;

/** Relative path from package root to brand.ts. */
const BRAND_PATH: string = 'src/shared/brand.ts';

/** The no-unwired-commands lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Every command in brand.ts COMMANDS must have a registerCommand/registerTextEditorCommand call — prevents orphaned commands.',
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
      if (!(await ctx.fileExists(brandPath))) continue;

      const brandSource: string = await ctx.readFile(brandPath);
      const brandLines: string[] = brandSource.split('\n');

      /* Extract COMMANDS entries */
      const commandsBlock: RegExpMatchArray | null = COMMANDS_BLOCK_RE.exec(brandSource);
      if (!commandsBlock || !commandsBlock[1]) {
        continue;
      }

      const commandEntries: Array<{ key: string; id: string }> = [];
      const re: RegExp = new RegExp(COMMAND_ENTRY_RE.source, 'g');
      let match: RegExpExecArray | null = re.exec(commandsBlock[1]);
      while (match !== null) {
        const key: string = match[1] ?? '';
        const id: string = match[2] ?? match[3] ?? '';
        if (key.length > 0 && id.length > 0) {
          commandEntries.push({ key, id });
        }
        match = re.exec(commandsBlock[1]);
      }

      if (commandEntries.length === 0) {
        continue;
      }

      /* Resolve ${COMMAND_PREFIX} in template literal command IDs */
      const prefixMatch: RegExpMatchArray | null = COMMAND_PREFIX_RE.exec(brandSource);
      if (prefixMatch && prefixMatch[1]) {
        const prefix: string = prefixMatch[1];
        for (const entry of commandEntries) {
          entry.id = entry.id.replaceAll(/\$\{COMMAND_PREFIX\}/g, prefix);
        }
      }

      /* Read all .ts files in the extension to find registerCommand calls */
      const allFiles: readonly string[] = await ctx.filesByExtension('.ts');
      const extFiles: readonly string[] = allFiles.filter(
        (f: string): boolean =>
          f.startsWith(pkgDir) && !f.includes('.test.') && !f.includes('__mocks__'),
      );

      /* Collect all registered command references */
      const registeredRefs: Set<string> = new Set();
      for (const file of extFiles) {
        const content: string = await ctx.readFile(file);
        /* Match COMMANDS.key references in registerCommand/registerTextEditorCommand calls */
        for (const entry of commandEntries) {
          if (content.includes(`COMMANDS.${entry.key}`)) {
            registeredRefs.add(entry.key);
          }
          /* Also check for direct string references */
          if (content.includes(`'${entry.id}'`) || content.includes(`"${entry.id}"`)) {
            registeredRefs.add(entry.key);
          }
        }
      }

      /* Report commands that are never referenced in registerCommand calls */
      for (const entry of commandEntries) {
        if (!registeredRefs.has(entry.key)) {
          const line: number = findLine(brandLines, entry.key) ?? 1;
          results.push(
            createResult(
              RULE_ID,
              brandPath,
              line,
              1,
              'error',
              `Command COMMANDS.${entry.key} ("${entry.id}") is defined in brand.ts but never referenced in any registerCommand/registerTextEditorCommand call.`,
              {
                tip: `Add a registerCommand(context, outputChannel, COMMANDS.${entry.key}, handler) call in commands.ts.`,
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
    if ((lines[i] ?? '').includes(sub)) {
      return i + 1;
    }
  }
  return undefined;
}

export default rule;
