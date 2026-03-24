<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StatPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StatProps = v.InferOutput<typeof StatPropsSchema>;
</script>

<script lang="ts">
  /**
   * Stat — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Stat />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StatProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StatProps = $derived.by(() => {
    const rawProps: StatProps = stripSvelteProps(allProps);
    const result = safeParse(StatPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StatProps;
  });
</script>

<div data-slot="stat" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
