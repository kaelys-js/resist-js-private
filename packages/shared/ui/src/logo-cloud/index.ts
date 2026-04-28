/**
 * Barrel re-export for the logo-cloud component — exposes the
 * LogoCloud Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type LogoCloudProps, LogoCloudPropsSchema } from './LogoCloud.svelte';

export {
  Root,
  type LogoCloudProps,
  LogoCloudPropsSchema,
  //
  Root as LogoCloud,
};
