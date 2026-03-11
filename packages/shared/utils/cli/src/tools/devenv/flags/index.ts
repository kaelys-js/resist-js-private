/**
 * Devenv Tool Flag Definitions — Auto-Discovery
 *
 * @module
 */

import type { FlagDefinition } from '@/cli/schemas';

const flagModules = import.meta.glob<{ default: readonly FlagDefinition[] }>(
  ['./*.ts', '!./index.ts'],
  { eager: true },
);

/** All flag definitions for the devenv tool, sorted by handler execution order. */
export const TOOL_FLAG_DEFS: readonly FlagDefinition[] = Object.values(flagModules)
  .flatMap((mod: { default: readonly FlagDefinition[] }): readonly FlagDefinition[] => mod.default)
  .sort((a: FlagDefinition, b: FlagDefinition): number => a.order - b.order);
