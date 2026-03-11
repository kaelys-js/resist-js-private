/**
 * Local CI Tool Flag Definitions — Auto-Discovery
 *
 * Discovers and aggregates all flag definition files in this directory.
 *
 * @module
 */

import type { FlagDefinition } from '@/cli/schemas';

const flagModules = import.meta.glob<{ default: readonly FlagDefinition[] }>(
  ['./*.ts', '!./index.ts'],
  { eager: true },
);

/** All flag definitions for the local-ci tool, sorted by handler execution order. */
export const TOOL_FLAG_DEFS: readonly FlagDefinition[] = Object.values(flagModules)
  .flatMap((mod: { default: readonly FlagDefinition[] }): readonly FlagDefinition[] => mod.default)
  .sort((a: FlagDefinition, b: FlagDefinition): number => a.order - b.order);
