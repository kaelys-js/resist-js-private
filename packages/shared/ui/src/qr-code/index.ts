/**
 * Barrel re-export for the qr-code component — exposes the
 * QrCode Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type QrCodeProps, QrCodePropsSchema } from './QrCode.svelte';

export {
  Root,
  type QrCodeProps,
  QrCodePropsSchema,
  //
  Root as QrCode,
};
