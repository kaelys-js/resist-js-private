/**
 * Rule: workspace/validate-wrangler-cron-syntax
 *
 * Validates 5-field cron expressions in wrangler.json triggers.cron arrays.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Valid ranges for each cron field (min, max). */
const CRON_FIELD_RANGES: ReadonlyArray<{ name: string; min: number; max: number }> = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'day of week', min: 0, max: 6 },
];

/**
 * Validate a single cron field value.
 *
 * @param value - The field value (e.g., "5", "*", "* /10")
 * @param range - The valid range for this field
 * @returns Error message or null if valid
 */
function validateCronField(
  value: string,
  range: { name: string; min: number; max: number },
): string | null {
  /* Wildcard is always valid. */
  if (value === '*') {
    return null;
  }

  /* Step notation: */
  if (value.includes('/')) {
    const parts: string[] = value.split('/');
    if (parts.length !== 2) {
      return `Invalid step notation '${value}' for ${range.name}`;
    }
    const base: string = parts[0] ?? '';
    const step: string = parts[1] ?? '';

    if (base !== '*') {
      const baseNum: number = Number(base);
      if (Number.isNaN(baseNum) || baseNum < range.min || baseNum > range.max) {
        return `${range.name} base '${base}' out of range (${String(range.min)}-${String(range.max)})`;
      }
    }

    const stepNum: number = Number(step);
    if (Number.isNaN(stepNum) || stepNum < 1) {
      return `Invalid step value '${step}' for ${range.name}`;
    }

    return null;
  }

  /* Range notation: */
  if (value.includes('-')) {
    const parts: string[] = value.split('-');
    if (parts.length !== 2) {
      return `Invalid range '${value}' for ${range.name}`;
    }
    const start: number = Number(parts[0]);
    const end: number = Number(parts[1]);

    if (Number.isNaN(start) || start < range.min || start > range.max) {
      return `${range.name} range start '${parts[0]}' out of range`;
    }
    if (Number.isNaN(end) || end < range.min || end > range.max) {
      return `${range.name} range end '${parts[1]}' out of range`;
    }

    return null;
  }

  /* List notation: */
  if (value.includes(',')) {
    const items: string[] = value.split(',');
    for (const item of items) {
      const result: string | null = validateCronField(item.trim(), range);
      if (result !== null) {
        return result;
      }
    }
    return null;
  }

  /* Simple numeric value. */
  const num: number = Number(value);
  if (Number.isNaN(num) || num < range.min || num > range.max) {
    return `${range.name} value '${value}' out of range (${String(range.min)}-${String(range.max)})`;
  }

  return null;
}

/**
 * Extract cron expressions from a parsed wrangler config.
 *
 * @param config - Parsed wrangler.json object
 * @returns Array of cron expression strings
 */
function extractCronExpressions(config: Record<string, unknown>): string[] {
  const crons: string[] = [];

  /* Top-level triggers.cron. */
  const { triggers } = config;
  if (typeof triggers === 'object' && triggers !== null) {
    const triggersObj: Record<string, unknown> = triggers as Record<string, unknown>;
    if (Array.isArray(triggersObj.cron)) {
      for (const cron of triggersObj.cron) {
        if (typeof cron === 'string') {
          crons.push(cron);
        }
      }
    }
  }

  /* Environment-level triggers.cron. */
  const { env } = config;
  if (typeof env === 'object' && env !== null) {
    const envObj: Record<string, unknown> = env as Record<string, unknown>;
    for (const envConfig of Object.values(envObj)) {
      if (typeof envConfig === 'object' && envConfig !== null) {
        const envCfg: Record<string, unknown> = envConfig as Record<string, unknown>;
        const envTriggers: unknown = envCfg.triggers;
        if (typeof envTriggers === 'object' && envTriggers !== null) {
          const envTriggersObj: Record<string, unknown> = envTriggers as Record<string, unknown>;
          if (Array.isArray(envTriggersObj.cron)) {
            for (const cron of envTriggersObj.cron) {
              if (typeof cron === 'string') {
                crons.push(cron);
              }
            }
          }
        }
      }
    }
  }

  return crons;
}

/** Validates cron syntax in wrangler.json files. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-wrangler-cron-syntax',
  description: 'Wrangler cron triggers must use valid 5-field cron syntax.',
  scope: 'workspace',
  categories: ['workspace', 'wrangler'],
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
      const name: string = basename(filePath);
      if (name !== 'wrangler.json' && name !== 'wrangler.jsonc') {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      const crons: string[] = extractCronExpressions(parsed);

      for (const cron of crons) {
        const fields: string[] = cron.trim().split(/\s+/);

        if (fields.length !== 5) {
          results.push(
            createResult(
              'workspace/validate-wrangler-cron-syntax',
              filePath,
              1,
              1,
              'error',
              `Invalid cron '${cron}' in ${relativePath} — expected 5 fields, got ${String(fields.length)}`,
              {
                tip: 'Cron format: minute hour day-of-month month day-of-week',
              },
            ),
          );
          continue;
        }

        for (let i: number = 0; i < 5; i++) {
          const field: string = fields[i] ?? '';
          const range: (typeof CRON_FIELD_RANGES)[number] | undefined = CRON_FIELD_RANGES[i];
          if (range === undefined) {
            continue;
          }

          const error: string | null = validateCronField(field, range);
          if (error !== null) {
            results.push(
              createResult(
                'workspace/validate-wrangler-cron-syntax',
                filePath,
                1,
                1,
                'error',
                `Invalid cron '${cron}' in ${relativePath}: ${error}`,
                {
                  tip: 'Fix the cron expression field',
                },
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
