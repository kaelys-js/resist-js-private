/**
 * Barrel re-export for the voice-message component — exposes
 * the VoiceMessage Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type VoiceMessageProps, VoiceMessagePropsSchema } from './VoiceMessage.svelte';

export {
  Root,
  type VoiceMessageProps,
  VoiceMessagePropsSchema,
  //
  Root as VoiceMessage,
};
