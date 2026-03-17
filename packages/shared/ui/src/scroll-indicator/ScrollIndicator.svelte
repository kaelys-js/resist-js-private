<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScrollIndicatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ScrollIndicatorProps = v.InferOutput<typeof ScrollIndicatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScrollIndicator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScrollIndicator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScrollIndicatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScrollIndicatorProps = $derived.by(() => {
    const rawProps: ScrollIndicatorProps = stripSvelteProps(allProps);
    const result = safeParse(ScrollIndicatorPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScrollIndicatorProps;
  });
</script>

<div data-slot="scroll-indicator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
