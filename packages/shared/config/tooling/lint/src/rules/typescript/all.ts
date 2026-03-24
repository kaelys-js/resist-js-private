/**
 * TypeScript lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import noBareAsCast from './no-bare-as-cast.ts';
import noBareDataTypes from './no-bare-data-types.ts';
import noBuiltinTypes from './no-builtin-types.ts';
import noEmptyCatch from './no-empty-catch.ts';
import noModuleSideEffects from './no-module-side-effects.ts';
import noThrow from './no-throw.ts';
import noUnionNull from './no-union-null.ts';
import requireConstComment from './require-const-comment.ts';
import requireNonNegativeInteger from './require-non-negative-integer.ts';
import requireReturnType from './require-return-type.ts';
import requireTypeAnnotation from './require-type-annotation.ts';
import noDefaultParams from './no-default-params.ts';
import noGenericFunctionType from './no-generic-function-type.ts';
import noUnionParams from './no-union-params.ts';

/** All TypeScript lint rules. */
export const TYPESCRIPT_RULES: TypeScriptRule[] = [
  requireTypeAnnotation,
  noBareAsCast,
  noBuiltinTypes,
  requireConstComment,
  requireReturnType,
  noEmptyCatch,
  noThrow,
  noBareDataTypes,
  noModuleSideEffects,
  noUnionNull,
  requireNonNegativeInteger,
  noDefaultParams,
  noGenericFunctionType,
  noUnionParams,
];
