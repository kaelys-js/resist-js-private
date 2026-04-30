<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ThemeIcon Svelte component — themed icon container with
   * tinted background and centered glyph (badge-style icon).
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ThemeIconPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ThemeIcon. */
  export type ThemeIconProps = v.InferOutput<typeof ThemeIconPropsSchema>;
</script>

<script lang="ts">
  /**
   * ThemeIcon — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ThemeIcon />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ThemeIconProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ThemeIconProps = $derived.by(() => {
    const rawProps: ThemeIconProps = stripSvelteProps(allProps);
    const result = safeParse(ThemeIconPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ThemeIconProps;
  });
</script>

<div data-slot="theme-icon" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
