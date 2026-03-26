/**
 * Tool Registry — central list of all external linting tools.
 *
 * Consolidates tool imports into a single export so consumers don't
 * need to import each tool individually.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { shellcheckTool } from '@/lint/tools/shellcheck.ts';
import { hadolintTool } from '@/lint/tools/hadolint.ts';
import { yamllintTool } from '@/lint/tools/yamllint.ts';
import { markdownlintTool } from '@/lint/tools/markdownlint.ts';
import { stylelintTool } from '@/lint/tools/stylelint.ts';
import { taploTool } from '@/lint/tools/taplo.ts';
import { actionlintTool } from '@/lint/tools/actionlint.ts';
import { sqlfluffTool } from '@/lint/tools/sqlfluff.ts';
import { ruffTool } from '@/lint/tools/ruff.ts';

/** All registered external linting tools. */
export const ALL_TOOLS: readonly ExternalTool[] = [
  shellcheckTool,
  hadolintTool,
  yamllintTool,
  markdownlintTool,
  stylelintTool,
  taploTool,
  actionlintTool,
  sqlfluffTool,
  ruffTool,
];
