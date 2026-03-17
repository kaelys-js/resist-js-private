<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SourceListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SourceListProps = v.InferOutput<typeof SourceListPropsSchema>;
</script>

<script lang="ts">
  /**
   * SourceList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SourceList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SourceListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SourceListProps = $derived.by(() => {
    const rawProps: SourceListProps = stripSvelteProps(allProps);
    const result = safeParse(SourceListPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SourceListProps;
  });
</script>

<div data-slot="source-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
