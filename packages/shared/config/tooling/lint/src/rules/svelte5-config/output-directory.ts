/**
 * Rule: svelte5-config/output-directory
 *
 * Output directory must not conflict with source directories or project root.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { getDefaultExportObject, getNestedValue, getStringValue } from './_config-ast.ts';

/** Directories that should never be used as output targets. */
const DANGEROUS_DIRS: ReadonlySet<string> = new Set(['src', './src', 'lib', './lib', '.', './']);

/** The output-directory lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/output-directory',
  description: 'Output directory conflicts with source directory',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);
      if (!configObj) {
        return [];
      }

      const results: LintResult[] = [];

      // Check kit.outDir
      const outDirValue: AstNode | undefined = getNestedValue(configObj, 'kit.outDir');
      if (outDirValue) {
        const outDir: string | undefined = getStringValue(outDirValue);
        if (outDir && DANGEROUS_DIRS.has(outDir)) {
          results.push({
            file: context.file,
            line: outDirValue.loc.start.line,
            column: outDirValue.loc.start.column + 1,
            severity: 'error',
            message: `Output directory '${outDir}' conflicts with source directory`,
            ruleId: rule.id,
            tip: "Use 'build' or '.svelte-kit' for output directories",
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      // Check adapter pages/assets options
      const adapterValue: AstNode | undefined = getNestedValue(configObj, 'kit.adapter');
      if (adapterValue?.type === 'CallExpression') {
        const args: AstNode[] | undefined = adapterValue.arguments as AstNode[] | undefined;
        if (args && args.length > 0 && args[0]?.type === 'ObjectExpression') {
          const [adapterOpts] = args;

          for (const prop of ['pages', 'assets'] as const) {
            const propValue: AstNode | undefined = getNestedValue(adapterOpts, prop);
            if (propValue) {
              const dir: string | undefined = getStringValue(propValue);
              if (dir && DANGEROUS_DIRS.has(dir)) {
                results.push({
                  file: context.file,
                  line: propValue.loc.start.line,
                  column: propValue.loc.start.column + 1,
                  severity: 'error',
                  message: `Adapter ${prop} directory '${dir}' conflicts with source directory`,
                  ruleId: rule.id,
                  tip: "Use 'build' for adapter output directories",
                  fix: { range: { start: 0, end: 0 }, text: '' },
                });
              }
            }
          }
        }
      }

      return results;
    },
  },
};

export default rule;
