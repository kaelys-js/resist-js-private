/**
 * Testing lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import requireColocatedTests from './require-colocated-tests.ts';

/** All testing lint rules. */
export const TESTING_RULES: TypeScriptRule[] = [
  requireColocatedTests,
];
