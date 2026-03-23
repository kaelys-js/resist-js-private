/**
 * JSDoc lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import paramTypeMatch from './param-type-match.ts';
import requireExample from './require-example.ts';
import requireJsdoc from './require-jsdoc.ts';
import requireModule from './require-module.ts';
import requireParam from './require-param.ts';
import requireReturns from './require-returns.ts';
import validateExample from './validate-example.ts';

/** All JSDoc lint rules. */
export const JSDOC_RULES: TypeScriptRule[] = [
  requireJsdoc,
  requireParam,
  requireReturns,
  requireExample,
  validateExample,
  paramTypeMatch,
  requireModule,
];
