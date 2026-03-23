/**
 * Import lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import noBarrelFiles from './no-barrel-files.ts';
import noReexport from './no-reexport.ts';
import noRelativeImports from './no-relative-imports.ts';

/** All import lint rules. */
export const IMPORT_RULES: TypeScriptRule[] = [
  noRelativeImports,
  noBarrelFiles,
  noReexport,
];
