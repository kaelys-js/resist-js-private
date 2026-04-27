<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SplitViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SplitView. */
  export type SplitViewProps = v.InferOutput<typeof SplitViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * SplitView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SplitView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SplitViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SplitViewProps = $derived.by(() => {
    const rawProps: SplitViewProps = stripSvelteProps(allProps);
    const result = safeParse(SplitViewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SplitViewProps;
  });
</script>

<div data-slot="split-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
