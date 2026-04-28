/**
 * Barrel re-export for the invoice-table component — exposes
 * the InvoiceTable Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type InvoiceTableProps, InvoiceTablePropsSchema } from './InvoiceTable.svelte';

export {
  Root,
  type InvoiceTableProps,
  InvoiceTablePropsSchema,
  //
  Root as InvoiceTable,
};
