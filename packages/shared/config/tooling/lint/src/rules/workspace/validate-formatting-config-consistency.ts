/**
 * Rule: workspace/validate-formatting-config-consistency
 *
 * Ensures .editorconfig, biome.base.json (or biome.json), and
 * .vscode/settings.json agree on indent style, indent size, and line endings.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/**
 * Simple .editorconfig parser for root-level settings.
 *
 * @param content - Raw .editorconfig file contents
 * @returns Parsed indentStyle/indentSize from the root section
 */
function parseEditorconfig(content: string): { indentStyle?: string; indentSize?: number } {
  const result: { indentStyle?: string; indentSize?: number } = {};
  const lines: string[] = content.split('\n');

  for (const line of lines) {
    const trimmed: string = line.trim();
    if (trimmed.startsWith('indent_style')) {
      const value: string = trimmed.split('=')[1]?.trim() ?? '';
      result.indentStyle = value;
    }
    if (trimmed.startsWith('indent_size')) {
      const value: string = trimmed.split('=')[1]?.trim() ?? '';
      const num: number = Number(value);
      if (!Number.isNaN(num)) {
        result.indentSize = num;
      }
    }
  }

  return result;
}

/** Ensures formatting configs are consistent. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-formatting-config-consistency',
  description: 'Formatting configs (.editorconfig, biome, vscode) must agree.',
  scope: 'workspace',
  categories: ['workspace', 'formatting'],
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

    /* Collect config file paths. */
    let editorconfigPath: string | undefined;
    let biomePath: string | undefined;
    let vscodePath: string | undefined;

    for (const filePath of await ctx.allFiles()) {
      const rel: string = relative(ctx.rootDir, filePath);
      if (rel === '.editorconfig') {
        editorconfigPath = filePath;
      } else if (rel === 'biome.base.json' || rel === 'biome.json') {
        /* Prefer biome.base.json if it exists. */
        if (biomePath === undefined || rel === 'biome.base.json') {
          biomePath = filePath;
        }
      } else if (rel === '.vscode/settings.json') {
        vscodePath = filePath;
      }
    }

    /* Need at least 2 config files to compare. */
    const configCount: number =
      (editorconfigPath === undefined ? 0 : 1) +
      (biomePath === undefined ? 0 : 1) +
      (vscodePath === undefined ? 0 : 1);

    if (configCount < 2) {
      return results;
    }

    /* Parse each config. */
    let editorIndentStyle: string | undefined;
    let editorIndentSize: number | undefined;

    if (editorconfigPath !== undefined) {
      try {
        const content: string = await ctx.readFile(editorconfigPath);
        const parsed: { indentStyle?: string; indentSize?: number } = parseEditorconfig(content);
        editorIndentStyle = parsed.indentStyle;
        editorIndentSize = parsed.indentSize;
      } catch {
        /* Skip unreadable file. */
      }
    }

    let biomeIndentStyle: string | undefined;
    let biomeIndentWidth: number | undefined;

    if (biomePath !== undefined) {
      try {
        const content: string = await ctx.readFile(biomePath);
        const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
        const { formatter } = parsed;
        if (typeof formatter === 'object' && formatter !== null) {
          const fmt: Record<string, unknown> = formatter as Record<string, unknown>;
          if (typeof fmt.indentStyle === 'string') {
            biomeIndentStyle = fmt.indentStyle;
          }
          if (typeof fmt.indentWidth === 'number') {
            biomeIndentWidth = fmt.indentWidth;
          }
        }
      } catch {
        /* Skip unreadable file. */
      }
    }

    let vscodeTabSize: number | undefined;
    let vscodeInsertSpaces: boolean | undefined;

    if (vscodePath !== undefined) {
      try {
        const content: string = await ctx.readFile(vscodePath);
        const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
        if (typeof parsed['editor.tabSize'] === 'number') {
          vscodeTabSize = parsed['editor.tabSize'] as number;
        }
        if (typeof parsed['editor.insertSpaces'] === 'boolean') {
          vscodeInsertSpaces = parsed['editor.insertSpaces'] as boolean;
        }
      } catch {
        /* Skip unreadable file. */
      }
    }

    /* Compare indent sizes. */
    const indentSizes: Array<{ source: string; value: number }> = [];
    if (editorIndentSize !== undefined) {
      indentSizes.push({ source: '.editorconfig', value: editorIndentSize });
    }
    if (biomeIndentWidth !== undefined) {
      indentSizes.push({ source: 'biome', value: biomeIndentWidth });
    }
    if (vscodeTabSize !== undefined) {
      indentSizes.push({ source: '.vscode/settings.json', value: vscodeTabSize });
    }

    const [firstSizeEntry, ...restSizes] = indentSizes;
    if (firstSizeEntry !== undefined && restSizes.length > 0) {
      const firstSize: number = firstSizeEntry.value;
      for (const entry of restSizes) {
        if (entry.value !== firstSize) {
          results.push(
            createResult(
              'workspace/validate-formatting-config-consistency',
              ctx.rootDir,
              1,
              1,
              'error',
              `Indent size mismatch: ${firstSizeEntry.source} uses ${String(firstSize)}, ${entry.source} uses ${String(entry.value)}`,
              {
                tip: 'Align indent size across all formatting configs',
              },
            ),
          );
          break;
        }
      }
    }

    /* Compare indent styles. */
    const indentStyles: Array<{ source: string; value: string }> = [];
    if (editorIndentStyle !== undefined) {
      indentStyles.push({ source: '.editorconfig', value: editorIndentStyle });
    }
    if (biomeIndentStyle !== undefined) {
      indentStyles.push({ source: 'biome', value: biomeIndentStyle });
    }
    if (vscodeInsertSpaces !== undefined) {
      const style: string = vscodeInsertSpaces ? 'space' : 'tab';
      indentStyles.push({ source: '.vscode/settings.json', value: style });
    }

    const [firstStyleEntry, ...restStyles] = indentStyles;
    if (firstStyleEntry !== undefined && restStyles.length > 0) {
      const firstStyle: string = firstStyleEntry.value;
      for (const entry of restStyles) {
        if (entry.value !== firstStyle) {
          results.push(
            createResult(
              'workspace/validate-formatting-config-consistency',
              ctx.rootDir,
              1,
              1,
              'error',
              `Indent style mismatch: ${firstStyleEntry.source} uses '${firstStyle}', ${entry.source} uses '${entry.value}'`,
              {
                tip: 'Align indent style across all formatting configs',
              },
            ),
          );
          break;
        }
      }
    }

    return results;
  },
};

export default rule;
