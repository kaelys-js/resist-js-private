/**
 * Barrel re-export for the contact-form component — exposes the
 * `ContactForm` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ContactFormProps, ContactFormPropsSchema } from './ContactForm.svelte';

export {
  Root,
  type ContactFormProps,
  ContactFormPropsSchema,
  //
  Root as ContactForm,
};
