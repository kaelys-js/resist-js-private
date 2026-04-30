<script module lang="ts">
  /**
   * VisuallyHidden Svelte component — wraps content in a
   * visually-clipped container that remains accessible to
   * screen readers, with an optional `focusable` mode for
   * skip-to-content links.
   *
   * @module
   */
  import * as v from 'valibot';
  import { type VariantProps, tv } from 'tailwind-variants';
  import { type Bool, BoolSchema, type Str, StrSchema } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  /**
   * Tailwind Variants for visually-hidden styles.
   *
   * Base: clip/clip-path technique hiding content visually while keeping it
   * accessible to screen readers. Focusable variant reveals on :focus/:active/:focus-within.
   */
  export const visuallyHiddenVariants = tv({
    base: [
      'absolute',
      'h-px',
      'w-px',
      'p-0',
      '-m-px',
      'overflow-hidden',
      'whitespace-nowrap',
      'border-0',
      '[clip:rect(0,0,0,0)]',
      '[clip-path:inset(50%)]',
      '[word-wrap:normal]',
    ],
    variants: {
      focusable: {
        true: [
          'focus:static',
          'focus:h-auto',
          'focus:w-auto',
          'focus:p-0',
          'focus:m-0',
          'focus:overflow-visible',
          'focus:whitespace-normal',
          'focus:[clip:auto]',
          'focus:[clip-path:none]',
          'active:static',
          'active:h-auto',
          'active:w-auto',
          'active:overflow-visible',
          'active:whitespace-normal',
          'active:[clip:auto]',
          'active:[clip-path:none]',
        ],
        false: [],
      },
    },
    defaultVariants: {
      focusable: false,
    },
  });

  /** `focusable` prop type for the VisuallyHidden component. */
  export type VisuallyHiddenVariant = VariantProps<typeof visuallyHiddenVariants>['focusable'];

  export const VisuallyHiddenPropsSchema = v.strictObject({
    /** Rendered HTML element type. @values span, div, h1, h2, h3, h4, h5, h6, p, label, a */
    as: v.optional(
      v.picklist(['span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'label', 'a']),
      'span',
    ),
    /** When true, element becomes visible on focus/active for skip links. @values true, false */
    focusable: v.optional(BoolSchema, false as Bool),
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
    /** Content to hide visually while keeping accessible to screen readers. @values {#snippet children()}Skip to content{/snippet} */
    children: v.optional(v.custom<Snippet>(() => true)),
  });

  /** Input props type — all fields optional (for $props). */
  export type VisuallyHiddenInputProps = v.InferInput<typeof VisuallyHiddenPropsSchema>;

  /** Validated output type — defaults filled in (after safeParse). */
  export type VisuallyHiddenProps = v.InferOutput<typeof VisuallyHiddenPropsSchema>;
</script>

<script lang="ts">
  /**
   * VisuallyHidden — hides content visually while keeping it accessible to screen readers.
   *
   * Uses the modern clip/clip-path CSS technique for zero visual footprint.
   * Supports polymorphic elements via `as` prop and a focusable variant
   * that reveals content on focus for skip-link patterns.
   *
   * @example
   * ```svelte
   * <VisuallyHidden>This text is only for screen readers</VisuallyHidden>
   *
   * <VisuallyHidden as="a" focusable href="#main-content">
   *   Skip to content
   * </VisuallyHidden>
   * ```
   */
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  const {
    as,
    focusable,
    class: className,
    children,
    ...restProps
  }: VisuallyHiddenInputProps = $props();

  const validated: VisuallyHiddenProps = $derived.by(() => {
    const dataProps: Record<string, unknown> = stripSvelteProps({
      as,
      focusable,
      class: className,
    });
    const result = safeParse(VisuallyHiddenPropsSchema, {
      ...dataProps,
      children,
    });
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VisuallyHiddenProps;
  });

  const variantClass: Str = $derived(
    visuallyHiddenVariants({ focusable: validated.focusable }) as Str,
  );
</script>

<svelte:element
  this={validated.as}
  data-slot="visually-hidden"
  class={cn(variantClass, validated.class)}
  {...restProps}
>
  {#if validated.children}
    {@render validated.children()}
  {/if}
</svelte:element>
