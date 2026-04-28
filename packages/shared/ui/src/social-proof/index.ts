/**
 * Barrel re-export for the social-proof component — exposes
 * the SocialProof Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SocialProofProps, SocialProofPropsSchema } from './SocialProof.svelte';

export {
  Root,
  type SocialProofProps,
  SocialProofPropsSchema,
  //
  Root as SocialProof,
};
