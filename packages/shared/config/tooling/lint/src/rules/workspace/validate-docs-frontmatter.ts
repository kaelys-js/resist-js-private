/**
 * Rule: workspace/validate-docs-frontmatter
 *
 * Documentation markdown files must have valid frontmatter.
 * Checks for required fields (title, description, slug, category, updated)
 * and validates their values.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Required frontmatter fields. */
const REQUIRED_FIELDS: readonly string[] = ['title', 'description', 'slug', 'category', 'updated'];

/** Regex for valid kebab-case slugs. */
const SLUG_PATTERN: RegExp = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Regex for valid YYYY-MM-DD date format. */
const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/;

/** Minimum length for description values. */
const MIN_DESCRIPTION_LENGTH: number = 10;

/** Documentation markdown files must have valid frontmatter. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-docs-frontmatter',
  description: 'Documentation markdown files must have valid frontmatter.',
  scope: 'workspace',
  categories: ['workspace', 'docs'],
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

    for (const filePath of await ctx.allFiles()) {
      if (!filePath.endsWith('.md')) {
        continue;
      }

      /* Only process .md files under a docs/ directory segment. */
      const relativePath: string = relative(ctx.rootDir, filePath);
      if (!relativePath.includes('docs/')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      /* Extract frontmatter between first --- and second ---. */
      if (!content.startsWith('---')) {
        continue;
      }

      const secondDelimiter: number = content.indexOf('---', 3);
      if (secondDelimiter === -1) {
        continue;
      }

      const frontmatterBlock: string = content.slice(3, secondDelimiter);
      const frontmatterLines: string[] = frontmatterBlock.split('\n');

      /* Parse key: value pairs from frontmatter. */
      const fields: Map<string, string> = new Map();
      for (const fmLine of frontmatterLines) {
        const colonIndex: number = fmLine.indexOf(':');
        if (colonIndex === -1) {
          continue;
        }
        const key: string = fmLine.slice(0, colonIndex).trim();
        const value: string = fmLine
          .slice(colonIndex + 1)
          .trim()
          .replaceAll(/^['"]|['"]$/g, '');
        if (key.length > 0) {
          fields.set(key, value);
        }
      }

      /* Check for required fields. */
      for (const requiredField of REQUIRED_FIELDS) {
        if (!fields.has(requiredField)) {
          results.push(
            createResult(
              'workspace/validate-docs-frontmatter',
              filePath,
              1,
              1,
              'error',
              `Missing required frontmatter field '${requiredField}' in ${relativePath}`,
              {
                tip: `Add '${requiredField}:' to the frontmatter block`,
              },
            ),
          );
        }
      }

      /* Validate description length. */
      const description: string | undefined = fields.get('description');
      if (description !== undefined && description.length < MIN_DESCRIPTION_LENGTH) {
        results.push(
          createResult(
            'workspace/validate-docs-frontmatter',
            filePath,
            1,
            1,
            'error',
            `Frontmatter 'description' must be at least ${String(MIN_DESCRIPTION_LENGTH)} characters in ${relativePath} (got ${String(description.length)})`,
            {
              tip: 'Provide a more detailed description for the document',
              source: `description: ${description}`,
            },
          ),
        );
      }

      /* Validate slug format. */
      const slug: string | undefined = fields.get('slug');
      if (slug !== undefined && slug.length > 0 && SLUG_PATTERN.test(slug) === false) {
        results.push(
          createResult(
            'workspace/validate-docs-frontmatter',
            filePath,
            1,
            1,
            'error',
            `Frontmatter 'slug' must be kebab-case in ${relativePath}: '${slug}'`,
            {
              tip: 'Use lowercase letters, numbers, and hyphens only (e.g. "my-page-slug")',
              source: `slug: ${slug}`,
            },
          ),
        );
      }

      /* Validate updated date format. */
      const updated: string | undefined = fields.get('updated');
      if (updated !== undefined && updated.length > 0 && DATE_PATTERN.test(updated) === false) {
        results.push(
          createResult(
            'workspace/validate-docs-frontmatter',
            filePath,
            1,
            1,
            'error',
            `Frontmatter 'updated' must be YYYY-MM-DD format in ${relativePath}: '${updated}'`,
            {
              tip: 'Use ISO date format (e.g. "2024-01-15")',
              source: `updated: ${updated}`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
