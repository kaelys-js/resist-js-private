<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DependencyGraphPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DependencyGraphProps = v.InferOutput<typeof DependencyGraphPropsSchema>;
</script>

<script lang="ts">
  /**
   * DependencyGraph — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DependencyGraph />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DependencyGraphProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DependencyGraphProps = $derived.by(() => {
    const rawProps: DependencyGraphProps = stripSvelteProps(allProps);
    const result = safeParse(DependencyGraphPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DependencyGraphProps;
  });
</script>

<div data-slot="dependency-graph" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
