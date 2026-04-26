/**
 * Rule: workspace/validate-vscode-extensions
 *
 * Validate .vscode/extensions.json matches the approved extensions list.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Approved VSCode extensions for this workspace. */
const APPROVED_EXTENSIONS: ReadonlySet<string> = new Set<string>([
  'aaron-bond.better-comments',
  'astro-build.astro-vscode',
  'anysphere.cpptools',
  'biomejs.biome',
  'bradlc.vscode-tailwindcss',
  'donjayamanne.githistory',
  'ecmel.vscode-html-css',
  'GitLab.gitlab-workflow',
  'Gruntfuggly.todo-tree',
  'mhutchie.git-graph',
  'mikestead.dotenv',
  'ms-azuretools.vscode-docker',
  'ms-kubernetes-tools.vscode-kubernetes-tools',
  'ms-python.python',
  'ms-vscode.makefile-tools',
  'oxc.oxc-vscode',
  'pflannery.vscode-versionlens',
  'redhat.vscode-yaml',
  'semanticdiff.semanticdiff',
  'shd101wyy.markdown-preview-enhanced',
  'streetsidesoftware.code-spell-checker',
  'svelte.svelte-vscode',
  'tamasfe.even-better-toml',
  'usernamehw.errorlens',
  'vitest.explorer',
  'WallabyJs.console-ninja',
  'yzhang.markdown-all-in-one',
  'YoavBls.pretty-ts-errors',
]);

/** Validates .vscode/extensions.json against the approved list. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-vscode-extensions',
  description: '.vscode/extensions.json must match the approved extensions list.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    return ctx.allFiles();
  },

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

    /* Find .vscode/extensions.json */
    let extensionsPath: string | undefined;

    for (const filePath of await ctx.allFiles()) {
      const rel: string = relative(ctx.rootDir, filePath);
      if (rel === '.vscode/extensions.json') {
        extensionsPath = filePath;
        break;
      }
    }

    if (extensionsPath === undefined) {
      results.push(
        createResult(
          'workspace/validate-vscode-extensions',
          ctx.rootDir,
          1,
          1,
          'error',
          'Missing .vscode/extensions.json',
          {
            tip: 'Create .vscode/extensions.json with the approved extensions list',
          },
        ),
      );
      return results;
    }

    /* Parse JSON. */
    const content: string = await ctx.readFile(extensionsPath);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      results.push(
        createResult(
          'workspace/validate-vscode-extensions',
          extensionsPath,
          1,
          1,
          'error',
          'Invalid JSON in .vscode/extensions.json',
          {
            tip: 'Fix the JSON syntax in .vscode/extensions.json',
          },
        ),
      );
      return results;
    }

    /* Extract recommendations. */
    const {recommendations} = parsed;
    const recList: string[] = Array.isArray(recommendations) ? (recommendations as string[]) : [];
    const recSet: Set<string> = new Set<string>(recList);

    /* Find missing extensions (approved but not recommended). */
    for (const approved of APPROVED_EXTENSIONS) {
      if (!recSet.has(approved)) {
        results.push(
          createResult(
            'workspace/validate-vscode-extensions',
            extensionsPath,
            1,
            1,
            'error',
            `Missing approved extension: ${approved}`,
            {
              tip: `Add "${approved}" to recommendations in .vscode/extensions.json`,
            },
          ),
        );
      }
    }

    /* Find extra extensions (recommended but not approved). */
    for (const rec of recList) {
      if (!APPROVED_EXTENSIONS.has(rec)) {
        results.push(
          createResult(
            'workspace/validate-vscode-extensions',
            extensionsPath,
            1,
            1,
            'error',
            `Unapproved extension: ${rec}`,
            {
              tip: `Remove "${rec}" from recommendations or add it to the approved list`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
