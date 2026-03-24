/**
 * Rule: naming/ts-file-kebab-case
 *
 * TypeScript files must have kebab-case filenames.
 * SvelteKit convention files (+page.ts, +server.ts, etc.), .svelte.ts files,
 * and .test.ts files are exempt.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Pattern for valid kebab-case filenames (without extension). */
const KEBAB_CASE_RE: RegExp = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const rule: TypeScriptRule = {
  id: 'naming/ts-file-kebab-case',
  description: 'TypeScript files must have kebab-case filenames',
  patterns: ['**/*.ts'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Extract filename from path
      const parts: string[] = context.file.split('/');
      const filename: string = parts.at(-1) ?? '';

      // Exempt .svelte.ts files
      if (filename.endsWith('.svelte.ts')) {
        return results;
      }

      // Exempt .test.ts files
      if (filename.endsWith('.test.ts')) {
        return results;
      }

      // Exempt .config.ts, .d.ts files
      if (filename.endsWith('.config.ts') || filename.endsWith('.d.ts')) {
        return results;
      }

      // Remove .ts extension
      const baseName: string = filename.replace(/\.ts$/, '');

      // Exempt SvelteKit convention files
      if (baseName.startsWith('+')) {
        return results;
      }

      if (!KEBAB_CASE_RE.test(baseName)) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `TypeScript file '${filename}' should use kebab-case (e.g., ${baseName.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}.ts)`,
          ruleId: 'naming/ts-file-kebab-case',
          tip: 'Rename the file to kebab-case (e.g., scene-loader.ts)',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
