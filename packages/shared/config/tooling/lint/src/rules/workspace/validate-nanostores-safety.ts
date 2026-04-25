/**
 * Rule: workspace/validate-nanostores-safety
 *
 * Validates nanostores usage patterns: detects .set() on atom() stores,
 * process.env access in store files, side effects, and persistentAtom key format.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern for atom() + .set() misuse. */
const ATOM_RE: RegExp = /atom\([^)]+\)/;
/** Description. */
const SET_RE: RegExp = /\.set\(/;

/** Pattern for process.env access. */
const PROCESS_ENV_RE: RegExp = /process\.env\.[A-Z_][A-Z0-9_]*/;

/** Side effect patterns. */
const SIDE_EFFECT_RE: RegExp = /localStorage|sessionStorage|window\.|fetch\(|navigator\./;

/** Valid persistentAtom key format: lowercase dotted (e.g., app.env.user). */
const PERSISTENT_KEY_RE: RegExp = /^[a-z0-9]+(\.[a-z0-9_-]+)+$/;

/** Pattern to extract persistentAtom key. */
const PERSISTENT_ATOM_KEY_RE: RegExp = /persistentAtom\(\s*['"]([^'"]+)['"]/g;

/** Store file extensions. */
const STORE_EXTENSIONS: ReadonlySet<string> = new Set<string>(['.ts', '.tsx']);

/** Validates nanostores usage patterns. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-nanostores-safety',
  description: 'Nanostores must follow safe usage patterns.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    for (const filePath of await ctx.allFiles()) {
      /* Only check store-related files. */
      const name: string = basename(filePath);
      const hasStoreExt: boolean = [...STORE_EXTENSIONS].some((ext: string): boolean =>
        filePath.endsWith(ext),
      );

      if (!hasStoreExt) {
        continue;
      }

      /* Only check files that reference nanostores. */
      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      /* Skip if not a store file (no nanostores imports). */
      if (
        !content.includes('atom(') &&
        !content.includes('writable(') &&
        !content.includes('computed(') &&
        !content.includes('persistentAtom(')
      ) {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);

      /* Check for atom() + .set() misuse. */
      if (ATOM_RE.test(content) && SET_RE.test(content)) {
        results.push(
          createResult(
            'workspace/validate-nanostores-safety',
            filePath,
            1,
            1,
            'error',
            `Writable mutation detected on read-only atom in ${relativePath}`,
            {
              tip: 'Use writable() instead of atom() for mutable stores',
              example: 'const count = writable(0)',
            },
          ),
        );
      }

      /* Check for process.env access. */
      if (PROCESS_ENV_RE.test(content)) {
        results.push(
          createResult(
            'workspace/validate-nanostores-safety',
            filePath,
            1,
            1,
            'error',
            `Direct environment access detected in store module: ${relativePath}`,
            {
              tip: 'Inject config via arguments or import safe typed config',
            },
          ),
        );
      }

      /* Check for side effects (warning). */
      if (SIDE_EFFECT_RE.test(content)) {
        results.push(
          createResult(
            'workspace/validate-nanostores-safety',
            filePath,
            1,
            1,
            'warning',
            `Potential side effect detected in store file: ${relativePath}`,
            {
              tip: 'Avoid side effects in top-level store modules',
            },
          ),
        );
      }

      /* Validate persistentAtom key format. */
      let keyMatch: RegExpExecArray | null = PERSISTENT_ATOM_KEY_RE.exec(content);
      while (keyMatch !== null) {
        const key: string = keyMatch[1] ?? '';
        if (!PERSISTENT_KEY_RE.test(key)) {
          results.push(
            createResult(
              'workspace/validate-nanostores-safety',
              filePath,
              1,
              1,
              'error',
              `Invalid persistentAtom key '${key}' in ${relativePath}`,
              {
                tip: 'Use structured, lowercase dotted keys (e.g., app.env.user)',
              },
            ),
          );
        }
        keyMatch = PERSISTENT_ATOM_KEY_RE.exec(content);
      }

      /* Reset regex lastIndex for next file. */
      PERSISTENT_ATOM_KEY_RE.lastIndex = 0;
    }

    return results;
  },
};

export default rule;
