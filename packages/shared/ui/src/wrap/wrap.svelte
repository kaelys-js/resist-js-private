<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Wrap Svelte component — flex-wrap layout primitive that
   * arranges children in rows with consistent gaps and
   * wraps overflow to the next line. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WrapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Wrap. */
  export type WrapProps = v.InferOutput<typeof WrapPropsSchema>;
</script>

<script lang="ts">
  /**
   * Wrap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Wrap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WrapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WrapProps = $derived.by(() => {
    const rawProps: WrapProps = stripSvelteProps(allProps);
    const result = safeParse(WrapPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WrapProps;
  });
</script>

<div data-slot="wrap" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
