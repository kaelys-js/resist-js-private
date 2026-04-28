/**
 * Barrel re-export for the spreadsheet component — exposes
 * the Spreadsheet Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SpreadsheetProps, SpreadsheetPropsSchema } from './Spreadsheet.svelte';

export {
  Root,
  type SpreadsheetProps,
  SpreadsheetPropsSchema,
  //
  Root as Spreadsheet,
};
