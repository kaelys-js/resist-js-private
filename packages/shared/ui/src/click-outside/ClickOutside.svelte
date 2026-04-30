<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ClickOutside — detector wrapper that emits when clicks land
   * outside the wrapped element. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ClickOutsidePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ClickOutside. */
  export type ClickOutsideProps = v.InferOutput<typeof ClickOutsidePropsSchema>;
</script>

<script lang="ts">
  /**
   * ClickOutside — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ClickOutside />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ClickOutsideProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ClickOutsideProps = $derived.by(() => {
    const rawProps: ClickOutsideProps = stripSvelteProps(allProps);
    const result = safeParse(ClickOutsidePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ClickOutsideProps;
  });
</script>

<div data-slot="click-outside" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
