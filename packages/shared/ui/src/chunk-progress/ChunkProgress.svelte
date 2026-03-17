<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ChunkProgressPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ChunkProgressProps = v.InferOutput<typeof ChunkProgressPropsSchema>;
</script>

<script lang="ts">
  /**
   * ChunkProgress — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ChunkProgress />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ChunkProgressProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ChunkProgressProps = $derived.by(() => {
    const rawProps: ChunkProgressProps = stripSvelteProps(allProps);
    const result = safeParse(ChunkProgressPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ChunkProgressProps;
  });
</script>

<div data-slot="chunk-progress" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
