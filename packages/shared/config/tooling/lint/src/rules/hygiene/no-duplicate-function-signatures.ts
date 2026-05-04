/**
 * Rule: hygiene/no-duplicate-function-signatures
 *
 * Exported functions must have unique names across the workspace —
 * duplicates indicate missing shared abstractions.
 *
 * @module
 */

import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';

/** Rule ID constant. */
const RULE_ID: string = 'hygiene/no-duplicate-function-signatures';

/** Extended context that may include ruleOptions. */
type DuplicateFnContext = WorkspaceContext & {
  ruleOptions?: { allowedNames?: string[] };
};

/** Regex to match exported function declarations. */
const EXPORT_FN_RE: RegExp = /export\s+function\s+(\w+)/g;

/** The no-duplicate-function-signatures lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Exported functions must have unique names across the workspace — duplicates indicate missing shared abstractions.',
  scope: 'workspace',
  categories: ['hygiene'],
  stages: ['ci'],
  fixable: true,
  optionsSchema: {
    allowedNames: {
      type: 'array',
      items: 'string',
      description: 'Function names allowed to appear in multiple files.',
    },
  },

  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;

    return ctx.filesByExtension('.ts');
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx: DuplicateFnContext = context as DuplicateFnContext;
    const allowedNames: ReadonlySet<string> = new Set(ctx.ruleOptions?.allowedNames ?? []);

    /* 1. Get all .ts files */
    const tsFiles: readonly string[] = await ctx.filesByExtension('.ts');

    /* 2. Filter out test files and declaration files */
    const sourceFiles: readonly string[] = tsFiles.filter(
      (f: string): boolean => !f.endsWith('.test.ts') && !f.endsWith('.d.ts'),
    );

    /* 3. For each file, find exported function names */
    type FnLocation = { file: string; line: number };
    const fnMap: Map<string, FnLocation[]> = new Map();

    await Promise.all(
      sourceFiles.map(async (file: string): Promise<void> => {
        const content: string = await ctx.readFile(file);
        const lines: string[] = content.split('\n');

        for (let i: number = 0; i < lines.length; i++) {
          const lineText: string = lines[i] ?? '';
          /* Reset lastIndex for global regex */
          const re: RegExp = new RegExp(EXPORT_FN_RE.source, 'g');
          let match: RegExpExecArray | null = re.exec(lineText);

          while (match !== null) {
            const fnName: string = match[1] ?? '';

            if (fnName.length > 0) {
              const locations: FnLocation[] = fnMap.get(fnName) ?? [];
              locations.push({ file, line: i + 1 });
              fnMap.set(fnName, locations);
            }
            match = re.exec(lineText);
          }
        }
      }),
    );

    /* 4. Report duplicates */
    const results: LintResult[] = [];

    for (const [fnName, locations] of fnMap) {
      if (locations.length < 2) {
        continue;
      }

      /* Skip allowed names */
      if (allowedNames.has(fnName)) {
        continue;
      }

      for (const loc of locations) {
        results.push(
          createResult(
            RULE_ID,
            loc.file,
            loc.line,
            1,
            'warning',
            `Exported function '${fnName}' is defined in ${String(locations.length)} files — consider extracting to a shared module.`,
            {
              tip: `Search the workspace for other definitions of '${fnName}' and consolidate into a single shared module.`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
