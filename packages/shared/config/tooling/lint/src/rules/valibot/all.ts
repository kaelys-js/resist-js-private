/**
 * Valibot lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import namespaceImport from './namespace-import.ts';
import noDirectSafeparse from './no-direct-safeparse.ts';
import noParse from './no-parse.ts';
import requireFieldDocs from './require-field-docs.ts';
import preferSharedSchema from './prefer-shared-schema.ts';
import requireMinLength from './require-min-length.ts';
import requireStrictObject from './require-strict-object.ts';
import noDuplicateSchema from './no-duplicate-schema.ts';
import noGenericStringSchema from './no-generic-string-schema.ts';
import requireGenericSchema from './require-generic-schema.ts';
import preferTemplateLiteral from './prefer-template-literal.ts';

/** All Valibot lint rules. */
export const VALIBOT_RULES: TypeScriptRule[] = [
  noParse,
  noDirectSafeparse,
  requireStrictObject,
  namespaceImport,
  requireFieldDocs,
  requireMinLength,
  preferSharedSchema,
  noDuplicateSchema,
  noGenericStringSchema,
  requireGenericSchema,
  preferTemplateLiteral,
];
