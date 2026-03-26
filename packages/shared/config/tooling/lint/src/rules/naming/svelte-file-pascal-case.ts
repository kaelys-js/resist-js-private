/**
 * Rule: naming/svelte-file-pascal-case
 *
 * Svelte component files must have PascalCase filenames.
 * SvelteKit convention files (+page.svelte, +layout.svelte, etc.) are exempt.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Pattern for valid PascalCase filenames (without extension). */
const PASCAL_CASE_RE: RegExp = /^[A-Z][a-zA-Z0-9]*$/;
/** The svelte-file-pascal-case lint rule. */
const rule: TypeScriptRule = {
  id: 'naming/svelte-file-pascal-case',
  description: 'Svelte files must have PascalCase filenames',
  patterns: ['**/*.svelte'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Extract filename from path
      const parts: string[] = context.file.split('/');
      const filename: string = parts.at(-1) ?? '';

      // Remove .svelte extension
      const baseName: string = filename.replace(/\.svelte$/, '');

      // Exempt SvelteKit convention files
      if (baseName.startsWith('+')) {
        return results;
      }

      if (!PASCAL_CASE_RE.test(baseName)) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `Svelte file '${filename}' should use PascalCase (e.g., ${baseName
            .split('-')
            .map((s: string): string => s.charAt(0).toUpperCase() + s.slice(1))
            .join('')}.svelte)`,
          ruleId: 'naming/svelte-file-pascal-case',
          tip: 'Rename the file to PascalCase (e.g., SceneEditor.svelte)',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
