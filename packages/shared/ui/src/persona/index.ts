/**
 * Barrel re-export for the persona component — exposes the
 * Persona Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PersonaProps, PersonaPropsSchema } from './Persona.svelte';

export {
  Root,
  type PersonaProps,
  PersonaPropsSchema,
  //
  Root as Persona,
};
