/**
 * Checks Tool Flag Definitions — Auto-Discovery
 *
 * Uses `import.meta.glob` to eagerly load all per-flag definition files
 * from sibling `.ts` files, following the same pattern as the framework's
 * `utils/flags/index.ts`.
 *
 * @module
 */

import type { FlagDefinition } from '@/cli/schemas';

const flagModules = import.meta.glob<{ default: readonly FlagDefinition[] }>(
  ['./*.ts', '!./index.ts'],
  { eager: true },
);

/** All flag definitions for the checks tool, sorted by handler execution order. */
export const TOOL_FLAG_DEFS: readonly FlagDefinition[] = Object.values(flagModules)
  .flatMap((mod: { default: readonly FlagDefinition[] }): readonly FlagDefinition[] => mod.default)
  .sort((a: FlagDefinition, b: FlagDefinition): number => a.order - b.order);
