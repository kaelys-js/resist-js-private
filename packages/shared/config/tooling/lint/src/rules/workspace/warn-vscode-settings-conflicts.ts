/**
 * Rule: workspace/warn-vscode-settings-conflicts
 *
 * Detect conflicts between VSCode settings and project configuration files.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Detects conflicts between VSCode settings and project config. */
const rule: WorkspaceRule = {
  id: 'workspace/warn-vscode-settings-conflicts',
  description: 'VSCode settings must not conflict with project configuration.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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

    /* Single pass: collect paths we care about. */
    let vscodeSettingsPath: string | undefined;
    let editorconfigPath: string | undefined;
    let biomePath: string | undefined;

    for await (const filePath of ctx.allFiles()) {
      const rel: string = relative(ctx.rootDir, filePath);
      if (rel === '.vscode/settings.json') {
        vscodeSettingsPath = filePath;
      } else if (rel === '.editorconfig') {
        editorconfigPath = filePath;
      } else if (rel === 'biome.json') {
        biomePath = filePath;
      }
    }

    /* No VSCode settings → no conflicts possible. */
    if (vscodeSettingsPath === undefined) {
      return results;
    }

    /* Parse VSCode settings. */
    const settingsContent: string = await ctx.readFile(vscodeSettingsPath);
    let settings: Record<string, unknown>;
    try {
      settings = JSON.parse(settingsContent) as Record<string, unknown>;
    } catch {
      return results;
    }

    const vscodeTabSize: unknown = settings['editor.tabSize'];
    const vscodeInsertSpaces: unknown = settings['editor.insertSpaces'];

    /* Check against .editorconfig. */
    if (editorconfigPath !== undefined) {
      const editorContent: string = await ctx.readFile(editorconfigPath);
      const lines: string[] = editorContent.split('\n');

      let editorIndentSize: number | undefined;
      let editorIndentStyle: string | undefined;

      for (const line of lines) {
        const trimmed: string = line.trim();
        const sizeMatch: RegExpMatchArray | null = /^indent_size\s*=\s*(\d+)/.exec(trimmed);
        if (sizeMatch !== null) {
          editorIndentSize = Number(sizeMatch[1]);
        }
        const styleMatch: RegExpMatchArray | null = /^indent_style\s*=\s*(space|tab)/.exec(trimmed);
        if (styleMatch !== null) {
          editorIndentStyle = styleMatch[1];
        }
      }

      if (
        editorIndentSize !== undefined &&
        typeof vscodeTabSize === 'number' &&
        vscodeTabSize !== editorIndentSize
      ) {
        results.push(
          createResult(
            'workspace/warn-vscode-settings-conflicts',
            vscodeSettingsPath,
            1,
            1,
            'warning',
            `VSCode editor.tabSize (${String(vscodeTabSize)}) conflicts with .editorconfig indent_size (${String(editorIndentSize)})`,
            {
              tip: 'Align editor.tabSize with indent_size in .editorconfig',
            },
          ),
        );
      }

      if (editorIndentStyle !== undefined && typeof vscodeInsertSpaces === 'boolean') {
        const vscodeUsesSpaces: boolean = vscodeInsertSpaces;
        const editorUsesSpaces: boolean = editorIndentStyle === 'space';
        if (vscodeUsesSpaces !== editorUsesSpaces) {
          results.push(
            createResult(
              'workspace/warn-vscode-settings-conflicts',
              vscodeSettingsPath,
              1,
              1,
              'warning',
              `VSCode editor.insertSpaces (${String(vscodeInsertSpaces)}) conflicts with .editorconfig indent_style (${editorIndentStyle})`,
              {
                tip: 'Align editor.insertSpaces with indent_style in .editorconfig',
              },
            ),
          );
        }
      }
    }

    /* Check against biome.json. */
    if (biomePath !== undefined) {
      const biomeContent: string = await ctx.readFile(biomePath);
      let biomeConfig: Record<string, unknown>;
      try {
        biomeConfig = JSON.parse(biomeContent) as Record<string, unknown>;
      } catch {
        return results;
      }

      const formatter: unknown = biomeConfig['formatter'];
      if (formatter !== undefined && formatter !== null && typeof formatter === 'object') {
        const formatterObj: Record<string, unknown> = formatter as Record<string, unknown>;
        const biomeIndentWidth: unknown = formatterObj['indentWidth'];

        if (
          typeof biomeIndentWidth === 'number' &&
          typeof vscodeTabSize === 'number' &&
          vscodeTabSize !== biomeIndentWidth
        ) {
          results.push(
            createResult(
              'workspace/warn-vscode-settings-conflicts',
              vscodeSettingsPath,
              1,
              1,
              'warning',
              `VSCode editor.tabSize (${String(vscodeTabSize)}) conflicts with biome.json formatter.indentWidth (${String(biomeIndentWidth)})`,
              {
                tip: 'Align editor.tabSize with formatter.indentWidth in biome.json',
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
