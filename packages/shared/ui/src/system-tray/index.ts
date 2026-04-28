/**
 * Barrel re-export for the system-tray component — exposes
 * the SystemTray Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SystemTrayProps, SystemTrayPropsSchema } from './SystemTray.svelte';

export {
  Root,
  type SystemTrayProps,
  SystemTrayPropsSchema,
  //
  Root as SystemTray,
};
