/**
 * Public types and the `buttonVariants` value for the Button component.
 *
 * Defined in a regular `.ts` file (instead of inside `button.svelte`'s
 * `<script module>`) so that `button/index.ts` can re-export them via
 * standard TS module resolution. This sidesteps the workspace-level
 * `*.svelte` ambient declaration in `src/svelte.d.ts`, whose non-standard
 * `export var [key: string]: unknown` syntax is accepted by tsgo but
 * not by svelte-check's named-import resolution for downstream packages
 * such as storylyne-editor.
 *
 * @module
 */

import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
import { type VariantProps, tv } from 'tailwind-variants';
import type { WithElementRef } from '../utils.js';

/** The tailwind-variants config for Button. */
export const buttonVariants = tv({
  base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
      destructive:
        'bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white shadow-xs',
      outline:
        'bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border shadow-xs',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs',
      ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-9 px-4 py-2 has-[>svg]:px-3',
      sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
      lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
      icon: 'size-9',
      'icon-sm': 'size-8',
      'icon-lg': 'size-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
  WithElementRef<HTMLAnchorAttributes> & {
    /** The visual style variant. */
    variant?: ButtonVariant;
    /** The size preset. */
    size?: ButtonSize;
  };
