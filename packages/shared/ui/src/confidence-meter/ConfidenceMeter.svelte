<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConfidenceMeterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ConfidenceMeterProps = v.InferOutput<typeof ConfidenceMeterPropsSchema>;
</script>

<script lang="ts">
  /**
   * ConfidenceMeter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ConfidenceMeter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConfidenceMeterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConfidenceMeterProps = $derived.by(() => {
    const rawProps: ConfidenceMeterProps = stripSvelteProps(allProps);
    const result = safeParse(ConfidenceMeterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConfidenceMeterProps;
  });
</script>

<div data-slot="confidence-meter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
