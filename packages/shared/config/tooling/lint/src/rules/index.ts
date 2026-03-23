/**
 * Rule Registry — all custom lint rules.
 *
 * Rules are grouped by category in sub-modules to keep dependency count manageable.
 *
 * @module
 */

import type { TypeScriptRule } from '../framework/types.ts';
import { COMMENTS_RULES } from './comments/all.ts';
import { IMPORT_RULES } from './imports/all.ts';
import { JSDOC_RULES } from './jsdoc/all.ts';
import { NAMING_RULES } from './naming/all.ts';
import { RESULT_RULES } from './result/all.ts';
import { TESTING_RULES } from './testing/all.ts';
import { TYPESCRIPT_RULES } from './typescript/all.ts';
import { VALIBOT_RULES } from './valibot/all.ts';

/** All registered custom lint rules. */
export const ALL_RULES: TypeScriptRule[] = [
  ...JSDOC_RULES,
  ...TYPESCRIPT_RULES,
  ...IMPORT_RULES,
  ...VALIBOT_RULES,
  ...NAMING_RULES,
  ...COMMENTS_RULES,
  ...TESTING_RULES,
  ...RESULT_RULES,
];
