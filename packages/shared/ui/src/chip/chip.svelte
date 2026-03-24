<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ChipPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ChipProps = v.InferOutput<typeof ChipPropsSchema>;
</script>

<script lang="ts">
  /**
   * Chip — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Chip />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ChipProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ChipProps = $derived.by(() => {
    const rawProps: ChipProps = stripSvelteProps(allProps);
    const result = safeParse(ChipPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ChipProps;
  });
</script>

<div data-slot="chip" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
