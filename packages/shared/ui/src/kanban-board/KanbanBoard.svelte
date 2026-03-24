<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const KanbanBoardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type KanbanBoardProps = v.InferOutput<typeof KanbanBoardPropsSchema>;
</script>

<script lang="ts">
  /**
   * KanbanBoard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <KanbanBoard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = KanbanBoardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: KanbanBoardProps = $derived.by(() => {
    const rawProps: KanbanBoardProps = stripSvelteProps(allProps);
    const result = safeParse(KanbanBoardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as KanbanBoardProps;
  });
</script>

<div data-slot="kanban-board" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
