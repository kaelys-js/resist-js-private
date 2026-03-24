/**
 * Import lint rules — all rules in this category.
 *
 * @module
 */

import type { TypeScriptRule } from '../../framework/types.ts';
import noBarrelFiles from './no-barrel-files.ts';
import noJsExtension from './no-js-extension.ts';
import noRawJson from './no-raw-json.ts';
import noRawNodeImports from './no-raw-node-imports.ts';
import noReexport from './no-reexport.ts';
import noRelativeImports from './no-relative-imports.ts';
import requireImportGroups from './require-import-groups.ts';

/** All import lint rules. */
export const IMPORT_RULES: TypeScriptRule[] = [
  noRelativeImports,
  noBarrelFiles,
  noReexport,
  noRawNodeImports,
  noRawJson,
  noJsExtension,
  requireImportGroups,
];
