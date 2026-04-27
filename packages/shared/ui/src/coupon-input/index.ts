/**
 * Barrel re-export for the coupon-input component — exposes the
 * `CouponInput` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CouponInputProps, CouponInputPropsSchema } from './CouponInput.svelte';

export {
  Root,
  type CouponInputProps,
  CouponInputPropsSchema,
  //
  Root as CouponInput,
};
