/**
 * Barrel re-export for the passkey-auth component — exposes
 * the PasskeyAuth Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PasskeyAuthProps, PasskeyAuthPropsSchema } from './PasskeyAuth.svelte';

export {
  Root,
  type PasskeyAuthProps,
  PasskeyAuthPropsSchema,
  //
  Root as PasskeyAuth,
};
