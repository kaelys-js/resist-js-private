/**
 * Result lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import checkBeforeAccess from './check-before-access.ts';
import noIgnoreResult from './no-ignore-result.ts';
import noTernaryFallback from './no-ternary-fallback.ts';
import requireOkReturn from './require-ok-return.ts';
import requireResultType from './require-result-type.ts';
import validateFunctionInput from './validate-function-input.ts';

/** All result lint rules. */
export const RESULT_RULES: TypeScriptRule[] = [
  noTernaryFallback,
  checkBeforeAccess,
  noIgnoreResult,
  requireResultType,
  validateFunctionInput,
  requireOkReturn,
];
