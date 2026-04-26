/**
 * Hand-rolled type shim for `./button.svelte`.
 *
 * Re-exports the named types/values declared inside button.svelte's
 * `<script module>` block. Without this shim, downstream consumers
 * (e.g. storylyne-editor) hit the workspace-level `*.svelte` ambient
 * declaration in `src/svelte.d.ts`, whose non-standard
 * `export var [key: string]: unknown` syntax is accepted by tsgo but
 * not by svelte-check's named-import resolution. The per-file
 * declaration here takes precedence over the wildcard ambient and
 * gives svelte-check the explicit named exports it requires.
 *
 * @module
 */

import type { Component } from 'svelte';
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
import type { WithElementRef } from '../utils.js';
import type { VariantProps } from 'tailwind-variants';

/** The tailwind-variants config used by Button. Re-typed here for the shim. */
export const buttonVariants: ReturnType<
  // The actual implementation is `tv({...})` in button.svelte. We model the
  // returned function shape generically to expose `VariantProps<typeof X>`.
  // The `unknown` type parameters are deliberate — consumers only use the
  // exported `ButtonVariant` / `ButtonSize` aliases below.
  () => (props?: { variant?: string; size?: string; class?: string }) => string
>;

export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
  WithElementRef<HTMLAnchorAttributes> & {
    /** The visual style variant. */
    variant?: ButtonVariant;
    /** The size preset. */
    size?: ButtonSize;
  };

/** Default export: the Button Svelte component. */
declare const Button: Component<ButtonProps>;
export default Button;
