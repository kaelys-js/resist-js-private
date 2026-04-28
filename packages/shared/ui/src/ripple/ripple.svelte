<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Ripple Svelte component — animated radial-wave ripple
   * effect for background decoration or button-click feedback.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RipplePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Ripple. */
  export type RippleProps = v.InferOutput<typeof RipplePropsSchema>;
</script>

<script lang="ts">
  /**
   * Ripple — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Ripple />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RippleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RippleProps = $derived.by(() => {
    const rawProps: RippleProps = stripSvelteProps(allProps);
    const result = safeParse(RipplePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RippleProps;
  });
</script>

<div data-slot="ripple" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
