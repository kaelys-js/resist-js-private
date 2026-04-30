/**
 * Barrel re-export for the upgrade-prompt component — exposes
 * the UpgradePrompt Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type UpgradePromptProps, UpgradePromptPropsSchema } from './UpgradePrompt.svelte';

export {
  Root,
  type UpgradePromptProps,
  UpgradePromptPropsSchema,
  //
  Root as UpgradePrompt,
};
