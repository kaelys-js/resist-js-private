/**
 * Barrel re-export for the contacts-list component — exposes
 * the `ContactsList` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ContactsListProps, ContactsListPropsSchema } from './ContactsList.svelte';

export {
  Root,
  type ContactsListProps,
  ContactsListPropsSchema,
  //
  Root as ContactsList,
};
