/**
 * Node.js alias resolution for bare Node processes.
 *
 * @module
 *
 * This package provides `register-aliases.mjs` and `resolve-aliases.mjs` which
 * enable `@/` tsconfig path alias resolution in bare Node.js processes
 * (outside Vite). Loaded via `NODE_OPTIONS="--import ..."` in `.npmrc`.
 *
 * The resolver files are `.mjs` because they run before TypeScript is available.
 * This `.ts` entry point exists for type-checking and future TypeScript additions.
 */

import type { Str } from '@/schemas/common';

// =============================================================================
// Constants
// =============================================================================

/** Relative path from workspace root to the register-aliases bootstrap script. */
export const REGISTER_ALIASES_PATH: Str =
  'packages/shared/config/tooling/node/src/register-aliases.mjs';

/** Relative path from workspace root to the resolve-aliases hook script. */
export const RESOLVE_ALIASES_PATH: Str =
  'packages/shared/config/tooling/node/src/resolve-aliases.mjs';
