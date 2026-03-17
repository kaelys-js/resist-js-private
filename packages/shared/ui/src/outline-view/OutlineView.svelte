<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OutlineViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type OutlineViewProps = v.InferOutput<typeof OutlineViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * OutlineView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OutlineView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OutlineViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OutlineViewProps = $derived.by(() => {
    const rawProps: OutlineViewProps = stripSvelteProps(allProps);
    const result = safeParse(OutlineViewPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OutlineViewProps;
  });
</script>

<div data-slot="outline-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
