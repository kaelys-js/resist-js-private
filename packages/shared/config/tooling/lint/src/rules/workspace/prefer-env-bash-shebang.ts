/**
 * Rule: workspace/prefer-env-bash-shebang
 *
 * Shell scripts should use #!/usr/bin/env bash for portability.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Shell scripts should use #!/usr/bin/env bash instead of #!/bin/bash. */
const rule: WorkspaceRule = {
  id: 'workspace/prefer-env-bash-shebang',
  description: 'Shell scripts should use #!/usr/bin/env bash for portability.',
  scope: 'workspace',
  categories: ['workspace', 'shell'],
  stages: ['lint', 'check'],
  fixable: false,
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

    for await (const filePath of ctx.allFiles()) {
      if (!filePath.endsWith('.sh')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const firstLine: string = content.split('\n')[0] ?? '';
      if (firstLine === '#!/bin/bash') {
        results.push(
          createResult(
            'workspace/prefer-env-bash-shebang',
            filePath,
            1,
            1,
            'warning',
            `Script uses #!/bin/bash — prefer #!/usr/bin/env bash for portability: ${relative(ctx.rootDir, filePath)}`,
            {
              tip: 'Replace #!/bin/bash with #!/usr/bin/env bash',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
