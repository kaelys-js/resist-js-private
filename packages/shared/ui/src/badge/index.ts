/**
 * Barrel re-export for the badge component — exposes the `Badge`
 * Svelte component plus the `badgeVariants` TV helper, props
 * schema, and the `BadgeVariant` / `BadgeSize` / `BadgeRadius` /
 * `BadgeInputProps` / `BadgeProps` types from the shared
 * `types.ts` module.
 *
 * @module
 */

export { default as Badge } from './badge.svelte';
export {
  badgeVariants,
  type BadgeVariant,
  type BadgeSize,
  type BadgeRadius,
  type BadgeInputProps,
  type BadgeProps,
  BadgePropsSchema,
} from './types.js';
