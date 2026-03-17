<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MindMapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MindMapProps = v.InferOutput<typeof MindMapPropsSchema>;
</script>

<script lang="ts">
  /**
   * MindMap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MindMap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MindMapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MindMapProps = $derived.by(() => {
    const rawProps: MindMapProps = stripSvelteProps(allProps);
    const result = safeParse(MindMapPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MindMapProps;
  });
</script>

<div data-slot="mind-map" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
