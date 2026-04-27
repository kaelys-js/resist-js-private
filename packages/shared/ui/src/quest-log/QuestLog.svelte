<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const QuestLogPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for QuestLog. */
  export type QuestLogProps = v.InferOutput<typeof QuestLogPropsSchema>;
</script>

<script lang="ts">
  /**
   * QuestLog — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <QuestLog />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = QuestLogProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: QuestLogProps = $derived.by(() => {
    const rawProps: QuestLogProps = stripSvelteProps(allProps);
    const result = safeParse(QuestLogPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as QuestLogProps;
  });
</script>

<div data-slot="quest-log" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
