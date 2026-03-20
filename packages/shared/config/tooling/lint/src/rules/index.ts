/**
 * Rule Registry — all custom lint rules.
 *
 * Each rule is imported statically to avoid dynamic discovery overhead.
 *
 * @module
 */

import type { TypeScriptRule } from '../framework/types.ts';

// JSDoc rules
import requireJsdoc from './jsdoc/require-jsdoc.ts';
import requireParam from './jsdoc/require-param.ts';
import requireReturns from './jsdoc/require-returns.ts';
import requireExample from './jsdoc/require-example.ts';
import paramTypeMatch from './jsdoc/param-type-match.ts';
import requireModule from './jsdoc/require-module.ts';

// TypeScript rules
import requireTypeAnnotation from './typescript/require-type-annotation.ts';
import noBareAsCast from './typescript/no-bare-as-cast.ts';
import noBuiltinTypes from './typescript/no-builtin-types.ts';
import requireConstComment from './typescript/require-const-comment.ts';
import requireReturnType from './typescript/require-return-type.ts';
import noEmptyCatch from './typescript/no-empty-catch.ts';
import noThrow from './typescript/no-throw.ts';
import noBareDataTypes from './typescript/no-bare-data-types.ts';

// Import rules
import noRelativeImports from './imports/no-relative-imports.ts';
import noBarrelFiles from './imports/no-barrel-files.ts';
import noReexport from './imports/no-reexport.ts';

// Valibot rules
import noParse from './valibot/no-parse.ts';
import noDirectSafeparse from './valibot/no-direct-safeparse.ts';
import requireStrictObject from './valibot/require-strict-object.ts';
import namespaceImport from './valibot/namespace-import.ts';
import requireFieldDocs from './valibot/require-field-docs.ts';

// Naming rules
import constantScreamingCase from './naming/constant-screaming-case.ts';
import camelCaseVars from './naming/camel-case-vars.ts';
import pascalCaseTypes from './naming/pascal-case-types.ts';
import svelteFilePascalCase from './naming/svelte-file-pascal-case.ts';
import tsFileKebabCase from './naming/ts-file-kebab-case.ts';

// Comments rules
import noLintDisable from './comments/no-lint-disable.ts';

// Testing rules
import requireColocatedTests from './testing/require-colocated-tests.ts';

// Result rules
import noTernaryFallback from './result/no-ternary-fallback.ts';
import checkBeforeAccess from './result/check-before-access.ts';
import noIgnoreResult from './result/no-ignore-result.ts';
import requireResultType from './result/require-result-type.ts';
import validateFunctionInput from './result/validate-function-input.ts';
import requireOkReturn from './result/require-ok-return.ts';

/** All registered custom lint rules. */
export const ALL_RULES: TypeScriptRule[] = [
  // JSDoc
  requireJsdoc,
  requireParam,
  requireReturns,
  requireExample,
  paramTypeMatch,
  requireModule,
  // TypeScript
  requireTypeAnnotation,
  noBareAsCast,
  noBuiltinTypes,
  requireConstComment,
  requireReturnType,
  noEmptyCatch,
  noThrow,
  noBareDataTypes,
  // Imports
  noRelativeImports,
  noBarrelFiles,
  noReexport,
  // Valibot
  noParse,
  noDirectSafeparse,
  requireStrictObject,
  namespaceImport,
  requireFieldDocs,
  // Naming
  constantScreamingCase,
  camelCaseVars,
  pascalCaseTypes,
  svelteFilePascalCase,
  tsFileKebabCase,
  // Comments
  noLintDisable,
  // Testing
  requireColocatedTests,
  // Result
  noTernaryFallback,
  checkBeforeAccess,
  noIgnoreResult,
  requireResultType,
  validateFunctionInput,
  requireOkReturn,
];
