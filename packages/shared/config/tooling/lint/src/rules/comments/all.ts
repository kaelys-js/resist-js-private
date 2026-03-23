/**
 * Comments lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import noLintDisable from './no-lint-disable.ts';

/** All comments lint rules. */
export const COMMENTS_RULES: TypeScriptRule[] = [
  noLintDisable,
];
