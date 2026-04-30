/**
 * Barrel re-export for the welcome-screen component — exposes
 * the WelcomeScreen Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type WelcomeScreenProps, WelcomeScreenPropsSchema } from './WelcomeScreen.svelte';

export {
  Root,
  type WelcomeScreenProps,
  WelcomeScreenPropsSchema,
  //
  Root as WelcomeScreen,
};
