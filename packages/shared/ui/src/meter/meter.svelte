<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MeterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MeterProps = v.InferOutput<typeof MeterPropsSchema>;
</script>

<script lang="ts">
  /**
   * Meter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Meter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MeterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MeterProps = $derived.by(() => {
    const rawProps: MeterProps = stripSvelteProps(allProps);
    const result = safeParse(MeterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MeterProps;
  });
</script>

<div data-slot="meter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
