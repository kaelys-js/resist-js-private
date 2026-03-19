import Root, { type KbdProps, KbdPropsSchema, kbdVariants, KEY_SYMBOLS } from './Kbd.svelte';
import Group, { type KbdGroupProps, KbdGroupPropsSchema } from './KbdGroup.svelte';

export {
  Root,
  Group,
  type KbdProps,
  type KbdGroupProps,
  KbdPropsSchema,
  KbdGroupPropsSchema,
  kbdVariants,
  KEY_SYMBOLS,
  //
  Root as Kbd,
  Group as KbdGroup,
};
