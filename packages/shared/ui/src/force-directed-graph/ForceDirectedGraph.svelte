<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ForceDirectedGraphPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ForceDirectedGraphProps = v.InferOutput<typeof ForceDirectedGraphPropsSchema>;
</script>

<script lang="ts">
  /**
   * ForceDirectedGraph — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ForceDirectedGraph />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ForceDirectedGraphProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ForceDirectedGraphProps = $derived.by(() => {
    const rawProps: ForceDirectedGraphProps = stripSvelteProps(allProps);
    const result = safeParse(ForceDirectedGraphPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ForceDirectedGraphProps;
  });
</script>

<div data-slot="force-directed-graph" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
