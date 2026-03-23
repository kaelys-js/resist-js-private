/**
 * Naming lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import camelCaseVars from './camel-case-vars.ts';
import constantScreamingCase from './constant-screaming-case.ts';
import pascalCaseTypes from './pascal-case-types.ts';
import svelteFilePascalCase from './svelte-file-pascal-case.ts';
import tsFileKebabCase from './ts-file-kebab-case.ts';

/** All naming lint rules. */
export const NAMING_RULES: TypeScriptRule[] = [
  constantScreamingCase,
  camelCaseVars,
  pascalCaseTypes,
  svelteFilePascalCase,
  tsFileKebabCase,
];
