/**
 * Barrel re-export for the author-bio component — exposes the
 * `AuthorBio` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AuthorBioProps, AuthorBioPropsSchema } from './AuthorBio.svelte';

export {
  Root,
  type AuthorBioProps,
  AuthorBioPropsSchema,
  //
  Root as AuthorBio,
};
