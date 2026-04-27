/**
 * Type shim for `./button.svelte`.
 *
 * Re-exports from `./types.ts` (the public surface for Button) plus the
 * default Svelte component export. This shim takes precedence over the
 * workspace-level `*.svelte` ambient declaration in `src/svelte.d.ts`,
 * which lacks named exports for downstream consumers like
 * `@/products-template/app` and `@storylyne/editor`.
 *
 * @module
 */

import type { Component } from 'svelte';
import type { ButtonProps } from './types.js';

export {
  buttonVariants,
  type ButtonVariant,
  type ButtonSize,
  type ButtonProps,
} from './types.js';

/** Default export: the Button Svelte component. */
declare const Button: Component<ButtonProps>;
export default Button;
