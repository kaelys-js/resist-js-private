<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * NumberFormatter Svelte component — formats numbers with
   * locale / unit / precision options. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NumberFormatterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NumberFormatter. */
  export type NumberFormatterProps = v.InferOutput<typeof NumberFormatterPropsSchema>;
</script>

<script lang="ts">
  /**
   * NumberFormatter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NumberFormatter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NumberFormatterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NumberFormatterProps = $derived.by(() => {
    const rawProps: NumberFormatterProps = stripSvelteProps(allProps);
    const result = safeParse(NumberFormatterPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NumberFormatterProps;
  });
</script>

<div data-slot="number-formatter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
