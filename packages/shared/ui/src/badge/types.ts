/**
 * Public types/values for the Badge component.
 *
 * Defined in a regular `.ts` file (instead of inside `badge.svelte`'s
 * `<script module>`) so that `badge/index.ts` can re-export them via
 * standard TS module resolution. This sidesteps the workspace-level
 * `*.svelte` ambient declaration in `src/svelte.d.ts`, whose non-standard
 * `export var [key: string]: unknown` syntax is accepted by tsgo but
 * not by svelte-check's named-import resolution for downstream packages.
 *
 * @module
 */

import * as v from 'valibot';
import type { Snippet } from 'svelte';
import { type VariantProps, tv } from 'tailwind-variants';
import { StrSchema, BoolSchema, type Bool } from '@/schemas/common';

/** The tailwind-variants config for Badge. */
export const badgeVariants = tv({
  base: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent',
      secondary:
        'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent',
      destructive:
        'bg-destructive [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70 border-transparent text-white',
      outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      success: 'bg-emerald-500 text-white [a&]:hover:bg-emerald-600 border-transparent',
      warning:
        'bg-amber-500 text-white [a&]:hover:bg-amber-600 border-transparent dark:bg-amber-600',
      info: 'bg-blue-500 text-white [a&]:hover:bg-blue-600 border-transparent',
    },
    size: {
      xs: 'px-1 py-0 text-[10px] [&>svg]:size-2.5',
      sm: 'px-2 py-0.5 text-xs [&>svg]:size-3',
      md: 'px-2.5 py-0.5 text-xs [&>svg]:size-3.5',
      lg: 'px-3 py-1 text-sm [&>svg]:size-4',
    },
    radius: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full',
    },
    dot: {
      true: 'size-2 p-0 border-0',
      false: '',
    },
    disabled: {
      true: 'opacity-50 pointer-events-none',
      false: '',
    },
  },
  compoundVariants: [
    { dot: true, variant: 'default', class: 'bg-primary' },
    { dot: true, variant: 'secondary', class: 'bg-secondary-foreground/50' },
    { dot: true, variant: 'destructive', class: 'bg-destructive' },
    { dot: true, variant: 'outline', class: 'bg-foreground border-0' },
    { dot: true, variant: 'success', class: 'bg-emerald-500' },
    { dot: true, variant: 'warning', class: 'bg-amber-500' },
    { dot: true, variant: 'info', class: 'bg-blue-500' },
    { dot: true, size: 'xs', class: 'size-1.5' },
    { dot: true, size: 'sm', class: 'size-2' },
    { dot: true, size: 'md', class: 'size-2.5' },
    { dot: true, size: 'lg', class: 'size-3' },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'sm',
    radius: 'full',
    dot: false,
    disabled: false,
  },
});

/** Visual variant prop type for the Badge component. */
export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
/** Size prop type for the Badge component. */
export type BadgeSize = VariantProps<typeof badgeVariants>['size'];
/** Border-radius prop type for the Badge component. */
export type BadgeRadius = VariantProps<typeof badgeVariants>['radius'];

export const BadgePropsSchema = v.strictObject({
  /** Visual style variant. @values default, secondary, destructive, outline, success, warning, info */
  variant: v.optional(
    v.picklist(['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info']),
    'default',
  ),
  /** Badge size controlling padding and text size. @values xs, sm, md, lg */
  size: v.optional(v.picklist(['xs', 'sm', 'md', 'lg']), 'sm'),
  /** Border radius. @values none, sm, md, lg, full */
  radius: v.optional(v.picklist(['none', 'sm', 'md', 'lg', 'full']), 'full'),
  /** Render as link when URL is provided. @values /components/button, https://example.com */
  href: v.optional(StrSchema),
  /** Render as small dot indicator with no text content. @values true, false */
  dot: v.optional(BoolSchema, false as Bool),
  /** Show a remove/dismiss X button. @values true, false */
  removable: v.optional(BoolSchema, false as Bool),
  /** Disabled state — reduced opacity, no interactions. @values true, false */
  disabled: v.optional(BoolSchema, false as Bool),
  /** Additional CSS classes. @values ml-2, animate-pulse */
  class: v.optional(StrSchema),
  /** Badge text or rich content. @values {#snippet children()}Badge{/snippet} */
  children: v.optional(v.custom<Snippet>(() => true)),
  /** Icon rendered before the badge content. @values {#snippet icon()}<Star class="size-3" />{/snippet} */
  icon: v.optional(v.custom<Snippet>(() => true)),
  /** Callback fired when the remove button is clicked. @values () => removeBadge(id) */
  onRemove: v.optional(v.custom<() => void>(() => true)),
});
/** Input props type — all fields optional (for $props). */
export type BadgeInputProps = v.InferInput<typeof BadgePropsSchema>;
/** Validated output type — defaults filled in (after safeParse). */
export type BadgeProps = v.InferOutput<typeof BadgePropsSchema>;
