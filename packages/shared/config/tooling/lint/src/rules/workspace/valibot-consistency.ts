/**
 * Rule: workspace/valibot-consistency
 *
 * Enforce correct and efficient use of Valibot schemas.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Enforce correct and efficient use of Valibot schemas. */
const rule: WorkspaceRule = {
  id: 'workspace/valibot-consistency',
  description: 'Enforce correct and efficient use of Valibot schemas.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
  async check(context: unknown): Promise<
    Array<{
      ruleId: string;
      file: string;
      line: number;
      column: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      fix: { range: { start: number; end: number }; text: string };
      tip?: string;
      example?: string;
      source?: string;
      url?: string;
      endLine?: number;
      endColumn?: number;
    }>
  > {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: Array<ReturnType<typeof createResult>> = [];

    const allFiles: readonly string[] = await ctx.allFiles();
    const tsFiles: string[] = allFiles.filter(
      (f: string): boolean =>
        f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'),
    );

    for (const file of tsFiles) {
      let content: string;
      try {
        content = await ctx.readFile(file);
      } catch {
        continue;
      }

      // 1. Unused schemas (defined but never used in parse/safeParse)
      const schemaMatches: RegExpMatchArray | null = content.match(
        /const\s+(\w+Schema)\s*=\s*v\.object/g,
      );
      if (schemaMatches !== null) {
        for (const match of schemaMatches) {
          const varName: string | undefined = /const\s+(\w+Schema)/.exec(match)?.[1];
          if (varName !== undefined) {
            const usagePattern: RegExp = new RegExp(`${varName}\\.(parse|safeParse)`);
            if (!usagePattern.test(content)) {
              results.push(
                createResult(
                  'workspace/valibot-consistency',
                  file,
                  1,
                  1,
                  'warning',
                  `Valibot schema '${varName}' defined but never validated`,
                  { tip: 'Remove unused schema or pass it to parse/safeParse' },
                ),
              );
            }
          }
        }
      }

      // 2. Raw JSON.parse usage (should use Valibot instead)
      if (/JSON\.parse\([^)]+\)/.test(content)) {
        results.push(
          createResult(
            'workspace/valibot-consistency',
            file,
            1,
            1,
            'warning',
            'Raw JSON.parse usage detected',
            { tip: 'Prefer unknown input + Valibot for parsing' },
          ),
        );
      }

      // 3. Unused safeParse results
      const safeParseMatches: RegExpMatchArray | null = content.match(
        /const\s+(\w+)\s*=\s*\w+Schema\.safeParse/g,
      );
      if (safeParseMatches !== null) {
        for (const match of safeParseMatches) {
          const varName: string | undefined = /const\s+(\w+)/.exec(match)?.[1];
          if (varName !== undefined) {
            const usagePattern: RegExp = new RegExp(`${varName}\\.(success|data|error)`);
            if (!usagePattern.test(content)) {
              results.push(
                createResult(
                  'workspace/valibot-consistency',
                  file,
                  1,
                  1,
                  'warning',
                  `safeParse() result '${varName}' assigned but not used`,
                  { tip: 'Check result.success before accessing result.data' },
                ),
              );
            }
          }
        }
      }

      // 4. Inline anonymous v.object schemas (not assigned to const/export)
      const lines: string[] = content.split('\n');
      for (const [i, line] of lines.entries()) {
        if (
          /v\.object\(\{/.test(line) &&
          !/^\s*(export\s+)?(const|let|var)\s+\w+\s*=\s*v\.object/.test(line)
        ) {
          results.push(
            createResult(
              'workspace/valibot-consistency',
              file,
              i + 1,
              1,
              'warning',
              'Inline anonymous Valibot object schema found',
              { tip: 'Hoist schemas to top-level constants for reuse and clarity' },
            ),
          );
        }
      }

      // 5. Schemas declared inside functions
      if (/function\s+\w+[^}]*v\.object/.test(content)) {
        results.push(
          createResult(
            'workspace/valibot-consistency',
            file,
            1,
            1,
            'warning',
            'Schema declared inside function scope',
            { tip: 'Move schemas to top-level unless they are runtime-parametric' },
          ),
        );
      }

      // 6. Missing type inference from schema (Infer<> used inline without type alias)
      const inferMatches: RegExpMatchArray | null = content.match(/Infer<typeof\s+\w+Schema>/g);
      if (inferMatches !== null) {
        for (const match of inferMatches) {
          // Check if this Infer<> is part of a type alias declaration
          const escapedMatch: string = match.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
          const typeAliasPattern: RegExp = new RegExp(`type\\s+\\w+\\s*=\\s*${escapedMatch}`);
          if (!typeAliasPattern.test(content)) {
            results.push(
              createResult(
                'workspace/valibot-consistency',
                file,
                1,
                1,
                'warning',
                'Schema inferred but no type alias declared',
                { tip: 'Name inferred types to avoid repeating Infer<> inline' },
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
