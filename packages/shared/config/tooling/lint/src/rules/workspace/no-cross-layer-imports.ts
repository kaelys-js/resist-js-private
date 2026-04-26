/**
 * Rule: workspace/no-cross-layer-imports
 *
 * Product source code must not import across layers
 * via relative paths.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Known product layers within the monorepo. */
const LAYERS: readonly string[] = [
  'api',
  'web',
  'data',
  'infra',
  'branding',
  'marketing',
  'mobile',
];

/** Pipe-separated layers for the regex pattern. */
const LAYERS_PATTERN: string = LAYERS.join('|');

/** Regex to detect relative imports pointing to a layer directory. */
const CROSS_LAYER_RE: RegExp = new RegExp(String.raw`from\s+['"](\.\.\/)+(` + LAYERS_PATTERN + String.raw`)\/`);

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Extract the product layer from a file path.
 *
 * Looks for the pattern `packages/products/{product}/{layer}/` and
 * returns the layer segment if it matches a known layer.
 *
 * @param {string} filePath - Absolute file path
 * @returns {string | undefined} The layer name or undefined if not determinable
 */
function extractLayer(filePath: string): string | undefined {
  const segments: string[] = filePath.split('/');
  const productsIdx: number = segments.indexOf('products');

  if (productsIdx === -1) {
    return undefined;
  }

  /* Expected pattern: .../packages/products/{product}/{layer}/... */
  const layerSegment: string | undefined = segments[productsIdx + 2];

  if (layerSegment !== undefined && LAYERS.includes(layerSegment)) {
    return layerSegment;
  }

  return undefined;
}

/** Flags relative imports that cross product layer boundaries. */
const rule: WorkspaceRule = {
  id: 'workspace/no-cross-layer-imports',
  description: 'Product source code must not import across layers via relative paths.',
  scope: 'workspace',
  categories: ['workspace', 'boundaries'],
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
      if (!filePath.includes('/packages/products/')) {
        continue;
      }

      if (!SOURCE_EXTENSIONS.some((ext: string): boolean => filePath.endsWith(ext))) {
        continue;
      }

      const currentLayer: string | undefined = extractLayer(filePath);
      if (currentLayer === undefined) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      /** Build a regex that captures the target layer from relative imports. */
      const captureRe: RegExp = new RegExp(
        String.raw`from\s+['"](?:\.\.\/)+(` + LAYERS_PATTERN + String.raw`)\/`,
        'gm',
      );

      let match: RegExpExecArray | null = captureRe.exec(content);
      while (match !== null) {
        const targetLayer: string = match[1] ?? '';

        if (targetLayer !== currentLayer) {
          const relativePath: string = relative(ctx.rootDir, filePath);
          results.push(
            createResult(
              'workspace/no-cross-layer-imports',
              filePath,
              1,
              1,
              'error',
              `Disallowed cross-layer import: ${currentLayer} → ${targetLayer} in ${relativePath}`,
              {
                tip: 'Move shared logic to packages/shared/ and import via alias',
              },
            ),
          );
        }

        match = captureRe.exec(content);
      }
    }

    return results;
  },
};

export default rule;
