/**
 * Rule: svelte5-config/kit-alias-consistency
 *
 * SvelteKit aliases in `kit.alias` must match `compilerOptions.paths` in
 * `tsconfig.json` to avoid import resolution failures.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { getDefaultExportObject, getNestedValue, getPropertyEntries } from './_config-ast.ts';

/**
 * Read and parse tsconfig.json paths from the same directory.
 *
 * @param dir - Directory containing tsconfig.json
 * @returns Map of alias names to path values, or empty map
 */
function readTsconfigPaths(dir: string): Map<string, string> {
  const paths: Map<string, string> = new Map();
  const tsconfigPath: string = join(dir, 'tsconfig.json');

  if (!existsSync(tsconfigPath)) {
    return paths;
  }

  try {
    const raw: string = readFileSync(tsconfigPath, 'utf8');
    // Strip comments from JSONC
    const stripped: string = raw.replaceAll(/\/\/.*$/gm, '').replaceAll(/\/\*[\s\S]*?\*\//g, '');
    const tsconfig: Record<string, unknown> = JSON.parse(stripped) as Record<string, unknown>;
    const compilerOptions: Record<string, unknown> | undefined = tsconfig.compilerOptions as
      | Record<string, unknown>
      | undefined;

    if (!compilerOptions?.paths) {
      return paths;
    }

    const tsPaths: Record<string, string[]> = compilerOptions.paths as Record<string, string[]>;
    for (const [alias] of Object.entries(tsPaths)) {
      // Strip trailing /* from alias for comparison
      const cleanAlias: string = alias.replace(/\/\*$/, '');
      paths.set(cleanAlias, alias);
    }
  } catch {
    /* Ignore parse errors */
  }

  return paths;
}

/** The kit-alias-consistency lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/kit-alias-consistency',
  description: 'Alias in svelte.config.js not found in tsconfig.json paths',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);
      if (!configObj) {
        return [];
      }

      const aliasObj: AstNode | undefined = getNestedValue(configObj, 'kit.alias');
      if (!aliasObj || aliasObj.type !== 'ObjectExpression') {
        return [];
      }

      const dir: string = dirname(context.file);
      const tsconfigPaths: Map<string, string> = readTsconfigPaths(dir);

      if (tsconfigPaths.size === 0) {
        return [];
      }

      const results: LintResult[] = [];
      const entries: Array<[string, AstNode]> = getPropertyEntries(aliasObj);

      for (const [aliasName, valueNode] of entries) {
        // Skip $lib — SvelteKit adds it automatically
        if (aliasName === '$lib') {
          continue;
        }

        if (!tsconfigPaths.has(aliasName)) {
          results.push({
            file: context.file,
            line: valueNode.loc.start.line,
            column: valueNode.loc.start.column + 1,
            severity: 'warning',
            message: `Alias '${aliasName}' in svelte.config not found in tsconfig.json paths`,
            ruleId: rule.id,
            tip: `Add to tsconfig.json paths: "${aliasName}/*": ["./<path>/*"]`,
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
